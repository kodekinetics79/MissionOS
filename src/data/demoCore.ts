const baseNow = new Date('2026-06-05T12:00:00-04:00');
const iso = (daysOffset: number) => new Date(baseNow.getTime() + daysOffset * 86_400_000).toISOString();
const pick = <T,>(items: T[], index: number) => items[index % items.length];

const stations = [
  { id: 'ST-01', name: 'Station 1', city: 'Lakewood', battalion: 'Battalion 1', responseArea: 'Urban core', commandOfficer: 'Capt. Elena Ruiz', readiness: 96, staffingGap: 0, apparatusReady: 98, inspectionBacklog: 2, status: 'Healthy' },
  { id: 'ST-02', name: 'Station 2', city: 'Wheat Ridge', battalion: 'Battalion 1', responseArea: 'Medical corridor', commandOfficer: 'Capt. Derek Lawson', readiness: 87, staffingGap: 1, apparatusReady: 92, inspectionBacklog: 6, status: 'Warning' },
  { id: 'ST-03', name: 'Station 3', city: 'Lakewood', battalion: 'Battalion 2', responseArea: 'Industrial south', commandOfficer: 'Capt. Aisha Turner', readiness: 91, staffingGap: 0, apparatusReady: 95, inspectionBacklog: 4, status: 'Healthy' },
  { id: 'ST-04', name: 'Station 4', city: 'Lakewood', battalion: 'Battalion 2', responseArea: 'Commercial ridge', commandOfficer: 'Capt. Maria Chen', readiness: 74, staffingGap: 2, apparatusReady: 81, inspectionBacklog: 11, status: 'At Risk' },
  { id: 'ST-05', name: 'Station 5', city: 'Morrison', battalion: 'Battalion 3', responseArea: 'WUI interface', commandOfficer: 'Capt. Sam Patel', readiness: 89, staffingGap: 1, apparatusReady: 90, inspectionBacklog: 5, status: 'Warning' },
  { id: 'ST-06', name: 'Station 6', city: 'Golden', battalion: 'Battalion 3', responseArea: 'Foothills / GIS edge', commandOfficer: 'Capt. Renee Morales', readiness: 93, staffingGap: 0, apparatusReady: 97, inspectionBacklog: 3, status: 'Healthy' },
];

const firstNames = ['Alex', 'Taylor', 'Jordan', 'Morgan', 'Riley', 'Casey', 'Avery', 'Jamie', 'Quinn', 'Parker'];
const lastNames = ['Garcia', 'Smith', 'Johnson', 'Martinez', 'Brown', 'Davis', 'Wilson', 'Lee', 'Clark', 'Moore'];
const ranks = ['Firefighter', 'Engineer', 'Lieutenant', 'Captain', 'Paramedic', 'Prevention Officer', 'Logistics Technician', 'Battalion Chief'];
const shifts = ['A', 'B', 'C'];

const staff = Array.from({ length: 35 }, (_, index) => {
  const station = pick(stations, index);
  const rank = ranks[index % ranks.length];
  const certExpiration = index % 6 === 0 ? 18 : index % 8 === 0 ? 27 : index % 11 === 0 ? 42 : 180;
  const status = index % 13 === 0 ? 'Leave' : index % 9 === 0 ? 'Training' : 'Active';
  return {
    id: `SF-${String(index + 1).padStart(3, '0')}`,
    name: `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]} ${index + 1}`,
    rank,
    role: rank,
    stationId: station.id,
    stationName: station.name,
    battalion: station.battalion,
    shift: shifts[index % shifts.length],
    email: `${firstNames[index % firstNames.length].toLowerCase()}.${lastNames[index % lastNames.length].toLowerCase()}${index + 1}@westmetro.example`,
    phone: `303-555-${String(2000 + index).slice(-4)}`,
    status,
    readiness: 72 + ((index * 3) % 25),
    performance: 78 + ((index * 5) % 17),
    overtimeHours: 4 + ((index * 4) % 22),
    supervisor: station.commandOfficer,
    certifications: rank === 'Prevention Officer'
      ? ['Inspector I', 'CPR/BLS']
      : rank === 'Logistics Technician'
        ? ['Driver Operator', 'SCBA Technician']
        : rank === 'Paramedic'
          ? ['EMT', 'CPR/BLS', 'Paramedic']
          : ['Firefighter I', 'CPR/BLS'],
    certExpiringDays: certExpiration,
    evaluationStatus: index % 10 === 0 ? 'Needs Follow-Up' : index % 7 === 0 ? 'Improving' : 'On Track',
    canBackfill: index % 5 !== 0,
  };
});

const occupancyNames = [
  'Lakewood Commerce Center', 'Canyon Ridge Apartments', 'West Metro Senior Living', 'Alameda Tech Campus', 'Morrison Event Hall',
  'Golden Logistics Depot', 'Wheat Ridge Medical Suites', 'Foothills Terrace Condos', 'South Metro Recreation Center', 'Clear Creek Brewery',
  'Horizon Retail Plaza', 'Ridgeview Assisted Living', 'Sunset Elementary', 'Ironworks Manufacturing', 'Pine Creek Storage',
  'West Metro Conference Center', 'Crestline High School', 'Summit View Condominiums', 'Silver Birch Daycare', 'Broadway Flats',
  'Maple Crossing Offices', 'Civic Library Annex', 'Foothills Ridge Resort', 'Pioneer Townhomes', 'Legacy Church Campus',
  'Red Rock Shopping Center', 'Northgate Gas & Convenience', 'Morrison Community Theater', 'Lakewood Veterinary Hospital', 'Golden Historic Hotel',
  'Quarry Business Park', 'West Metro Justice Center', 'Arbor View Towncenter', 'Crescent Warehouse', 'Peakside Senior Apartments',
  'Meadowbrook School District HQ', 'Station 4 Training Tower', 'Sunridge Office Park', 'Route 6 Truck Stop', 'Riverbend Event Pavilion',
];

const hydrantCoverage = Array.from({ length: 75 }, (_, index) => {
  const occupancy = index % 5 === 0 ? `OP-${String(index % 40 + 1).padStart(3, '0')}` : `OP-${String((index + 12) % 40 + 1).padStart(3, '0')}`;
  const outOfService = [6, 17, 28, 41, 57, 68].includes(index);
  return {
    id: `HYD-${String(index + 1).padStart(3, '0')}`,
    hydrantNumber: `H-${String(4200 + index)}`,
    address: `${100 + index} ${pick(['Main St', 'Harrison Ave', 'Alameda Ave', 'Kipling St', 'W 38th Ave', 'Canyon Rd'], index)}`,
    stationId: pick(stations, index).id,
    gisReady: index % 9 !== 0,
    flowGpm: 850 + (index % 10) * 55,
    lastFlowTest: iso(-14 - (index % 18)),
    maintenanceStatus: outOfService ? 'Overdue' : index % 7 === 0 ? 'Needs Flushing' : 'Healthy',
    status: outOfService ? 'Out of Service' : index % 7 === 0 ? 'Warning' : 'Healthy',
    riskLevel: outOfService ? 'High' : index % 4 === 0 ? 'Moderate' : 'Low',
    nearbyOccupancyIds: [occupancy, `OP-${String((index + 3) % 40 + 1).padStart(3, '0')}`],
  };
});

