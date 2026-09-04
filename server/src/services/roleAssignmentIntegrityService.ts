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

function httpError(message: string, status: number) {
  const error: any = new Error(message);
  error.status = status;
  return error;
}

function uniqueIds(roleIds: unknown): string[] {
  if (!Array.isArray(roleIds)) return [];
  return Array.from(new Set(roleIds.map(String).map((id) => id.trim()).filter(Boolean)));
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
 * Replace a user's role set with failure compensation.
 *
 * The current MissionOS repository is a durable JSON-document compatibility
 * layer, not a true relational transaction engine. A naïve delete-all/recreate
 * sequence can therefore leave a user with a partial authorization set if a
 * later write fails. This service removes that failure mode while the runtime is
 * migrated to normalized Prisma/Postgres transactions:
 *
 * 1. Validate every requested role before changing state.
 * 2. Snapshot the original assignments.
 * 3. Add missing roles first so a user is never temporarily stripped of all
 *    authorization merely because a later create fails.
 * 4. Remove obsolete roles only after all additions succeed.
 * 5. On any failure, restore the exact original role set and rethrow.
 *
 * This is a compensating transaction, not a substitute for a future database
 * transaction. The migration plan must eventually replace it with a real
 * SERIALIZABLE/transactional role-set write in normalized Postgres.
 */
export async function replaceUserRolesSafely(
  tenantId: string,
  targetUserId: string,
  actorUserId: string,
  requestedRoleIds: unknown,
  store: RoleAssignmentStore = prisma as RoleAssignmentStore,
) {
  const user = await store.user.findFirst({ where: { id: targetUserId, tenantId } });
  if (!user) throw httpError('User not found', 404);

  const nextRoleIds = uniqueIds(requestedRoleIds);
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

  return {
    userId: targetUserId,
    roleIds: nextRoleIds,
    added: toAdd,
    removed: toRemove,
    changed: true,
  };
}
