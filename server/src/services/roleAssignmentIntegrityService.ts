import { prisma } from '../utils/prisma.js';

type RecordLike = Record<string, any>;

type RoleAssignmentStore = {
  user: {
    findFirst(args: any): Promise<RecordLike | null>;
  };
  role: {
    findFirst(args: any): Promise<RecordLike | null>;
  };
  userRole: {
    findMany(args: any): Promise<RecordLike[]>;
    create(args: any): Promise<RecordLike>;
    deleteMany(args: any): Promise<{ count: number }>;
  };
  auditLog?: {
    create(args: any): Promise<RecordLike>;
  };
};

const roleAssignmentTails = new Map<string, Promise<void>>();

function httpError(message: string, status: number) {
  const error: any = new Error(message);
  error.status = status;
  return error;
}

function uniqueIds(roleIds: unknown): string[] {
  if (!Array.isArray(roleIds)) {
    throw httpError('roleIds must be an array', 400);
  }
  return Array.from(new Set(roleIds.map(String).map((id) => id.trim()).filter(Boolean)));
}

async function withRoleAssignmentLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = roleAssignmentTails.get(key) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(operation);
  const tail = run.then(() => undefined, () => undefined);
  roleAssignmentTails.set(key, tail);

  try {
    return await run;
  } finally {
    if (roleAssignmentTails.get(key) === tail) roleAssignmentTails.delete(key);
  }
}

async function validateRoleSet(store: RoleAssignmentStore, tenantId: string, roleIds: string[]) {
  for (const roleId of roleIds) {
    const role = await store.role.findFirst({ where: { id: roleId } });
    if (!role || (role.tenantId != null && role.tenantId !== tenantId)) {
      throw httpError('One or more requested roles are outside the current tenant', 403);
    }
  }
}

async function restoreOriginalRoleSet(
  store: RoleAssignmentStore,
  tenantId: string,
  targetUserId: string,
  original: RecordLike[],
) {
  await store.userRole.deleteMany({ where: { tenantId, userId: targetUserId } });
  for (const link of original) {
    await store.userRole.create({
      data: {
        ...link,
        tenantId,
        userId: targetUserId,
      },
    });
  }
}

/**
 * Replace a user's role set with serialized failure compensation.
 *
 * The current MissionOS repository is a durable JSON-document compatibility
 * layer, not a true relational transaction engine. A naive delete-all/recreate
 * sequence can therefore leave a user with a partial authorization set if a
 * later write fails. This service removes that failure mode while the runtime is
 * migrated to normalized Prisma/Postgres transactions:
 *
 * 1. Serialize replacements per tenant/user within this process so concurrent
 *    admin requests cannot interleave authorization state transitions.
 * 2. Validate every requested role before changing state.
 * 3. Snapshot the original assignments.
 * 4. Add missing roles first so a later create failure cannot strip all access.
 * 5. Remove obsolete roles only after all additions succeed.
 * 6. Persist the security audit event as part of completion semantics.
 * 7. If any write OR audit write fails, restore the exact original role set.
 *
 * This is a transitional compensating transaction. The in-process lock does not
 * provide cross-node serialization. The production migration must replace this
 * with a real PostgreSQL transaction plus row/advisory locking (or SERIALIZABLE
 * isolation) before MissionOS is operated as a multi-node service.
 */
export async function replaceUserRolesSafely(
  tenantId: string,
  targetUserId: string,
  actorUserId: string,
  requestedRoleIds: unknown,
  store: RoleAssignmentStore = prisma as RoleAssignmentStore,
) {
  const nextRoleIds = uniqueIds(requestedRoleIds);
  const lockKey = `${tenantId}:${targetUserId}`;

  return withRoleAssignmentLock(lockKey, async () => {
    const user = await store.user.findFirst({ where: { id: targetUserId, tenantId } });
    if (!user) throw httpError('User not found', 404);

    await validateRoleSet(store, tenantId, nextRoleIds);

    const original = await store.userRole.findMany({ where: { tenantId, userId: targetUserId } });
    const originalIds = new Set(original.map((link) => String(link.roleId)));
    const nextIds = new Set(nextRoleIds);
    const toAdd = nextRoleIds.filter((roleId) => !originalIds.has(roleId));
    const toRemove = [...originalIds].filter((roleId) => !nextIds.has(roleId));

    if (!toAdd.length && !toRemove.length) {
      return {
        userId: targetUserId,
        roleIds: nextRoleIds,
        added: [],
        removed: [],
        changed: false,
      };
    }

    try {
      const assignedAt = new Date().toISOString();
      for (const roleId of toAdd) {
        await store.userRole.create({
          data: {
            tenantId,
            userId: targetUserId,
            roleId,
            assignedByUserId: actorUserId,
            assignedAt,
          },
        });
      }

      for (const roleId of toRemove) {
        await store.userRole.deleteMany({ where: { tenantId, userId: targetUserId, roleId } });
      }

      if (store.auditLog) {
        await store.auditLog.create({
          data: {
            tenantId,
            userId: actorUserId,
            module: 'Admin',
            action: 'Replaced user roles safely',
            entityName: 'User',
            entityId: targetUserId,
            severity: 'High',
            beforeJson: JSON.stringify({ roleIds: [...originalIds] }),
            afterJson: JSON.stringify({ roleIds: nextRoleIds }),
            createdAt: new Date().toISOString(),
          },
        });
      }
    } catch (writeError) {
      try {
        await restoreOriginalRoleSet(store, tenantId, targetUserId, original);
      } catch (rollbackError) {
        const error: any = httpError('Role assignment failed and rollback could not restore the original authorization state', 500);
        error.cause = writeError;
        error.rollbackCause = rollbackError;
        throw error;
      }
      throw writeError;
    }

    return {
      userId: targetUserId,
      roleIds: nextRoleIds,
      added: toAdd,
      removed: toRemove,
      changed: true,
    };
  });
}
