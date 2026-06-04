import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const now = Date.now();
const iso = (daysFromNow: number) => new Date(now + daysFromNow * 86400000);
const past = (daysAgo: number) => new Date(now - daysAgo * 86400000);

const permissionGroups = [
  'core.view',
  'dashboard.view',
  'personnel.view',
  'personnel.manage',
  'staffing.view',
  'staffing.manage',
  'training.view',
  'training.manage',
  'incidents.view',
  'incidents.manage',
  'incidents.qa',
  'neris.export',
  'epcr.view',
  'assets.view',
  'assets.manage',
  'prevention.view',
  'prevention.manage',
  'analytics.view',
  'analytics.export',
  'integrations.view',
  'integrations.manage',
  'admin.users',
  'admin.roles',
  'admin.audit',
  'support.view',
  'support.manage',
  'ai.view',
  'ai.manage',
];

const roleDefinitions = [
  ['Firefighter', ['core.view', 'dashboard.view', 'personnel.view', 'staffing.view', 'training.view', 'incidents.view', 'assets.view', 'prevention.view']],
  ['Company Officer', ['core.view', 'dashboard.view', 'personnel.view', 'staffing.view', 'staffing.manage', 'training.view', 'training.manage', 'incidents.view', 'incidents.manage', 'assets.view', 'prevention.view']],
  ['Battalion Chief', ['core.view', 'dashboard.view', 'personnel.view', 'personnel.manage', 'staffing.view', 'staffing.manage', 'training.view', 'training.manage', 'incidents.view', 'incidents.manage', 'incidents.qa', 'neris.export', 'epcr.view', 'assets.view', 'assets.manage', 'prevention.view', 'analytics.view', 'analytics.export']],
  ['Training Admin', ['core.view', 'dashboard.view', 'personnel.view', 'training.view', 'training.manage', 'analytics.view', 'analytics.export']],
  ['Prevention Officer', ['core.view', 'dashboard.view', 'prevention.view', 'prevention.manage', 'analytics.view']],
  ['Logistics Manager', ['core.view', 'dashboard.view', 'assets.view', 'assets.manage', 'analytics.view']],
  ['District Admin', permissionGroups],
  ['System Admin', ['core.view', 'dashboard.view', 'integrations.view', 'integrations.manage', 'admin.users', 'admin.roles', 'admin.audit', 'support.view', 'support.manage', 'ai.view', 'ai.manage']],
  ['Read-Only Auditor', ['core.view', 'dashboard.view', 'personnel.view', 'staffing.view', 'training.view', 'incidents.view', 'assets.view', 'prevention.view', 'analytics.view', 'integrations.view', 'admin.audit', 'support.view', 'ai.view']],
] as const;

