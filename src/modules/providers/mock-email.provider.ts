import { NotificationProvider, DeliveryPayload, DeliveryResult } from './provider.interface';
import { logger } from '../../shared/logger/pino.logger';
import { v4 as uuidv4 } from 'uuid';

export class MockEmailProvider implements NotificationProvider {
  readonly channel = 'email' as const;

  async send(payload: DeliveryPayload): Promise<DeliveryResult> {
    const providerId = `mock-email-${uuidv4()}`;

    logger.info(
        {
            providerId,
            userId: payload.userId,
            tenantId: payload.tenantId,
            subject: payload.subject,
            body: payload.body,
            metadata: payload.metadata,
        },
        '[MockEmailProvider] Would send email',
    );

    // occasional failure simulation for testing partial failure handling
    if (payload.metadata?.simulateFailure === true) {
      return {
        success: false,
        error: 'Simulated email delivery failure',
      };
    }

    return {
      success: true,
      providerId,
    };
  }
}