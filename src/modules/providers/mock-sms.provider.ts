import { NotificationProvider, DeliveryPayload, DeliveryResult } from './provider.interface';
import { logger } from '../../shared/logger/pino.logger';
import { v4 as uuidv4 } from 'uuid';


export class MockSmsProvider implements NotificationProvider{
    readonly channel = 'sms' as const

    async send(payload: DeliveryPayload): Promise<DeliveryResult> {
        const providerId = `mock-sms-${uuidv4()}`;

        logger.info({
            providerId, 
            userId :payload.userId,
            tenantId: payload.tenantId,
            subject: payload.subject,
            body: payload.body,
            metadata: payload.metadata
        }, '[MockSmsProvider] Would send in sms')
     
        // occasional failure simulation for testing partial failure
        if(payload.metadata?.simulateFailure === true){
            return {
                success: false,
                error: "Simulated sms delivery failure"
            };
        }

        return {
            success: true,
            providerId,
        }
    }
}