async function main() {
  await prisma.$transaction([
    prisma.escalationLog.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.slaPolicy.deleteMany(),
    prisma.knowledgeBaseArticle.deleteMany(),
    prisma.systemStatusEvent.deleteMany(),
    prisma.reportDefinition.deleteMany(),
    prisma.savedReport.deleteMany(),
    prisma.reportExport.deleteMany(),
    prisma.aiInsightAction.deleteMany(),
    prisma.aiInsight.deleteMany(),
    prisma.aiQuestionLog.deleteMany(),
    prisma.integrationLog.deleteMany(),
    prisma.fieldMapping.deleteMany(),
    prisma.apiEndpointExample.deleteMany(),
    prisma.integrationSystem.deleteMany(),
    prisma.nerisMapping.deleteMany(),
    prisma.cadImportLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.personnelAssignment.deleteMany(),
    prisma.personnelCertification.deleteMany(),
    prisma.personnelDocument.deleteMany(),
    prisma.personnelPerformanceReview.deleteMany(),
    prisma.personnelGoal.deleteMany(),
    prisma.personnel.deleteMany(),
    prisma.rank.deleteMany(),
    prisma.station.deleteMany(),
    prisma.battalion.deleteMany(),
    prisma.shiftPlatoon.deleteMany(),
    prisma.departmentUnit.deleteMany(),
    prisma.certification.deleteMany(),
    prisma.apparatus.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.inventoryTransaction.deleteMany(),
    prisma.inventoryItem.deleteMany(),
    prisma.maintenanceEvent.deleteMany(),
    prisma.preventiveMaintenanceSchedule.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.property.deleteMany(),
    prisma.occupancy.deleteMany(),
    prisma.inspectionChecklistItem.deleteMany(),
    prisma.violation.deleteMany(),
    prisma.permit.deleteMany(),
    prisma.preplan.deleteMany(),
    prisma.preventionDocument.deleteMany(),
    prisma.inspection.deleteMany(),
    prisma.hydrant.deleteMany(),
    prisma.hazard.deleteMany(),
    prisma.preventionContact.deleteMany(),
    prisma.incidentAttachment.deleteMany(),
    prisma.incidentQaReview.deleteMany(),
    prisma.incidentNarrative.deleteMany(),
    prisma.incidentTimelineEvent.deleteMany(),
    prisma.incidentPersonnel.deleteMany(),
    prisma.incidentUnit.deleteMany(),
    prisma.incident.deleteMany(),
    prisma.shiftAssignment.deleteMany(),
    prisma.openShift.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.staffingRule.deleteMany(),
    prisma.shiftTradeRequest.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.trainingAttendance.deleteMany(),
    prisma.trainingAssignment.deleteMany(),
    prisma.courseSession.deleteMany(),
    prisma.course.deleteMany(),
    prisma.analyticsSnapshot.deleteMany(),
    prisma.dataQualityCheck.deleteMany(),
    prisma.duplicateRecord.deleteMany(),
  ]);

  const tenant = await prisma.tenant.create({
    data: {
      name: 'West Metro Fire Protection District',
      code: 'WMFPD',
      timezone: 'America/Denver',
    },
  });

  const battalions = await Promise.all([
    prisma.battalion.create({ data: { tenantId: tenant.id, code: 'B1', name: 'Battalion 1', chiefName: 'Chris Alvarez', createdBy: 'system' } }),
    prisma.battalion.create({ data: { tenantId: tenant.id, code: 'B2', name: 'Battalion 2', chiefName: 'Maya Chen', createdBy: 'system' } }),
    prisma.battalion.create({ data: { tenantId: tenant.id, code: 'B3', name: 'Battalion 3', chiefName: 'Jordan Fields', createdBy: 'system' } }),
  ]);

  await prisma.shiftPlatoon.createMany({
    data: [
      { tenantId: tenant.id, code: 'A', name: 'A Shift', createdBy: 'system' },
      { tenantId: tenant.id, code: 'B', name: 'B Shift', createdBy: 'system' },
      { tenantId: tenant.id, code: 'C', name: 'C Shift', createdBy: 'system' },
    ],
  });

  await prisma.departmentUnit.createMany({
    data: [
      { tenantId: tenant.id, code: 'OPS', name: 'Operations', createdBy: 'system' },
      { tenantId: tenant.id, code: 'TRN', name: 'Training', createdBy: 'system' },
      { tenantId: tenant.id, code: 'PREV', name: 'Prevention', createdBy: 'system' },
      { tenantId: tenant.id, code: 'LOG', name: 'Logistics', createdBy: 'system' },
    ],
  });

  const permissions = await prisma.permission.createMany({
    data: permissionGroups.map((code) => ({
      code,
      module: code.split('.')[0],
      name: code.replace('.', ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      description: `Allows ${code} access`,
    })),
  });
  void permissions;
  const allPermissions = await prisma.permission.findMany();

  const roles = [];
  for (const [name, codes] of roleDefinitions) {
    const role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name,
        code: name.replace(/\s+/g, '_').toLowerCase(),
        description: `${name} demo role`,
        createdBy: 'system',
      },
    });
    roles.push(role);
    const selectedPermissions = allPermissions.filter((permission) => codes.includes(permission.code));
    await prisma.rolePermission.createMany({
      data: selectedPermissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
    });
  }

  const passwordHash = await bcrypt.hash('CommandCore2026!', 10);
  const users = await Promise.all([
    prisma.user.create({ data: { tenantId: tenant.id, email: 'admin@westmetro.example', displayName: 'Dana Mitchell', passwordHash } }),
    prisma.user.create({ data: { tenantId: tenant.id, email: 'chief@westmetro.example', displayName: 'Chris Alvarez', passwordHash } }),
    prisma.user.create({ data: { tenantId: tenant.id, email: 'training@westmetro.example', displayName: 'Maya Chen', passwordHash } }),
    prisma.user.create({ data: { tenantId: tenant.id, email: 'prevention@westmetro.example', displayName: 'Jordan Fields', passwordHash } }),
    prisma.user.create({ data: { tenantId: tenant.id, email: 'logistics@westmetro.example', displayName: 'Sam Brooks', passwordHash } }),
    prisma.user.create({ data: { tenantId: tenant.id, email: 'system@westmetro.example', displayName: 'Taylor Grant', passwordHash } }),
    prisma.user.create({ data: { tenantId: tenant.id, email: 'auditor@westmetro.example', displayName: 'Alex Parker', passwordHash } }),
  ]);
  await prisma.userRole.createMany({
    data: [
      { userId: users[0].id, roleId: roles.find((role) => role.name === 'District Admin')!.id },
      { userId: users[1].id, roleId: roles.find((role) => role.name === 'Battalion Chief')!.id },
      { userId: users[2].id, roleId: roles.find((role) => role.name === 'Training Admin')!.id },
      { userId: users[3].id, roleId: roles.find((role) => role.name === 'Prevention Officer')!.id },
      { userId: users[4].id, roleId: roles.find((role) => role.name === 'Logistics Manager')!.id },
      { userId: users[5].id, roleId: roles.find((role) => role.name === 'System Admin')!.id },
      { userId: users[6].id, roleId: roles.find((role) => role.name === 'Read-Only Auditor')!.id },
    ],
  });

  const stations = [];
  for (let index = 1; index <= 17; index += 1) {
    const battalion = battalions[Math.min(Math.floor((index - 1) / 6), battalions.length - 1)];
    stations.push(
      await prisma.station.create({
        data: {
          tenantId: tenant.id,
          battalionId: battalion.id,
          number: index,
          name: `Station ${index}`,
          battalion: battalion.name,
          address: `${1000 + index} West Metro Blvd`,
          city: index % 3 === 0 ? 'Lakewood' : index % 3 === 1 ? 'Wheat Ridge' : 'Golden',
          readinessScore: 72 + ((index * 7) % 23),
          staffingStatus: index % 5 === 0 ? 'Gap' : 'Covered',
          createdBy: 'system',
        },
      })
    );
  }

  const certs = await Promise.all([
    'EMT',
    'Paramedic',
    'Firefighter I',
    'Firefighter II',
    'HazMat Operations',
    'Driver Operator',
    'Wildland Firefighter',
    'Officer I',
    'Inspector I',
    'CPR/BLS',
    'ACLS',
  ].map((name, index) =>
    prisma.certification.create({
      data: {
        tenantId: tenant.id,
        name,
        category: index < 2 ? 'EMS' : index < 5 ? 'Fire' : index < 8 ? 'Operations' : index < 9 ? 'Prevention' : 'EMS',
        validityMonths: index === 2 || index === 3 ? 60 : 24,
        isRequired: ['EMT', 'Firefighter I', 'CPR/BLS'].includes(name),
      },
    })
  ));

  const ranks = await Promise.all([
    'Firefighter',
    'Engineer',
    'Lieutenant',
    'Captain',
    'Battalion Chief',
    'Training Officer',
    'Prevention Officer',
    'Logistics Technician',
  ].map((name, index) =>
    prisma.rank.create({
      data: {
        tenantId: tenant.id,
        code: name.replace(/\s+/g, '_').toUpperCase(),
        name,
        sortOrder: index + 1,
      },
    })
  ));

  const personnel = [];
  for (let index = 1; index <= 80; index += 1) {
    const station = stations[(index - 1) % stations.length];
    const rank = ranks[(index - 1) % ranks.length];
    const person = await prisma.personnel.create({
      data: {
        tenantId: tenant.id,
        stationId: station.id,
        battalionId: station.battalionId,
        rankId: rank.id,
        employeeNumber: `WM-${String(index).padStart(4, '0')}`,
        firstName: ['Alex', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Jordan', 'Jamie', 'Avery', 'Parker', 'Quinn'][index % 10],
        lastName: ['Garcia', 'Smith', 'Johnson', 'Martinez', 'Brown', 'Davis', 'Wilson', 'Lee', 'Clark', 'Moore'][index % 10] + ` ${index}`,
        rank: rank.name,
        role: rank.name,
        email: `person${index}@westmetro.example`,
        phone: `303-555-${String(2000 + index).slice(-4)}`,
        status: index % 18 === 0 ? 'Leave' : index % 11 === 0 ? 'Training' : 'Active',
        employmentStatus: index % 7 === 0 ? 'Probationary' : 'Full Time',
        readinessStatus: index % 8 === 0 ? 'WARNING' : 'READY',
        readinessScore: 72 + ((index * 3) % 26),
        createdBy: 'system',
      },
    });
    personnel.push(person);

    await prisma.personnelAssignment.create({
      data: {
        tenantId: tenant.id,
        personnelId: person.id,
        stationId: station.id,
        platoonCode: ['A', 'B', 'C'][index % 3],
        assignmentType: index % 6 === 0 ? 'Temporary Relief' : 'Primary Assignment',
        startDate: past(180),
        isCurrent: true,
        createdBy: 'system',
      },
    });

    await prisma.personnelCertification.createMany({
      data: certs.slice(0, 3 + (index % 4)).map((cert, certIndex) => {
        const expiring = index % 7 === 0 && certIndex === 1;
        const expired = index % 9 === 0 && certIndex === 0;
        return {
          tenantId: tenant.id,
          personnelId: person.id,
          certificationId: cert.id,
          issuedAt: past(300 + certIndex * 10),
          expiresAt: expired ? past(2) : expiring ? iso(14) : iso(120 + certIndex * 30),
          status: expired ? 'Expired' : expiring ? 'Expiring Soon' : 'Valid',
          createdBy: 'system',
        };
      }),
    });
  }

  await prisma.personnelDocument.createMany({
    data: personnel.slice(0, 15).map((person, index) => ({
      tenantId: tenant.id,
      personnelId: person.id,
      title: `HR File ${index + 1}`,
      fileUrl: null,
      documentType: index % 2 === 0 ? 'Performance Review' : 'Credential',
    })),
  });

  const apparatus = [];
  for (let index = 1; index <= 30; index += 1) {
    const station = stations[(index - 1) % stations.length];
    apparatus.push(
      await prisma.apparatus.create({
        data: {
          tenantId: tenant.id,
          stationId: station.id,
          unitNumber: `${index % 3 === 0 ? 'M' : index % 5 === 0 ? 'L' : 'E'}${index}`,
          apparatusType: index % 3 === 0 ? 'Medic' : index % 5 === 0 ? 'Ladder' : 'Engine',
          status: index % 8 === 0 ? 'MAINTENANCE_DUE' : 'READY',
          readinessScore: index % 8 === 0 ? 62 : 94,
          mileage: 20000 + index * 1100,
          nextMaintenanceAt: iso(index % 8 === 0 ? 5 : 80),
        },
      })
    );
  }

  for (let index = 1; index <= 45; index += 1) {
    const station = stations[(index - 1) % stations.length];
    await prisma.asset.create({
        data: {
          tenantId: tenant.id,
          assetTag: `AS-${index}`,
          name: ['SCBA', 'Thermal Camera', 'Radio', 'Monitor', 'Chainsaw'][index % 5],
          category: ['PPE', 'Electronics', 'Communications', 'EMS', 'Tools'][index % 5],
          status: index % 11 === 0 ? 'WARNING' : 'READY',
          stationId: station.id,
        },
      });
  }

  for (let index = 1; index <= 60; index += 1) {
    const station = stations[(index - 1) % stations.length];
    await prisma.inventoryItem.create({
      data: {
        tenantId: tenant.id,
        stationId: station.id,
        sku: `INV-${index}`,
        name: ['Gloves', 'IV Kits', 'Masks', 'Batteries', 'Foam'][index % 5],
        category: ['EMS', 'EMS', 'PPE', 'Equipment', 'Suppression'][index % 5],
        quantity: index % 13 === 0 ? 3 : 25 + index,
        reorderPoint: 10,
        unit: 'each',
        expiresAt: index % 10 === 0 ? iso(20) : null,
      },
    });
  }

  for (let index = 1; index <= 30; index += 1) {
    const property = await prisma.property.create({
      data: {
        tenantId: tenant.id,
        name: `${['Commercial', 'Residential', 'School', 'Healthcare', 'Industrial'][index % 5]} Property ${index}`,
        address: `${500 + index} Colfax Ave`,
        city: index % 2 === 0 ? 'Lakewood' : 'Wheat Ridge',
        occupancyType: ['commercial', 'residential multi-family', 'school', 'healthcare', 'industrial', 'high-risk occupancy'][index % 6],
        riskLevel: index % 6 === 0 ? 'Extreme' : index % 3 === 0 ? 'High' : index % 2 === 0 ? 'Moderate' : 'Low',
        stationArea: stations[(index - 1) % stations.length].name,
      },
    });

    await prisma.occupancy.create({
      data: {
        tenantId: tenant.id,
        propertyId: property.id,
        occupancyName: property.name,
        occupantLoad: 10 + index * 2,
        riskLevel: property.riskLevel,
      },
    });

    const inspection = await prisma.inspection.create({
      data: {
        tenantId: tenant.id,
        propertyId: property.id,
        stationId: stations[(index - 1) % stations.length].id,
        inspectionType: 'Annual Fire Inspection',
        status: index % 6 === 0 ? 'REINSPECTION_REQUIRED' : index % 4 === 0 ? 'FAILED' : 'SCHEDULED',
        scheduledAt: past(index),
        inspectorName: `Inspector ${index % 6}`,
      },
    });

    await prisma.inspectionChecklistItem.create({
      data: {
        tenantId: tenant.id,
        inspectionId: inspection.id,
        label: 'Fire extinguishers current',
        status: index % 4 ? 'Pass' : 'Fail',
      },
    });

    if (index % 4 === 0) {
      await prisma.violation.create({
        data: {
          tenantId: tenant.id,
          propertyId: property.id,
          inspectionId: inspection.id,
          codeReference: 'IFC 901.6',
          description: 'Fire protection systems require maintenance documentation',
          dueAt: iso(30),
        },
      });
    }

    if (index % 5 === 0) {
      await prisma.permit.create({
        data: {
          tenantId: tenant.id,
          propertyId: property.id,
          permitNumber: `PERMIT-${index}`,
          permitType: 'Special Event',
          status: index % 10 === 0 ? 'UNDER_REVIEW' : 'APPROVED',
          expiresAt: iso(90),
        },
      });
    }

    if (index % 3 === 0) {
      await prisma.preplan.create({
        data: {
          tenantId: tenant.id,
          propertyId: property.id,
          title: `Preplan ${index}`,
          summary: 'Access, hydrants, hazards, FDC, and occupancy notes captured.',
          hazards: index % 9 === 0 ? ['Chemical storage'] : [],
          hydrantNotes: 'Hydrant on Alpha side',
        },
      });
    }
  }

  const incidents = [];
  for (let index = 1; index <= 12; index += 1) {
    const incident = await prisma.incident.create({
      data: {
        tenantId: tenant.id,
        stationId: stations[(index - 1) % stations.length].id,
        incidentNumber: `2026-${String(index).padStart(6, '0')}`,
        incidentType: index % 3 === 0 ? 'Structure Fire' : index % 3 === 1 ? 'EMS' : 'Rescue',
        status: index % 5 === 0 ? 'QA_NEEDED' : 'CLOSED',
        qaStatus: index % 5 === 0 ? 'Needs Review' : 'Approved',
        location: `${200 + index} Main St`,
        city: index % 2 ? 'Lakewood' : 'Wheat Ridge',
        dispatchAt: past(index),
        arrivalAt: past(index),
        clearedAt: past(index),
        cadSourceId: `CAD-${index}`,
        nerisReady: index % 6 !== 0,
        epcrLinked: index % 3 === 1,
      },
    });
    incidents.push(incident);
    await prisma.incidentUnit.create({
      data: {
        tenantId: tenant.id,
        incidentId: incident.id,
        apparatusId: apparatus[index % apparatus.length].id,
        unitName: apparatus[index % apparatus.length].unitNumber,
        role: 'Primary',
      },
    });
    await prisma.incidentPersonnel.create({
      data: {
        tenantId: tenant.id,
        incidentId: incident.id,
        personnelId: personnel[index % personnel.length].id,
        roleAtIncident: 'Crew Member',
      },
    });
  }

  await prisma.nerisMapping.createMany({
    data: ['incidentNumber', 'incidentType', 'location', 'dispatchAt', 'arrivalAt', 'clearedAt', 'station', 'units', 'personnel', 'narrative'].map((field) => ({
      tenantId: tenant.id,
      internalField: field,
      nerisField: `neris.${field}`,
      required: field !== 'narrative',
      validationRule: 'required_if_applicable',
    })),
  });

  const systems = await Promise.all([
    ['CAD', 'REAL_TIME'],
    ['RMS', 'EVENT_DRIVEN'],
    ['NERIS', 'BATCH'],
    ['Payroll', 'BATCH'],
    ['GIS', 'REAL_TIME'],
    ['ePCR', 'EVENT_DRIVEN'],
    ['LMS', 'REAL_TIME'],
    ['SSO', 'REAL_TIME'],
  ].map(([name, exchangeMethod], index) =>
    prisma.integrationSystem.create({
      data: {
        tenantId: tenant.id,
        name,
        systemType: name,
        status: index === 2 ? 'DEGRADED' : 'HEALTHY',
        exchangeMethod: exchangeMethod as 'REAL_TIME',
        authMethod: index === 7 ? 'OIDC' : 'OAuth2/API Key',
        rateLimitPerMinute: 120,
        lastSyncAt: past(1),
      },
    })
  ));

  for (const system of systems) {
    await prisma.integrationLog.create({
      data: {
        tenantId: tenant.id,
        integrationId: system.id,
        status: system.status === 'HEALTHY' ? 'Success' : 'Warning',
        message: `${system.name} synchronization completed`,
        durationMs: 180,
      },
    });
    await prisma.fieldMapping.create({
      data: {
        tenantId: tenant.id,
        integrationId: system.id,
        sourceField: 'external.id',
        targetField: 'commandcore.externalId',
        required: true,
      },
    });
    await prisma.apiEndpointExample.create({
      data: {
        tenantId: tenant.id,
        integrationId: system.id,
        method: 'GET',
        path: `/api/integrations/${system.systemType.toLowerCase()}/records`,
        description: `${system.name} sample endpoint`,
        requestExample: {},
        responseExample: { success: true },
      },
    });
  }

  await prisma.aiInsight.createMany({
    data: [
      {
        tenantId: tenant.id,
        category: 'Station readiness risk',
        title: 'Station 4 readiness reduction',
        summary: 'Medic maintenance warning and two expiring EMS certifications reduce readiness.',
        severity: 'HIGH',
        confidenceScore: 91.5,
        dataSources: ['Assets', 'Personnel Certifications', 'Staffing'],
        recommendedActions: ['Schedule Medic 4 maintenance', 'Assign EMS refresher', 'Backfill paramedic coverage'],
      },
      {
        tenantId: tenant.id,
        category: 'Overtime risk',
        title: 'B-shift overtime trend increasing',
        summary: 'Repeated backfill at Stations 2 and 9 may exceed planned overtime threshold.',
        severity: 'NORMAL',
        confidenceScore: 86.2,
        dataSources: ['Staffing', 'Overtime Records'],
        recommendedActions: ['Review open shifts', 'Invite qualified availability pool'],
      },
      {
        tenantId: tenant.id,
        category: 'Prevention backlog risk',
        title: 'High-risk inspection backlog',
        summary: 'Commercial corridor inspections include overdue high-risk occupancies.',
        severity: 'HIGH',
        confidenceScore: 89,
        dataSources: ['Prevention', 'Properties', 'Inspections'],
        recommendedActions: ['Prioritize high-risk reinspection queue'],
      },
    ],
  });

  await prisma.reportDefinition.create({
    data: {
      tenantId: tenant.id,
      name: 'District Readiness Summary',
      module: 'Analytics',
      definition: { widgets: ['readiness', 'staffing', 'training', 'assets', 'prevention'] },
      createdBy: users[0].id,
    },
  });

  await prisma.notification.createMany({
    data: [
      { tenantId: tenant.id, userId: users[0].id, title: 'Certification expiring', message: 'Two EMT certifications expire within 14 days.', notificationType: 'certification.expiring' },
      { tenantId: tenant.id, userId: users[1].id, title: 'Open staffing gap', message: 'Station 4 still has a paramedic coverage gap on B shift.', notificationType: 'staffing.gap' },
      { tenantId: tenant.id, userId: users[4].id, title: 'Maintenance warning', message: 'Medic 4 is due for brake inspection this week.', notificationType: 'asset.maintenance' },
      { tenantId: tenant.id, userId: users[2].id, title: 'Integration sync issue', message: 'NERIS validation queue has exceeded the response threshold.', notificationType: 'integration.sync' },
      { tenantId: tenant.id, userId: users[3].id, title: 'Inspection overdue', message: 'Commercial corridor inspections require follow-up scheduling.', notificationType: 'inspection.overdue', isRead: true },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { tenantId: tenant.id, userId: users[1].id, action: 'Viewed station summary', entityName: 'Station', entityId: stations[3].id },
      { tenantId: tenant.id, userId: users[3].id, action: 'Updated inspection queue', entityName: 'Inspection', entityId: incidents[0].id },
      { tenantId: tenant.id, userId: users[0].id, action: 'Updated role permissions', entityName: 'Role', entityId: roles[6].id },
      { tenantId: tenant.id, userId: users[4].id, action: 'Resolved maintenance warning', entityName: 'Apparatus', entityId: apparatus[3].id },
    ],
  });

  await prisma.supportTicket.createMany({
    data: [
      { tenantId: tenant.id, ticketNumber: 'SUP-1001', title: 'CAD sync warning review', description: 'Review delayed CAD import batch.', severity: 'HIGH', status: 'OPEN', requesterName: 'Battalion Chief', assignedTo: 'Integration Support', slaDueAt: iso(1) },
      { tenantId: tenant.id, ticketNumber: 'SUP-1002', title: 'Add Station 17 WUI preplan layer', description: 'Expose the map layer in the prevention dashboard.', severity: 'NORMAL', status: 'IN_PROGRESS', requesterName: 'Prevention Officer', assignedTo: 'GIS Support', slaDueAt: iso(2) },
      { tenantId: tenant.id, ticketNumber: 'SUP-1003', title: 'Training export format request', description: 'Need CSV export grouped by certification.', severity: 'NORMAL', status: 'RESOLVED', requesterName: 'Training Admin', assignedTo: 'Customer Success', slaDueAt: iso(3) },
    ],
  });

  await prisma.slaPolicy.createMany({
    data: [
      { tenantId: tenant.id, severity: 'CRITICAL', responseMinutes: 30, resolutionMinutes: 240 },
      { tenantId: tenant.id, severity: 'HIGH', responseMinutes: 120, resolutionMinutes: 720 },
      { tenantId: tenant.id, severity: 'NORMAL', responseMinutes: 480, resolutionMinutes: 2880 },
    ],
  });

  await prisma.knowledgeBaseArticle.create({
    data: {
      tenantId: tenant.id,
      title: 'How to review NERIS export readiness',
      category: 'Operations',
      body: 'Open incident detail, review mapping, correct warnings, then export.',
    },
  });

  console.log('CommandCore 360 database seeded.');
  console.log('Demo login: admin@westmetro.example / CommandCore2026!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
