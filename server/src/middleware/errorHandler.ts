import type { Request, Response, NextFunction } from 'express';
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  console.error(err);
  res.status(500).json({ success: false, data: null, message: 'Server error', errors: [message] });
}
