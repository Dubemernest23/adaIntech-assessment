export interface DeliveryPayload {
  userId: string;
  tenantId: string;
  channel: string;
  subject?: string;
  body: string;
  metadata: Record<string, unknown>;
}

export interface DeliveryResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

export interface NotificationProvider {
  readonly channel: 'email' | 'sms' | 'in_app';
  send(payload: DeliveryPayload): Promise<DeliveryResult>;
}