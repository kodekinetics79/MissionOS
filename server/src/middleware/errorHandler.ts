import type { Request, Response, NextFunction } from 'express';

// Central error handler. Maps known errors to correct status codes and never
// leaks internal error detail to the client (NIST SI-11 / OWASP). Full detail
// is logged server-side only.
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[api error]', err);

  // Validation errors (zod) -> 400 with field-level (non-sensitive) messages.
  if (err?.name === 'ZodError' && Array.isArray(err.issues)) {
    const errors = err.issues.map((i: any) => `${(i.path ?? []).join('.') || 'body'}: ${i.message}`);
    return res.status(400).json({ success: false, data: null, message: 'Validation failed', errors });
  }

  const msg = err instanceof Error ? err.message : '';

  if (msg === 'Invalid credentials') {
    return res.status(401).json({ success: false, data: null, message: 'Invalid credentials', errors: ['Invalid credentials'] });
  }
  // MFA second-factor prompts/failures are safe to relay (no sensitive detail).
  if (err?.mfaRequired || /mfa code/i.test(msg)) {
    return res.status(401).json({ success: false, data: { mfaRequired: true }, message: msg || 'MFA required', errors: [msg || 'MFA code required'], mfaRequired: true });
  }
  // Secret / configuration problems must not reveal which secret or why.
  if (/missing or weak|not set|configuration/i.test(msg)) {
    return res.status(503).json({ success: false, data: null, message: 'Service unavailable', errors: ['Server configuration error'] });
  }
  if (/not found/i.test(msg)) {
    return res.status(404).json({ success: false, data: null, message: 'Not found', errors: ['Resource not found'] });
  }
  if (/forbidden|permission/i.test(msg)) {
    return res.status(403).json({ success: false, data: null, message: 'Forbidden', errors: ['Insufficient permissions'] });
  }

  // Default: generic message only — internal details stay in the server log.
  const status = typeof err?.status === 'number' ? err.status : 500;
  return res.status(status).json({ success: false, data: null, message: 'Server error', errors: ['An unexpected error occurred.'] });
}
