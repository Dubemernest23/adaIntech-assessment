
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

export interface DeliveryHistoryFilters {
  channel?: string;
  status?: DeliveryStatusEnum;
  from?: Date; 
  to?: Date;
  limit?: number; 
}

export interface DeliveryStatusSummary {
 status:string;
 count: number;
}

export interface DeliveryChannelSummary {
  channel: string;
  count: number;
}

export interface DeliverySummaryResult {
  byStatus: DeliveryStatusSummary[];
  byChannel: DeliveryChannelSummary[];
  total: number;
}