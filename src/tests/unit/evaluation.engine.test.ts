
import {
  evaluatePreferences,
  isInQuietHours,
  mapEventToCategory,
  getEnabledChannels,
} from '../../modules/evaluation/evaluation.engine';
import { PreferenceData, EventData } from '../../modules/evaluation/evaluation.types';

const basePreferences: PreferenceData = {
  emailEnabled: true,
  smsEnabled: true,
  inAppEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  timezone: 'Africa/Lagos',
  categories: [
    { category: 'billing', enabled: true, deliveryMode: 'realtime' },
    { category: 'compliance', enabled: true, deliveryMode: 'realtime' },
    { category: 'engagement', enabled: true, deliveryMode: 'daily_digest' },
    { category: 'system', enabled: true, deliveryMode: 'realtime' },
  ],
};

const baseEvent: EventData = {
  eventType: 'transaction_created',
  userId: 'user-001',
  tenantId: 'tenant-001',
};

describe('mapEventToCategory', () => {
  it('should map transaction_created to billing', () => {
    expect(mapEventToCategory('transaction_created')).toBe('billing');
  });

  it('should map invoice_due to billing', () => {
    expect(mapEventToCategory('invoice_due')).toBe('billing');
  });

  it('should map user_onboarded to engagement', () => {
    expect(mapEventToCategory('user_onboarded')).toBe('engagement');
  });

  it('should map compliance_flagged to compliance', () => {
    expect(mapEventToCategory('compliance_flagged')).toBe('compliance');
  });

  it('should map system_alert to system', () => {
    expect(mapEventToCategory('system_alert')).toBe('system');
  });

  it('should return null for unknown event type', () => {
    expect(mapEventToCategory('unknown_event')).toBeNull();
  });
});

describe('isInQuietHours', () => {
  it('should return true when time is within overnight quiet hours', () => {
    // 23:00 Lagos time — quiet hours are 22:00-07:00
    const now = new Date('2026-06-06T22:00:00Z'); // 23:00 Lagos (UTC+1)
    expect(isInQuietHours(now, '22:00', '07:00', 'Africa/Lagos')).toBe(true);
  });

  it('should return true when time is in early morning quiet hours', () => {
    // 06:00 Lagos time — still in quiet hours
    const now = new Date('2026-06-06T05:00:00Z'); // 06:00 Lagos
    expect(isInQuietHours(now, '22:00', '07:00', 'Africa/Lagos')).toBe(true);
  });

  it('should return false when time is outside quiet hours', () => {
    // 14:00 Lagos time — outside quiet hours
    const now = new Date('2026-06-06T13:00:00Z'); // 14:00 Lagos
    expect(isInQuietHours(now, '22:00', '07:00', 'Africa/Lagos')).toBe(false);
  });

  it('should handle same-day quiet hours correctly', () => {
    const now = new Date('2026-06-06T12:00:00Z'); // 13:00 Lagos
    expect(isInQuietHours(now, '12:00', '14:00', 'Africa/Lagos')).toBe(true);
  });
});

describe('getEnabledChannels', () => {
  it('should return all enabled channels', () => {
    const channels = getEnabledChannels(basePreferences);
    expect(channels).toEqual(['email', 'sms', 'in_app']);
  });

  it('should return only enabled channels', () => {
    const prefs = {
      ...basePreferences,
      smsEnabled: false,
      inAppEnabled: false,
    };
    const channels = getEnabledChannels(prefs);
    expect(channels).toEqual(['email']);
  });

  it('should return empty array when no channels enabled', () => {
    const prefs = {
      ...basePreferences,
      emailEnabled: false,
      smsEnabled: false,
      inAppEnabled: false,
    };
    expect(getEnabledChannels(prefs)).toEqual([]);
  });
});

describe('evaluatePreferences', () => {
  it('should return deliver for valid event during active hours', () => {
    const now = new Date('2026-06-06T13:00:00Z'); // 14:00 Lagos — not quiet hours
    const result = evaluatePreferences(baseEvent, basePreferences, now);

    expect(result.status).toBe('deliver');
    expect(result.channels).toContain('email');
    expect(result.channels).toContain('sms');
    expect(result.deliveryMode).toBe('realtime');
    expect(result.category).toBe('billing');
  });

  it('should skip when category is disabled', () => {
    const prefs = {
      ...basePreferences,
      categories: [
        { category: 'billing', enabled: false, deliveryMode: 'realtime' },
      ],
    };
    const now = new Date('2026-06-06T13:00:00Z');
    const result = evaluatePreferences(baseEvent, prefs, now);

    expect(result.status).toBe('skip');
    expect(result.skipReason).toBe('category_disabled');
  });

  it('should skip when in quiet hours', () => {
    const now = new Date('2026-06-06T22:00:00Z'); // 23:00 Lagos — quiet hours
    const result = evaluatePreferences(baseEvent, basePreferences, now);

    expect(result.status).toBe('skip');
    expect(result.skipReason).toBe('quiet_hours');
  });

  it('should skip when no channels enabled', () => {
    const prefs = {
      ...basePreferences,
      emailEnabled: false,
      smsEnabled: false,
      inAppEnabled: false,
    };
    const now = new Date('2026-06-06T13:00:00Z');
    const result = evaluatePreferences(baseEvent, prefs, now);

    expect(result.status).toBe('skip');
    expect(result.skipReason).toBe('no_channels_enabled');
  });

  it('should return daily_digest delivery mode for engagement events', () => {
    const event = { ...baseEvent, eventType: 'user_onboarded' };
    const now = new Date('2026-06-06T13:00:00Z');
    const result = evaluatePreferences(event, basePreferences, now);

    expect(result.status).toBe('deliver');
    expect(result.deliveryMode).toBe('daily_digest');
    expect(result.category).toBe('engagement');
  });

  it('should skip unknown event types', () => {
    const event = { ...baseEvent, eventType: 'unknown_event' };
    const now = new Date('2026-06-06T13:00:00Z');
    const result = evaluatePreferences(event, basePreferences, now);

    expect(result.status).toBe('skip');
  });
});