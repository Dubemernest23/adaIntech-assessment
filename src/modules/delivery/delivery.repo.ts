import { DeliveryStatus } from '@prisma/client';
import { prisma } from '../../database/prisma.client';
import { CreateDeliveryRecordInput, DeliveryStatusEnum } from './delivery.types';

const STATUS_MAP: Record<DeliveryStatusEnum, DeliveryStatus>={
    sent: DeliveryStatus.sent,
    failed: DeliveryStatus.failed,
    skipped: DeliveryStatus.skipped,
    queued: DeliveryStatus.queued
};


export class DeliveryRepository {
    async createRecord(data: CreateDeliveryRecordInput) {
        return prisma.deliveryRecord.create({
            data: {
                eventId: data.eventId,
                userId: data.userId,
                tenantId: data.tenantId,
                channel: data.channel,
                status: STATUS_MAP[data.status],
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