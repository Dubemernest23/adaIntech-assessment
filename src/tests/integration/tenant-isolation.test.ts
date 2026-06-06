import { DeliveryRepository } from '../../modules/delivery/delivery.repo';

jest.mock('../../database/prisma.client', () => ({
  prisma: {
    deliveryRecord: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

import { prisma } from '../../database/prisma.client';

const mockFindMany = prisma.deliveryRecord.findMany as jest.Mock;

describe('Tenant Isolation', () => {
  let repository: DeliveryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new DeliveryRepository();
  });

  it('should only return records for the specified tenant', async () => {
    const tenant001Records = [
      { id: '1', tenantId: 'tenant-001', userId: 'user-001', status: 'sent' },
    ];

    mockFindMany.mockResolvedValue(tenant001Records);

    const result = await repository.findByUserAndTenant('user-001', 'tenant-001');

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-001',
          userId: 'user-001',
        }),
      }),
    );
    expect(result).toEqual(tenant001Records);
  });

  it('should not return tenant-002 records when querying tenant-001', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await repository.findByUserAndTenant('user-002', 'tenant-001');

    expect(result).toEqual([]);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-001',
        }),
      }),
    );
  });

  it('should always scope queries by tenantId — cross-tenant access impossible', async () => {
    await repository.findByUserAndTenant('user-001', 'tenant-002');

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.tenantId).toBe('tenant-002');
    expect(callArgs.where.tenantId).not.toBe('tenant-001');
  });
});