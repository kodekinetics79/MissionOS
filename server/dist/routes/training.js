"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const auth_js_1 = require("../middleware/auth.js");
const foundationService_js_1 = require("../services/foundationService.js");
const trainingService_js_1 = require("../services/trainingService.js");
const prisma_js_1 = require("../utils/prisma.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authRequired);
router.get('/needs', (0, auth_js_1.requirePermission)('training.needs.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const { status, stationId } = req.query;
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.listTrainingNeeds)(req.user.tenantId, page, take, status, stationId), 'Training needs');
}));
router.get('/command-center', (0, auth_js_1.requirePermission)('training.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.getTrainingCommandCenter)(req.user.tenantId), 'Training command center');
}));
router.post('/needs/generate', (0, auth_js_1.requirePermission)('training.needs.generate'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const result = await (0, trainingService_js_1.generateTrainingNeeds)(req.user.tenantId, req.user.userId);
    (0, apiResponse_js_1.ok)(res, result, 'Training needs generated');
}));
router.get('/needs/:id', (0, auth_js_1.requirePermission)('training.needs.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.getTrainingNeed)(req.user.tenantId, String(req.params.id)), 'Training need');
}));
router.post('/needs/:id/dismiss', (0, auth_js_1.requirePermission)('training.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.dismissTrainingNeed)(req.user.tenantId, String(req.params.id), req.user.userId), 'Training need dismissed');
}));
router.post('/needs/:id/resolve', (0, auth_js_1.requirePermission)('training.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.resolveTrainingNeed)(req.user.tenantId, String(req.params.id), req.user.userId), 'Training need resolved');
}));
router.get('/courses', (0, auth_js_1.requirePermission)('training.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const { category, deliveryType, certification } = req.query;
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.listCourses)(req.user.tenantId, page, take, { category, deliveryType, certification }), 'Courses');
}));
router.post('/courses', (0, auth_js_1.requirePermission)('training.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.created)(res, await (0, trainingService_js_1.createCourse)(req.user.tenantId, req.body ?? {}, req.user.userId), 'Course created');
}));
router.get('/courses/:id', (0, auth_js_1.requirePermission)('training.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.getCourse)(req.user.tenantId, String(req.params.id)), 'Course');
}));
router.put('/courses/:id', (0, auth_js_1.requirePermission)('training.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.updateCourse)(req.user.tenantId, String(req.params.id), req.body ?? {}, req.user.userId), 'Course updated');
}));
router.get('/sessions', (0, auth_js_1.requirePermission)('training.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const { courseId, stationId, status } = req.query;
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.listSessions)(req.user.tenantId, page, take, { courseId, stationId, status }), 'Sessions');
}));
router.post('/sessions', (0, auth_js_1.requirePermission)('training.assign'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.created)(res, await (0, trainingService_js_1.createSession)(req.user.tenantId, req.body ?? {}, req.user.userId), 'Session created');
}));
router.get('/sessions/:id', (0, auth_js_1.requirePermission)('training.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.getSession)(req.user.tenantId, String(req.params.id)), 'Session');
}));
router.put('/sessions/:id', (0, auth_js_1.requirePermission)('training.assign'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.updateSession)(req.user.tenantId, String(req.params.id), req.body ?? {}, req.user.userId), 'Session updated');
}));
router.get('/assignments', (0, auth_js_1.requirePermission)('training.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const { personnelId, courseId, status } = req.query;
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.listAssignments)(req.user.tenantId, page, take, { personnelId, courseId, status }), 'Training assignments');
}));
router.post('/assignments', (0, auth_js_1.requirePermission)('training.assign'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.created)(res, await (0, trainingService_js_1.createAssignment)(req.user.tenantId, req.body ?? {}, req.user.userId), 'Training assignment created');
}));
router.post('/assignments/bulk', (0, auth_js_1.requirePermission)('training.assign'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.created)(res, await (0, trainingService_js_1.bulkCreateAssignments)(req.user.tenantId, req.body ?? {}, req.user.userId), 'Training assignments created');
}));
router.get('/sessions/:id/attendance', (0, auth_js_1.requirePermission)('training.attendance'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.listAttendance)(req.user.tenantId, String(req.params.id)), 'Attendance');
}));
router.post('/sessions/:id/attendance', (0, auth_js_1.requirePermission)('training.attendance'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.recordAttendance)(req.user.tenantId, String(req.params.id), req.body ?? {}, req.user.userId), 'Attendance recorded');
}));
router.get('/certifications', (0, auth_js_1.requirePermission)('training.certifications'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.listCertifications)(req.user.tenantId, page, take), 'Certifications');
}));
router.get('/certifications/compliance', (0, auth_js_1.requirePermission)('training.certifications'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.getCertificationCompliance)(req.user.tenantId), 'Certification compliance');
}));
router.get('/certifications/expiring', (0, auth_js_1.requirePermission)('training.certifications'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.getExpiringCertifications)(req.user.tenantId), 'Expiring certifications');
}));
router.post('/certifications/renewal', (0, auth_js_1.requirePermission)('training.certifications'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.createRenewal)(req.user.tenantId, req.body ?? {}, req.user.userId), 'Certification renewed');
}));
router.get('/recommendations/courses', (0, auth_js_1.requirePermission)('training.recommendations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.getCourseRecommendations)(req.user.tenantId), 'Course recommendations');
}));
router.get('/recommendations/trainers', (0, auth_js_1.requirePermission)('training.recommendations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.getTrainerRecommendations)(req.user.tenantId, String(req.query.needId ?? ''), String(req.query.courseId ?? '')), 'Trainer recommendations');
}));
router.get('/recommendations/trainees', (0, auth_js_1.requirePermission)('training.recommendations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.getTraineeRecommendations)(req.user.tenantId, String(req.query.needId ?? ''), String(req.query.courseId ?? '')), 'Trainee recommendations');
}));
router.get('/readiness-impact', (0, auth_js_1.requirePermission)('training.recommendations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.getReadinessImpact)(req.user.tenantId), 'Readiness impact');
}));
router.get('/personnel/:id/profile', (0, auth_js_1.requirePermission)('training.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, trainingService_js_1.getPersonnelTrainingProfile)(req.user.tenantId, String(req.params.id)), 'Personnel training profile');
}));
router.get('/recommendations/courses/:needId', (0, auth_js_1.requirePermission)('training.recommendations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const recommendations = await (0, trainingService_js_1.getCourseRecommendations)(req.user.tenantId);
    (0, apiResponse_js_1.ok)(res, recommendations.find((recommendation) => recommendation.need?.id === req.params.needId) ?? null, 'Course recommendation');
}));
router.get('/stats', (0, auth_js_1.requirePermission)('training.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const [needs, sessions, assignments, compliance, ready] = await Promise.all([
        prisma_js_1.prisma.trainingNeedAssessment.count({ where: { tenantId: req.user.tenantId, status: 'Open' } }),
        prisma_js_1.prisma.courseSession.count({ where: { tenantId: req.user.tenantId } }),
        prisma_js_1.prisma.trainingAssignment.count({ where: { tenantId: req.user.tenantId } }),
        (0, trainingService_js_1.getCertificationCompliance)(req.user.tenantId),
        (0, trainingService_js_1.getReadinessImpact)(req.user.tenantId),
    ]);
    (0, apiResponse_js_1.ok)(res, {
        openNeeds: needs,
        sessions,
        assignments,
        compliance,
        ready,
    }, 'Training stats');
}));
exports.default = router;
