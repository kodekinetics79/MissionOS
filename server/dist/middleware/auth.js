"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRequired = authRequired;
exports.requirePermission = requirePermission;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authRequired(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
        return res.status(401).json({ success: false, data: null, message: 'Unauthorized', errors: ['Missing bearer token'] });
    try {
        req.user = jsonwebtoken_1.default.verify(header.slice(7), process.env.JWT_SECRET || 'dev-secret');
        next();
    }
    catch {
        return res.status(401).json({ success: false, data: null, message: 'Unauthorized', errors: ['Invalid token'] });
    }
}
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user?.permissions?.includes(permission) && !req.user?.permissions?.includes('admin.security'))
            return res.status(403).json({ success: false, data: null, message: 'Forbidden', errors: [`Missing permission: ${permission}`] });
        next();
    };
}
