# CommandCore 360 API Map

## Auth
- POST `/api/auth/login`
- GET `/api/auth/me`
- POST `/api/auth/logout`

## Platform Core
- GET/POST/PUT `/api/users`
- GET/POST/PUT `/api/roles`
- GET/POST/PUT `/api/permissions`
- GET/POST/PUT `/api/stations`

## RMS / ePCR / NERIS
- GET/POST/PUT `/api/incidents`
- GET `/api/neris/mappings`

## LMS
- GET/POST/PUT `/api/courses`
- GET/POST/PUT `/api/training/assignments`

## Staffing
- GET/POST/PUT `/api/shifts`
- GET/POST/PUT `/api/staffing/assignments`

## Personnel
- GET/POST/PUT `/api/personnel`

## Assets / Inventory
- GET/POST/PUT `/api/apparatus`
- GET/POST/PUT `/api/assets`
- GET/POST/PUT `/api/inventory`

## Prevention
- GET/POST/PUT `/api/properties`
- GET/POST/PUT `/api/inspections`
- GET/POST/PUT `/api/permits`
- GET/POST/PUT `/api/preplans`

## Analytics / Reporting
- GET `/api/analytics/dashboard`

## Integration Center
- GET/POST/PUT `/api/integrations`
- GET `/api/integrations/logs`

## AI Advisor
- GET/POST/PUT `/api/ai/insights`
- POST `/api/ai/ask`

## Support / SLA
- GET/POST/PUT `/api/support/tickets`
