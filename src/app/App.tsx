import { ReactNode, Suspense, lazy, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ensureDevSession } from '../services/apiClient';
import { AppShell } from '../layouts/AppShell';
import { Platform } from '../pages/Platform';
import { StationsDirectory } from '../pages/StationsDirectory';
import { Station360 } from '../pages/Station360';
import { PersonnelDirectory } from '../pages/PersonnelDirectory';
import { Personnel360 } from '../pages/Personnel360';
import { Search } from '../pages/Search';
import { Notifications } from '../pages/Notifications';
import { MorningReadinessBriefing, DemoReadiness } from '../pages/Demo';
import { IncidentCommandCenter } from '../pages/IncidentCommandCenter';
import { IncidentCreateEdit } from '../pages/IncidentCreateEdit';
import { IncidentDataQualityCenter } from '../pages/IncidentDataQualityCenter';
import { IncidentDetail } from '../pages/IncidentDetail';
import { IncidentQaWorkQueue } from '../pages/IncidentQaWorkQueue';
import { NerisMapping } from '../pages/NerisMapping';
import { NerisExportPreview } from '../pages/NerisExportPreview';
import { EpcrLinkage } from '../pages/EpcrLinkage';
import { CadImportLogs } from '../pages/CadImportLogs';
import { Dashboard } from '../pages/Dashboard';
import { Incidents } from '../pages/Incidents';
import { Staffing } from '../pages/Staffing';
// Code-split the Workforce Performance module so its bundle loads only on demand.
const WorkforcePerformance = lazy(() => import('../pages/WorkforcePerformance').then((m) => ({ default: m.WorkforcePerformance })));
import { TrainingCommandCenter } from '../pages/TrainingCommandCenter';
import { TrainingNeedAssessment } from '../pages/TrainingNeedAssessment';
import { CourseCatalog } from '../pages/CourseCatalog';
import { CourseDetail } from '../pages/CourseDetail';
import { CourseSessionScheduler } from '../pages/CourseSessionScheduler';
import { TrainerMatching } from '../pages/TrainerMatching';
import { TraineeRecommendations } from '../pages/TraineeRecommendations';
import { CertificationCompliance } from '../pages/CertificationCompliance';
import { TrainingAttendance } from '../pages/TrainingAttendance';
import { PersonnelTrainingProfile } from '../pages/PersonnelTrainingProfile';
import {
  Assets,
  ApparatusRegistry,
  Apparatus360,
  EquipmentInventory,
  StationInventory as AssetStationInventory,
  MaintenanceWorkbench,
  PreventiveMaintenanceCalendar,
  InventoryTransactionsPage,
  VendorReorderCenter,
  AssetReadinessRisks,
} from '../pages/Assets';
import {
  Prevention,
  PropertyRegistry,
  Property360,
  InspectionQueue,
  MobileInspectionForm,
  InspectionChecklist,
  ViolationsCorrectiveActions,
  PermitCenter,
  PreplanLibrary,
  PreplanDetail,
  HydrantsHazards,
  PreventionRiskCenter,
  InspectionPrioritization,
} from '../pages/Prevention';
import {
  Analytics,
  ExecutiveSummaryDashboard,
  StationComparison,
  CustomReportBuilder,
  SavedReports,
  ReportPreview,
  ReportExportCenter,
  DataQualityCenter,
  DuplicateDetectionCenter,
  IncidentAnalytics,
  TrainingAnalytics,
  StaffingAnalytics,
  PersonnelAnalytics,
  AssetAnalytics,
  PreventionAnalytics,
  IntegrationAnalytics,
} from '../pages/Analytics';
import {
  Integrations,
  ConnectedSystems,
  IntegrationSystem360,
  DataFlowMonitor,
  FieldMappingStudio,
  SyncLogs,
  ErrorRetryCenter,
  ApiDocumentation,
  CredentialsWebhooks,
  IntegrationPerformance,
  AdapterRegistry,
} from '../pages/IntegrationHub';
import {
  Advisor,
  DailyReadinessBriefing,
  InsightWorkbench,
  InsightDetail,
  EvidenceViewer,
  NextBestActions,
  AskCommandCore,
  AiRules,
  AiProviders,
  StaffingRiskView,
  TrainingRiskView,
  PersonnelRiskView,
  IncidentRiskView,
  AssetRiskView,
  PreventionRiskView,
  IntegrationRiskView,
  DataQualityRiskView,
  StationRiskView,
} from '../pages/AiAdvisor';
import {
  Security,
  UserManagement,
  RoleManagement,
  RbacMatrix,
  AccessReviewCenter,
  AuditLogViewer,
  SensitiveDataAccessLogs,
  SessionLogs,
  AuthenticationPolicies,
  SsoMfaSettings,
  SecurityControls,
  ComplianceMapping,
  BackupDisasterRecovery,
  SecurityIncidentResponse,
  VulnerabilityManagement,
} from '../pages/Security';
import {
  Support,
  SlaCenter,
  EscalationPath,
  SystemStatus,
} from '../pages/Support';
import { RequirementAlignment } from '../pages/RequirementAlignment';
import { TenantConfiguration } from '../pages/TenantConfiguration';
import {
  ContinuityCenter,
  EpcrReadiness,
  HydrantsGis,
  IntegrationHubDemo,
  MobileFieldMode,
  Permits,
  Preplans,
  PreventionInspections,
  ReportBuilder,
  RmsNerisReadiness,
  SecurityCompliance,
} from '../pages/CompetitiveModules';

