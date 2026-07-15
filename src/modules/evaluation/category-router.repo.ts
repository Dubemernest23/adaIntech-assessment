import { prisma } from "../../database/prisma.client";
import { CategoryMapping } from '@prisma/client';

export class CategoryMappingRepository {
    findByTenant(eventType: string, tenantId: string): Promise<CategoryMapping | null> {
        return prisma.categoryMapping.findFirst({
            where: {
                eventType,
                tenantId
            }
        })
    }


    findByProductLine(eventType: string, productLine: string): Promise<CategoryMapping | null> {
        return prisma.categoryMapping.findFirst({
            where: {
                eventType,
                productLine,
                tenantId: null
            }
        })
    }

}

