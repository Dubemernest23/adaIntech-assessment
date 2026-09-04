
const realDbUrl = process.env.REAL_DATABASE_URL;
const describeIfDb = realDbUrl ? describe : describe.skip;

import { prisma } from '../../database/prisma.client';

describeIfDb('CategoryMapping database uniqueness', () => {
    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('rejects duplicate default mappings for the same eventType', async () => {
        const eventType = 'category.mapping.unique.default'

        await prisma.categoryMapping.deleteMany({ where: { eventType } });

        try {
            await prisma.categoryMapping.create({
                data: {
                    eventType,
                    category: 'billing',
                    productLine: null,
                    tenantId: null,
                    isDefault: true,
                },
            });

            await expect(
                prisma.categoryMapping.create({
                    data: {
                        eventType,
                        category: 'compliance',
                        productLine: null,
                        tenantId: null,
                        isDefault: true,
                    },
                }),
            ).rejects.toThrow();
        } finally {
        await prisma.categoryMapping.deleteMany({ where: { eventType } });
        }
    });

    it('rejects duplicate product-line mappings for the same eventType and productLine', async () => {
        const eventType = 'category.mapping.unique.product-line';
        const productLine = 'saas';

            await prisma.categoryMapping.deleteMany({ where: { eventType } });

        try {
            await prisma.categoryMapping.create({
                data: {
                eventType,
                category: 'billing',
                productLine,
                tenantId: null,
                isDefault: false,
                },
            });

            await expect(
                prisma.categoryMapping.create({
                    data: {
                        eventType,
                        category: 'engagement',
                        productLine,
                        tenantId: null,
                        isDefault: false,
                    },
               }),
            ).rejects.toThrow();
        } finally {
            await prisma.categoryMapping.deleteMany({ where: { eventType } });
        }
    });

    it('rejects duplicate tenant mappings for the same eventType and tenantId', async () => {
        const eventType = 'category.mapping.unique.tenant';
        const tenantId = 'tenant-category-mapping-unique';

        await prisma.categoryMapping.deleteMany({ where: { eventType } });

        try {
            await prisma.categoryMapping.create({
                data: {
                eventType,
                category: 'system',
                productLine: null,
                tenantId,
                isDefault: false,
                },
            });

            await expect(
                prisma.categoryMapping.create({
                data: {
                    eventType,
                    category: 'compliance',
                    productLine: null,
                    tenantId,
                    isDefault: false,
                },
                }),
            ).rejects.toThrow();
        } finally {
            await prisma.categoryMapping.deleteMany({ where: { eventType } });
        }
    });
});
