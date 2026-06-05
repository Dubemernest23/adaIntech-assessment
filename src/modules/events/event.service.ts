import {EventRepository} from "./event.repo";    
import {IncomingEventInput} from "./event.validation";
import {EventIngestionResult} from "./event.types";
import { logger } from '../../shared/logger/pino.logger';


export class EventService {
    private repository: EventRepository;

    constructor() {
        this.repository = new EventRepository();
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

        return {
            eventId: event.eventId,
            status: 'accepted',
            message: 'Event accepted for processing',
        };
    }
}