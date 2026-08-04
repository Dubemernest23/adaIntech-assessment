jest.mock('../../modules/events/event.repo');
jest.mock('../../modules/evaluation/category-router.repo');
jest.mock('../../modules/notifications/notification.repo');
jest.mock('../../modules/delivery/delivery.repo');

jest.mock('../../shared/queues/queue.config', () => ({
  orchestrationQueue: { add: jest.fn() },
  digestQueue: { add: jest.fn() },
  dlqQueue: { add: jest.fn() },
}));

jest.mock('../../shared/logger/pino.logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { Job } from 'bullmq';
import { EventRepository } from '../../modules/events/event.repo';
import { CategoryMappingRepository } from '../../modules/evaluation/category-router.repo';
import { NotificationRepository } from '../../modules/notifications/notification.repo';
import { DeliveryRepository } from '../../modules/delivery/delivery.repo';
import { EventService } from '../../modules/events/event.service';
import { processOrchestration } from '../../modules/orchestrator/orchestrator.worker';
import { digestQueue, orchestrationQueue } from '../../shared/queues/queue.config';
import { JOB_NAMES } from '../../shared/constants';

const mockFindEventById = jest.fn();
const mockCreateEvent = jest.fn();
const mockUpdateOrchestrationStatus = jest.fn();
const mockFindByTenant = jest.fn();
const mockFindByProductLine = jest.fn();
const mockFindByUserAndTenant = jest.fn();
const mockCreateDeliveryRecord = jest.fn();

(EventRepository as jest.Mock).mockImplementation(() => ({
  findEventById: mockFindEventById,
  createEvent: mockCreateEvent,
  updateOrchestrationStatus: mockUpdateOrchestrationStatus,
}));

(CategoryMappingRepository as jest.Mock).mockImplementation(() => ({
  findByTenant: mockFindByTenant,
  findByProductLine: mockFindByProductLine,
}));

(NotificationRepository as jest.Mock).mockImplementation(() => ({
  findByUserAndTenant: mockFindByUserAndTenant,
}));

(DeliveryRepository as jest.Mock).mockImplementation(() => ({
  createRecord: mockCreateDeliveryRecord,
}));

describe('product-line routing integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUpdateOrchestrationStatus.mockResolvedValue({});
    mockCreateDeliveryRecord.mockResolvedValue({});
    mockFindByTenant.mockResolvedValue(null);
    mockFindByProductLine.mockImplementation((eventType, productLine) =>
      eventType === 'transaction_created' && productLine === 'saas'
        ? Promise.resolve({ category: 'system' })
        : Promise.resolve(null),
    );
    mockFindByUserAndTenant.mockResolvedValue({
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      timezone: 'UTC',
      categories: [
        { category: 'billing', enabled: false, deliveryMode: 'realtime' },
        { category: 'system', enabled: true, deliveryMode: 'daily_digest' },
      ],
    });
  });

  it('passes productLine from ingestion into the worker so product-line category overrides are used', async () => {
    const incomingEvent = {
      eventId: 'product-line-routing-event',
      eventType: 'transaction_created' as const,
      tenantId: 'tenant-product-line',
      userId: 'user-product-line',
      productLine: 'saas' as const,
      schemaVersion: '1.0' as const,
      payload: { amount: 2500 },
      occurredAt: '2026-06-06T14:00:00Z',
    };

    mockFindEventById.mockResolvedValue(null);
    mockCreateEvent.mockResolvedValue({
      ...incomingEvent,
      orchestrationStatus: 'PENDING',
    });
    (orchestrationQueue.add as jest.Mock).mockResolvedValue({});
    (digestQueue.add as jest.Mock).mockResolvedValue({});

    const service = new EventService();
    await service.ingestEvent(incomingEvent, 'corr-product-line');

    const queuedJobPayload = (orchestrationQueue.add as jest.Mock).mock.calls[0][1];

    expect(queuedJobPayload).toEqual(
      expect.objectContaining({
        eventId: incomingEvent.eventId,
        productLine: 'saas',
      }),
    );

    await processOrchestration({
      id: 'job-product-line-routing',
      name: JOB_NAMES.ORCHESTRATE,
      data: queuedJobPayload,
      attemptsMade: 0,
    } as Job);

    expect(mockFindByProductLine).toHaveBeenCalledWith(
      'transaction_created',
      'saas',
    );
    expect(digestQueue.add).toHaveBeenCalledWith(
      JOB_NAMES.SEND_DIGEST,
      expect.objectContaining({
        eventId: incomingEvent.eventId,
        tenantId: incomingEvent.tenantId,
      }),
      expect.anything(),
    );
    expect(mockCreateDeliveryRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: incomingEvent.eventId,
        channel: 'digest',
        status: 'queued',
      }),
    );
    expect(mockUpdateOrchestrationStatus).toHaveBeenLastCalledWith(
      incomingEvent.eventId,
      'COMPLETED',
    );
  });
});
