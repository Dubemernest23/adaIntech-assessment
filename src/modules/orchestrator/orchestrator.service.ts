import { evaluatePreferences } from '../evaluation/evaluation.engine';
import { ProviderRegistry } from '../providers/provider-registry';
import { DeliveryRepository } from '../delivery/delivery.repo';
import { NotificationRepository } from '../notifications/notification.repo';
import { digestQueue, dlqQueue } from '../../shared/queues/queue.config';
import { JOB_NAMES } from '../../shared/constants';
import { logger } from '../../shared/logger/pino.logger';
import { OrchestratorInput, OrchestratorResult, ChannelOutcome } from './orchestrator.types';
import { PreferenceData } from '../evaluation/evaluation.types';

export class OrchestratorService {

    private providerRegistry: ProviderRegistry;
    private deliveryRepository: DeliveryRepository;
    private notificationRepository: NotificationRepository;

    constructor() {
        this.providerRegistry = new ProviderRegistry();
        this.deliveryRepository = new DeliveryRepository();
        this.notificationRepository = new NotificationRepository();
    }

    async orchestrate(input: OrchestratorInput): Promise<OrchestratorResult> {
        const { eventId, eventType, userId, tenantId, payload, correlationId } = input;

        logger.info({ eventId, eventType, userId, tenantId, correlationId }, 'Orchestrating delivery');

        //Load preferences
        const preference = await this.notificationRepository.findByUserAndTenant({
            userId,
            tenantId,
        });

        if (!preference) {
            // if there is no prefrence then skip
            await this.deliveryRepository.createRecord({
                eventId,
                userId,
                tenantId,
                channel: 'all',
                status: 'skipped',
                skipReason: 'preferences_not_found',
                correlationId,
            });

            return {
                eventId,
                outcomes: [{
                    channel: 'all',
                    status: 'skipped',
                    skipReason: 'preferences_not_found',
                }],
                evaluationResult: {
                    status: 'skip',
                    skipReason: 'preferences_not_found',
                    channels: [],
                },
            };
        }

        // Build preference data for evaluation engine
        const preferenceData: PreferenceData = {
            emailEnabled: preference.emailEnabled,
            smsEnabled: preference.smsEnabled,
            inAppEnabled: preference.inAppEnabled,
            quietHoursStart: preference.quietHoursStart,
            quietHoursEnd: preference.quietHoursEnd,
            timezone: preference.timezone,
            categories: preference.categories.map((c) => ({
                category: c.category,
                enabled: c.enabled,
                deliveryMode: c.deliveryMode,
            })),
        };

        // evaluate prefrences before handling skip
        const evaluationResult = evaluatePreferences(
            { eventType, userId, tenantId },
            preferenceData,
        );

        //Handle skip
        if (evaluationResult.status === 'skip') {
            await this.deliveryRepository.createRecord({
                eventId,
                userId,
                tenantId,
                channel: 'all',
                status: 'skipped',
                skipReason: evaluationResult.skipReason,
                correlationId,
            });

            logger.info(
                { eventId, skipReason: evaluationResult.skipReason, correlationId },
                'Notification skipped',
            );

            return {
                eventId,
                outcomes: [{
                channel: 'all',
                status: 'skipped',
                skipReason: evaluationResult.skipReason,
                }],
                evaluationResult,
            };
        }

        // Handle digest mode
        if (evaluationResult.deliveryMode === 'daily_digest') {
            await digestQueue.add(
                JOB_NAMES.SEND_DIGEST,
                { eventId, userId, tenantId, payload, correlationId },
                { jobId: `digest-${eventId}` },
            );

            await this.deliveryRepository.createRecord({
                eventId,
                userId,
                tenantId,
                channel: 'digest',
                status: 'queued',
                correlationId,
            });

            logger.info({ eventId, correlationId }, 'Notification queued for digest');

            return {
                eventId,
                outcomes: [{ channel: 'digest', status: 'queued' }],
                evaluationResult,
            };
        }

        // Realtime delivery across all enabled channels
        const outcomes: ChannelOutcome[] = [];

        await Promise.allSettled(
            evaluationResult.channels.map(async (channel) => {
                const provider = this.providerRegistry.getProvider(channel);

                if (!provider) {
                    const outcome: ChannelOutcome = {
                        channel,
                        status: 'failed',
                        error: `No provider registered for channel: ${channel}`,
                    };
                    outcomes.push(outcome);

                    await this.deliveryRepository.createRecord({
                        eventId,
                        userId,
                        tenantId,
                        channel,
                        status: 'failed',
                        skipReason: `No provider for ${channel}`,
                        correlationId,
                    });
                    return;
                }

                try {
                    const result = await provider.send({
                        userId,
                        tenantId,
                        channel,
                        subject: `ABP Connect notification — ${eventType}`,
                        body: `You have a new notification for event: ${eventType}`,
                        metadata: { eventId, ...payload },
                    });

                    const status = result.success ? 'sent' : 'failed';

                    const outcome: ChannelOutcome = {
                        channel,
                        status,
                        providerId: result.providerId,
                        error: result.error,
                    };
                    outcomes.push(outcome);

                    await this.deliveryRepository.createRecord({
                        eventId,
                        userId,
                        tenantId,
                        channel,
                        status,
                        correlationId,
                    });

                    logger.info(
                        { eventId, channel, status, correlationId },
                        'Channel delivery recorded',
                    );

                } catch (error) {
                    // Individual channel failure (partial failure handling) which is recorded to DB
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                    outcomes.push({
                        channel,
                        status: 'failed',
                        error: errorMessage,
                    });

                    await this.deliveryRepository.createRecord({
                        eventId,
                        userId,
                        tenantId,
                        channel,
                        status: 'failed',
                        correlationId,
                    });

                    // Send to DLQ for inspection
                    await dlqQueue.add(
                        JOB_NAMES.DLQ_EVENT,
                        { eventId, channel, error: errorMessage, correlationId },
                        { jobId: `dlq-${eventId}-${channel}-${Date.now()}` },
                    );

                    logger.error(
                        { eventId, channel, error: errorMessage, correlationId },
                        'Channel delivery failed — sent to DLQ',
                    );
                }
            }),
        );

        return { eventId, outcomes, evaluationResult };
    }
}