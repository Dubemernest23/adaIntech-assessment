jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

jest.mock('../../shared/logger/pino.logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { MockEmailProvider } from '../../modules/providers/mock-email.provider';
import { MockSmsProvider } from '../../modules/providers/mock-sms.provider';
import { MockInAppProvider } from '../../modules/providers/mock-inapp.provider';
import { ProviderRegistry } from '../../modules/providers/provider-registry';

const basePayload = {
  userId: 'user-001',
  tenantId: 'tenant-001',
  channel: 'email',
  subject: 'Test notification',
  body: 'Test body',
  metadata: { eventId: 'test-event-id' },
};

describe('MockEmailProvider', () => {
  let provider: MockEmailProvider;

  beforeEach(() => {
    provider = new MockEmailProvider();
  });

  it('should have channel email', () => {
    expect(provider.channel).toBe('email');
  });

  it('should return success on send', async () => {
    const result = await provider.send(basePayload);
    expect(result.success).toBe(true);
    expect(result.providerId).toBeDefined();
  });

  it('should return failure when simulateFailure is true', async () => {
    const payload = {
      ...basePayload,
      metadata: { simulateFailure: true },
    };
    const result = await provider.send(payload);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('MockSmsProvider', () => {
  let provider: MockSmsProvider;

  beforeEach(() => {
    provider = new MockSmsProvider();
  });

  it('should have channel sms', () => {
    expect(provider.channel).toBe('sms');
  });

  it('should return success on send', async () => {
    const result = await provider.send({ ...basePayload, channel: 'sms' });
    expect(result.success).toBe(true);
    expect(result.providerId).toBeDefined();
  });

  it('should return failure when simulateFailure is true', async () => {
    const payload = {
      ...basePayload,
      channel: 'sms',
      metadata: { simulateFailure: true },
    };
    const result = await provider.send(payload);
    expect(result.success).toBe(false);
  });
});

describe('MockInAppProvider', () => {
  let provider: MockInAppProvider;

  beforeEach(() => {
    provider = new MockInAppProvider();
  });

  it('should have channel in_app', () => {
    expect(provider.channel).toBe('in_app');
  });

  it('should return success on send', async () => {
    const result = await provider.send({ ...basePayload, channel: 'in_app' });
    expect(result.success).toBe(true);
    expect(result.providerId).toBeDefined();
  });

  it('should return failure when simulateFailure is true', async () => {
    const payload = {
      ...basePayload,
      channel: 'in_app',
      metadata: { simulateFailure: true },
    };
    const result = await provider.send(payload);
    expect(result.success).toBe(false);
  });
});

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it('should return email provider', () => {
    const provider = registry.getProvider('email');
    expect(provider).toBeDefined();
    expect(provider?.channel).toBe('email');
  });

  it('should return sms provider', () => {
    const provider = registry.getProvider('sms');
    expect(provider).toBeDefined();
    expect(provider?.channel).toBe('sms');
  });

  it('should return in_app provider', () => {
    const provider = registry.getProvider('in_app');
    expect(provider).toBeDefined();
    expect(provider?.channel).toBe('in_app');
  });

  it('should return null for unknown channel', () => {
    const provider = registry.getProvider('unknown');
    expect(provider).toBeNull();
  });

  it('should return all available channels', () => {
    const channels = registry.getAvailableChannels();
    expect(channels).toContain('email');
    expect(channels).toContain('sms');
    expect(channels).toContain('in_app');
  });
});