jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

jest.mock('../../shared/queues/queue.config', () => ({
  orchestrationQueue: { add: jest.fn() },
  digestQueue: { add: jest.fn() },
  dlqQueue: { add: jest.fn() },
}));

jest.mock('../../modules/events/event.repo');

jest.mock('../../shared/logger/pino.logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EventService } from '../../modules/events/event.service';
import { EventRepository } from '../../modules/events/event.repo';
import { orchestrationQueue } from '../../shared/queues/queue.config';

const mockFindEventById = jest.fn();
const mockCreateEvent = jest.fn();
const mockUpdateOrchestrationStatus = jest.fn();

(EventRepository as jest.Mock).mockImplementation(() => ({
  findEventById: mockFindEventById,
  createEvent: mockCreateEvent,
  updateOrchestrationStatus: mockUpdateOrchestrationStatus,
}));

const mockQueueAdd = orchestrationQueue.add as jest.Mock;

const testEvent = {
  eventId: 'test-event-id',
  eventType: 'transaction_created' as const,
  tenantId: 'tenant-001',
  userId: 'user-001',
  productLine: 'fintech' as const,
  schemaVersion: '1.0' as const,
  payload: { amount: 1000 },
  occurredAt: '2026-06-06T14:00:00Z',
};

const savedEvent = {
  eventId: testEvent.eventId,
  eventType: testEvent.eventType,
  tenantId: testEvent.tenantId,
  userId: testEvent.userId,
  payload: testEvent.payload,
  orchestrationStatus: 'PENDING',
};

describe('EventService — D1 ingestion-to-queue durability', () => {
  let service: EventService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EventService();
  });

  describe('New event ingestion', () => {
    it('should save event as PENDING then update to QUEUED on successful enqueue', async () => {
      mockFindEventById.mockResolvedValue(null);
      mockCreateEvent.mockResolvedValue(savedEvent);
      mockQueueAdd.mockResolvedValue({});
      mockUpdateOrchestrationStatus.mockResolvedValue({});

      const result = await service.ingestEvent(testEvent, 'corr-001');

      expect(result.status).toBe('accepted');
      expect(mockCreateEvent).toHaveBeenCalledTimes(1);
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'orchestrate-notification',
        expect.objectContaining({ eventId: testEvent.eventId }),
        expect.objectContaining({
          jobId: `orchestrate-${testEvent.eventId}`,
        }),
      );
      expect(mockUpdateOrchestrationStatus).toHaveBeenCalledWith(
        testEvent.eventId,
        'QUEUED',
      );
    });

    it('should mark event ENQUEUE_FAILED when queue.add fails — event remains recoverable', async () => {
      mockFindEventById.mockResolvedValue(null);
      mockCreateEvent.mockResolvedValue(savedEvent);
      mockQueueAdd.mockRejectedValue(new Error('Redis unavailable'));
      mockUpdateOrchestrationStatus.mockResolvedValue({});

      const result = await service.ingestEvent(testEvent, 'corr-002');

      expect(result.status).toBe('accepted');
      expect(mockUpdateOrchestrationStatus).toHaveBeenCalledWith(
        testEvent.eventId,
        'ENQUEUE_FAILED',
      );
    });
  });

  describe('Idempotency and re-enqueue', () => {
    it('should re-enqueue when retried with same eventId and status is ENQUEUE_FAILED', async () => {
      mockFindEventById.mockResolvedValue({
        ...savedEvent,
        orchestrationStatus: 'ENQUEUE_FAILED',
      });
      mockQueueAdd.mockResolvedValue({});
      mockUpdateOrchestrationStatus.mockResolvedValue({});

      const result = await service.ingestEvent(testEvent, 'corr-003');

      expect(result.status).toBe('accepted');
      expect(mockCreateEvent).not.toHaveBeenCalled();
      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      expect(mockUpdateOrchestrationStatus).toHaveBeenCalledWith(
        testEvent.eventId,
        'QUEUED',
      );
    });

    it('should re-enqueue when retried with same eventId and status is PENDING', async () => {
      mockFindEventById.mockResolvedValue({
        ...savedEvent,
        orchestrationStatus: 'PENDING',
      });
      mockQueueAdd.mockResolvedValue({});
      mockUpdateOrchestrationStatus.mockResolvedValue({});

      const result = await service.ingestEvent(testEvent, 'corr-004');

      expect(result.status).toBe('accepted');
      expect(mockCreateEvent).not.toHaveBeenCalled();
      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('should return duplicate when event is already QUEUED', async () => {
      mockFindEventById.mockResolvedValue({
        ...savedEvent,
        orchestrationStatus: 'QUEUED',
      });

      const result = await service.ingestEvent(testEvent, 'corr-005');

      expect(result.status).toBe('duplicate');
      expect(mockQueueAdd).not.toHaveBeenCalled();
      expect(mockCreateEvent).not.toHaveBeenCalled();
    });

    it('should return duplicate when event is already COMPLETED', async () => {
      mockFindEventById.mockResolvedValue({
        ...savedEvent,
        orchestrationStatus: 'COMPLETED',
      });

      const result = await service.ingestEvent(testEvent, 'corr-006');

      expect(result.status).toBe('duplicate');
      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  describe('userId validation', () => {
    it('should reject event without userId at schema level', () => {
      const { incomingEventSchema } = require('../../modules/events/event.validation');

      const eventWithoutUserId = {
        ...testEvent,
        userId: undefined,
      };

      const result = incomingEventSchema.safeParse(eventWithoutUserId);
      expect(result.success).toBe(false);
    });

    it('should reject event with empty userId', () => {
      const { incomingEventSchema } = require('../../modules/events/event.validation');

      const eventWithEmptyUserId = {
        ...testEvent,
        userId: '',
      };

      const result = incomingEventSchema.safeParse(eventWithEmptyUserId);
      expect(result.success).toBe(false);
    });
  });
});