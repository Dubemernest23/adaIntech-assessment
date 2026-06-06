export interface CreateDeliveryRecordInput {
  eventId: string;
  userId: string;
  tenantId: string;
  channel: string;
  status: 'sent' | 'failed' | 'skipped' | 'queued';
  skipReason?: string;
  correlationId: string;
}