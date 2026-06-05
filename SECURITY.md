# MissionOS — Security Posture

**Scope & honesty statement.** MissionOS is a configurable, multi-tenant SaaS
platform for Fire/EMS and public safety. This document describes the security
controls **actually implemented in this build** and how they **align with**
government-relevant frameworks (NIST SP 800-53 Rev. 5, NIST CSF 2.0, CJIS
Security Policy, OWASP ASVS). It is an **alignment** statement, **not** a
certification. MissionOS is **not** SOC 2 / FedRAMP / StateRAMP authorized and is
**not** CJIS-audited; those require an accredited assessor, production
infrastructure, and organizational controls outside the application.

Last hardening pass: 2026-06-04.

---

## Controls implemented in this build

### Identity, authentication & session (NIST IA / AC · CJIS §5.6)
- **Password storage:** bcrypt, cost factor **12** (OWASP-recommended). Plaintext
  passwords are never stored or logged.
- **Tokens:** JWT (HS256). Algorithm is **pinned on verify** (`algorithms:['HS256']`)
  to prevent algorithm-confusion / `alg:none` forgery. Access token TTL 2h,
  refresh 7d (both env-configurable).
- **No hardcoded/fallback secrets.** Signing/verification secrets are read from the
  environment via a fail-closed helper that **rejects missing or weak (<32 char)
  secrets** — the app refuses to mint or accept tokens without a strong secret.
  (Previously the code fell back to a public `'dev-secret'`; that forgeable path
  is removed.)
- **No user enumeration:** failed logins return a single generic `Invalid
  credentials` (HTTP 401) whether the account is missing, inactive, or the
  password is wrong.
- **Brute-force protection (NIST AC-7 / CJIS §5.6.2.1):** `/api/auth/login` and
  `/api/auth/refresh` are rate-limited to 20 attempts / 15 min / IP (HTTP 429).
- **Multi-factor authentication (NIST IA-2 / CJIS §5.6.2.2):** TOTP (RFC 6238)
  enrollment with proof-of-possession activation; when enabled, sign-in requires a
  valid 6-digit code (wrong/missing code → 401). Admin enforcement is policy-gated
  via `MFA_REQUIRED_FOR_ADMIN` (default off so the shared demo login keeps working);
  the demo administrator account is protected from MFA enrollment so password-only
  auto-login can't be locked out.

### Authorization (NIST AC-2/AC-3/AC-6 · least privilege)
- **RBAC:** roles → permissions; protected routes enforce `requirePermission(...)`.
- **Multi-tenant isolation:** all data is scoped by `tenantId`; queries and writes
  are tenant-scoped.

### Transport & data protection (NIST SC-8/SC-13/SC-23)
- **TLS to the database:** Postgres connections require TLS (`sslmode=require`) and
  **verify the server certificate by default** (`rejectUnauthorized=true`; an
  explicit `PG_SSL_NO_VERIFY` escape hatch exists but is off).
- **Parameterized queries:** all database writes use parameterized statements; the
  query/filter engine runs in-memory over typed objects (no string-built SQL),
  closing SQL-injection vectors.

### Application hardening (NIST SC-5/SC-7/SI-10/SI-11)
- **Security headers (helmet):** HSTS (1y, includeSubDomains, preload),
  `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy:
  no-referrer`, and `X-Powered-By` removed.
- **CORS** restricted to the configured origin(s).
- **Input validation** via zod on request bodies; validation failures return 400.
- **Request size cap** (2 MB JSON) to reduce DoS surface; general API rate limit
  (1200 req / 15 min / IP).
- **Error handling (SI-11):** internal error detail is **logged server-side only**;
  clients receive generic messages with correct status codes (401/403/404/400/503/500)
  — secret/configuration errors never reveal which secret or why.

### Auditing & accountability (NIST AU · CJIS §5.4)
- **Audit log** captures security-relevant actions (auth, admin, staffing/workforce
  decisions, requisitions, config changes) with actor, entity, and timestamp.
- **Sensitive-access logging** for ePCR-linked (PHI-adjacent) records, plus access
  reviews and a trust/compliance-mapping center in-app.

### Secrets & supply chain (NIST CM / SA)
- `.env` is **git-ignored and untracked** (it was previously committed — fixed this
  pass); a `.gitignore` now excludes secrets, build output, and local DB files.
- `.env.example` carries placeholders only.

---

## Known gaps & honest limitations
- **No third-party certification/attestation** (SOC 2, FedRAMP, StateRAMP, CJIS
  audit, pen-test report). Posture is self-assessed.
- **Secrets management:** secrets are in a local `.env`; production should use a
  managed secret store (Vault, AWS/GCP Secrets Manager, Vercel encrypted env) with
  rotation. JWT secret/RS256 key rotation is not yet automated.
- **Auth depth:** no account lockout counter persisted across nodes (rate limit is
  in-memory per instance), no MFA enforcement in the API path, no refresh-token
  rotation/blacklist, no device/session revocation list.
- **Data at rest:** relies on the database provider's encryption (e.g., Neon); the
  app does not add field-level encryption for PII/PHI.
- **Tenancy:** logical (`tenantId`) isolation, not physical per-tenant databases.
- **Infrastructure controls** (WAF, DDoS, IDS/IPS, network segmentation, FIPS-validated
  crypto modules, audit-log immutability/SIEM shipping, HA/DR) are deployment-time
  and not part of the application code.
- **Dependency posture:** `npm audit` reports moderate advisories only in the
  **dev-only** Prisma CLI tooling, which is not on the runtime path (the runtime
  uses a custom repository over `pg`). Recommend removing the unused Prisma
  dependency or pinning a patched version.

---

## Operational recommendations (do these for a real deployment)
1. **Rotate any credential ever shared in chat/logs** — including the current Neon
   database password — and move secrets into a managed secret store.
2. Enforce **MFA** for privileged roles; add account lockout + refresh-token
   rotation/revocation.
3. Terminate TLS at a managed edge with a **WAF**; ship audit logs to an immutable
   **SIEM**; enable DB **encryption at rest** + automated backups/DR.
4. Run an independent **penetration test** and dependency/secret scanning in CI
   before any production or CJIS-relevant use.
5. Pursue formal **SOC 2 / CJIS** alignment with an accredited assessor when the
   deployment target is set.
