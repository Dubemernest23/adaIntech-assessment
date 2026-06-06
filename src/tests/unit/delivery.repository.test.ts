jest.mock('../../database/prisma.client', () => ({
  prisma: {
    deliveryRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

import { DeliveryRepository } from '../../modules/delivery/delivery.repo';
import { prisma } from '../../database/prisma.client';

const mockCreate = prisma.deliveryRecord.create as jest.Mock;
const mockFindMany = prisma.deliveryRecord.findMany as jest.Mock;

describe('DeliveryRepository', () => {
  let repository: DeliveryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new DeliveryRepository();
  });

  it('should create a delivery record', async () => {
    const record = {
      id: 'record-1',
      eventId: 'event-1',
      userId: 'user-001',
      tenantId: 'tenant-001',
      channel: 'email',
      status: 'sent',
      correlationId: 'corr-1',
    };
    mockCreate.mockResolvedValue(record);

    const result = await repository.createRecord({
      eventId: 'event-1',
      userId: 'user-001',
      tenantId: 'tenant-001',
      channel: 'email',
      status: 'sent',
      correlationId: 'corr-1',
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual(record);
  });

  it('should find records by user and tenant', async () => {
    mockFindMany.mockResolvedValue([]);
    await repository.findByUserAndTenant('user-001', 'tenant-001');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-001', tenantId: 'tenant-001' },
      }),
    );
  });

  it('should find records by eventId and tenant', async () => {
    mockFindMany.mockResolvedValue([]);
    await repository.findByEventId('event-1', 'tenant-001');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: 'event-1', tenantId: 'tenant-001' },
      }),
    );
  });
});