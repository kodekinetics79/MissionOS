import type { AiInsight, Asset, Incident, Inspection, IntegrationSystem, Personnel, RoleName, Station } from '../types';

export const roles: RoleName[] = ['Firefighter','Company Officer','Battalion Chief','Training Admin','Prevention Officer','Logistics Manager','District Admin','System Admin','Read-Only Auditor'];

export const stations: Station[] = [
  {id:'ST-01',name:'Station 1',city:'Lakewood',readiness:94,staffingGap:0,apparatusReady:100,openInspections:3,status:'Healthy'},
  {id:'ST-02',name:'Station 2',city:'Wheat Ridge',readiness:82,staffingGap:1,apparatusReady:92,openInspections:8,status:'Warning'},
  {id:'ST-03',name:'Station 3',city:'Lakewood',readiness:89,staffingGap:0,apparatusReady:95,openInspections:5,status:'Healthy'},
  {id:'ST-04',name:'Station 4',city:'Lakewood',readiness:68,staffingGap:2,apparatusReady:73,openInspections:11,status:'Critical'},
  {id:'ST-05',name:'Station 5',city:'Morrison',readiness:91,staffingGap:0,apparatusReady:96,openInspections:2,status:'Healthy'},
  {id:'ST-06',name:'Station 6',city:'Golden Fringe',readiness:85,staffingGap:1,apparatusReady:90,openInspections:4,status:'Warning'},
  {id:'ST-07',name:'Station 7',city:'Lakewood',readiness:88,staffingGap:0,apparatusReady:91,openInspections:6,status:'Healthy'},
  {id:'ST-08',name:'Station 8',city:'Wheat Ridge',readiness:79,staffingGap:1,apparatusReady:86,openInspections:9,status:'Warning'},
  {id:'ST-09',name:'Station 9',city:'Lakewood',readiness:74,staffingGap:2,apparatusReady:82,openInspections:7,status:'Warning'},
  {id:'ST-10',name:'Station 10',city:'Edgewater Area',readiness:92,staffingGap:0,apparatusReady:98,openInspections:3,status:'Healthy'},
  {id:'ST-11',name:'Station 11',city:'Lakewood',readiness:87,staffingGap:0,apparatusReady:93,openInspections:4,status:'Healthy'},
  {id:'ST-12',name:'Station 12',city:'WUI Zone',readiness:81,staffingGap:1,apparatusReady:88,openInspections:10,status:'Warning'},
  {id:'ST-13',name:'Station 13',city:'Lakewood',readiness:90,staffingGap:0,apparatusReady:97,openInspections:2,status:'Healthy'},
  {id:'ST-14',name:'Station 14',city:'Wheat Ridge',readiness:84,staffingGap:1,apparatusReady:90,openInspections:5,status:'Warning'},
  {id:'ST-15',name:'Station 15',city:'Lakewood',readiness:93,staffingGap:0,apparatusReady:98,openInspections:2,status:'Healthy'},
  {id:'ST-16',name:'Station 16',city:'Suburban South',readiness:86,staffingGap:0,apparatusReady:91,openInspections:6,status:'Healthy'},
  {id:'ST-17',name:'Station 17',city:'WUI Foothills',readiness:77,staffingGap:1,apparatusReady:84,openInspections:12,status:'Warning'}
];

export const incidentTrend = [
  {month:'Jan',incidents:3470,ems:2380,fire:312}, {month:'Feb',incidents:3315,ems:2290,fire:284},
  {month:'Mar',incidents:3602,ems:2510,fire:338}, {month:'Apr',incidents:3541,ems:2475,fire:322},
  {month:'May',incidents:3698,ems:2590,fire:341}, {month:'Jun',incidents:3528,ems:2450,fire:304},
  {month:'Jul',incidents:3764,ems:2601,fire:376}, {month:'Aug',incidents:3611,ems:2486,fire:359},
  {month:'Sep',incidents:3459,ems:2352,fire:318}, {month:'Oct',incidents:3578,ems:2434,fire:326},
  {month:'Nov',incidents:3501,ems:2397,fire:301}, {month:'Dec',incidents:3533,ems:2410,fire:299}
];

