import { OrchestratorService } from '../../modules/orchestrator/orchestrator.service';

// Mock all external dependencies
jest.mock('../../modules/notifications/notification.repo');
jest.mock('../../modules/delivery/delivery.repo');
jest.mock('../../modules/providers/provider-registry');
jest.mock('../../shared/queues/queue.config', () => ({
  digestQueue: { add: jest.fn().mockResolvedValue({}) },
  dlqQueue: { add: jest.fn().mockResolvedValue({}) },
}));
jest.mock('../../database/prisma.client', () => ({
  prisma: {},
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));
jest.mock('../../shared/logger/pino.logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { NotificationRepository } from '../../modules/notifications/notification.repo';
import { DeliveryRepository } from '../../modules/delivery/delivery.repo';
import { ProviderRegistry } from '../../modules/providers/provider-registry';

const mockFindByUserAndTenant = jest.fn();
const mockCreateRecord = jest.fn().mockResolvedValue({});
const mockGetProvider = jest.fn();

(NotificationRepository as jest.Mock).mockImplementation(() => ({
  findByUserAndTenant: mockFindByUserAndTenant,
}));

(DeliveryRepository as jest.Mock).mockImplementation(() => ({
  createRecord: mockCreateRecord,
}));

(ProviderRegistry as jest.Mock).mockImplementation(() => ({
  getProvider: mockGetProvider,
}));

const basePreference = {
  emailEnabled: true,
  smsEnabled: false,
  inAppEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: 'UTC',
  categories: [
    { category: 'billing', enabled: true, deliveryMode: 'realtime' },
    { category: 'compliance', enabled: true, deliveryMode: 'realtime' },
    { category: 'engagement', enabled: true, deliveryMode: 'daily_digest' },
    { category: 'system', enabled: true, deliveryMode: 'realtime' },
  ],
};

const baseInput = {
  eventId: 'test-event-id',
  eventType: 'transaction_created',
  userId: 'user-001',
  tenantId: 'tenant-001',
  payload: { amount: 1000 },
  correlationId: 'test-correlation-id',
};

describe('OrchestratorService', () => {
  let service: OrchestratorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrchestratorService();
  });

  it('should skip when preferences not found', async () => {
    mockFindByUserAndTenant.mockResolvedValue(null);

    const result = await service.orchestrate(baseInput);

    expect(result.outcomes[0].status).toBe('skipped');
    expect(result.outcomes[0].skipReason).toBe('preferences_not_found');
    expect(mockCreateRecord).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'skipped', skipReason: 'preferences_not_found' }),
    );
  });

  it('should skip when category is disabled', async () => {
    mockFindByUserAndTenant.mockResolvedValue({
      ...basePreference,
      categories: [
        { category: 'billing', enabled: false, deliveryMode: 'realtime' },
      ],
    });

    const result = await service.orchestrate(baseInput);

    expect(result.outcomes[0].status).toBe('skipped');
    expect(result.outcomes[0].skipReason).toBe('category_disabled');
  });

  it('should deliver via provider when category is enabled', async () => {
    mockFindByUserAndTenant.mockResolvedValue(basePreference);
    mockGetProvider.mockReturnValue({
      send: jest.fn().mockResolvedValue({ success: true, providerId: 'mock-123' }),
    });

    const result = await service.orchestrate(baseInput);

    expect(result.outcomes[0].status).toBe('sent');
    expect(mockCreateRecord).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent', channel: 'email' }),
    );
  });

  it('should queue for digest when delivery mode is daily_digest', async () => {
    const { digestQueue } = require('../../shared/queues/queue.config');
    mockFindByUserAndTenant.mockResolvedValue(basePreference);

    const digestInput = { ...baseInput, eventType: 'user_onboarded' };
    const result = await service.orchestrate(digestInput);

    expect(result.outcomes[0].status).toBe('queued');
    expect(digestQueue.add).toHaveBeenCalled();
  });

  it('should record failed delivery when provider returns failure', async () => {
    mockFindByUserAndTenant.mockResolvedValue(basePreference);
    mockGetProvider.mockReturnValue({
      send: jest.fn().mockResolvedValue({ success: false, error: 'Provider error' }),
    });

    const result = await service.orchestrate(baseInput);

    expect(result.outcomes[0].status).toBe('failed');
    expect(mockCreateRecord).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('should continue other channels when one fails', async () => {
    const multiChannelPreference = {
      ...basePreference,
      emailEnabled: true,
      smsEnabled: true,
    };
    mockFindByUserAndTenant.mockResolvedValue(multiChannelPreference);

    mockGetProvider
      .mockReturnValueOnce({
        send: jest.fn().mockRejectedValue(new Error('Email crashed')),
      })
      .mockReturnValueOnce({
        send: jest.fn().mockResolvedValue({ success: true, providerId: 'sms-123' }),
      });

    const result = await service.orchestrate(baseInput);

    const statuses = result.outcomes.map((o) => o.status);
    expect(statuses).toContain('failed');
    expect(statuses).toContain('sent');
  });
});