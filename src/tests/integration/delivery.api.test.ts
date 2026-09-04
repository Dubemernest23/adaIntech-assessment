import { DeliveryRepository } from '../../modules/delivery/delivery.repo';

jest.mock('../../database/prisma.client', () => ({
  prisma: {
    deliveryRecord: {
      findMany: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
    },
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

import { prisma } from '../../database/prisma.client';

const mockFindMany = prisma.deliveryRecord.findMany as jest.Mock;
const mockGroupBy = prisma.deliveryRecord.groupBy as jest.Mock;


describe('DeliveryRepository Tenant Isolation', () => {

  let repository: DeliveryRepository;


  beforeEach(() => {
    jest.clearAllMocks();
    repository = new DeliveryRepository();
  });


  it('should only return records for the specified tenant and user', async () => {

        const records = [
            {
                id: 'delivery-1',
                tenantId: 'tenant-001',
                userId: 'user-001',
                status: 'sent',
            },
        ];

        mockFindMany.mockResolvedValue(records);

        const result = await repository.findByUserAndTenant(
            'user-001',
            'tenant-001'
        );

        expect(mockFindMany).toHaveBeenCalledWith({
            where:{
                tenantId:'tenant-001',
                userId:'user-001'
            },
            orderBy:{
                attemptedAt:'desc'
            }
        });
        expect(result).toEqual(records);
    });



    it('should not allow cross tenant event lookup', async () => {

        mockFindMany.mockResolvedValue([]);

        const result = await repository.findByEventId(
           'event-123',
            'tenant-001'
        );

        expect(mockFindMany).toHaveBeenCalledWith({
            where:{
                eventId:'event-123',
                tenantId:'tenant-001'
            }
        });

        expect(result).toEqual([]);
    });



    it('should apply tenant isolation when filtering history', async()=>{
        mockFindMany.mockResolvedValue([]);

        await repository.findByUserAndTenantFiltered(
            'user-001',
            'tenant-001',
            {
                limit:20,
                from: new Date('2026-01-01T00:00:00Z'),
            }
        );

        const query = mockFindMany.mock.calls[0][0];

        expect(query.where).toEqual(
            expect.objectContaining({
                userId:'user-001',
                tenantId:'tenant-001'
            })
        );
        expect(query.take).toBe(20);
        expect(query.where.attemptedAt.gte)
        .toEqual(new Date('2026-01-01T00:00:00Z'));

    });



    it('should return delivery summary grouped by status and channel', async()=>{

        mockGroupBy
        .mockResolvedValueOnce([
            {
                status:'sent',
                _count:{
                    _all:5
                }
            }
        ])
        .mockResolvedValueOnce([
            {
                channel:'email',
                _count:{
                    _all:5
                }
            }
        ]);
        const result = await repository.getSummaryByUserAndTenant(
            'user-001',
            'tenant-001'
        );

        expect(mockGroupBy).toHaveBeenCalledTimes(2);

        expect(mockGroupBy).toHaveBeenCalledWith(
            expect.objectContaining({
                by:['status'],
                where:{
                    userId:'user-001',
                    tenantId:'tenant-001'
                }
            })
        );
        expect(result).toEqual({
            byStatus:[
                {
                    status:'sent',
                    count:5
                }
            ],
            byChannel:[
                {
                    channel:'email',
                    count:5
                }
            ],
            total:5
        });
    });


    it('should filter history using only end date', async()=>{

        mockFindMany.mockResolvedValue([]);

        await repository.findByUserAndTenantFiltered(
            'user-001',
            'tenant-001',
            {
                to: new Date('2026-12-31')
            }
        );

        const query = mockFindMany.mock.calls[0][0];

        expect(query.where.attemptedAt.lte)
            .toEqual(new Date('2026-12-31'));
    });

    it('should not include attemptedAt filter when dates are missing', async()=>{

        mockFindMany.mockResolvedValue([]);

        await repository.findByUserAndTenantFiltered(
            'user-001',
            'tenant-001',
            {
                limit:10
            }
        );
        const query = mockFindMany.mock.calls[0][0];

        expect(query.where.attemptedAt)
            .toBeUndefined();

    });

    it('should apply limit when within valid range', async () => {
        mockFindMany.mockResolvedValue([]);

        await repository.findByUserAndTenantFiltered(
            'user-001',
            'tenant-001',
            { limit: 100 },
        );

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 100 }),
        );
    });

}); 