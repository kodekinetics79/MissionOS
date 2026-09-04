-- MissionOS production JSON-repository hardening.
--
-- This migration protects the authorization control plane while MissionOS is
-- incrementally migrated from the records JSONB store to normalized PostgreSQL
-- tables. It is intentionally additive and idempotent.

CREATE TABLE IF NOT EXISTS records (
  model text NOT NULL,
  id text NOT NULL,
  "tenantId" text,
  data jsonb NOT NULL,
  "createdAt" text,
  "updatedAt" text,
  PRIMARY KEY (model, id)
);

-- Most runtime reads are tenant + model scoped. This also makes integrity and
-- operational support queries against the durable store predictable as volume grows.
CREATE INDEX IF NOT EXISTS records_tenant_model_idx
  ON records ("tenantId", model);

-- Authentication currently resolves a user by email before tenant context exists,
-- therefore email remains globally unique in the current product contract.
CREATE UNIQUE INDEX IF NOT EXISTS records_user_email_ci_uq
  ON records ((lower(data->>'email')))
  WHERE model = 'user'
    AND COALESCE(data->>'email', '') <> '';

-- A user must never hold the same role twice inside one tenant. The application
-- already writes tenantId/userId/roleId into UserRole JSON records; PostgreSQL now
-- enforces the invariant durably as well.
CREATE UNIQUE INDEX IF NOT EXISTS records_user_role_uq
  ON records ("tenantId", (data->>'userId'), (data->>'roleId'))
  WHERE model = 'userRole'
    AND "tenantId" IS NOT NULL
    AND COALESCE(data->>'userId', '') <> ''
    AND COALESCE(data->>'roleId', '') <> '';

CREATE INDEX IF NOT EXISTS records_user_role_user_idx
  ON records ("tenantId", (data->>'userId'))
  WHERE model = 'userRole';

-- Role-permission links are read on every authenticated request. Keep the lookup
-- indexed now; uniqueness is intentionally deferred until legacy/global-role data
-- is audited across all tenants.
CREATE INDEX IF NOT EXISTS records_role_permission_role_idx
  ON records ("tenantId", (data->>'roleId'))
  WHERE model = 'rolePermission';

-- Operational audit review is tenant and time ordered.
CREATE INDEX IF NOT EXISTS records_audit_tenant_created_idx
  ON records ("tenantId", (data->>'createdAt'))
  WHERE model = 'auditLog';
