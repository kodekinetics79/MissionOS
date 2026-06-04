import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { getPagination } from '../services/foundationService.js';
import {
  createAssignment,
  createCourse,
  createRenewal,
  createSession,
  bulkCreateAssignments,
  dismissTrainingNeed,
  getTrainingCommandCenter,
  generateTrainingNeeds,
  getCertificationCompliance,
  getCourse,
  getCourseRecommendations,
  getExpiringCertifications,
  getPersonnelTrainingProfile,
  getReadinessImpact,
  getSession,
  getTraineeRecommendations,
  getTrainingNeed,
  getTrainerRecommendations,
  listAssignments,
  listAttendance,
  listCourses,
  listSessions,
  listTrainingNeeds,
  recordAttendance,
  resolveTrainingNeed,
  updateCourse,
  updateSession,
  listCertifications,
} from '../services/trainingService.js';
import { prisma } from '../utils/prisma.js';

const router = Router();

router.use(authRequired);

router.get('/needs', requirePermission('training.needs.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const { status, stationId } = req.query as Record<string, string>;
  ok(res, await listTrainingNeeds(req.user!.tenantId, page, take, status, stationId), 'Training needs');
}));

router.get('/command-center', requirePermission('training.view'), asyncHandler(async (req, res) => {
  ok(res, await getTrainingCommandCenter(req.user!.tenantId), 'Training command center');
}));

router.post('/needs/generate', requirePermission('training.needs.generate'), asyncHandler(async (req, res) => {
  const result = await generateTrainingNeeds(req.user!.tenantId, req.user!.userId);
  ok(res, result, 'Training needs generated');
}));

router.get('/needs/:id', requirePermission('training.needs.view'), asyncHandler(async (req, res) => {
  ok(res, await getTrainingNeed(req.user!.tenantId, String(req.params.id)), 'Training need');
}));

router.post('/needs/:id/dismiss', requirePermission('training.manage'), asyncHandler(async (req, res) => {
  ok(res, await dismissTrainingNeed(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Training need dismissed');
}));

router.post('/needs/:id/resolve', requirePermission('training.manage'), asyncHandler(async (req, res) => {
  ok(res, await resolveTrainingNeed(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Training need resolved');
}));

router.get('/courses', requirePermission('training.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const { category, deliveryType, certification } = req.query as Record<string, string>;
  ok(res, await listCourses(req.user!.tenantId, page, take, { category, deliveryType, certification }), 'Courses');
}));

router.post('/courses', requirePermission('training.manage'), asyncHandler(async (req, res) => {
  created(res, await createCourse(req.user!.tenantId, req.body ?? {}, req.user!.userId), 'Course created');
}));

router.get('/courses/:id', requirePermission('training.view'), asyncHandler(async (req, res) => {
  ok(res, await getCourse(req.user!.tenantId, String(req.params.id)), 'Course');
}));

router.put('/courses/:id', requirePermission('training.manage'), asyncHandler(async (req, res) => {
  ok(res, await updateCourse(req.user!.tenantId, String(req.params.id), req.body ?? {}, req.user!.userId), 'Course updated');
}));

router.get('/sessions', requirePermission('training.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const { courseId, stationId, status } = req.query as Record<string, string>;
  ok(res, await listSessions(req.user!.tenantId, page, take, { courseId, stationId, status }), 'Sessions');
}));

router.post('/sessions', requirePermission('training.assign'), asyncHandler(async (req, res) => {
  created(res, await createSession(req.user!.tenantId, req.body ?? {}, req.user!.userId), 'Session created');
}));

router.get('/sessions/:id', requirePermission('training.view'), asyncHandler(async (req, res) => {
  ok(res, await getSession(req.user!.tenantId, String(req.params.id)), 'Session');
}));

router.put('/sessions/:id', requirePermission('training.assign'), asyncHandler(async (req, res) => {
  ok(res, await updateSession(req.user!.tenantId, String(req.params.id), req.body ?? {}, req.user!.userId), 'Session updated');
}));

router.get('/assignments', requirePermission('training.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const { personnelId, courseId, status } = req.query as Record<string, string>;
  ok(res, await listAssignments(req.user!.tenantId, page, take, { personnelId, courseId, status }), 'Training assignments');
}));

router.post('/assignments', requirePermission('training.assign'), asyncHandler(async (req, res) => {
  created(res, await createAssignment(req.user!.tenantId, req.body ?? {}, req.user!.userId), 'Training assignment created');
}));

router.post('/assignments/bulk', requirePermission('training.assign'), asyncHandler(async (req, res) => {
  created(res, await bulkCreateAssignments(req.user!.tenantId, req.body ?? {}, req.user!.userId), 'Training assignments created');
}));

router.get('/sessions/:id/attendance', requirePermission('training.attendance'), asyncHandler(async (req, res) => {
  ok(res, await listAttendance(req.user!.tenantId, String(req.params.id)), 'Attendance');
}));

router.post('/sessions/:id/attendance', requirePermission('training.attendance'), asyncHandler(async (req, res) => {
  ok(res, await recordAttendance(req.user!.tenantId, String(req.params.id), req.body ?? {}, req.user!.userId), 'Attendance recorded');
}));

router.get('/certifications', requirePermission('training.certifications'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listCertifications(req.user!.tenantId, page, take), 'Certifications');
}));

