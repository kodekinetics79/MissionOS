import type { Response } from 'express';
export function ok(res: Response, data: unknown, message = 'OK') { return res.json({ success: true, data, message, errors: [] }); }
export function created(res: Response, data: unknown, message = 'Created') { return res.status(201).json({ success: true, data, message, errors: [] }); }
