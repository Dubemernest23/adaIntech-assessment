import { EvaluationResult, PreferenceData, EventData, SkipReason,} from './evaluation.types';

// Maps event types to notification categories
const EVENT_CATEGORY_MAP: Record<string, string> = {
  transaction_created: 'billing',
  invoice_due: 'billing',
  user_onboarded: 'engagement',
  compliance_flagged: 'compliance',
  system_alert: 'system',
};

export const mapEventToCategory = (eventType: string): string | null => {
  return EVENT_CATEGORY_MAP[eventType] ?? null;
};

export const isInQuietHours = (
  now: Date,
  quietHoursStart: string,
  quietHoursEnd: string,
  timezone: string,
): boolean => {
    // Get current time in user's timezone as HH:MM
    const currentTime = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone,
    });

    const [startH, startM] = quietHoursStart.split(':').map(Number);
    const [endH, endM] = quietHoursEnd.split(':').map(Number);
    const [currH, currM] = currentTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currentMinutes = currH * 60 + currM;

    // Handle overnight quiet hours
    if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    // Same day quiet hours 
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    };

    export const getEnabledChannels = (preferences: PreferenceData): string[] => {
        const channels: string[] = [];
        if (preferences.emailEnabled) channels.push('email');
        if (preferences.smsEnabled) channels.push('sms');
        if (preferences.inAppEnabled) channels.push('in_app');
        return channels;
    };

    export const evaluatePreferences = (
        event: EventData,
        preferences: PreferenceData,
        now: Date = new Date(),
    ): EvaluationResult => {
        // Map event to category
        const category = mapEventToCategory(event.eventType);

        if (!category) {
            return {
                status: 'skip',
                skipReason: 'category_disabled',
                channels: [],
            };
        }

        // Check if category is enabled
        const categoryPref = preferences.categories.find(
            (c) => c.category === category,
        );

        if (!categoryPref || !categoryPref.enabled) {
            return {
                status: 'skip',
                skipReason: 'category_disabled' as SkipReason,
                channels: [],
                category,
            };
        }

        // Check quiet hours
        if (preferences.quietHoursStart && preferences.quietHoursEnd) {
            const inQuietHours = isInQuietHours(
                now,
                preferences.quietHoursStart,
                preferences.quietHoursEnd,
                preferences.timezone,
            );

            if (inQuietHours) {
                return {
                    status: 'skip',
                    skipReason: 'quiet_hours' as SkipReason,
                    channels: [],
                    category,
                };
            }
        }

        // Get enabled channels
        const channels = getEnabledChannels(preferences);

        if (channels.length === 0) {
            return {
                status: 'skip',
                skipReason: 'no_channels_enabled' as SkipReason,
                channels: [],
                category,
            };
        }

        // Return delivery decision
        return {
            status: 'deliver',
            channels,
            deliveryMode: categoryPref.deliveryMode as 'realtime' | 'daily_digest',
            category,
        };
};