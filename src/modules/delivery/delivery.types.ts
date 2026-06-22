export type DeliveryStatusEnum = 'sent' | 'failed' | 'skipped' | 'queued';

export interface CreateDeliveryRecordInput {
  eventId: string;
  userId: string;
  tenantId: string;
  channel: string;
  status: DeliveryStatusEnum;
  skipReason?: string;
  correlationId: string;
}