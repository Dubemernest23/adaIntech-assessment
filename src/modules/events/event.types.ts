import type { IncomingEvent } from '@prisma/client';

export type EventTypeEnum = IncomingEvent['eventType'];
export type ProductLineEnum = IncomingEvent['productLine'];

export interface IncomingEventDto {
  eventId: string;
  eventType: EventTypeEnum;
  tenantId: string;
  userId?: string;
  productLine: ProductLineEnum;
  schemaVersion: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface EventIngestionResult {
  eventId: string;
  status: 'accepted' | 'duplicate';
  message: string;
}