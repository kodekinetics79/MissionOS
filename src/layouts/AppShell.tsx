import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Brain, Building2, CalendarDays, ClipboardCheck, ClipboardList, FileText, GraduationCap, LifeBuoy, Link2, Lock, MapPinned, Package, ShieldCheck, ShieldAlert, SlidersHorizontal, Users } from 'lucide-react';
import { getNotifications, getPlatformSummary } from '../services/platformClient';
import { Sidebar, type SidebarGroup, type SidebarItem } from '../components/Sidebar';
import { ToastHost } from '../components/ToastHost';
import { Topbar } from '../components/Topbar';
import { enabledNavIds, getActiveTenantId } from '../data/tenants';

const commandCenterItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Command Center', icon: ShieldCheck, description: 'Executive readiness screen' },
  { id: 'daily-briefing', label: 'Morning Briefing', icon: ClipboardCheck, description: 'Shift-start executive brief' },
  { id: 'demo-readiness', label: 'Demo Readiness', icon: Activity, description: 'Scenario walkthrough and evidence trail' },
  { id: 'advisor', label: 'AI Readiness Advisor', icon: Brain, description: 'Cross-module intelligence' },
];

const responseItems: SidebarItem[] = [
  { id: 'rms', label: 'Incident Command Center', icon: FileText, description: 'Records and report control' },
  { id: '/rms-neris', label: 'RMS / NERIS Readiness', icon: FileText, description: 'Incident QA and export posture' },
  { id: '/epcr-readiness', label: 'ePCR Readiness', icon: FileText, description: 'EMS sync and HIPAA posture' },
  { id: '/mobile-field-mode', label: 'Mobile Field Mode', icon: ClipboardCheck, description: 'Offline-first field workflows' },
];

const workforceItems: SidebarItem[] = [
  { id: 'staffing', label: 'Staffing & Scheduling', icon: CalendarDays, description: 'Coverage management' },
  { id: 'stations', label: 'Station Readiness', icon: Building2, description: 'Stations and response readiness' },
  { id: 'personnel360', label: 'Personnel 360', icon: Users, description: 'Master staff record' },
  { id: 'learning', label: 'Learning & Skills', icon: GraduationCap, description: 'Agency training readiness' },
  { id: 'workforce-performance', label: 'Workforce Performance', icon: Activity, description: 'KPIs, appraisals, forecasting, requisitions' },
];

const assetsItems: SidebarItem[] = [
  { id: 'assets', label: 'Apparatus & Assets', icon: Package, description: 'Fleet, equipment, and readiness' },
  { id: 'apparatusRegistry', label: 'Apparatus Registry', icon: Package, description: 'Vehicle and apparatus records' },
  { id: 'stationInventory', label: 'Station Inventory', icon: ClipboardCheck, description: 'Station-level stock and supplies' },
  { id: 'maintenance', label: 'Maintenance Workbench', icon: ClipboardCheck, description: 'Stock and service workflow' },
  { id: 'preventive', label: 'Readiness Checks', icon: ClipboardCheck, description: 'Preventive service planning' },
  { id: 'reorder', label: 'Purchase Requests', icon: ClipboardList, description: 'Reorder and procurement queue' },
  { id: 'risks', label: 'Lifecycle & Replacement', icon: ShieldAlert, description: 'Asset risk and replacement planning' },
];

const preventionItems: SidebarItem[] = [
  { id: 'prevention', label: 'Properties & Occupancies', icon: Building2, description: 'Property and occupancy risk' },
  { id: '/prevention-inspections', label: 'Prevention & Inspections', icon: ClipboardList, description: 'Inspection and reinspection workflow' },
  { id: '/permits', label: 'Permitting', icon: ClipboardCheck, description: 'Permit approval workflow' },
  { id: '/preplans', label: 'Preplans & Occupancy Risk', icon: MapPinned, description: 'Building risk profiles' },
  { id: '/hydrants-gis', label: 'Hydrants / GIS', icon: MapPinned, description: 'Water supply and GIS readiness' },
];

