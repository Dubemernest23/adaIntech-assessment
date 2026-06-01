import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from '../shared/logger/pino.logger';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  logger.info('Seeding database...');

  const preference = await prisma.notificationPreference.upsert({
    where: {
      userId_tenantId: {
        userId: 'user-001',
        tenantId: 'tenant-001',
      },
    },
    update: {},
    create: {
      userId: 'user-001',
      tenantId: 'tenant-001',
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      timezone: 'Africa/Lagos',
      categories: {
        create: [
          {
            tenantId: 'tenant-001',
            category: 'compliance',
            enabled: true,
            deliveryMode: 'realtime',
          },
          {
            tenantId: 'tenant-001',
            category: 'billing',
            enabled: true,
            deliveryMode: 'daily_digest',
          },
          {
            tenantId: 'tenant-001',
            category: 'engagement',
            enabled: false,
            deliveryMode: 'daily_digest',
          },
          {
            tenantId: 'tenant-001',
            category: 'system',
            enabled: true,
            deliveryMode: 'realtime',
          },
        ],
      },
    },
  });

  logger.info({ preferenceId: preference.id }, 'Seed complete');
}

main()
  .catch((err) => {
    logger.error(err, 'Seed failed');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });