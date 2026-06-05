import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { accessSecret, JWT_ALGS } from '../utils/secrets.js';
export type AuthUser = { userId: string; tenantId: string; permissions: string[]; email: string };
declare global { namespace Express { interface Request { user?: AuthUser } } }
export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ success:false, data:null, message:'Unauthorized', errors:['Missing bearer token'] });
  // No hardcoded fallback secret; algorithm pinned to HS256 (prevents alg-confusion forgery).
  try { req.user = jwt.verify(header.slice(7), accessSecret(), { algorithms: [...JWT_ALGS] }) as AuthUser; next(); }
  catch { return res.status(401).json({ success:false, data:null, message:'Unauthorized', errors:['Invalid token'] }); }
}
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.permissions?.includes(permission) && !req.user?.permissions?.includes('admin.security')) return res.status(403).json({ success:false, data:null, message:'Forbidden', errors:[`Missing permission: ${permission}`] });
    next();
  };
}
