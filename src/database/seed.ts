import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from '../shared/logger/pino.logger';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
async function main() {
  logger.info('Seeding database...');

  // Clear existing data
  await prisma.notificationCategoryPreference.deleteMany({});
  await prisma.notificationPreference.deleteMany({});

  // Tenant 001
  await prisma.notificationPreference.create({
    data: {
      userId: 'user-001',
      tenantId: 'tenant-001',
      emailEnabled: true,
      smsEnabled: true,
      inAppEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      timezone: 'Africa/Lagos',
      categories: {
        create: [
          { tenantId: 'tenant-001', category: 'compliance', enabled: true, deliveryMode: 'realtime' },
          { tenantId: 'tenant-001', category: 'billing', enabled: true, deliveryMode: 'realtime' },
          { tenantId: 'tenant-001', category: 'engagement', enabled: true, deliveryMode: 'daily_digest' },
          { tenantId: 'tenant-001', category: 'system', enabled: true, deliveryMode: 'realtime' },
        ],
      },
    },
  });

  // Tenant 002
  await prisma.notificationPreference.create({
    data: {
      userId: 'user-002',
      tenantId: 'tenant-002',
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      quietHoursStart: '23:00',
      quietHoursEnd: '06:00',
      timezone: 'UTC',
      categories: {
        create: [
          { tenantId: 'tenant-002', category: 'compliance', enabled: true, deliveryMode: 'realtime' },
          { tenantId: 'tenant-002', category: 'billing', enabled: true, deliveryMode: 'realtime' },
          { tenantId: 'tenant-002', category: 'engagement', enabled: true, deliveryMode: 'daily_digest' },
          { tenantId: 'tenant-002', category: 'system', enabled: true, deliveryMode: 'realtime' },
        ],
      },
    },
  });

  logger.info('Seed complete — two tenants created');
}

main()
  .catch((err) => {
    logger.error(err, 'Seed failed');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });