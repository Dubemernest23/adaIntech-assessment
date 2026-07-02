import { CategoryMappingRepository } from '../../modules/evaluation/category-router.repo';

jest.mock('../../database/prisma.client', () => ({
    prisma: {
        categoryMapping: {
            findFirst: jest.fn(),
        },
    },
}));

const { prisma } = require('../../database/prisma.client');

describe('CategoryMappingRepository', () => {
    let repo: CategoryMappingRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = new CategoryMappingRepository();
    });

    it('should query by eventType and tenantId for tenant lookup', async () => {
        prisma.categoryMapping.findFirst.mockResolvedValue({ category: 'billing' });

        const result = await repo.findByTenant('transaction_created', 'tenant-001');

        expect(prisma.categoryMapping.findFirst).toHaveBeenCalledWith({
            where: { eventType: 'transaction_created', tenantId: 'tenant-001' },
        });
        expect(result?.category).toBe('billing');
    });

    it('should query by eventType and productLine with tenantId null for product-line lookup', async () => {
        prisma.categoryMapping.findFirst.mockResolvedValue({ category: 'compliance' });

        const result = await repo.findByProductLine('transaction_created', 'fintech');

        expect(prisma.categoryMapping.findFirst).toHaveBeenCalledWith({
            where: { eventType: 'transaction_created', productLine: 'fintech', tenantId: null },
        });
        expect(result?.category).toBe('compliance');
    });
});