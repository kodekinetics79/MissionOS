import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { login, refreshSession } from '../services/authService.js';
import { authRequired } from '../middleware/auth.js';
const router = Router();
router.post('/login', asyncHandler(async (req, res) => { const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body); ok(res, await login(body.email, body.password), 'Logged in'); }));
router.post('/refresh', asyncHandler(async (req, res) => {
  const body = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
  ok(res, refreshSession(body.refreshToken), 'Session refreshed');
}));
router.get('/me', authRequired, asyncHandler(async (req, res) => ok(res, req.user, 'Current user')));
router.post('/logout', authRequired, asyncHandler(async (_req, res) => ok(res, true, 'Logged out')));
export default router;
