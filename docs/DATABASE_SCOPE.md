# Database Scope Coverage

The Prisma schema covers the seven West Metro scope areas as one shared platform model.

| Scope | Database Coverage |
|---|---|
| RMS/ePCR/NERIS | Incident, IncidentUnit, IncidentPersonnel, Timeline, Narrative, QA Review, Attachment, EpcrLink, NerisMapping, NerisExportLog, CadImportLog |
| LMS | Course, CourseSession, TrainingAssignment, TrainingAttendance, Certification, PersonnelCertification |
| Staffing | Shift, ShiftAssignment, StaffingRule, OpenShift, ShiftTradeRequest, LeaveRequest, OvertimeRecord, AvailabilityRecord |
| Personnel & Performance | Personnel, documents, certifications, reviews, goals, assignments, incident links |
| Assets & Inventory | Apparatus, Asset, InventoryItem, InventoryTransaction, MaintenanceEvent, PreventiveMaintenanceSchedule, Vendor |
| Prevention | Property, Occupancy, Inspection, Checklist, Violation, Permit, Preplan, Hydrant, Hazard, Contacts, Documents |
| Analytics / Reporting | SavedReport, ReportExport, DataQualityCheck, DuplicateRecord, AnalyticsSnapshot |

Shared platform services include Tenant, User, Role, Permission, AuditLog, Notification, IntegrationSystem, IntegrationLog, FieldMapping, ApiEndpointExample, AiInsight, SupportTicket, SLA, and KnowledgeBase.
