import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_DRIVER = 'sqlite';
process.env.DATABASE_URL = '';

type PrismaModules = {
  initDb: (options?: { reset?: boolean }) => Promise<string>;
  prisma: any;
  flushWrites: () => Promise<void>;
};

let prismaModulesPromise: Promise<PrismaModules> | undefined;
function loadPrismaModules(): Promise<PrismaModules> {
  if (!prismaModulesPromise) {
    prismaModulesPromise = import('./prisma.js').then((module) => ({
      initDb: module.initDb,
      prisma: module.prisma,
      flushWrites: module.flushWrites,
    }));
  }
  return prismaModulesPromise;
}

test('bulk repository mutations are awaited and return deterministic counts', async () => {
  const { initDb, prisma, flushWrites } = await loadPrismaModules();
  await initDb({ reset: true });

  const model = prisma.ctoDurabilityProbe;
  const ids = ['probe-a', 'probe-b', 'probe-c'];

  const created = await model.createMany({
    data: ids.map((id) => ({ id, tenantId: 'tenant-west-metro', status: 'new' })),
  });
  assert.equal(created.count, 3);
  assert.equal(await model.count({ where: { tenantId: 'tenant-west-metro' } }), 3);

  const updated = await model.updateMany({
    where: { tenantId: 'tenant-west-metro' },
    data: { status: 'ready' },
  });
  assert.equal(updated.count, 3);
  const readyRows = await model.findMany({ where: { status: 'ready' } });
  assert.equal(readyRows.length, 3);

  const deleted = await model.deleteMany({
    where: { id: { in: ['probe-a', 'probe-b'] } },
  });
  assert.equal(typeof deleted.count, 'number');
  assert.equal(deleted.count, 2);
  assert.equal(await model.count({ where: { tenantId: 'tenant-west-metro' } }), 1);

  await flushWrites();
  await model.deleteMany({ where: { tenantId: 'tenant-west-metro' } });
});
