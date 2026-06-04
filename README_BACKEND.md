# MissionOS Backend + Database Foundation

This package provides the MissionOS backend — a production-oriented Express/TypeScript API and a local SQLite-backed database foundation for demos and development. MissionOS is a configurable, multi-tenant SaaS platform for Fire/EMS and public safety; the seeded data represents one sample agency tenant.

## Included

- Express + TypeScript API
- SQLite-backed data store with a Prisma-shaped repository layer
- JWT authentication and refresh-token-ready structure
- RBAC roles and permissions
- Tenant-ready data model
- Audit, notification, support, integration, analytics, and AI insight tables
- Seeded records for the core operational modules and RMS/ePCR/NERIS workflow
- API route foundation for every major module

## Setup

```bash
cp .env.example .env
npm install
npm run db:seed
npm run dev
```

Frontend: http://localhost:9911  
API: http://localhost:4100  
Health check: http://localhost:4100/health

## Demo Login

```text
admin@westmetro.example
MissionOS2026!
```

## API Examples

```bash
curl http://localhost:4100/health
curl -X POST http://localhost:4100/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"admin@westmetro.example","password":"MissionOS2026!"}'
```

After login, pass the token:

```bash
curl http://localhost:4100/api/analytics/dashboard   -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes

This is a strong full-stack foundation, not final production certification. The backend now boots from a local SQLite database seeded with operational demo data. External systems such as CAD, NERIS, payroll, GIS, ePCR, LMS, SSO, and HRIS are represented through connector-ready Integration Center records and route structure. Real vendor-specific integrations should be implemented by replacing the mocked connectors with live ones.

## Developer Checklist

- Seed the local demo database with `npm run db:migrate` and `npm run db:seed`
- Verify the API on `http://localhost:4100`
- Verify the frontend on `http://localhost:9911`
- Check the shared platform summary at `/api/platform/summary`
- Check staffing readiness at `/api/staffing/command-center`
- Check evaluator flow at `/demo-morning-readiness` and `/demo-readiness`
