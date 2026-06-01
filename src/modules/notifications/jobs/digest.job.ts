import { digestQueue } from '../../../shared/queues/queue.config';
import { QUEUE_NAMES, JOB_NAMES } from '../../../shared/constants';
import { logger } from '../../../shared/logger/pino.logger';

export const scheduleDailyDigest = async (tenantId: string): Promise<void> => {
    await digestQueue.add(
        JOB_NAMES.SEND_DIGEST,
        { tenantId },
        {
        repeat: {
            pattern: '0 8 * * *', // Every day at 8:00 AM
        },
        jobId: `${QUEUE_NAMES.DIGEST}-${tenantId}`,
        },
    );

    logger.info({ tenantId }, 'Daily digest job scheduled');
};

export const triggerDigestNow = async (tenantId: string): Promise<void> => {
    await digestQueue.add(
        JOB_NAMES.SEND_DIGEST,
        { tenantId },
        {
        jobId: `${QUEUE_NAMES.DIGEST}-${tenantId}-manual-${Date.now()}`,
        },
    );

    logger.info({ tenantId }, 'Daily digest triggered manually');
};