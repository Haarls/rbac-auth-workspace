import { PrismaClient } from '@prisma/client';
import { seedSandboxData } from '../src/lib/sandbox';

const prisma = new PrismaClient();

async function main() {
  await prisma.sandbox.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const sandbox = await prisma.sandbox.create({
    data: { ipHash: 'local-dev-seed', expiresAt },
  });
  await seedSandboxData(sandbox.id);
  console.log(`Seeded isolated sandbox ${sandbox.id} (owner 1042, manager 2084, staff 3096)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
