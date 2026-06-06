import { EventService } from '../../modules/events/event.service';

jest.mock('../../modules/events/event.repo');
jest.mock('../../modules/orchestrator/orchestrator.service');
jest.mock('../../shared/logger/pino.logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { EventRepository } from '../../modules/events/event.repo';
import { OrchestratorService } from '../../modules/orchestrator/orchestrator.service';

const mockFindByEventId = jest.fn();
const mockCreateEvent = jest.fn();
const mockOrchestrate = jest.fn().mockResolvedValue({});

(EventRepository as jest.Mock).mockImplementation(() => ({
  findByEventId: mockFindByEventId,
  createEvent: mockCreateEvent,
}));

(OrchestratorService as jest.Mock).mockImplementation(() => ({
  orchestrate: mockOrchestrate,
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

describe('Event Idempotency — R2', () => {
  let service: EventService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EventService();
  });

  it('should accept a new event and trigger orchestration', async () => {
    mockFindByEventId.mockResolvedValue(null);
    mockCreateEvent.mockResolvedValue({ eventId: testEvent.eventId, eventType: 'transaction_created' });

    const result = await service.ingestEvent(testEvent, 'correlation-001');

    expect(result.status).toBe('accepted');
    expect(mockCreateEvent).toHaveBeenCalledTimes(1);
  });

  it('should reject duplicate eventId without creating a new record', async () => {
    mockFindByEventId.mockResolvedValue({
      eventId: testEvent.eventId,
      processed: true,
    });

    const result = await service.ingestEvent(testEvent, 'correlation-002');

    expect(result.status).toBe('duplicate');
    expect(mockCreateEvent).not.toHaveBeenCalled();
    expect(mockOrchestrate).not.toHaveBeenCalled();
  });

  it('should return duplicate for same eventId submitted multiple times', async () => {
    mockFindByEventId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ eventId: testEvent.eventId });

    mockCreateEvent.mockResolvedValue({ eventId: testEvent.eventId });

    const first = await service.ingestEvent(testEvent, 'correlation-003');
    const second = await service.ingestEvent(testEvent, 'correlation-004');

    expect(first.status).toBe('accepted');
    expect(second.status).toBe('duplicate');
    expect(mockCreateEvent).toHaveBeenCalledTimes(1);
  });
});