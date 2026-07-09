import { CategoryMappingRepository } from '../../modules/evaluation/category-router.repo';

jest.mock('../../database/prisma.client', () => ({
    prisma: {
        categoryMapping: {
            findFirst: jest.fn(),
        },
    },
}));

const { prisma } = require('../../database/prisma.client');

/**
 * Uniqueness at the DB level is enforced via three partial unique indexes
 * (see migration: 20260709180446_fix_category_mappings_uniqueness).
 * These tests verify the query shapes that rely on those constraints.
 */

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
    it('should return single result even when called multiple times for same default mapping', async () => {
        prisma.categoryMapping.findFirst.mockResolvedValue({ category: 'billing' });

        const result1 = await repo.findByProductLine('transaction_created', null as any);
        const result2 = await repo.findByProductLine('transaction_created', null as any);

        expect(result1?.category).toBe('billing');
        expect(result2?.category).toBe('billing');
        expect(prisma.categoryMapping.findFirst).toHaveBeenCalledTimes(2);
    });

    it('should query tenant mapping with tenantId scoped correctly, preventing cross-tenant collision', async () => {
        prisma.categoryMapping.findFirst
            .mockResolvedValueOnce({ category: 'compliance' })  // tenant-001
            .mockResolvedValueOnce({ category: 'billing' });    // tenant-002

        const resultTenant1 = await repo.findByTenant('transaction_created', 'tenant-001');
        const resultTenant2 = await repo.findByTenant('transaction_created', 'tenant-002');

        expect(resultTenant1?.category).toBe('compliance');
        expect(resultTenant2?.category).toBe('billing');
        expect(prisma.categoryMapping.findFirst).toHaveBeenNthCalledWith(1, {
            where: { eventType: 'transaction_created', tenantId: 'tenant-001' },
        });
        expect(prisma.categoryMapping.findFirst).toHaveBeenNthCalledWith(2, {
            where: { eventType: 'transaction_created', tenantId: 'tenant-002' },
        });
    });
});