const preplans = occupancyNames.map((name, index) => {
  const occupancyId = `OP-${String(index + 1).padStart(3, '0')}`;
  const station = pick(stations, index);
  const hydrantsForArea = hydrantCoverage.filter((hydrant) => hydrant.stationId === station.id).slice(0, 3).map((hydrant) => hydrant.id);
  const riskScore = 52 + ((index * 7) % 42);
  return {
    id: `PP-${String(index + 1).padStart(3, '0')}`,
    occupancyId,
    occupancyName: name,
    address: `${1000 + index} ${pick(['W Alameda Ave', 'Kipling St', 'S Sheridan Blvd', 'Main St', 'Canyon Rd', 'Harrison Ave'], index)}`,
    city: station.city,
    stationId: station.id,
    stationName: station.name,
    occupancyType: pick(['Commercial', 'Multi-Family', 'Assisted Living', 'Retail', 'Industrial', 'Education', 'Assembly', 'Storage'], index),
    riskScore,
    riskLevel: riskScore >= 85 ? 'Critical' : riskScore >= 72 ? 'High' : riskScore >= 62 ? 'At Risk' : 'Healthy',
    hazards: pick([
      ['Cooking grease, single stairwell, roof access limited'],
      ['Deep storage, sprinkler impairement history, dock access'],
      ['Memory care wing, oxygen use, delayed notification concerns'],
      ['Lithium battery storage, mixed tenancy, high occupant load'],
      ['Combustible storage, alarm panel room, keybox required'],
      ['Assembly crowding, special event load, temporary fencing'],
    ], index),
    knoxBox: index % 3 !== 0,
    alarmPanel: index % 5 !== 0 ? 'AFA-9000' : 'AFA-7000',
    sprinkler: index % 4 === 0 ? 'Wet' : index % 6 === 0 ? 'Partial' : 'Present',
    fdc: index % 7 === 0 ? 'West side driveway' : 'Front setback',
    primaryContact: `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`,
    contactPhone: `303-555-${String(7000 + index).slice(-4)}`,
    contactEmail: `${occupancyId.toLowerCase()}@westmetro.example`,
    hydrantIds: hydrantsForArea,
    openViolations: index % 4 === 0 ? 3 : index % 3 === 0 ? 2 : 0,
    inspectionLink: `insp-${String(index + 1).padStart(3, '0')}`,
    permitIds: [`PR-${String(index % 35 + 1).padStart(3, '0')}`],
    preplanStatus: index % 8 === 0 ? 'Pending Review' : index % 6 === 0 ? 'Needs QA' : 'Reviewed',
    lastInspectionAt: iso(-20 - index),
    activeIncidentCount: index % 5,
    highRiskFlag: riskScore >= 72 || index % 4 === 0,
  };
});

const incidents = Array.from({ length: 60 }, (_, index) => {
  const occupancy = pick(preplans, index);
  const station = pick(stations, index + (index % 3));
  const isEms = index % 3 !== 0;
  const isStructure = index % 10 === 0;
  const type = isStructure ? 'Structure Fire' : isEms ? pick(['EMS - Cardiac', 'EMS - Fall Injury', 'Lift Assist', 'Chest Pain', 'Stroke Alert'], index) : pick(['Alarm Activation', 'Vehicle Collision', 'Smoke Investigation', 'Brush Fire', 'HazMat Assist'], index);
  const qaStatus = isStructure || index % 11 === 0 ? 'Needs QA' : index % 7 === 0 ? 'Pending Review' : 'Passed';
  const nerisStatus = isStructure || index % 11 === 0 ? 'Needs QA' : index % 5 === 0 ? 'Ready for Export' : index % 6 === 0 ? 'Failed Sync' : 'Ready for Export';
  const epcrStatus = isEms ? (index % 7 === 0 ? 'Failed Sync' : index % 4 === 0 ? 'Pending Review' : 'Synced') : 'Not Applicable';
  return {
    id: `INC-26-${String(index + 1).padStart(4, '0')}`,
    incidentNumber: `WM-2606-${String(1800 + index)}`,
    incidentType: type,
    category: isEms ? 'EMS' : 'Fire',
    stationId: station.id,
    stationName: station.name,
    battalion: station.battalion,
    location: occupancy.address,
    occupancyId: occupancy.occupancyId,
    occupancyName: occupancy.occupancyName,
    dispatchAt: iso(-index * 3),
    reportedAt: iso(-index * 3 - 0.2),
    closedAt: index % 6 === 0 ? iso(-index * 3 + 0.6) : null,
    priority: index % 10 === 0 ? 'High' : index % 4 === 0 ? 'Medium' : 'Normal',
    status: index % 10 === 0 ? 'Approved' : index % 4 === 0 ? 'Submitted' : index % 6 === 0 ? 'Closed' : 'QA Needed',
    qaStatus,
    nerisStatus,
    epcrStatus,
    responseMinutes: 4 + (index % 11),
    turnoutMinutes: 1 + (index % 4),
    units: isEms ? [pick(['Medic 1', 'Medic 2', 'Medic 4', 'Medic 6'], index), pick(['Engine 1', 'Engine 2', 'Engine 4', 'Truck 4'], index)] : [pick(['Engine 1', 'Engine 2', 'Engine 4', 'Brush 5'], index), pick(['Truck 4', 'Rescue 6', 'Medic 2', 'Medic 4'], index)],
    crewIds: [pick(staff, index).id, pick(staff, index + 4).id, pick(staff, index + 8).id],
    leadOfficer: pick(staff, index).name,
    trainingRecommendation: isStructure ? 'Ladder operations refresher' : isEms ? 'CPR/BLS refresh' : 'Incident command refresher',
    correctiveAction: qaStatus === 'Needs QA' ? 'Supervisor review required before export' : 'No action required',
    kpiImpact: isStructure ? ['Response Time', 'NERIS Export', 'Training Compliance'] : isEms ? ['ePCR Sync', 'HIPAA QA', 'Training Compliance'] : ['RMS Quality'],
    relatedPropertyId: occupancy.occupancyId,
    highRiskOccupancy: occupancy.highRiskFlag,
  };
});

