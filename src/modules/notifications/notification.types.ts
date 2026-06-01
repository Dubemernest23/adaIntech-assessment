import {NotificationCategory, DeliveryMode} from  "@prisma/client";

export interface CategoryPreferenceInput {
    category: NotificationCategory;
    enabled: boolean;
    deliveryMode: DeliveryMode;
}
export interface UpdatePreferenceInput {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    inAppEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
    categories?: CategoryPreferenceInput[];
}

export interface ToggleCategoryInput {
    category: NotificationCategory;
    enabled: boolean
}

export interface PreferenceContext {
    userId: string;
    tenantId: string;
}