const intelligenceItems: SidebarItem[] = [
  { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3, description: 'Shared reporting' },
  { id: '/report-builder', label: 'Report Builder', icon: BarChart3, description: 'Saved and scheduled reporting' },
  { id: 'analytics-quality', label: 'Data Quality', icon: ShieldAlert, description: 'Warehouse health' },
];

const workflowItems: SidebarItem[] = [
  { id: 'incident-qa', label: 'QA Work Queue', icon: ClipboardList, description: 'Review and approval queue' },
  { id: 'incident-neris', label: 'NERIS Mapping', icon: FileText, description: 'Validation and export readiness' },
  { id: 'incident-export', label: 'Export Preview', icon: FileText, description: 'Export packaging and readiness' },
  { id: 'incident-epcr', label: 'ePCR Linkage', icon: FileText, description: 'EMS documentation queue' },
  { id: 'incident-cad', label: 'CAD Logs', icon: ClipboardCheck, description: 'Dispatch imports and sync logs' },
  { id: 'incident-quality', label: 'Incident Data Quality', icon: ShieldAlert, description: 'QA / QI and corrective actions' },
  { id: 'requirement-alignment', label: 'Requirement Alignment', icon: ShieldCheck, description: 'RFP and competitive positioning' },
];

const platformItems: SidebarItem[] = [
  { id: 'integrations', label: 'Integration Command Center', icon: Link2, description: 'Public safety API hub' },
  { id: '/integration-hub', label: 'Integration Hub', icon: Link2, description: 'Connector posture and sync health' },
  { id: '/security-compliance', label: 'Security & Compliance', icon: Lock, description: 'Governance and trust' },
  { id: '/continuity-center', label: 'Continuity Center', icon: LifeBuoy, description: 'Service targets and resilience' },
  { id: 'security', label: 'Security & Admin', icon: Lock, description: 'Governance and trust' },
  { id: 'support', label: 'Support / SLA', icon: LifeBuoy, description: 'Service targets and uptime' },
  { id: 'tenant-configuration', label: 'Tenant Configuration', icon: SlidersHorizontal, description: 'Multi-tenant module setup' },
];

const navGroups: SidebarGroup[] = [
  { label: 'Command Center', items: commandCenterItems },
  { label: 'Response & Records', items: responseItems },
  { label: 'Workforce Readiness', items: workforceItems },
  { label: 'Assets & Logistics', items: assetsItems },
  { label: 'Community Risk & Prevention', items: preventionItems },
  { label: 'Performance & Intelligence', items: intelligenceItems },
  { label: 'Workflows & Approvals', items: workflowItems },
  { label: 'Platform & Trust', items: platformItems },
];