const nerisValidation = incidents.map((incident, index) => ({
  id: `NERIS-${String(index + 1).padStart(3, '0')}`,
  incidentId: incident.id,
  validationStatus: incident.nerisStatus,
  qaStatus: incident.qaStatus,
  exportStatus: incident.nerisStatus === 'Ready for Export' ? 'Ready for Export' : incident.nerisStatus === 'Failed Sync' ? 'Failed Sync' : 'Pending Review',
  errors: incident.nerisStatus === 'Needs QA' ? ['Missing apparatus arrival time', 'Narrative requires location cleanup'] : incident.nerisStatus === 'Failed Sync' ? ['Validation timeout against NERIS schema'] : [],
  missingFields: incident.nerisStatus === 'Needs QA' ? ['Arrival time'] : [],
  exportBatch: `Batch-${String(1 + (index % 6)).padStart(2, '0')}`,
  qaOwner: pick(staff, index + 3).name,
  recommendedTraining: incident.trainingRecommendation,
  correctiveAction: incident.correctiveAction,
  linkedStationId: incident.stationId,
  incidentType: incident.incidentType,
  priority: incident.priority,
}));

const epcrSync = incidents
  .filter((incident) => incident.category === 'EMS')
  .slice(0, 30)
  .map((incident, index) => ({
    id: `EPCR-${String(index + 1).padStart(3, '0')}`,
    incidentId: incident.id,
    vendor: pick(['ESO', 'ImageTrend', 'TBD ePCR Connector', 'eBridge', 'Zoll Data'], index),
    syncStatus: incident.epcrStatus,
    hipaaPosture: index % 7 === 0 ? 'At Risk' : index % 5 === 0 ? 'Pending Review' : 'Healthy',
    qaStatus: incident.qaStatus,
    lastSyncAt: iso(-index),
    syncLatencySeconds: 20 + (index % 19) * 3,
    documentationComplete: incident.qaStatus !== 'Needs QA',
    errors: incident.epcrStatus === 'Failed Sync' ? ['Patient signature missing', 'Demographic mapping mismatch'] : [],
    patientCareTypes: pick([['Cardiac', 'Pain'], ['Fall', 'Lift Assist'], ['Stroke'], ['Respiratory'], ['Trauma']], index),
    linkedStaffIds: incident.crewIds,
  }));

const training = Array.from({ length: 50 }, (_, index) => {
  const staffMember = pick(staff, index);
  const course = pick(['CPR/BLS Renewal', 'Ladder Operations Refresher', 'EMS Documentation QA', 'HazMat Operations', 'Driver Operator', 'Inspector I', 'SCBA Annual', 'ICS 300'], index);
  const dueInDays = index % 9 === 0 ? -5 : index % 6 === 0 ? 12 : index % 4 === 0 ? 28 : 60 + index;
  return {
    id: `TRN-${String(index + 1).padStart(3, '0')}`,
    staffId: staffMember.id,
    staffName: staffMember.name,
    course,
    category: course.includes('EMS') || course.includes('CPR') ? 'EMS' : course.includes('Inspector') ? 'Prevention' : 'Operations',
    status: dueInDays < 0 ? 'Overdue' : dueInDays <= 30 ? 'Due Soon' : index % 7 === 0 ? 'Completed' : 'Assigned',
    dueDate: iso(dueInDays),
    assignedAt: iso(-14 - index),
    completionDate: dueInDays < 0 ? null : index % 7 === 0 ? iso(-2 - index % 4) : null,
    completionPct: dueInDays < 0 ? 0 : index % 7 === 0 ? 100 : 62 + (index % 35),
    source: index % 3 === 0 ? 'Incident QA' : index % 4 === 0 ? 'Certification Cycle' : 'Supervisor Assignment',
    relatedIncidentId: pick(incidents, index).id,
    actionLabel: dueInDays < 0 ? 'Assign Training' : dueInDays <= 30 ? 'Review' : 'Track',
    supervisorAlert: dueInDays <= 30 || staffMember.certExpiringDays <= 30,
  };
});

const appraisals = Array.from({ length: 30 }, (_, index) => {
  const staffMember = pick(staff, index);
  return {
    id: `APR-${String(index + 1).padStart(3, '0')}`,
    staffId: staffMember.id,
    staffName: staffMember.name,
    period: index % 2 === 0 ? '2026 Q1' : '2025 Annual',
    status: index % 8 === 0 ? 'Needs Follow-Up' : index % 6 === 0 ? 'Completed' : 'In Review',
    rating: index % 8 === 0 ? 2 : index % 5 === 0 ? 5 : 4,
    improvementPlan: index % 8 === 0 ? 'Ladder operations and documentation accuracy' : 'Continue current development plan',
    linkedTrainingIds: [pick(training, index).id, pick(training, index + 3).id],
    supervisor: staffMember.supervisor,
    actionRequired: index % 8 === 0 ? 'Schedule coaching and assign refresher' : 'No immediate action',
  };
});

const kpis = [
  { id: 'kpi-neris-ready', label: 'NERIS readiness %', value: 91, target: 95, trend: '+3%', status: 'Warning', module: 'RMS / NERIS', description: 'Validated incidents ready for export.' },
  { id: 'kpi-staffing-gaps', label: 'Staffing gaps', value: 4, target: 0, trend: '+1', status: 'At Risk', module: 'Fire & EMS', description: 'Unfilled or backfill-driven gaps on active shifts.' },
  { id: 'kpi-training', label: 'Training compliance %', value: 93, target: 95, trend: '+2%', status: 'Warning', module: 'Learning', description: 'Required training current within cycle.' },
  { id: 'kpi-assets', label: 'Asset readiness %', value: 94, target: 95, trend: '+1%', status: 'Healthy', module: 'Assets', description: 'Apparatus and critical equipment ready for service.' },
  { id: 'kpi-inspections', label: 'Inspection backlog', value: 14, target: 0, trend: '-3', status: 'Overdue', module: 'Prevention', description: 'Open inspections overdue for follow-up.' },
  { id: 'kpi-permits', label: 'Permit review queue', value: 9, target: 0, trend: '-1', status: 'Pending Review', module: 'Prevention', description: 'Permit applications awaiting approval or inspection.' },
  { id: 'kpi-risk-occupancies', label: 'High-risk occupancies', value: 11, target: 0, trend: '+2', status: 'At Risk', module: 'Prevention', description: 'Properties with open violations or high-risk profiles.' },
  { id: 'kpi-integrations', label: 'Integration health', value: 92, target: 95, trend: '+4%', status: 'Healthy', module: 'Platform', description: 'Healthy connectors across CAD, RMS, NERIS, ePCR, GIS, and SSO.' },
  { id: 'kpi-security', label: 'Security posture', value: 94, target: 95, trend: '+1%', status: 'Healthy', module: 'Platform Trust', description: 'Controls, MFA, backup, audit, and DR posture.' },
  { id: 'kpi-overtime-risk', label: 'Forecasted overtime risk', value: 68, target: 50, trend: '+8', status: 'Warning', module: 'Workforce', description: 'Projected overtime pressure for the next pay period.' },
  ...Array.from({ length: 15 }, (_, index) => ({
    id: `kpi-${index + 11}`,
    label: pick(['Response time', 'Unit utilization', 'Hydrant readiness', 'Preplan completion', 'Vendors on time', 'Inventory coverage', 'Mobile sync lag', 'Cycle completion', 'SLA adherence', 'Audit closure'], index),
    value: 70 + (index % 20),
    target: 90,
    trend: index % 2 === 0 ? '+1%' : '-1%',
    status: index % 4 === 0 ? 'Warning' : 'Healthy',
    module: pick(['Operations', 'Prevention', 'Platform', 'Learning'], index),
    description: 'Synthetic KPI for executive dashboard coverage.',
  })),
];

