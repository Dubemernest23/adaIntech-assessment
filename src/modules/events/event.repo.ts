import { EventType, OrchestrationStatus, ProductLine, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.client';
import { IncomingEventInput } from './event.validation';

export class EventRepository {
    async findEventById(eventId: string) {
        return prisma.incomingEvent.findUnique({
            where: { eventId },
        });
    }

    async createEvent(data: IncomingEventInput) {
        return prisma.incomingEvent.create({
            data: {
                eventId: data.eventId,
                eventType: data.eventType as EventType,
                tenantId: data.tenantId,
                userId: data.userId,
                productLine: data.productLine as ProductLine,
                schemaVersion: data.schemaVersion,
                payload: data.payload as Prisma.InputJsonValue,
                occurredAt: new Date(data.occurredAt),
                orchestrationStatus: OrchestrationStatus.PENDING,
            },
        });
    }

    async updateOrchestrationStatus(
        eventId: string,
        status: 'PENDING' | 'QUEUED' | 'COMPLETED' | 'ENQUEUE_FAILED' | 'FAILED',
    ) {
        return prisma.incomingEvent.update({
            where: { eventId },
            data: { orchestrationStatus: status as OrchestrationStatus },
        });
    }

    async findRecoverableEvents() {
        return prisma.incomingEvent.findMany({
            where: {
                orchestrationStatus: {
                    in: [OrchestrationStatus.PENDING, OrchestrationStatus.ENQUEUE_FAILED],
                },
                receivedAt: { lt: new Date(Date.now() - 60 * 1000) },
            },
        });
    }
}