export function AppShell({
  children,
  route,
  setRoute,
}: {
  children: ReactNode;
  route: string;
  setRoute: (route: string) => void;
}) {
  const [platformSummary, setPlatformSummary] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Tenant-scoped navigation: the sidebar shows only the modules the active
  // tenant has enabled (Tenant Configuration drives this live).
  const [enabledNav, setEnabledNav] = useState<Set<string>>(() => enabledNavIds(getActiveTenantId()));

  useEffect(() => {
    const refresh = () => setEnabledNav(enabledNavIds(getActiveTenantId()));
    window.addEventListener('missionos:tenant-config-changed', refresh);
    return () => window.removeEventListener('missionos:tenant-config-changed', refresh);
  }, []);

  const visibleNavGroups = useMemo(
    () => navGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => enabledNav.has(item.id)) }))
      .filter((group) => group.items.length > 0),
    [enabledNav],
  );

  useEffect(() => {
    getPlatformSummary().then(setPlatformSummary).catch(() => setPlatformSummary(null));
    getNotifications().then((response) => setNotifications(response.items)).catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ stationId?: string }>).detail;
      if (detail?.stationId) {
        localStorage.setItem('missionos.station.selectedId', detail.stationId);
        setRoute('station360');
      }
    };
    window.addEventListener('missionos:open-station-360', handler as EventListener);
    return () => window.removeEventListener('missionos:open-station-360', handler as EventListener);
  }, [setRoute]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ personnelId?: string }>).detail;
      if (detail?.personnelId) {
        localStorage.setItem('missionos.personnel.selectedId', detail.personnelId);
        setRoute('personnel360');
      }
    };
    window.addEventListener('missionos:open-personnel-360', handler as EventListener);
    return () => window.removeEventListener('missionos:open-personnel-360', handler as EventListener);
  }, [setRoute]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ propertyId?: string }>).detail;
      if (detail?.propertyId) {
        localStorage.setItem('missionos.prevention.selectedPropertyId', detail.propertyId);
        setRoute('prevention-property');
      }
    };
    window.addEventListener('missionos:open-property-360', handler as EventListener);
    return () => window.removeEventListener('missionos:open-property-360', handler as EventListener);
  }, [setRoute]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ apparatusId?: string }>).detail;
      if (detail?.apparatusId) {
        localStorage.setItem('missionos.apparatus.selectedId', detail.apparatusId);
        setRoute('apparatus360');
      }
    };
    window.addEventListener('missionos:open-apparatus-360', handler as EventListener);
    return () => window.removeEventListener('missionos:open-apparatus-360', handler as EventListener);
  }, [setRoute]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ incidentId?: string }>).detail;
      if (detail?.incidentId) {
        localStorage.setItem('missionos.incident.selectedId', detail.incidentId);
        setRoute('incident-detail');
      }
    };
    window.addEventListener('missionos:open-incident', handler as EventListener);
    return () => window.removeEventListener('missionos:open-incident', handler as EventListener);
  }, [setRoute]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ route?: string }>).detail;
      if (detail?.route) setRoute(detail.route);
    };
    window.addEventListener('missionos:set-route', handler as EventListener);
    return () => window.removeEventListener('missionos:set-route', handler as EventListener);
  }, [setRoute]);

  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

  return (
    <div className="shell">
      <Sidebar groups={visibleNavGroups} activeId={route} onSelect={setRoute} />
      <main>
        <ToastHost />
        <Topbar
          title="MissionOS"
          subtitle="Configurable SaaS platform for Fire/EMS & public safety operations"
          notifications={unreadNotifications}
          notificationItems={notifications}
          onNotificationOpen={(notification) => {
            const type = String(notification.notificationType ?? '').toLowerCase();
            if (type.includes('training')) setRoute('learning');
            else if (type.includes('staffing')) setRoute('staffing');
            else if (type.includes('asset') || type.includes('maintenance')) setRoute('assets');
            else if (type.includes('prevention') || type.includes('inspection') || type.includes('permit')) setRoute('/prevention-inspections');
            else if (type.includes('neris')) setRoute('/rms-neris');
            else if (type.includes('epcr')) setRoute('/epcr-readiness');
            else if (type.includes('incident') || type.includes('cad')) setRoute('rms');
            else if (type.includes('security') || type.includes('audit')) setRoute('/security-compliance');
            else if (type.includes('integration') || type.includes('sync')) setRoute('/integration-hub');
            else setRoute('dashboard');
          }}
          searchSlot={(
            <label className="search-inline">
              <input
                value={searchQuery}
                placeholder="Search personnel, stations, assets, incidents..."
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    localStorage.setItem('missionos.search.query', searchQuery.trim());
                    setRoute('search');
                  }
                }}
              />
            </label>
          )}
          quickActionLabel="Morning Briefing"
          onQuickAction={() => setRoute('demo-morning-readiness')}
          systemHealthLabel={platformSummary?.integrationHealth?.failed > 0 ? 'Degraded' : 'Healthy'}
          systemHealthHint={`Readiness ${platformSummary?.readiness?.agencyAverage ?? '—'}% · ${platformSummary?.openAlerts ?? 0} open alerts`}
        />
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
