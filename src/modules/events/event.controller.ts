import { Request, Response, NextFunction } from 'express';
import { EventService } from './event.service';
import { sendSuccess } from '../../shared/utils/response.utils';
import { HTTP_STATUS } from '../../shared/constants';
import { IncomingEventInput } from './event.validation';

export class EventController {
      private service: EventService;

    constructor() {
        this.service = new EventService();
    }

    ingestEvent = async ( req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.service.ingestEvent(
                req.body as IncomingEventInput,
                res.locals.requestId,
            );

            const statusCode: 200 | undefined =
                result.status === 'duplicate'
                ? HTTP_STATUS.OK
                : undefined;

            sendSuccess(res, result, result.message, statusCode);
        } catch (error) {
            next(error);
        }
    };
}