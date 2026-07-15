import { CategoryRouterService } from '../../modules/evaluation/category-router.service';
import { CategoryMappingRepository } from '../../modules/evaluation/category-router.repo';

jest.mock('../../modules/evaluation/category-router.repo');
jest.mock('../../shared/logger/pino.logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockFindByTenant = jest.fn();
const mockFindByProductLine = jest.fn();

(CategoryMappingRepository as jest.Mock).mockImplementation(() => ({
    findByTenant: mockFindByTenant,
    findByProductLine: mockFindByProductLine,
}));

describe('CategoryRouterService', () => {
    let service: CategoryRouterService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CategoryRouterService();
    });

    it('should return tenant override when one exists', async () => {
        mockFindByTenant.mockResolvedValue({ category: 'compliance' });
        mockFindByProductLine.mockResolvedValue({ category: 'billing' });

        const result = await service.resolve('transaction_created', 'tenant-001', 'fintech');

        expect(result).toBe('compliance');
        expect(mockFindByProductLine).not.toHaveBeenCalled();
    });

    it('should return product-line mapping when no tenant override exists', async () => {
        mockFindByTenant.mockResolvedValue(null);
        mockFindByProductLine.mockResolvedValue({ category: 'system' });

        const result = await service.resolve('transaction_created', 'tenant-001', 'saas');

        expect(result).toBe('system');
    });

    it('should return default mapping when no DB override exists', async () => {
        mockFindByTenant.mockResolvedValue(null);
        mockFindByProductLine.mockResolvedValue(null);

        const result = await service.resolve('transaction_created', 'tenant-001', 'fintech');

        expect(result).toBe('billing');
    });

    it('should return null for unknown event type with no mapping at any level', async () => {
        mockFindByTenant.mockResolvedValue(null);
        mockFindByProductLine.mockResolvedValue(null);

        const result = await service.resolve('unknown_event', 'tenant-001', 'fintech');

        expect(result).toBeNull();
    });
});