import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Brain, Building2, CalendarDays, ClipboardCheck, ClipboardList, FileText, GraduationCap, HardHat, Home, LifeBuoy, Link2, Lock, MapPinned, Package, ShieldCheck, ShieldAlert, SlidersHorizontal, Users } from 'lucide-react';
import type { RoleName } from '../types';
import { getNotifications, getPlatformSummary, getRoles } from '../services/platformClient';
import { Sidebar, type SidebarGroup, type SidebarItem } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { enabledNavIds, getActiveTenantId } from '../data/tenants';

const commandItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Command Center', icon: Home, description: 'Executive readiness screen' },
  { id: 'daily-briefing', label: 'Morning Briefing', icon: ClipboardCheck, description: 'Morning chief briefing' },
  { id: 'advisor', label: 'AI Readiness Advisor', icon: Brain, description: 'Cross-module intelligence' },
  { id: 'requirement-alignment', label: 'Requirement Alignment', icon: ShieldCheck, description: 'SaaS positioning & RFP alignment' },
];

const operationsItems: SidebarItem[] = [
  { id: 'rms', label: 'Incidents / RMS', icon: FileText, description: 'Records and report control' },
  { id: 'staffing', label: 'Staffing & Scheduling', icon: CalendarDays, description: 'Coverage management' },
  { id: 'stations', label: 'Station Readiness', icon: Building2, description: 'Stations and response readiness' },
];

const workforceItems: SidebarItem[] = [
  { id: 'personnel360', label: 'Personnel 360', icon: Users, description: 'Master staff record' },
  { id: 'learning', label: 'Learning & Skills', icon: GraduationCap, description: 'Agency training readiness' },
  { id: 'workforce-performance', label: 'Workforce Performance', icon: Activity, description: 'KPIs, appraisals, forecasting, requisitions' },
  { id: 'performance-goals', label: 'Performance & Goals', icon: ClipboardCheck, description: 'Reviews and development' },
];

const logisticsItems: SidebarItem[] = [
  { id: 'assets', label: 'Assets & Apparatus', icon: Package, description: 'Command center and readiness' },
  { id: 'maintenance', label: 'Inventory & Maintenance', icon: ClipboardCheck, description: 'Stock and service workflow' },
];

const preventionItems: SidebarItem[] = [
  { id: 'prevention', label: 'Properties & Occupancies', icon: Building2, description: 'Property and occupancy risk' },
  { id: 'prevention-inspections', label: 'Inspections / Permits / Preplans', icon: ClipboardList, description: 'Inspection and compliance workflow' },
];

const intelligenceItems: SidebarItem[] = [
  { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3, description: 'Shared reporting' },
  { id: 'analytics-quality', label: 'Data Quality', icon: ShieldAlert, description: 'Warehouse health' },
];

const platformItems: SidebarItem[] = [
  { id: 'integrations', label: 'Integration Hub', icon: Link2, description: 'Public safety API hub' },
  { id: 'tenant-configuration', label: 'Tenant Configuration', icon: SlidersHorizontal, description: 'Multi-tenant module setup' },
  { id: 'security', label: 'Security & Admin', icon: Lock, description: 'Governance and trust' },
  { id: 'support', label: 'Support / SLA', icon: LifeBuoy, description: 'Service targets and uptime' },
];

const navGroups: SidebarGroup[] = [
  { label: 'Command', items: commandItems },
  { label: 'Operations', items: operationsItems },
  { label: 'Workforce', items: workforceItems },
  { label: 'Logistics', items: logisticsItems },
  { label: 'Prevention', items: preventionItems },
  { label: 'Intelligence', items: intelligenceItems },
  { label: 'Platform', items: platformItems },
];

export function AppShell({
  children,
  route,
  setRoute,
  role,
  setRole,
}: {
  children: ReactNode;
  route: string;
  setRoute: (route: string) => void;
  role: RoleName;
  setRole: (role: RoleName) => void;
}) {
  const [roles, setRoles] = useState<string[]>([role]);
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
    getRoles()
      .then((response) => setRoles(response.items.map((item) => item.name)))
      .catch(() => setRoles([role]));
  }, [role]);

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
        <Topbar
          title="MissionOS"
          subtitle="Configurable SaaS platform for Fire/EMS & public safety operations"
          role={role}
          roles={roles}
          onRoleChange={(nextRole) => setRole(nextRole as RoleName)}
          notifications={unreadNotifications}
          notificationItems={notifications}
          onNotificationOpen={(notification) => {
            const type = String(notification.notificationType ?? '').toLowerCase();
            if (type.includes('training')) setRoute('learning');
            else if (type.includes('staffing')) setRoute('staffing');
            else if (type.includes('asset') || type.includes('maintenance')) setRoute('assets');
            else if (type.includes('prevention') || type.includes('inspection') || type.includes('permit')) setRoute('prevention');
            else if (type.includes('incident') || type.includes('neris') || type.includes('epcr') || type.includes('cad')) setRoute('rms');
            else if (type.includes('security') || type.includes('audit')) setRoute('security');
            else if (type.includes('integration') || type.includes('sync')) setRoute('integrations');
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
