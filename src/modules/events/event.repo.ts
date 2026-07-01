import { prisma } from '../../database/prisma.client';
import { IncomingEventInput } from './event.validation';

export class EventRepository {
  async findEventById(eventId: string){
    return prisma.incomingEvent.findUnique({
      where:{eventId}
    })
  }

  async createEvent(data: IncomingEventInput) {
    return prisma.incomingEvent.create({
      data: {
        eventId: data.eventId,
        eventType: data.eventType as any,
        tenantId: data.tenantId,
        userId: data.userId,
        productLine: data.productLine as any,
        schemaVersion: data.schemaVersion,
        payload: data.payload as any,
        occurredAt: new Date(data.occurredAt),
        orchestrationStatus: 'PENDING' as any,
      },
    });
  }

  async updateOrchestrationStatus(
    eventId: string,
    status: 'PENDING' | 'QUEUED' | 'COMPLETED' | 'ENQUEUE_FAILED' | 'FAILED'
  ) {
    return prisma.incomingEvent.update({
      where: {eventId},
      data: {orchestrationStatus: status as any}
    })
  }

  async findRecoverableEvents(){
    return prisma.incomingEvent.findMany({
      where: {
         orchestrationStatus: { in: ['PENDING', 'ENQUEUE_FAILED'] as any },
        receivedAt: { lt: new Date(Date.now() - 60 * 1000) },
      }
    })
  }
}
