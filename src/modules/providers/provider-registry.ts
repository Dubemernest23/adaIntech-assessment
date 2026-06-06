import { NotificationProvider } from './provider.interface';
import { MockEmailProvider } from './mock-email.provider';
import { MockSmsProvider } from './mock-sms.provider';

type Channel = 'email' | 'sms'  |'in_app'

export class ProviderRegistry {
    private providers: Map<string, NotificationProvider>;

    constructor() {
        this.providers = new Map();
        this.register(new MockEmailProvider());
        this.register(new MockSmsProvider());
    }

    private register(provider: NotificationProvider): void {
        this.providers.set(provider.channel, provider);
    }

    getProvider(channel: string): NotificationProvider | null {
        return this.providers.get(channel) ?? null;
    }

    getAvailableChannels(): string[] {
        return Array.from(this.providers.keys());
    }
}
