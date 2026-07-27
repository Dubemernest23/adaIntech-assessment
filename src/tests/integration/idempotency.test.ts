jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

jest.mock('../../modules/events/event.repo');
jest.mock('../../shared/queues/queue.config', () => ({
  orchestrationQueue: { add: jest.fn() },
  digestQueue: { add: jest.fn() },
  dlqQueue: { add: jest.fn() },
}));
jest.mock('../../shared/logger/pino.logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EventService } from '../../modules/events/event.service';
import { EventRepository } from '../../modules/events/event.repo';

const mockFindEventById = jest.fn();
const mockCreateEvent = jest.fn();
const mockUpdateOrchestrationStatus = jest.fn().mockResolvedValue({});

(EventRepository as jest.Mock).mockImplementation(() => ({
  findEventById: mockFindEventById,
  createEvent: mockCreateEvent,
  updateOrchestrationStatus: mockUpdateOrchestrationStatus,
}));

const testEvent = {
  eventId: 'test-idempotency-event',
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
};

describe('Event Idempotency — R2', () => {
  let service: EventService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EventService();
  });

  it('should accept a new event and enqueue orchestration', async () => {
    mockFindEventById.mockResolvedValue(null);
    mockCreateEvent.mockResolvedValue({
      ...savedEvent,
      orchestrationStatus: 'PENDING',
    });

    const result = await service.ingestEvent(testEvent, 'correlation-001');

    expect(result.status).toBe('accepted');
    expect(mockCreateEvent).toHaveBeenCalledTimes(1);
  });

  it('should return duplicate when event is already QUEUED — R2', async () => {
    mockFindEventById.mockResolvedValue({
      ...savedEvent,
      orchestrationStatus: 'QUEUED',
    });

    const result = await service.ingestEvent(testEvent, 'correlation-002');

    expect(result.status).toBe('duplicate');
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('should return duplicate when event is already COMPLETED — R2', async () => {
    mockFindEventById.mockResolvedValue({
      ...savedEvent,
      orchestrationStatus: 'COMPLETED',
    });

    const result = await service.ingestEvent(testEvent, 'correlation-003');

    expect(result.status).toBe('duplicate');
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('should re-enqueue when same eventId retried with ENQUEUE_FAILED status', async () => {
    mockFindEventById.mockResolvedValue({
      ...savedEvent,
      orchestrationStatus: 'ENQUEUE_FAILED',
    });

    const result = await service.ingestEvent(testEvent, 'correlation-004');

    expect(result.status).toBe('accepted');
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('should only create event once across multiple submissions of same eventId', async () => {
    mockFindEventById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...savedEvent, orchestrationStatus: 'QUEUED' });

    mockCreateEvent.mockResolvedValue({
      ...savedEvent,
      orchestrationStatus: 'PENDING',
    });

    const first = await service.ingestEvent(testEvent, 'correlation-005');
    const second = await service.ingestEvent(testEvent, 'correlation-006');

    expect(first.status).toBe('accepted');
    expect(second.status).toBe('duplicate');
    expect(mockCreateEvent).toHaveBeenCalledTimes(1);
  });
});