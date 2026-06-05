import type { Status } from '../types';

const classMap: Record<string, string> = {
  Healthy: 'badge healthy', Online: 'badge healthy', Warning: 'badge warning', Degraded: 'badge warning', Critical: 'badge critical', Offline: 'badge critical',
  Draft: 'badge neutral', Submitted: 'badge healthy', Closed: 'badge neutral', Open: 'badge warning', Overdue: 'badge critical', Scheduled: 'badge healthy', 'In Review': 'badge warning', 'QA Needed': 'badge warning', Passed: 'badge healthy',
  READY: 'badge healthy', WARNING: 'badge warning', OUT_OF_SERVICE: 'badge critical', MAINTENANCE_DUE: 'badge warning', RETIRED: 'badge neutral', HEALTHY: 'badge healthy', DEGRADED: 'badge warning', FAILED: 'badge critical', PAUSED: 'badge neutral',
  ACTIVE: 'badge healthy', 'Maintenance Warning': 'badge warning', 'Out of Service': 'badge critical', Ready: 'badge healthy', Watch: 'badge warning', 'At Risk': 'badge warning', Valid: 'badge healthy', 'Expiring Soon': 'badge warning', Expired: 'badge critical', 'Low Stock': 'badge warning', 'In Stock': 'badge healthy', 'Out of Stock': 'badge critical', 'Maintenance Due': 'badge warning', 'Due Soon': 'badge warning', 'In Progress': 'badge warning', Completed: 'badge healthy', Deferred: 'badge neutral',
  Queued: 'badge warning', Processing: 'badge warning', Invited: 'badge warning', Locked: 'badge critical', Reviewed: 'badge healthy', Duplicate: 'badge critical', Dismissed: 'badge neutral', Improving: 'badge healthy', Stable: 'badge healthy', Resolved: 'badge healthy', Archived: 'badge neutral', Cancelled: 'badge neutral', 'Reinspection Required': 'badge warning',
  Due: 'badge warning', Waived: 'badge healthy', Unread: 'badge warning', Read: 'badge neutral', Current: 'badge healthy',
  Connected: 'badge healthy', Disabled: 'badge neutral', 'Pending Configuration': 'badge warning',
  'Partial Success': 'badge warning', Retried: 'badge healthy', Investigating: 'badge warning', 'Retry Scheduled': 'badge warning',
  Succeeded: 'badge healthy', Running: 'badge warning', Stale: 'badge warning', Error: 'badge critical', Low: 'badge healthy',
  // AI advisor severities + statuses
  High: 'badge warning', Medium: 'badge warning', Info: 'badge neutral', Active: 'badge healthy', Paused: 'badge neutral',
  New: 'badge warning', Acknowledged: 'badge warning', Suggested: 'badge neutral', Assigned: 'badge warning',
  Implemented: 'badge healthy', 'Partially Implemented': 'badge warning', Planned: 'badge neutral', 'Not Applicable': 'badge neutral', 'On Track': 'badge healthy', Breached: 'badge critical', Contained: 'badge warning', 'In Remediation': 'badge warning', 'Risk Accepted': 'badge neutral'
};

export function StatusBadge({ status }: { status: Status | string }) {
  return <span className={classMap[status] ?? 'badge neutral'}>{status}</span>;
}
