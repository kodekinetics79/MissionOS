# MissionOS

Configurable SaaS platform for Fire/EMS, public safety, and emergency-service operations.

MissionOS is a **multi-tenant SaaS product**, not a one-off client build. The same platform serves multiple agencies, departments, stations, and jurisdictions, with per-tenant configurable modules, KPIs, workflows, reports, and role-based access on a shared common data platform. This build ships a React/Vite frontend, an Express API, and a local SQLite-backed demo database. The **Station 4 / Medic 4 fire/EMS scenario ships as a sample tenant** ("West Metro Fire & EMS (Sample Agency)") to demonstrate the product — it is sample data, not the product's identity.

> Configured to align with this procurement. See the in-app **Requirement Alignment** page for an honest mapping of MissionOS capabilities to the RFP requirements. We do not claim NERIS certification, full ePCR parity, SOC 2, or legal/regulatory compliance unless explicitly implemented.

## Product Layers

**Core Compliance Modules** — Records & Interoperability · LMS / Training · Staffing & Scheduling · Personnel & Performance · Asset & Inventory · Prevention / Inspections / Permitting / Preplans · Analytics / Reporting

**Advanced Intelligence Modules** — Mission Control · Readiness scoring · KPI management · Training need assessment · Appraisal management · Forecasting · Staff requisitions · Asset lifecycle intelligence · Action engine

**Future Expansion Modules** — Digital twin scenario planning · AI command briefing · Citizen portal · Business/occupancy portal · Vendor portal · Mutual aid interoperability · Board-ready reporting · Open API / data warehouse

## Configurable SaaS Architecture

Multi-agency / multi-tenant · configurable modules · configurable KPIs · configurable workflows · configurable reports · role-based access · API integration layer · future data warehouse · optional add-on modules.

## Scope Covered

- Records Management System structure: RMS/ePCR/NERIS-compatible incident records
- Learning Management System: courses, sessions, assignments, attendance, certifications
- Staffing and Scheduling: shifts, assignments, open shifts, overtime, availability
- Personnel & Performance Management: personnel master record, certifications, goals, reviews, documents
- Asset & Inventory Management: apparatus, assets, inventory, maintenance, vendors
- Prevention / Inspections / Permitting / Preplans: properties, inspections, violations, permits, preplans, hazards
- Data Warehouse / Analytics / Reporting: reports, snapshots, data quality, duplicate detection
- Integration Center: CAD, RMS, NERIS, Payroll, GIS, ePCR, LMS, SSO, HRIS, warehouse connectors
- AI Readiness Advisor: insight model, actions, prompt log, optional Ollama/provider placeholder
- Security: JWT auth, RBAC, audit logs, tenant-ready design

## Local Setup

1. Configure environment:

```bash
cp .env.example .env
```

2. Install and initialize:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

3. Run frontend + API:

```bash
npm run dev
```

Frontend: http://localhost:9911  
API: http://localhost:4100  
Health: http://localhost:4100/health

## Demo Login

```text
admin@westmetro.example
MissionOS2026!
```

## Useful Commands

```bash
npm run dev:web
npm run dev:api
npm run build
npm run db:studio
```

## Developer Checklist

- Install dependencies with `npm install`
- Reset and seed the local demo database with `npm run db:migrate` and `npm run db:seed`
- Start the API on `http://localhost:4100`
- Start the frontend on `http://localhost:9911` or `http://localhost:9912` if the port is busy
- Verify `GET /api/platform/summary`, `GET /api/personnel`, `GET /api/staffing/command-center`, and `GET /api/analytics/command-center`
- Walk the evaluator story with `Morning Readiness Briefing` and `Demo Readiness`

## Documentation

- `README_BACKEND.md`
- `docs/API_MAP.md`
- `docs/DATABASE_SCOPE.md`
- `prisma/schema.prisma`
- `prisma/seed.ts`

## Database Note

The current build runs on a local SQLite demo store with a Prisma-shaped repository layer. That keeps the app self-contained for demos and development. The production migration path is to replace the local store with PostgreSQL and real Prisma migrations when the deployment target is finalized.
