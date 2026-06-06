import { NotificationProvider, DeliveryPayload, DeliveryResult } from './provider.interface';
import { logger } from '../../shared/logger/pino.logger';
import { v4 as uuidv4 } from 'uuid';

export class MockInAppProvider implements NotificationProvider {
  readonly channel = 'in_app' as const;

  async send(payload: DeliveryPayload): Promise<DeliveryResult> {
    const providerId = `mock-inapp-${uuidv4()}`;

    logger.info(
      {
        providerId,
        userId: payload.userId,
        tenantId: payload.tenantId,
        body: payload.body,
        metadata: payload.metadata,
      },
      '[MockInAppProvider] Would send in-app notification',
    );

    if (payload.metadata?.simulateFailure === true) {
      return {
        success: false,
        error: 'Simulated in-app delivery failure',
      };
    }

    return {
      success: true,
      providerId,
    };
  }
}