import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRequired, requirePermission } from './middleware/auth.js';
import {
  currentTenantList,
  enforceCurrentTenantSelector,
  requireTenantOwnedRoleMutation,
  requireTenantOwnedUser,
  sanitizeAdminUserPayload,
  sanitizeTenantProfilePayload,
  sanitizeTenantRolePayload,
  validateRoleAssignments,
} from './middleware/tenantGuard.js';
import { asyncHandler } from './utils/asyncHandler.js';
import { initDb } from './utils/prisma.js';
import { accessSecret, refreshSecret } from './utils/secrets.js';

const app = express();
const port = Number(process.env.PORT || 4100);
const isProduction = process.env.NODE_ENV === 'production';
let databaseDriver = 'initializing';

app.set('trust proxy', 1); // correct client IP behind a proxy/load balancer (for rate limiting)
app.disable('x-powered-by');

// Fail fast on security-critical production configuration instead of booting a
// partially functional service and discovering the problem during authentication.
accessSecret();
refreshSecret();

if (isProduction) {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error('Production configuration requires PostgreSQL DATABASE_URL');
  }
  if (!process.env.CORS_ORIGIN?.trim()) {
    throw new Error('Production configuration requires explicit CORS_ORIGIN');
  }
}

// Security headers (NIST SC-8 / SC-23). CSP is enforced at the static SPA host;
// disabled here so the JSON API + cross-origin SPA are not broken in dev.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'no-referrer' },
}));

const corsOrigins = process.env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean) || ['http://localhost:9911'];
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));

const rlOpts = {
  standardHeaders: true as const,
  legacyHeaders: false as const,
  message: {
    success: false,
    data: null,
    message: 'Too many requests',
    errors: ['Rate limit exceeded. Try again later.'],
  },
};

// Brute-force protection on authentication (NIST AC-7 / CJIS 5.6): 20 attempts / 15 min / IP.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, ...rlOpts });
// General API throttle to blunt scraping / abuse.
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1200, ...rlOpts });

app.use(morgan(isProduction ? 'combined' : 'dev'));

// Liveness: process is up.
app.get('/health', (_req, res) => res.json({
  status: 'healthy',
  service: 'missionos-api',
  utc: new Date().toISOString(),
}));

// Readiness: service has a usable database backend. In production we refuse to
// claim readiness unless the durable PostgreSQL backend is actually active.
app.get('/ready', (_req, res) => {
  const ready = databaseDriver !== 'initializing' && (!isProduction || databaseDriver === 'postgres');
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    service: 'missionos-api',
    database: databaseDriver,
    utc: new Date().toISOString(),
  });
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/refresh', authLimiter);
// Apply the general API limiter before every app-level override/policy guard as
// well as the legacy router. Previously the central hardening routes bypassed it.
app.use('/api', apiLimiter);

// ── Core authorization/tenancy boundary ────────────────────────────────────
// These guards sit in front of legacy foundation/admin routes so the platform
// cannot expose cross-tenant data even where an older route/service is broader
// than the current production policy.
app.get('/api/tenants', authRequired, asyncHandler(currentTenantList));
app.use('/api/users', authRequired, requirePermission('admin.users.view'));
app.use('/api/roles', authRequired, requirePermission('admin.roles.view'));
app.use('/api/permissions', authRequired, requirePermission('admin.permissions.view'));
app.use('/api/rbac/matrix', authRequired, requirePermission('admin.permissions.view'));
app.use('/api/platform/summary', authRequired, requirePermission('dashboard.view'));
app.use('/api/stations', authRequired, requirePermission('stations.view'));
app.use('/api/certifications', authRequired, requirePermission('training.view'));
app.use('/api/properties', authRequired, requirePermission('prevention.view'));
app.use('/api/rms', authRequired, requirePermission('incidents.view'));
app.use('/api/search', authRequired, requirePermission('core.view'));
app.use('/api/analytics/dashboard', authRequired, requirePermission('analytics.view'));

// Tenant-admin routes that previously accepted arbitrary tenant/resource ids or
// trusted broad update payloads. These pre-route gates provide defense in depth
// while the underlying services are progressively normalized.
app.use('/api/admin/tenant-config', authRequired, enforceCurrentTenantSelector);
app.put('/api/admin/tenant', authRequired, requirePermission('admin.security.manage'), sanitizeTenantProfilePayload);

app.post(
  '/api/admin/users',
  authRequired,
  requirePermission('admin.users.manage'),
  sanitizeAdminUserPayload,
  asyncHandler(validateRoleAssignments),
);
app.use('/api/admin/users/:id', authRequired, asyncHandler(requireTenantOwnedUser), sanitizeAdminUserPayload);
app.post(
  '/api/admin/users/:id/roles',
  requirePermission('admin.roles.manage'),
  asyncHandler(validateRoleAssignments),
);
app.delete('/api/admin/users/:id/roles/:roleId', requirePermission('admin.roles.manage'));

app.post('/api/admin/roles', authRequired, requirePermission('admin.roles.manage'), sanitizeTenantRolePayload);
app.use(
  '/api/admin/roles/:id',
  authRequired,
  asyncHandler(requireTenantOwnedRoleMutation),
  sanitizeTenantRolePayload,
);

app.use('/api', routes);
app.use(errorHandler);

initDb()
  .then((driver) => {
    databaseDriver = driver;

    // The repository can deliberately fall back to SQLite for local demos, but a
    // production process must never continue on that fallback because that would
    // create split-brain/lost-data risk after a Postgres outage.
    if (isProduction && driver !== 'postgres') {
      throw new Error('Production database initialization did not establish PostgreSQL');
    }

    app.listen(port, () => {
      console.log(`MissionOS API listening on http://localhost:${port} (database: ${driver})`);
    });
  })
  .catch((err) => {
    console.error('MissionOS API failed to initialize safely:', err);
    process.exit(1);
  });