router.get('/certifications/compliance', requirePermission('training.certifications'), asyncHandler(async (req, res) => {
  ok(res, await getCertificationCompliance(req.user!.tenantId), 'Certification compliance');
}));

router.get('/certifications/expiring', requirePermission('training.certifications'), asyncHandler(async (req, res) => {
  ok(res, await getExpiringCertifications(req.user!.tenantId), 'Expiring certifications');
}));

router.post('/certifications/renewal', requirePermission('training.certifications'), asyncHandler(async (req, res) => {
  ok(res, await createRenewal(req.user!.tenantId, req.body ?? {}, req.user!.userId), 'Certification renewed');
}));

router.get('/recommendations/courses', requirePermission('training.recommendations.view'), asyncHandler(async (req, res) => {
  ok(res, await getCourseRecommendations(req.user!.tenantId), 'Course recommendations');
}));

router.get('/recommendations/trainers', requirePermission('training.recommendations.view'), asyncHandler(async (req, res) => {
  ok(res, await getTrainerRecommendations(req.user!.tenantId, String(req.query.needId ?? ''), String(req.query.courseId ?? '')), 'Trainer recommendations');
}));

router.get('/recommendations/trainees', requirePermission('training.recommendations.view'), asyncHandler(async (req, res) => {
  ok(res, await getTraineeRecommendations(req.user!.tenantId, String(req.query.needId ?? ''), String(req.query.courseId ?? '')), 'Trainee recommendations');
}));

router.get('/readiness-impact', requirePermission('training.recommendations.view'), asyncHandler(async (req, res) => {
  ok(res, await getReadinessImpact(req.user!.tenantId), 'Readiness impact');
}));

router.get('/personnel/:id/profile', requirePermission('training.view'), asyncHandler(async (req, res) => {
  ok(res, await getPersonnelTrainingProfile(req.user!.tenantId, String(req.params.id)), 'Personnel training profile');
}));

router.get('/recommendations/courses/:needId', requirePermission('training.recommendations.view'), asyncHandler(async (req, res) => {
  const recommendations = await getCourseRecommendations(req.user!.tenantId);
  ok(res, recommendations.find((recommendation: any) => recommendation.need?.id === req.params.needId) ?? null, 'Course recommendation');
}));

router.get('/stats', requirePermission('training.view'), asyncHandler(async (req, res) => {
  const [needs, sessions, assignments, compliance, ready] = await Promise.all([
    prisma.trainingNeedAssessment.count({ where: { tenantId: req.user!.tenantId, status: 'Open' } }),
    prisma.courseSession.count({ where: { tenantId: req.user!.tenantId } }),
    prisma.trainingAssignment.count({ where: { tenantId: req.user!.tenantId } }),
    getCertificationCompliance(req.user!.tenantId),
    getReadinessImpact(req.user!.tenantId),
  ]);
  ok(res, {
    openNeeds: needs,
    sessions,
    assignments,
    compliance,
    ready,
  }, 'Training stats');
}));

export default router;
