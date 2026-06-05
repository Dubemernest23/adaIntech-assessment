export type EvaluationStatus = 'deliver' | 'skip';

export type SkipReason = 
  | 'category_disabled' 
  | 'quiet_hours' 
  | 'no_channels_enabled'
  | 'preferences_not_found';

export type DeliveryMode = 'realtime' | 'daily_digest';

export interface EvaluationResult {
  status: EvaluationStatus;
  skipReason?: SkipReason;
  channels: string[];
  deliveryMode?: DeliveryMode;
  category?: string;
}

export interface PreferenceData {
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  categories: CategoryData[];
}

export interface CategoryData {
  category: string;
  enabled: boolean;
  deliveryMode: string;
}

export interface EventData {
  eventType: string;
  userId?: string;
  tenantId: string;
}