const pages: Record<string, ReactNode> = {
  platform: <Platform />,
  'command-center': <Dashboard />,
  'morning-briefing': <DailyReadinessBriefing />,
  'ai-readiness': <Advisor />,
  stations: <StationsDirectory />,
  'station-readiness': <StationsDirectory />,
  station360: <Station360 />,
  personnel: <PersonnelDirectory />,
  'personnel-360': <Personnel360 />,
  personnel360: <Personnel360 />,
  'performance-goals': <Personnel360 />,
  search: <Search />,
  notifications: <Notifications />,
  rms: <IncidentCommandCenter />,
  dashboard: <Dashboard />,
  'daily-briefing': <DailyReadinessBriefing />,
  'demo-morning-readiness': <MorningReadinessBriefing />,
  'demo-readiness': <DemoReadiness />,
  incidents: <Incidents />,
  'incident-center': <IncidentCommandCenter />,
  'incident-detail': <IncidentDetail />,
  'incident-edit': <IncidentCreateEdit />,
  'incident-qa': <IncidentQaWorkQueue />,
  'incident-neris': <NerisMapping />,
  'incident-export': <NerisExportPreview />,
  'incident-epcr': <EpcrLinkage />,
  'incident-cad': <CadImportLogs />,
  'incident-quality': <IncidentDataQualityCenter />,
  '/rms-neris': <RmsNerisReadiness />,
  '/epcr-readiness': <EpcrReadiness />,
  '/prevention-inspections': <PreventionInspections />,
  '/permits': <Permits />,
  '/preplans': <Preplans />,
  '/hydrants-gis': <HydrantsGis />,
  '/mobile-field-mode': <MobileFieldMode />,
  '/report-builder': <ReportBuilder />,
  '/security-compliance': <SecurityCompliance />,
  '/continuity-center': <ContinuityCenter />,
  staffing: <Staffing />,
  'staffing-scheduling': <Staffing />,
  'workforce-performance': <WorkforcePerformance />,
  'workforce-planning': <WorkforcePerformance />,
  'requirement-alignment': <RequirementAlignment />,
  'tenant-configuration': <TenantConfiguration />,
  learning: <TrainingCommandCenter />,
  'learning-skills': <TrainingCommandCenter />,
  'learning-center': <TrainingCommandCenter />,
  'learning-needs': <TrainingNeedAssessment />,
  'learning-catalog': <CourseCatalog />,
  'learning-course': <CourseDetail />,
  'learning-sessions': <CourseSessionScheduler />,
  'learning-trainers': <TrainerMatching />,
  'learning-trainees': <TraineeRecommendations />,
  'learning-compliance': <CertificationCompliance />,
  'learning-attendance': <TrainingAttendance />,
  'learning-profile': <PersonnelTrainingProfile />,
  assets: <Assets />,
  'assets-apparatus': <Assets />,
  apparatusRegistry: <ApparatusRegistry />,
  apparatus360: <Apparatus360 />,
  assetInventory: <EquipmentInventory />,
  stationInventory: <AssetStationInventory />,
  maintenance: <MaintenanceWorkbench />,
  'inventory-maintenance': <MaintenanceWorkbench />,
  preventive: <PreventiveMaintenanceCalendar />,
  transactions: <InventoryTransactionsPage />,
  reorder: <VendorReorderCenter />,
  risks: <AssetReadinessRisks />,
  prevention: <Prevention />,
  'properties-occupancies': <Prevention />,
  'prevention-properties': <PropertyRegistry />,
  'prevention-property': <Property360 />,
  'prevention-inspections': <InspectionQueue />,
  'prevention-mobile': <MobileInspectionForm />,
  'prevention-checklist': <InspectionChecklist />,
  'prevention-violations': <ViolationsCorrectiveActions />,
  'prevention-permits': <PermitCenter />,
  'prevention-preplans': <PreplanLibrary />,
  'prevention-preplan': <PreplanDetail />,
  'prevention-hydrants': <HydrantsHazards />,
  'prevention-risks': <PreventionRiskCenter />,
  'prevention-prioritization': <InspectionPrioritization />,
  analytics: <Analytics />,
  'analytics-reports': <Analytics />,
  'analytics-executive': <ExecutiveSummaryDashboard />,
  'analytics-station-comparison': <StationComparison />,
  'analytics-builder': <CustomReportBuilder />,
  'analytics-saved': <SavedReports />,
  'analytics-preview': <ReportPreview />,
  'analytics-exports': <ReportExportCenter />,
  'analytics-quality': <DataQualityCenter />,
  'data-quality': <DataQualityCenter />,
  'analytics-duplicates': <DuplicateDetectionCenter />,
  'analytics-incidents': <IncidentAnalytics />,
  'analytics-training': <TrainingAnalytics />,
  'analytics-staffing': <StaffingAnalytics />,
  'analytics-personnel': <PersonnelAnalytics />,
  'analytics-assets': <AssetAnalytics />,
  'analytics-prevention': <PreventionAnalytics />,
  'analytics-integrations': <IntegrationAnalytics />,
  integrations: <Integrations />,
  'integration-hub': <Integrations />,
  '/integration-hub': <IntegrationHubDemo />,
  'integration-systems': <ConnectedSystems />,
  'integration-system': <IntegrationSystem360 />,
  'integration-flow': <DataFlowMonitor />,
  'integration-mappings': <FieldMappingStudio />,
  'integration-logs': <SyncLogs />,
  'integration-errors': <ErrorRetryCenter />,
  'integration-docs': <ApiDocumentation />,
  'integration-credentials': <CredentialsWebhooks />,
  'integration-performance': <IntegrationPerformance />,
  'integration-adapters': <AdapterRegistry />,
  advisor: <Advisor />,
  'ai-briefing': <DailyReadinessBriefing />,
  'ai-workbench': <InsightWorkbench />,
  'ai-insight': <InsightDetail />,
  'ai-evidence': <EvidenceViewer />,
  'ai-actions': <NextBestActions />,
  'ai-ask': <AskCommandCore />,
  'ai-rules': <AiRules />,
  'ai-providers': <AiProviders />,
  'ai-risk-staffing': <StaffingRiskView />,
  'ai-risk-training': <TrainingRiskView />,
  'ai-risk-personnel': <PersonnelRiskView />,
  'ai-risk-incidents': <IncidentRiskView />,
  'ai-risk-assets': <AssetRiskView />,
  'ai-risk-prevention': <PreventionRiskView />,
  'ai-risk-integrations': <IntegrationRiskView />,
  'ai-risk-data': <DataQualityRiskView />,
  'ai-risk-stations': <StationRiskView />,
  security: <Security />,
  'security-admin': <Security />,
  'admin-trust': <Security />,
  'admin-users': <UserManagement />,
  'admin-roles': <RoleManagement />,
  'admin-rbac': <RbacMatrix />,
  'admin-access': <AccessReviewCenter />,
  'admin-audit': <AuditLogViewer />,
  'admin-sensitive': <SensitiveDataAccessLogs />,
  'admin-sessions': <SessionLogs />,
  'admin-auth': <AuthenticationPolicies />,
  'admin-sso': <SsoMfaSettings />,
  'admin-controls': <SecurityControls />,
  'admin-compliance': <ComplianceMapping />,
  'admin-backup': <BackupDisasterRecovery />,
  'admin-incidents': <SecurityIncidentResponse />,
  'admin-vulnerabilities': <VulnerabilityManagement />,
  support: <Support />,
  'support-sla': <SlaCenter />,
  'support-escalation': <EscalationPath />,
  'support-system': <SystemStatus />,
};

function getInitialRoute() {
  if (typeof window === 'undefined') return 'platform';
  const hashRoute = decodeURIComponent(window.location.hash.slice(1).trim());
  if (hashRoute) return hashRoute;
  return window.localStorage.getItem('missionos.route') ?? 'platform';
}

export function App() {
  const [route, setRoute] = useState(getInitialRoute);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureDevSession().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('missionos.route', route);
    const nextHash = `#${route.startsWith('/') ? route : route}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, [route]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromHash = () => {
      const nextRoute = decodeURIComponent(window.location.hash.slice(1).trim()) || 'platform';
      setRoute(nextRoute);
    };
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  if (!ready) {
    return (
      <div className="boot-screen">
        <div className="brand-mark"><ShieldCheck size={26} /></div>
        <p>Connecting to MissionOS…</p>
      </div>
    );
  }

  return (
    <AppShell route={route} setRoute={setRoute}>
      <Suspense fallback={<div className="page-loading">Loading module…</div>}>
        {pages[route] ?? pages.platform}
      </Suspense>
    </AppShell>
  );
}
