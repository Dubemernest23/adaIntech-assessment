import {EventRepository} from "./event.repo";    
import {IncomingEventInput} from "./event.validation";
import {EventIngestionResult, OrchestrationJob} from "./event.types";
import { logger } from '../../shared/logger/pino.logger';
import { orchestrationQueue } from '../../shared/queues/queue.config';
import { JOB_NAMES } from "../../shared/constants";

export class EventService {
    
    constructor(
        private readonly repository = new EventRepository()
    ) {}

    async ingestEvent(data: IncomingEventInput,correlationId: string): Promise<EventIngestionResult> {

        // Idempotency check and ensure event is not processed multiple times
        const existingEvent = await this.repository.findEventById(data.eventId);

        if (existingEvent) {
            if(
                existingEvent.orchestrationStatus === 'PENDING' ||
                existingEvent.orchestrationStatus === 'ENQUEUE_FAILED'
            ){
                logger.warn(
                    {
                        eventId: data.eventId,
                        status: existingEvent.orchestrationStatus,
                        correlationId
                    },
                    'Event exists but was not queued — attempting re-enqueue',
                );

                await this.enqueueOrchestration(
                    {
                        eventId: existingEvent.eventId,
                        eventType: existingEvent.eventType,
                        userId: existingEvent.userId,
                        tenantId: existingEvent.tenantId,
                        payload: existingEvent.payload as Record<string, unknown>,
                        correlationId,
                    }
                );

                return {eventId: data.eventId,
                    status: 'accepted',
                    message: 'Event re-queued for orchestrtaion'
                }
            }

            // already queued or completed 
            logger.warn(
                { eventId: data.eventId, correlationId },
                'Duplicate event received — skipping',
            );
            return {
                eventId: data.eventId,
                status: 'duplicate',
                message: 'Event already received and is being processed',
            };
        }

        // save events with pending order
        const event = await this.repository.createEvent(data);

        logger.info(
            {
                eventId: event.eventId,
                eventType: event.eventType,
                tenantId: event.tenantId,
                correlationId,
            },
            'Event ingested successfully',
        );

        // enqueue orchestrtaion for processing
        await this.enqueueOrchestration(
            {
                eventId: event.eventId,
                eventType: event.eventType,
                userId: event.userId,
                tenantId: event.tenantId,
                payload: event.payload as Record<string, unknown>,
                correlationId, 
            }
        )

        return {
            eventId: event.eventId,
            status: 'accepted',
            message: 'Event accepted for processing',
        };
    }

    private async enqueueOrchestration(jobData: OrchestrationJob) : Promise<void>{
        const {eventId} = jobData;

        // queue operation
        try {
            await orchestrationQueue.add(
                JOB_NAMES.ORCHESTRATE,
                jobData,
                {
                    jobId: `orchestrate-${eventId}`,
                }
            )
        } catch (error){
            
            await this.repository.updateOrchestrationStatus(
                eventId,
                'ENQUEUE_FAILED'
            );
            logger.error(
                {
                    eventId,
                    error
                },
                'Failed to enqueu orchestration job'
            )
            return;
        }
        
        // databas update
        try{
            await this.repository.updateOrchestrationStatus(
                eventId,
                'QUEUED',
            );
            logger.info(
                {eventId},
                'Orchestration job enqueud successfully',
            )
        }catch(error){
            logger.error(
                {eventId, error}, 
                'Job was queued but failed to update status',
            )
        }
 
    }
}