const assets = Array.from({ length: 90 }, (_, index) => {
  const station = pick(stations, index);
  const assetType = pick(['Engine', 'Medic', 'SCBA', 'Radio', 'AED', 'Thermal Camera', 'Hose', 'Ladder', 'Tablet', 'GPS Unit'], index);
  const readiness = 72 + ((index * 2) % 28);
  const maintenanceDue = index % 9 === 0 ? iso(-2) : index % 7 === 0 ? iso(5) : iso(18);
  return {
    id: `AS-${String(index + 1).padStart(3, '0')}`,
    name: `${assetType} ${index + 1}`,
    type: assetType,
    stationId: station.id,
    stationName: station.name,
    status: index % 9 === 0 ? 'At Risk' : index % 7 === 0 ? 'Warning' : 'Healthy',
    readiness,
    criticality: assetType === 'Engine' || assetType === 'Medic' || assetType === 'SCBA' ? 'Critical' : 'Standard',
    maintenanceDue,
    lastServiceAt: iso(-15 - (index % 20)),
    maintenanceNote: index % 9 === 0 ? 'Hydro test overdue' : index % 7 === 0 ? 'Due soon' : 'Current',
    riskLevel: index % 9 === 0 ? 'High' : index % 7 === 0 ? 'Moderate' : 'Low',
    assignedTo: station.name,
    linkedKpi: index % 9 === 0 ? 'kpi-assets' : null,
  };
});

const workOrders = Array.from({ length: 30 }, (_, index) => {
  const asset = pick(assets, index);
  return {
    id: `WO-${String(index + 1).padStart(3, '0')}`,
    assetId: asset.id,
    assetName: asset.name,
    title: index % 5 === 0 ? 'SCBA hydro test' : index % 4 === 0 ? 'Preventive maintenance' : 'Inspection and service',
    status: index % 8 === 0 ? 'Overdue' : index % 6 === 0 ? 'Scheduled' : index % 3 === 0 ? 'In Progress' : 'Pending Review',
    priority: index % 8 === 0 ? 'High' : index % 4 === 0 ? 'Medium' : 'Normal',
    dueDate: iso(index % 8 === 0 ? -4 : index % 6 === 0 ? 3 : 12),
    assignedTo: pick(staff, index).name,
    estimatedCost: 250 + (index % 9) * 175,
    riskImpact: index % 8 === 0 ? 'High' : index % 4 === 0 ? 'Moderate' : 'Low',
  };
});

const inventory = Array.from({ length: 100 }, (_, index) => {
  const station = pick(stations, index);
  const critical = index % 6 === 0;
  const onHand = critical ? 1 + (index % 2) : 12 + (index % 20);
  const reorderPoint = critical ? 4 : 10;
  return {
    id: `INV-${String(index + 1).padStart(3, '0')}`,
    itemName: pick(['Nitrile gloves', 'Oxygen cylinder', 'CPR electrodes', 'Bandage kit', 'Hose gasket', 'Radio battery', 'SCBA seal kit', 'Helmet shield', 'EMS airway kit', 'Printer toner'], index),
    category: critical ? 'EMS' : pick(['Fire', 'EMS', 'Office', 'PPE', 'Tools'], index),
    stationId: station.id,
    stationName: station.name,
    onHand,
    reorderPoint,
    unitCost: 8 + (index % 15) * 12,
    status: onHand <= reorderPoint ? 'Low Stock' : 'In Stock',
    lastCountedAt: iso(-1 - (index % 12)),
    requisitionId: onHand <= reorderPoint ? `REQ-${String(index % 12 + 1).padStart(3, '0')}` : null,
    critical,
    linkedAssetId: critical ? pick(assets, index).id : null,
  };
});

const inspections = Array.from({ length: 50 }, (_, index) => {
  const occupancy = pick(preplans, index);
  const inspector = pick(staff.filter((person) => person.rank.includes('Prevention') || person.rank.includes('Captain') || person.rank.includes('Battalion')), index);
  return {
    id: `INS-${String(index + 1).padStart(3, '0')}`,
    occupancyId: occupancy.occupancyId,
    occupancyName: occupancy.occupancyName,
    address: occupancy.address,
    stationId: occupancy.stationId,
    inspectorId: inspector.id,
    inspectorName: inspector.name,
    scheduledFor: iso(index % 4 === 0 ? -3 : index % 6 === 0 ? 2 : 9),
    dueDate: iso(index % 4 === 0 ? -1 : index % 6 === 0 ? 4 : 12),
    status: index % 4 === 0 ? 'Overdue' : index % 3 === 0 ? 'Scheduled' : index % 5 === 0 ? 'Pending Review' : 'Completed',
    riskLevel: occupancy.riskLevel,
    violationCount: occupancy.openViolations + (index % 3),
    reinspectionRequired: occupancy.openViolations > 0 || index % 6 === 0,
    permitDependency: occupancy.permitIds[0],
    preplanLinked: occupancy.id,
    result: index % 4 === 0 ? 'Open violations require follow-up' : 'Passed with notes',
    notes: index % 4 === 0 ? 'Owner follow-up required for alarms and egress.' : 'Good compliance posture.',
  };
});

const permits = Array.from({ length: 35 }, (_, index) => {
  const occupancy = pick(preplans, index);
  return {
    id: `PER-${String(index + 1).padStart(3, '0')}`,
    permitNumber: `FP-${2026}-${String(200 + index)}`,
    occupancyId: occupancy.occupancyId,
    occupancyName: occupancy.occupancyName,
    permitType: pick(['Special Event', 'Sprinkler', 'Fire Alarm', 'Hot Work', 'Fuel Tank', 'Tents / Canopies', 'Flammable Liquids'], index),
    feeStatus: index % 6 === 0 ? 'Due' : index % 5 === 0 ? 'Paid' : 'Waived',
    reviewStatus: index % 4 === 0 ? 'Pending Review' : index % 7 === 0 ? 'Approved' : index % 5 === 0 ? 'Needs QA' : 'Approved',
    inspectionDependency: index % 3 === 0 ? 'Required' : 'Optional',
    status: index % 4 === 0 ? 'Pending Review' : index % 7 === 0 ? 'Approved' : 'Submitted',
    submittedAt: iso(-12 - index),
    expiresAt: iso(30 + (index % 60)),
    linkedInspectionId: `INS-${String((index % 50) + 1).padStart(3, '0')}`,
    approvedBy: index % 7 === 0 ? pick(staff, index + 2).name : null,
    workflowStatus: index % 4 === 0 ? 'Awaiting Manager Approval' : 'Ready',
  };
});

