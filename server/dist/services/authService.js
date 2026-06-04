"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.refreshSession = refreshSession;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_js_1 = require("../utils/prisma.js");
async function login(email, password) {
    const user = await prisma_js_1.prisma.user.findUnique({ where: { email }, include: { tenant: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!user || !user.isActive)
        throw new Error('Invalid credentials');
    const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!valid)
        throw new Error('Invalid credentials');
    const permissions = Array.from(new Set(user.roles.flatMap(r => r.role.permissions.map(p => p.permission.code))));
    const payload = { userId: user.id, tenantId: user.tenantId, email: user.email, permissions };
    const accessToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '2h' });
    const refreshToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret', { expiresIn: '7d' });
    await prisma_js_1.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { accessToken, refreshToken, user: { id: user.id, email: user.email, displayName: user.displayName, tenant: user.tenant.name, permissions } };
}
function refreshSession(token) {
    const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret');
    const accessToken = jsonwebtoken_1.default.sign({ userId: payload.userId, tenantId: payload.tenantId, email: payload.email, permissions: payload.permissions }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '2h' });
    return { accessToken };
}
