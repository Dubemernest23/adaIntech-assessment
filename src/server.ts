import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { appConfig } from './config';
import { connectDatabase, disconnectDatabase, prisma } from './database/prisma.client';
import { logger } from './shared/logger/pino.logger';
import { startNotificationWorker } from './modules/notifications/jobs/notification.worker';
import { scheduleDailyDigest } from './modules/notifications/jobs/digest.job';
import { Worker } from 'bullmq';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const worker: Worker = startNotificationWorker();

    // Schedule daily digest for all tenants in the database
    // In production this would also be triggered at tenant onboarding
    const tenants = await prisma.notificationPreference.findMany({
      select: { tenantId: true },
      distinct: ['tenantId'],
    });

    for (const { tenantId } of tenants) {
      await scheduleDailyDigest(tenantId);
      logger.info({ tenantId }, 'Daily digest scheduled for tenant');
    }

    const server = app.listen(appConfig.port, () => {
      logger.info(
        {
          port: appConfig.port,
          environment: appConfig.env,
        },
        'Server started successfully',
      );
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        await worker.close();
        await disconnectDatabase();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
};

startServer();