const workflows = Array.from({ length: 30 }, (_, index) => {
  const source = pick(['Permit', 'Requisition', 'Training Assignment', 'Security Review', 'Inspection Follow-Up', 'Asset Maintenance'], index);
  const linkedEntityId = source === 'Permit'
    ? pick(permits, index).id
    : source === 'Requisition'
      ? `REQ-${String(index % 12 + 1).padStart(3, '0')}`
      : source === 'Training Assignment'
        ? pick(training, index).id
        : source === 'Security Review'
          ? `SEC-${String(index % 50 + 1).padStart(3, '0')}`
          : source === 'Inspection Follow-Up'
            ? pick(inspections, index).id
            : pick(workOrders, index).id;
  return {
    id: `WF-${String(index + 1).padStart(3, '0')}`,
    workflowType: source,
    title: `${source} approval cycle`,
    status: index % 8 === 0 ? 'Pending Review' : index % 7 === 0 ? 'Approved' : index % 5 === 0 ? 'Needs QA' : 'In Progress',
    owner: pick(staff, index + 1).name,
    approver: pick(staff, index + 5).name,
    sourceModule: source,
    dueDate: iso(index % 8 === 0 ? -2 : index % 6 === 0 ? 3 : 10),
    linkedEntityId,
    nextAction: index % 8 === 0 ? 'Review and approve' : 'Continue workflow',
  };
});

const integrations = [
  { id: 'INT-CAD', name: 'CAD', systemType: 'Computer Aided Dispatch', status: 'Healthy', syncStatus: 'Live', lastSyncAt: iso(-0.1), healthScore: 98, owner: 'Operations', dataDomains: ['Incidents', 'Units', 'Response Times'], authMethod: 'OAuth2', notes: 'Feeds incident and response dashboards.' },
  { id: 'INT-RMS', name: 'RMS', systemType: 'Records Management', status: 'Healthy', syncStatus: 'Live', lastSyncAt: iso(-0.2), healthScore: 96, owner: 'Records', dataDomains: ['Incidents', 'QA', 'Export'], authMethod: 'API Key', notes: 'Supports incident documentation and exports.' },
  { id: 'INT-NERIS', name: 'NERIS', systemType: 'National Emergency Response Info System', status: 'Warning', syncStatus: 'Batch Delay', lastSyncAt: iso(-1.4), healthScore: 84, owner: 'Records', dataDomains: ['Validation', 'Export'], authMethod: 'OAuth2', notes: 'Validation queue needs QA before export.' },
  { id: 'INT-EPCR', name: 'ePCR', systemType: 'Electronic Patient Care Report', status: 'Healthy', syncStatus: 'Live', lastSyncAt: iso(-0.3), healthScore: 91, owner: 'EMS', dataDomains: ['Patient Care', 'HIPAA QA'], authMethod: 'FHIR OAuth', notes: 'Documentation connector for EMS workflow.' },
  { id: 'INT-PAY', name: 'Payroll', systemType: 'Payroll / Timekeeping', status: 'Healthy', syncStatus: 'Nightly', lastSyncAt: iso(-0.5), healthScore: 93, owner: 'HR / Finance', dataDomains: ['OT', 'Attendance', 'Shift Premiums'], authMethod: 'SFTP + token', notes: 'Supports forecasted overtime and payroll export.' },
  { id: 'INT-HRIS', name: 'HRIS', systemType: 'Human Resources', status: 'Healthy', syncStatus: 'Nightly', lastSyncAt: iso(-0.6), healthScore: 94, owner: 'HR', dataDomains: ['Staff', 'Positions', 'Vacancies'], authMethod: 'SCIM', notes: 'Feeds staff records and vacancies.' },
  { id: 'INT-GIS', name: 'GIS / ESRI', systemType: 'GIS / Mapping', status: 'Healthy', syncStatus: 'Live', lastSyncAt: iso(-0.1), healthScore: 95, owner: 'Prevention', dataDomains: ['Hydrants', 'Occupancies', 'Response Areas'], authMethod: 'SAML / OAuth2', notes: 'Maps hydrants and high-risk occupancies.' },
  { id: 'INT-SSO', name: 'SSO / MFA', systemType: 'Identity Provider', status: 'Healthy', syncStatus: 'Live', lastSyncAt: iso(-0.1), healthScore: 99, owner: 'IT', dataDomains: ['Users', 'MFA', 'Roles'], authMethod: 'SAML + OIDC', notes: 'Identity and access backbone.' },
  { id: 'INT-SMS', name: 'Email / SMS', systemType: 'Notification Services', status: 'Healthy', syncStatus: 'Live', lastSyncAt: iso(-0.2), healthScore: 90, owner: 'Operations', dataDomains: ['Notifications', 'Approvals'], authMethod: 'SMTP + SMS API', notes: 'Supports alerting and assignment reminders.' },
  { id: 'INT-FIN', name: 'Finance', systemType: 'Budget / AP', status: 'Warning', syncStatus: 'Queued', lastSyncAt: iso(-2.2), healthScore: 78, owner: 'Finance', dataDomains: ['Budget', 'Purchases', 'Requisitions'], authMethod: 'SFTP', notes: 'Pending approvals create delay.' },
  { id: 'INT-WH', name: 'Data Warehouse', systemType: 'Warehouse / BI', status: 'Healthy', syncStatus: 'Live', lastSyncAt: iso(-0.15), healthScore: 97, owner: 'Analytics', dataDomains: ['KPIs', 'Reports', 'History'], authMethod: 'API / ETL', notes: 'Used by report builder and executive dashboards.' },
  { id: 'INT-VEND', name: 'Vendor Console', systemType: 'External Vendor Portal', status: 'Warning', syncStatus: 'Pending Configuration', lastSyncAt: iso(-3.1), healthScore: 70, owner: 'Logistics', dataDomains: ['Orders', 'Assets'], authMethod: 'SSO', notes: 'Awaiting vendor-side SSO configuration.' },
];

const securityEvents = Array.from({ length: 50 }, (_, index) => ({
  id: `SEC-${String(index + 1).padStart(3, '0')}`,
  createdAt: iso(-index * 0.6),
  module: index % 7 === 0 ? 'Security' : index % 5 === 0 ? 'Admin' : index % 4 === 0 ? 'Integration' : 'Audit',
  action: pick(['MFA enrolled', 'Access review opened', 'Failed login attempt', 'Role updated', 'Backup verification completed', 'Export approved', 'Sensitive record viewed', 'Session revoked', 'Vulnerability scan completed', 'DR drill simulated'], index),
  severity: index % 8 === 0 ? 'High' : index % 5 === 0 ? 'Warning' : 'Info',
  status: index % 8 === 0 ? 'Investigating' : index % 5 === 0 ? 'Resolved' : 'Reviewed',
  user: pick(staff, index).name,
  relatedEntity: pick(['Incident export', 'ePCR access', 'Role matrix', 'SAML config', 'Backup policy', 'Hydrant map', 'Permit review', 'Inspection record'], index),
  complianceTag: pick(['NIST CSF', 'CJIS', 'HIPAA', 'VPAT', 'Encryption', 'DR', 'RBAC'], index),
  description: `${pick(['Audit trail captured', 'Event recorded', 'Policy check logged', 'Control verified'], index)} for ${pick(['operational', 'administrative', 'security', 'platform'], index)} activity.`,
}));

const auditLog = [
  {
    id: 'AUD-001',
    createdAt: iso(-0.1),
    module: 'Security',
    action: 'MFA enabled',
    severity: 'Info',
    status: 'Reviewed',
    user: 'Demo User',
    relatedEntity: 'Identity provider',
    complianceTag: 'NIST CSF',
    description: 'Multi-factor authentication is enabled for all demo users.',
  },
  {
    id: 'AUD-002',
    createdAt: iso(-0.2),
    module: 'Support',
    action: 'Backup verified',
    severity: 'Info',
    status: 'Reviewed',
    user: 'Demo User',
    relatedEntity: 'Backup snapshot',
    complianceTag: 'DR',
    description: 'Nightly backup completed and restore point validated.',
  },
  {
    id: 'AUD-003',
    createdAt: iso(-0.3),
    module: 'Security',
    action: 'Medium vulnerability triaged',
    severity: 'Warning',
    status: 'Investigating',
    user: 'Demo User',
    relatedEntity: 'Vulnerability scan',
    complianceTag: 'CJIS',
    description: 'One medium-severity issue is open for remediation scheduling.',
  },
  {
    id: 'AUD-004',
    createdAt: iso(-0.4),
    module: 'Reporting',
    action: 'Data export prepared',
    severity: 'Info',
    status: 'Reviewed',
    user: 'Demo User',
    relatedEntity: 'CSV export',
    complianceTag: 'HIPAA',
    description: 'A mock export package is available for download and archival.',
  },
  {
    id: 'AUD-005',
    createdAt: iso(-0.5),
    module: 'Platform',
    action: 'GIS warning logged',
    severity: 'Warning',
    status: 'Reviewed',
    user: 'Demo User',
    relatedEntity: 'GIS connector',
    complianceTag: 'Operations',
    description: 'GIS connector warning captured for scenario walkthrough.',
  },
  ...securityEvents.slice(0, 45).map((event, index) => ({
    id: `AUD-${String(index + 6).padStart(3, '0')}`,
    createdAt: event.createdAt,
    module: event.module,
    action: event.action,
    severity: event.severity,
    status: event.status,
    user: event.user,
    relatedEntity: event.relatedEntity,
    complianceTag: event.complianceTag,
    description: event.description,
  })),
];

const reports = Array.from({ length: 20 }, (_, index) => {
  const module = pick(['RMS / NERIS', 'Training', 'Staffing', 'Prevention', 'Assets', 'Integration', 'Security'], index);
  return {
    id: `RPT-${String(index + 1).padStart(3, '0')}`,
    name: `${module} ${pick(['Executive Summary', 'KPI Snapshot', 'Compliance Detail', 'Trend Pack', 'Exception Report'], index)}`,
    module,
    status: index % 6 === 0 ? 'Scheduled' : index % 5 === 0 ? 'Running' : 'Ready',
    schedule: index % 6 === 0 ? 'Weekly Monday 07:00' : index % 4 === 0 ? 'Daily 06:00' : 'On demand',
    lastRun: iso(-index - 1),
    nextRun: iso(index % 6 === 0 ? 2 : index % 4 === 0 ? 1 : 5),
    owner: pick(staff, index + 2).name,
    delivery: index % 3 === 0 ? 'Email' : index % 4 === 0 ? 'SFTP' : 'Download',
    filters: ['District', 'Station', 'Date range'],
    exportFormats: ['PDF', 'XLSX', 'CSV'],
    rowsIncluded: 120 + index * 3,
    isFavorite: index % 4 === 0,
  };
});

const notifications = Array.from({ length: 40 }, (_, index) => ({
  id: `NOT-${String(index + 1).padStart(3, '0')}`,
  createdAt: iso(-index * 0.3),
  type: pick(['Training', 'Staffing', 'Prevention', 'Integration', 'Security', 'Asset', 'Incident', 'Permit'], index),
  title: pick([
    'CPR/BLS expiring within 30 days',
    'Overtime forecast increased',
    'High-risk occupancy needs reinspection',
    'NERIS validation ready for QA',
    'Hydrant out of service within response area',
    'SCBA hydro test overdue',
    'Permit pending fee confirmation',
    'Security audit event requires review',
  ], index),
  message: pick([
    'Supervisor action is recommended today.',
    'Cross-module impact has been linked.',
    'This record appears in the executive dashboard.',
    'The workflow is waiting for approval.',
  ], index),
  status: index % 5 === 0 ? 'Unread' : 'Read',
  priority: index % 7 === 0 ? 'High' : 'Normal',
  relatedRoute: pick(['/rms-neris', '/epcr-readiness', '/prevention-inspections', '/permits', '/preplans', '/hydrants-gis', '/mobile-field-mode', '/integration-hub', '/security-compliance', '/continuity-center'], index),
  actionLabel: pick(['Review', 'Approve', 'Schedule', 'Assign', 'Open'], index),
}));

const forecasting = Array.from({ length: 20 }, (_, index) => ({
  id: `FRC-${String(index + 1).padStart(3, '0')}`,
  category: pick(['Overtime', 'Vacancy', 'Asset', 'Inventory', 'Prevention', 'Hydrant', 'Budget'], index),
  title: pick([
    'Paramedic vacancy likely to drive overtime',
    'SCBA replacement budget at risk',
    'Inventory burn rate increasing in EMS supply',
    'Inspection backlog will affect next quarter',
    'Hydrant maintenance request should be prioritized',
    'Additional prevention coverage recommended',
  ], index),
  status: index % 5 === 0 ? 'Warning' : 'Healthy',
  impact: pick(['Cost increase', 'Readiness drop', 'Response delay', 'Compliance risk', 'Workload increase'], index),
  confidence: 78 + (index % 20),
  linkedStaffIds: [pick(staff, index).id, pick(staff, index + 1).id],
  linkedAssetIds: [pick(assets, index).id],
  linkedInventoryIds: [pick(inventory, index).id],
  dueDate: iso(index % 5 === 0 ? 7 : 14),
}));

const requisitions = Array.from({ length: 12 }, (_, index) => ({
  id: `REQ-${String(index + 1).padStart(3, '0')}`,
  type: index % 3 === 0 ? 'Staff' : index % 3 === 1 ? 'Inventory' : 'Budget',
  title: index % 3 === 0 ? 'Paramedic backfill request' : index % 3 === 1 ? 'Low EMS inventory replenishment' : 'SCBA replacement funding',
  status: index % 4 === 0 ? 'Pending Review' : index % 4 === 1 ? 'Approved' : index % 4 === 2 ? 'Queued' : 'Draft',
  priority: index % 4 === 0 ? 'High' : 'Normal',
  requestedBy: pick(staff, index).name,
  approver: pick(staff, index + 5).name,
  reason: index % 3 === 0 ? 'Open shift gap in Station 4 and overtime forecast increase.' : index % 3 === 1 ? 'EMS supply below reorder point across three stations.' : 'Hydro test and replacement cycle due this quarter.',
  linkedForecastId: `FRC-${String(index % 20 + 1).padStart(3, '0')}`,
  cost: 500 + index * 125,
}));

