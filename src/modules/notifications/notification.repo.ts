import { prisma } from '../../database/prisma.client';
import { PreferenceContext, UpdatePreferenceInput, ToggleCategoryInput } from './notification.types';
import { NotificationCategory } from '@prisma/client';

export class NotificationRepository {
    async findByUserAndTenant(context: PreferenceContext) {
        return prisma.notificationPreference.findUnique({
            where: {
                userId_tenantId: {
                    userId: context.userId,
                    tenantId: context.tenantId,
                },
            },
            include: {
                categories: true,
            },
        });
    }

    async upsertPreference(context: PreferenceContext, data: UpdatePreferenceInput) {
        const { categories, ...preferenceData } = data;

        return prisma.notificationPreference.upsert({
            where: {
                userId_tenantId: {
                    userId: context.userId,
                  tenantId: context.tenantId,
                },
            },
            update: {
                ...preferenceData,
                ...(categories && {
                categories: {
                    deleteMany: {},
                    create: categories.map((cat) => ({
                        ...cat,
                        tenantId: context.tenantId,
                    })),
                },
                }),
            },
        create: {
            userId: context.userId,
            tenantId: context.tenantId,
            ...preferenceData,
            categories: {
            create: (categories ?? []).map((cat) => ({
                ...cat,
                tenantId: context.tenantId,
            })),
            },
        },
        include: {
            categories: true,
        },
        });
    }

    async toggleCategory(context: PreferenceContext, data: ToggleCategoryInput) {
        // check if preference exists for user and tenant 
        const preference = await this.findByUserAndTenant(context);

        if (!preference) {
            return null;
        }

        // confirm tenant isolation on category level
        return prisma.notificationCategoryPreference.upsert({
            where: {
                preferenceId_category: {
                preferenceId: preference.id,
                category: data.category as NotificationCategory,
                },
            },
            update: {
                enabled: data.enabled,
            },
            create: {
                preferenceId: preference.id,
                tenantId: context.tenantId,
                category: data.category as NotificationCategory,
                enabled: data.enabled,
                deliveryMode: 'realtime',
            },
        });
    }
}