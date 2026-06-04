"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error', errors: [message] });
}
