import {EventRepository} from "./event.repo";    
import {IncomingEventInput} from "./event.validation";
import {EventIngestionResult} from "./event.types";
import { logger } from '../../shared/logger/pino.logger';
import { OrchestratorService } from "../orchestrator/orchestrator.service";
import { da } from "zod/v4/locales";


export class EventService {
    private repository: EventRepository;
    private orchestrator: OrchestratorService

    constructor() {
        this.repository = new EventRepository();
        this.orchestrator = new OrchestratorService()
    }

    async ingestEvent(data: IncomingEventInput,correlationId: string): Promise<EventIngestionResult> {
        // Idempotency check and ensure event is not processed multiple times
        const existing = await this.repository.findByEventId(data.eventId);

        if (existing) {
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

        const event = await this.repository.createEvent(data, data.tenantId);

        logger.info(
            {
                eventId: event.eventId,
                eventType: event.eventType,
                tenantId: event.tenantId,
                correlationId,
            },
            'Event ingested successfully',
        );

        // trigger orchestration asychronously and don't await this because ingestion and orchestration
        // are seperate concerns 
        if (data.userId) {
            this.orchestrator.orchestrate({
                eventId: data.eventId,
                eventType: data.eventType,
                userId: data.userId,
                tenantId: data.tenantId,
                payload: data.payload,
                correlationId,
            }).catch((error) =>{
                logger.error(
                    {
                        eventId: data.eventId,
                        error: error.message,
                        correlationId
                    },
                    "Orchestration failed"
                );
            });
        }



        return {
            eventId: event.eventId,
            status: 'accepted',
            message: 'Event accepted for processing',
        };
    }
}