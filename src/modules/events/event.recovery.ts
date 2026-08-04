import { prisma } from '../../database/prisma.client';
import { orchestrationQueue } from '../../shared/queues/queue.config';
import { JOB_NAMES } from '../../shared/constants';
import { logger } from '../../shared/logger/pino.logger';

export const recoverOrphanedEvents = async (): Promise<void> => {

    const orphaned = await prisma.incomingEvent.findMany({
        where: {
            // Only PENDING and ENQUEUE_FAILED are recoverable.
            // FAILED is terminal — the job already exhausted retries and is in the DLQ.
            // COMPLETED and QUEUED are not orphaned.
            orchestrationStatus: { in: ['PENDING', 'ENQUEUE_FAILED'] as any },
            receivedAt: { lt: new Date(Date.now() - 60 * 1000) },
        },
    });


    if (orphaned.length === 0) {
        logger.info('Startup recovery: no orphaned events found');
        return;
    }

    logger.info(
        { count: orphaned.length },
        'Startup recovery: re-enqueueing orphaned events',
    );

    for (const event of orphaned) {
        try {
            await orchestrationQueue.add(
                JOB_NAMES.ORCHESTRATE,
                {
                eventId: event.eventId,
                eventType: event.eventType,
                userId: event.userId,
                tenantId: event.tenantId,
                payload: event.payload,
                productLine: event.productLine,
                correlationId: 'startup-recovery',
                },
                { jobId: `orchestrate-${event.eventId}` },
            );

            await prisma.incomingEvent.update({
                where: { eventId: event.eventId },
                data: { orchestrationStatus: 'QUEUED' as any },
            });

            logger.info({ eventId: event.eventId }, 'Orphaned event recovered');
        } catch (error) {
            logger.error(
                { eventId: event.eventId, error },
                'Failed to recover orphaned event during startup',
            );
        }
    }
};