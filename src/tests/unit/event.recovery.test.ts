jest.mock('../../database/prisma.client', () => ({
    prisma: {
        incomingEvent: {
            findMany: jest.fn(),
            update: jest.fn(),
        },
    },
    connectDatabase: jest.fn(),
    disconnectDatabase: jest.fn(),
}));

jest.mock('../../shared/queues/queue.config', () => ({
  orchestrationQueue: { add: jest.fn() },
  digestQueue: { add: jest.fn() },
  dlqQueue: { add: jest.fn() },
}));

jest.mock('../../shared/logger/pino.logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { recoverOrphanedEvents } from '../../modules/events/event.recovery';
import { prisma } from '../../database/prisma.client';
import { orchestrationQueue } from '../../shared/queues/queue.config';

const mockFindMany = prisma.incomingEvent.findMany as jest.Mock;
const mockUpdate = prisma.incomingEvent.update as jest.Mock;
const mockQueueAdd = orchestrationQueue.add as jest.Mock;

describe('recoverOrphanedEvents', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should only query for PENDING and ENQUEUE_FAILED — never FAILED', async () => {
        mockFindMany.mockResolvedValue([]);

        await recoverOrphanedEvents();

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    orchestrationStatus: expect.objectContaining({
                        in: ['PENDING', 'ENQUEUE_FAILED'],
                    }),
                }),
            }),
        );
    });

    it('should not include FAILED events in the query filter', async () => {
        mockFindMany.mockResolvedValue([]);

        await recoverOrphanedEvents();

        const callArgs = mockFindMany.mock.calls[0][0];
        expect(callArgs.where.orchestrationStatus.in).not.toContain('FAILED');
    });

    it('should re-enqueue orphaned PENDING events and update status to QUEUED', async () => {
        mockFindMany.mockResolvedValue([
            {
                eventId: 'orphan-1',
                eventType: 'transaction_created',
                userId: 'user-001',
                tenantId: 'tenant-001',
                productLine: 'fintech',
                payload: {},
            },
        ]);
        mockQueueAdd.mockResolvedValue({});
        mockUpdate.mockResolvedValue({});

        await recoverOrphanedEvents();

        expect(mockQueueAdd).toHaveBeenCalledTimes(1);
        expect(mockQueueAdd).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                eventId: 'orphan-1',
                productLine: 'fintech',
            }),
            expect.anything(),
        );
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { eventId: 'orphan-1' },
                data: { orchestrationStatus: 'QUEUED' },
            }),
        );
    });

    it('should do nothing when no orphaned events exist', async () => {
        mockFindMany.mockResolvedValue([]);

        await recoverOrphanedEvents();

        expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it('should never re-enqueue an event that has reached the terminal FAILED state', async () => {

        mockFindMany.mockImplementation(({ where }) => {
            const allEvents = [
            { eventId: 'recovered-1', orchestrationStatus: 'PENDING', userId: 'user-001', tenantId: 'tenant-001', eventType: 'transaction_created', productLine: 'fintech', payload: {} },
            { eventId: 'dlqed-event', orchestrationStatus: 'FAILED', userId: 'user-002', tenantId: 'tenant-001', eventType: 'transaction_created', productLine: 'fintech', payload: {} },
            ];
            const allowedStatuses: string[] = where.orchestrationStatus.in;
            return Promise.resolve(
            allEvents.filter((e) => allowedStatuses.includes(e.orchestrationStatus)),
            );
        });

        mockQueueAdd.mockResolvedValue({});
        mockUpdate.mockResolvedValue({});

        await recoverOrphanedEvents();

        // Only the PENDING event should have been re-enqueued
        expect(mockQueueAdd).toHaveBeenCalledTimes(1);
        expect(mockQueueAdd).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ eventId: 'recovered-1' }),
            expect.anything(),
        );


        // The FAILED (DLQ'd) event must never be touched
        expect(mockQueueAdd).not.toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ eventId: 'dlqed-event' }),
            expect.anything(),
        );
    });
});
