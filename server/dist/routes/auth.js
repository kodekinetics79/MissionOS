"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const authService_js_1 = require("../services/authService.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.post('/login', (0, asyncHandler_js_1.asyncHandler)(async (req, res) => { const body = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(1) }).parse(req.body); (0, apiResponse_js_1.ok)(res, await (0, authService_js_1.login)(body.email, body.password), 'Logged in'); }));
router.post('/refresh', (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const body = zod_1.z.object({ refreshToken: zod_1.z.string().min(1) }).parse(req.body);
    (0, apiResponse_js_1.ok)(res, (0, authService_js_1.refreshSession)(body.refreshToken), 'Session refreshed');
}));
router.get('/me', auth_js_1.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, req.user, 'Current user')));
router.post('/logout', auth_js_1.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (_req, res) => (0, apiResponse_js_1.ok)(res, true, 'Logged out')));
exports.default = router;
