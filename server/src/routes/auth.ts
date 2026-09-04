import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { login, logout, refreshSession } from '../services/authService.js';
import { authRequired } from '../middleware/auth.js';
import { mfaService } from '../services/mfaService.js';

const router = Router();

router.post('/login', asyncHandler(async (req, res) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    totp: z.string().optional(),
  }).parse(req.body);
  ok(res, await login(body.email, body.password, body.totp), 'Logged in');
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const body = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
  ok(res, await refreshSession(body.refreshToken), 'Session refreshed');
}));

router.get('/me', authRequired, asyncHandler(async (req, res) => ok(res, req.user, 'Current user')));

router.post('/logout', authRequired, asyncHandler(async (req, res) => {
  ok(res, await logout(req.user!.userId), 'Logged out');
}));

// MFA (TOTP) enrollment — all require an authenticated session.
router.get('/mfa/status', authRequired, asyncHandler(async (req, res) => {
  ok(res, await mfaService.status(req.user!.tenantId, req.user!.userId), 'MFA status');
}));

router.post('/mfa/setup', authRequired, asyncHandler(async (req, res) => {
  ok(res, await mfaService.setup(req.user!.tenantId, req.user!.userId), 'MFA setup started');
}));

router.post('/mfa/activate', authRequired, asyncHandler(async (req, res) => {
  const body = z.object({ token: z.string().min(6) }).parse(req.body);
  ok(res, await mfaService.activate(req.user!.tenantId, req.user!.userId, body.token), 'MFA enabled');
}));

router.post('/mfa/disable', authRequired, asyncHandler(async (req, res) => {
  const body = z.object({ token: z.string().min(6) }).parse(req.body);
  ok(res, await mfaService.disable(req.user!.tenantId, req.user!.userId, body.token), 'MFA disabled');
}));

export default router;