export const incidents: Incident[] = [
  {id:'WM-260601-0182',type:'EMS - Cardiac',station:'Station 4',location:'W Alameda Ave',status:'Submitted',qaStatus:'QA Needed',source:'CAD Import',units:['Medic 4','Engine 4'],priority:'High',time:'08:14'},
  {id:'WM-260601-0183',type:'Structure Alarm',station:'Station 9',location:'Kipling St',status:'Draft',qaStatus:'Open',source:'CAD Import',units:['Engine 9','Tower 2'],priority:'Medium',time:'08:31'},
  {id:'WM-260601-0184',type:'Wildland Interface Check',station:'Station 17',location:'Foothills Ridge',status:'Closed',qaStatus:'Passed',source:'Mobile Entry',units:['Brush 17'],priority:'Medium',time:'09:02'},
  {id:'WM-260601-0185',type:'EMS - Fall Injury',station:'Station 2',location:'W 38th Ave',status:'Submitted',qaStatus:'Passed',source:'CAD Import',units:['Medic 2'],priority:'Normal',time:'09:17'},
  {id:'WM-260601-0186',type:'Vehicle Accident',station:'Station 8',location:'I-70 Corridor',status:'Submitted',qaStatus:'QA Needed',source:'CAD Import',units:['Engine 8','Medic 8'],priority:'High',time:'09:44'}
];

export const personnel: Personnel[] = [
  {id:'P-101',name:'Jordan Ellis',rank:'Battalion Chief',station:'District',role:'Battalion Chief',certStatus:'Current',readiness:96,expiringCerts:0,incidents:118,attendance:99},
  {id:'P-114',name:'Maria Chen',rank:'Paramedic',station:'Station 4',role:'Firefighter',certStatus:'Expiring 12 days',readiness:72,expiringCerts:1,incidents:86,attendance:94},
  {id:'P-125',name:'Derek Lawson',rank:'Engineer',station:'Station 4',role:'Company Officer',certStatus:'Current',readiness:88,expiringCerts:0,incidents:93,attendance:97},
  {id:'P-138',name:'Aisha Turner',rank:'Captain',station:'Station 9',role:'Company Officer',certStatus:'Current',readiness:91,expiringCerts:0,incidents:104,attendance:98},
  {id:'P-147',name:'Sam Patel',rank:'Firefighter/EMT',station:'Station 2',role:'Firefighter',certStatus:'Expiring 21 days',readiness:79,expiringCerts:1,incidents:61,attendance:92},
  {id:'P-152',name:'Renee Morales',rank:'Prevention Specialist',station:'Prevention',role:'Prevention Officer',certStatus:'Current',readiness:94,expiringCerts:0,incidents:12,attendance:99}
];

export const assets: Asset[] = [
  {id:'A-004-M',name:'Medic 4',type:'Ambulance',station:'Station 4',status:'Warning',readiness:71,maintenance:'Brake inspection due',assignedTo:'Station 4'},
  {id:'A-004-E',name:'Engine 4',type:'Engine',station:'Station 4',status:'Healthy',readiness:94,maintenance:'Current',assignedTo:'Station 4'},
  {id:'A-009-E',name:'Engine 9',type:'Engine',station:'Station 9',status:'Warning',readiness:82,maintenance:'Pump service in 6 days',assignedTo:'Station 9'},
  {id:'A-017-B',name:'Brush 17',type:'Wildland',station:'Station 17',status:'Healthy',readiness:91,maintenance:'Current',assignedTo:'Station 17'},
  {id:'A-002-M',name:'Medic 2',type:'Ambulance',station:'Station 2',status:'Healthy',readiness:96,maintenance:'Current',assignedTo:'Station 2'}
];

export const inspections: Inspection[] = [
  {id:'I-8841',property:'Lakewood Commercial Center',city:'Lakewood',risk:'High',status:'Overdue',due:'2026-06-01',violations:3,preplan:true},
  {id:'I-8842',property:'Wheat Ridge Senior Living',city:'Wheat Ridge',risk:'High',status:'Scheduled',due:'2026-06-04',violations:0,preplan:true},
  {id:'I-8843',property:'Foothills Storage Complex',city:'WUI Zone',risk:'Medium',status:'Overdue',due:'2026-05-29',violations:2,preplan:false},
  {id:'I-8844',property:'Alameda Retail Strip',city:'Lakewood',risk:'Medium',status:'In Review',due:'2026-06-03',violations:1,preplan:true}
];