function patchRecord<T extends { id: string }>(collection: T[], recordId: string, updates: Partial<T>) {
  const target = collection.find((item) => item.id === recordId);
  if (target) Object.assign(target, updates);
}

function applyScenarioFixtures() {
  patchRecord(stations, 'ST-02', {
    readiness: 82,
    staffingGap: 2,
    apparatusReady: 86,
    inspectionBacklog: 9,
    status: 'At Risk',
    vacancies: ['Paramedic', 'Paramedic'],
    overtimeTrend: '18% above budget',
  } as any);

  patchRecord(forecasting, 'FRC-001', {
    category: 'Overtime',
    title: 'Station 2 paramedic vacancies are driving overtime',
    status: 'Warning',
    impact: 'Cost increase',
    confidence: 92,
    linkedStaffIds: ['SF-002', 'SF-012'],
    dueDate: iso(7),
  } as any);

  patchRecord(forecasting, 'FRC-002', {
    category: 'Overtime',
    title: 'Overtime forecast confirms two paramedic requisitions needed',
    status: 'Warning',
    impact: 'Workload increase',
    confidence: 88,
    linkedStaffIds: ['SF-002', 'SF-012'],
    dueDate: iso(10),
  } as any);

  patchRecord(requisitions, 'REQ-001', {
    type: 'Staff',
    title: 'Paramedic backfill request — Station 2',
    status: 'Pending Review',
    priority: 'High',
    reason: 'Two paramedic vacancies and 18% overtime pressure.',
    linkedForecastId: 'FRC-001',
    approver: 'Deputy Chief',
  } as any);

  patchRecord(requisitions, 'REQ-002', {
    type: 'Staff',
    title: 'Paramedic backfill request — Station 2 relief coverage',
    status: 'Pending Review',
    priority: 'High',
    reason: 'Second backfill needed to stabilize Station 2 coverage.',
    linkedForecastId: 'FRC-002',
    approver: 'Deputy Chief',
  } as any);

  patchRecord(training, 'TRN-001', {
    course: 'CPR/BLS Renewal',
    status: 'Due Soon',
    dueDate: iso(12),
    completionPct: 15,
    source: 'Certification Cycle',
  } as any);
  patchRecord(training, 'TRN-010', {
    course: 'Ladder Operations Refresher',
    status: 'Assigned',
    dueDate: iso(14),
    completionPct: 0,
    source: 'Incident QA',
  } as any);

  patchRecord(staff, 'SF-003', { certExpiringDays: 14, status: 'Active' } as any);
  patchRecord(staff, 'SF-009', { certExpiringDays: 21, status: 'Active' } as any);
  patchRecord(staff, 'SF-015', { certExpiringDays: 27, status: 'Active' } as any);

  patchRecord(appraisals, 'APR-001', {
    status: 'Needs Follow-Up',
    rating: 2,
    improvementPlan: 'Ladder operations refresher and documentation coaching',
    actionRequired: 'Schedule coaching and assign refresher',
    linkedTrainingIds: ['TRN-010'],
  } as any);
  patchRecord(appraisals, 'APR-002', {
    status: 'Needs Follow-Up',
    rating: 2,
    improvementPlan: 'Ladder placement and ventilation timing review',
    actionRequired: 'Supervisor review and remediation plan',
    linkedTrainingIds: ['TRN-010'],
  } as any);

  patchRecord(assets, 'AS-012', {
    name: 'Engine 12',
    type: 'Engine',
    stationId: 'ST-04',
    stationName: 'Station 4',
    status: 'At Risk',
    readiness: 63,
    maintenanceDue: iso(-1),
    lastServiceAt: iso(-28),
    maintenanceNote: 'Preventive maintenance overdue',
    riskLevel: 'High',
    assignedTo: 'Station 4',
  } as any);
  patchRecord(assets, 'AS-021', {
    name: 'SCBA Cylinder Bank 1',
    type: 'SCBA',
    stationId: 'ST-04',
    stationName: 'Station 4',
    status: 'At Risk',
    readiness: 58,
    maintenanceDue: iso(-3),
    lastServiceAt: iso(-40),
    maintenanceNote: 'Hydro test overdue',
    riskLevel: 'High',
    assignedTo: 'Station 4',
  } as any);

  patchRecord(workOrders, 'WO-001', {
    assetId: 'AS-012',
    assetName: 'Engine 12',
    title: 'Engine 12 preventive maintenance',
    status: 'Overdue',
    priority: 'High',
    dueDate: iso(-2),
    assignedTo: pick(staff, 4).name,
    riskImpact: 'High',
  } as any);
  patchRecord(workOrders, 'WO-002', {
    assetId: 'AS-021',
    assetName: 'SCBA Cylinder Bank 1',
    title: 'SCBA hydro test and inspection',
    status: 'Scheduled',
    priority: 'High',
    dueDate: iso(2),
    assignedTo: pick(staff, 5).name,
    riskImpact: 'High',
  } as any);

  patchRecord(inventory, 'INV-001', {
    itemName: 'Oxygen cylinder',
    stationId: 'ST-04',
    stationName: 'Station 4',
    onHand: 2,
    reorderPoint: 6,
    status: 'Low Stock',
    critical: true,
    requisitionId: 'REQ-004',
  } as any);
  patchRecord(inventory, 'INV-014', {
    itemName: 'CPR electrodes',
    stationId: 'ST-04',
    stationName: 'Station 4',
    onHand: 1,
    reorderPoint: 5,
    status: 'Low Stock',
    critical: true,
    requisitionId: 'REQ-004',
  } as any);

  patchRecord(requisitions, 'REQ-004', {
    type: 'Inventory',
    title: 'EMS supplies reorder — Station 4',
    status: 'Pending Review',
    priority: 'High',
    reason: 'Oxygen cylinders and CPR electrodes below reorder threshold.',
    linkedForecastId: 'FRC-004',
    approver: 'Logistics Chief',
  } as any);
  patchRecord(forecasting, 'FRC-004', {
    category: 'Inventory',
    title: 'EMS inventory burn rate shows 9 days remaining',
    status: 'Warning',
    impact: 'Readiness drop',
    confidence: 90,
    linkedInventoryIds: ['INV-001', 'INV-014'],
    dueDate: iso(5),
  } as any);

  patchRecord(preplans, 'PP-012', {
    occupancyName: 'Ridgeview Senior Living',
    address: '1284 Ridgeview Lane',
    riskScore: 94,
    riskLevel: 'Critical',
    hazards: ['Memory care wing, delayed notification, oxygen use, limited egress'],
    knoxBox: true,
    alarmPanel: 'AFA-9900',
    sprinkler: 'Wet',
    fdc: 'North side courtyard',
    primaryContact: 'Dana Morgan',
    contactPhone: '303-555-7812',
    contactEmail: 'ridgeview.senior@westmetro.example',
    openViolations: 3,
    preplanStatus: 'Needs QA',
    lastInspectionAt: iso(-18),
    highRiskFlag: true,
    hydrantIds: ['HYD-017'],
  } as any);

  patchRecord(inspections, 'INS-012', {
    occupancyId: 'PP-012',
    occupancyName: 'Ridgeview Senior Living',
    status: 'Overdue',
    riskLevel: 'Critical',
    violationCount: 4,
    reinspectionRequired: true,
    result: 'Reinspection overdue',
    notes: 'Open violations and overdue corrective action for assisted living occupancy.',
    dueDate: iso(-3),
    scheduledFor: iso(-10),
  } as any);

  patchRecord(permits, 'PER-012', {
    occupancyId: 'PP-012',
    occupancyName: 'Ridgeview Senior Living',
    permitType: 'Fire Alarm',
    feeStatus: 'Due',
    reviewStatus: 'Pending Review',
    inspectionDependency: 'Required',
    status: 'Pending Review',
    workflowStatus: 'Awaiting Manager Approval',
  } as any);

  patchRecord(hydrantCoverage, 'HYD-017', {
    gisReady: false,
    maintenanceStatus: 'Overdue',
    status: 'Out of Service',
    riskLevel: 'High',
    nearbyOccupancyIds: ['PP-012', 'PP-009'],
    lastFlowTest: iso(-25),
  } as any);

  patchRecord(incidents, 'INC-26-0001', {
    incidentType: 'Structure Fire - Delayed Ventilation',
    category: 'Fire',
    stationId: 'ST-01',
    stationName: 'Station 1',
    occupancyId: 'PP-012',
    occupancyName: 'Ridgeview Senior Living',
    qaStatus: 'Needs QA',
    nerisStatus: 'Needs QA',
    epcrStatus: 'Not Applicable',
    responseMinutes: 9,
    trainingRecommendation: 'Ladder operations and ventilation refresher',
    correctiveAction: 'Supervisor review required before export',
    status: 'QA Needed',
    units: ['Engine 1', 'Truck 4'],
    crewIds: ['SF-001', 'SF-004', 'SF-008'],
    leadOfficer: pick(staff, 0).name,
    kpiImpact: ['Response Time', 'NERIS Export', 'Training Compliance'],
    highRiskOccupancy: true,
  } as any);

  patchRecord(nerisValidation, 'NERIS-001', {
    validationStatus: 'Needs QA',
    qaStatus: 'Needs QA',
    exportStatus: 'Pending Review',
    errors: ['Missing ventilation performed time', 'Arrival time not validated'],
    missingFields: ['Ventilation performed time', 'Arrival time'],
    qaOwner: 'Capt. Maria Chen',
    recommendedTraining: 'Ladder operations and ventilation refresher',
    correctiveAction: 'Supervisor review required before export',
  } as any);

  patchRecord(epcrSync, 'EPCR-001', {
    syncStatus: 'Synced',
    hipaaPosture: 'Healthy',
    qaStatus: 'Reviewed',
    lastSyncAt: iso(-0.1),
  } as any);

  patchRecord(integrations, 'INT-GIS', {
    status: 'Warning',
    syncStatus: 'Delayed',
    lastSyncAt: iso(-2.1),
    healthScore: 81,
    notes: 'GIS connector warning — map layers pending refresh.',
  } as any);
  patchRecord(integrations, 'INT-PAY', {
    status: 'Warning',
    syncStatus: 'Failed Sync',
    lastSyncAt: iso(-1.8),
    healthScore: 72,
    notes: 'Payroll export failed because overtime code mapping did not resolve.',
  } as any);

  patchRecord(kpis, 'kpi-neris-ready', { value: 88, target: 95, trend: '-3%', status: 'Warning' } as any);
  patchRecord(kpis, 'kpi-staffing-gaps', { value: 2, target: 0, trend: '+2', status: 'At Risk' } as any);
  patchRecord(kpis, 'kpi-training', { value: 89, target: 95, trend: '-2%', status: 'Warning' } as any);
  patchRecord(kpis, 'kpi-assets', { value: 86, target: 95, trend: '-4%', status: 'At Risk' } as any);
  patchRecord(kpis, 'kpi-inspections', { value: 18, target: 0, trend: '+5', status: 'Overdue' } as any);
  patchRecord(kpis, 'kpi-permits', { value: 11, target: 0, trend: '+2', status: 'Pending Review' } as any);
  patchRecord(kpis, 'kpi-risk-occupancies', { value: 14, target: 0, trend: '+3', status: 'At Risk' } as any);
  patchRecord(kpis, 'kpi-integrations', { value: 89, target: 95, trend: '-1%', status: 'Warning' } as any);
  patchRecord(kpis, 'kpi-security', { value: 97, target: 95, trend: '+1%', status: 'Healthy' } as any);
  patchRecord(kpis, 'kpi-overtime-risk', { value: 82, target: 50, trend: '+18', status: 'Warning' } as any);

  patchRecord(notifications, 'NOT-001', {
    title: 'CPR certifications expiring within 30 days',
    message: 'Three personnel need CPR/BLS assignment and supervisor follow-up.',
    priority: 'High',
    actionLabel: 'Assign Training',
  } as any);
  patchRecord(notifications, 'NOT-002', {
    title: 'Ladder operations evaluation needs review',
    message: 'Two evaluations indicate refresher training is required.',
    priority: 'High',
    actionLabel: 'Review',
  } as any);

  patchRecord(reports, 'RPT-001', {
    status: 'Ready',
    schedule: 'Daily 06:00',
    delivery: 'Download',
    rowsIncluded: 180,
  } as any);

  patchRecord(auditLog as any, 'AUD-003', {
    description: 'Medium vulnerability opened for remediation scheduling in Trust Center.',
  } as any);
}

applyScenarioFixtures();

export {
  stations as demoStations,
  staff as demoStaff,
  incidents as demoIncidents,
  nerisValidation as demoNeris,
  epcrSync as demoEpcr,
  training as demoTraining,
  appraisals as demoAppraisals,
  kpis as demoKpis,
  assets as demoAssets,
  workOrders as demoWorkOrders,
  inventory as demoInventory,
  inspections as demoInspections,
  permits as demoPermits,
  preplans as demoPreplans,
  preplans as demoOccupancies,
  hydrantCoverage as demoHydrants,
  workflows as demoWorkflows,
  integrations as demoIntegrations,
  securityEvents as demoSecurity,
  auditLog as demoAuditLog,
  reports as demoReports,
  notifications as demoNotifications,
  forecasting as demoForecasting,
  requisitions as demoRequisitions,
};
