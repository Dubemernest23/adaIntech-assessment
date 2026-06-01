import { Worker, Job } from 'bullmq';
import { redisConfig } from '../../../config';
import { QUEUE_NAMES, JOB_NAMES } from '../../../shared/constants';
import { logger } from '../../../shared/logger/pino.logger';
import { prisma } from '../../../database/prisma.client';

export const startNotificationWorker = (): Worker => {
    const worker = new Worker(
        QUEUE_NAMES.DIGEST,
        async (job: Job) => {
            if (job.name === JOB_NAMES.SEND_DIGEST) {
                await processDailyDigest(job);
            }
            },
            {
            connection: {
                host: redisConfig.host,
                port: redisConfig.port,
            },
        },
    );

    worker.on('completed', (job: Job) => {
        logger.info({ jobId: job.id, jobName: job.name }, 'Job completed');
    });

    worker.on('failed', (job: Job | undefined, error: Error) => {
        logger.error(
        { jobId: job?.id, jobName: job?.name, error: error.message },
        'Job failed',
        );
    });

    logger.info('Notification worker started');
    return worker;
};

const processDailyDigest = async (job: Job): Promise<void> => {
    const { tenantId } = job.data;

    logger.info({ jobId: job.id, tenantId }, 'Processing daily digest');

    // Find users with daily_digest delivery mode for this tenant
    const digestCategories = await prisma.notificationCategoryPreference.findMany({
        where: {
            tenantId,
            deliveryMode: 'daily_digest',
            enabled: true,
        },
        include: {
            preference: true,
        },
    });

    if (digestCategories.length === 0) {
        logger.info({ tenantId }, 'No digest subscriptions found');
        return;
    }

    
    const byUser = digestCategories.reduce(
        (acc, cat) => {
        const userId = cat.preference.userId;
        if (!acc[userId]) acc[userId] = [];
        acc[userId].push(cat.category);
        return acc;
        },
        {} as Record<string, string[]>,
    );

  // Here we log what would be sent if in prod
    for (const [userId, categories] of Object.entries(byUser)) {
        logger.info(
            { userId, tenantId, categories },
            'Would send daily digest notification',
        );

        await job.updateProgress(
        Math.round((Object.keys(byUser).indexOf(userId) + 1) /
            Object.keys(byUser).length * 100),
        );
    }

  logger.info(
    { tenantId, userCount: Object.keys(byUser).length },
    'Daily digest processing complete',
  );
};