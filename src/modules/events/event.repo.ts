import { prisma } from '../../database/prisma.client';
import { IncomingEventInput } from './event.validation';

export class EventRepository {
  async findByEventId(eventId: string) {
    return prisma.incomingEvent.findUnique({
      where: { eventId },
    });
  }

  async createEvent(data: IncomingEventInput, tenantId: string) {
    return prisma.incomingEvent.create({
      data: {
        eventId: data.eventId,
        eventType: data.eventType as any,
        tenantId,
        userId: data.userId,
        productLine: data.productLine as any,
        schemaVersion: data.schemaVersion,
        payload: data.payload as any,
        occurredAt: new Date(data.occurredAt),
      },
    });
  }

  async markAsProcessed(eventId: string) {
    return prisma.incomingEvent.update({
      where: { eventId },
      data: { processed: true },
    });
  }
}