export const integrations: IntegrationSystem[] = [
  {name:'CAD',status:'Online',method:'Real-time API',latency:'220ms',lastSync:'2 min ago',auth:'OAuth2',rateLimit:'900/min'},
  {name:'RMS',status:'Online',method:'Event-driven',latency:'310ms',lastSync:'4 min ago',auth:'API Key + IP allowlist',rateLimit:'600/min'},
  {name:'NERIS',status:'Degraded',method:'Batch + validation',latency:'1.8s',lastSync:'24 min ago',auth:'OAuth2',rateLimit:'120/min'},
  {name:'Payroll',status:'Online',method:'Nightly batch',latency:'2.4s',lastSync:'Today 02:00',auth:'SFTP + token',rateLimit:'N/A'},
  {name:'GIS',status:'Online',method:'REST/Map service',latency:'430ms',lastSync:'7 min ago',auth:'SAML SSO',rateLimit:'300/min'},
  {name:'ePCR',status:'Online',method:'FHIR-style exchange',latency:'540ms',lastSync:'9 min ago',auth:'OAuth2',rateLimit:'300/min'},
  {name:'LMS',status:'Online',method:'REST API',latency:'260ms',lastSync:'1 min ago',auth:'OIDC',rateLimit:'700/min'},
  {name:'SSO',status:'Online',method:'SAML/OIDC',latency:'180ms',lastSync:'Live',auth:'Microsoft Entra ID',rateLimit:'Policy based'}
];

export const aiInsights: AiInsight[] = [
  {id:'AI-1',title:'Station 4 readiness needs attention',summary:'Station 4 readiness is reduced because Medic 4 has a maintenance warning and two assigned EMS certifications expire within 14 days.',severity:'Critical',confidence:94,impact:'Potential EMS response capacity reduction during peak call window.',sources:['Staffing','Assets','Training','Incidents'],action:'Backfill one paramedic, schedule Medic 4 brake inspection, assign EMS refresher today.'},
  {id:'AI-2',title:'Overtime risk rising on B-shift',summary:'Repeated backfill at Stations 2 and 9 is increasing overtime exposure and fatigue risk.',severity:'Warning',confidence:88,impact:'Higher labor cost and reduced crew resilience.',sources:['Scheduling','Attendance','Personnel'],action:'Offer voluntary cross-station coverage before mandatory overtime.'},
  {id:'AI-3',title:'Inspection backlog in commercial corridor',summary:'Lakewood commercial inspections are trending overdue, with high-risk occupancies requiring follow-up.',severity:'Warning',confidence:91,impact:'Prevention compliance exposure and delayed violation closure.',sources:['Prevention','GIS','Analytics'],action:'Batch inspections by corridor and assign one additional prevention officer this week.'},
  {id:'AI-4',title:'Training compliance below target',summary:'EMS refresher completion among company officers is below agency target for the current cycle.',severity:'Info',confidence:83,impact:'Potential credentialing and quality assurance concern.',sources:['LMS','Personnel'],action:'Auto-enroll remaining officers into next available refresher session.'}
];

export const supportTickets = [
  {id:'SLA-101',title:'NERIS validation queue latency',severity:'High',status:'In Progress',target:'4 hrs',owner:'Integration Support'},
  {id:'SLA-102',title:'Add Station 17 WUI preplan layer',severity:'Normal',status:'Open',target:'2 business days',owner:'GIS Support'},
  {id:'SLA-103',title:'Training export format request',severity:'Normal',status:'Resolved',target:'2 business days',owner:'Customer Success'}
];

export const auditLogs = [
  {time:'09:42',user:'Jordan Ellis',action:'Viewed Station 4 readiness detail',module:'Dashboard'},
  {time:'09:37',user:'Renee Morales',action:'Updated inspection status I-8841',module:'Prevention'},
  {time:'09:22',user:'System',action:'Synced CAD incident WM-260601-0186',module:'Integration'},
  {time:'09:11',user:'Training Admin',action:'Assigned EMS refresher to 12 users',module:'LMS'}
];
