import { prisma } from '../../database/prisma.client';
import { CreateDeliveryRecordInput } from './delivery.types';

export class DeliveryRepository {
    async createRecord(data: CreateDeliveryRecordInput) {
        return prisma.deliveryRecord.create({
            data: {
                eventId: data.eventId,
                userId: data.userId,
                tenantId: data.tenantId,
                channel: data.channel,
                status: data.status as any,
                skipReason: data.skipReason,
                correlationId: data.correlationId,
            },
        });
    }

    async findByUserAndTenant(userId: string, tenantId: string) {
        return prisma.deliveryRecord.findMany({
            where: {
                userId,
                tenantId,
            },
            orderBy: {
                attemptedAt: 'desc',
            },
        });
    }

    async findByEventId(eventId: string, tenantId: string) {
        return prisma.deliveryRecord.findMany({
            where: {
                eventId,
                tenantId,
            },
        });
    }
}