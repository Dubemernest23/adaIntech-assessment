import { Request, Response, NextFunction } from 'express';
import { DeliveryRepository } from './delivery.repo';
import { sendSuccess } from '../../shared/utils/response.utils';
import { AppError } from '../../shared/errors/app.error';
import { HTTP_STATUS } from '../../shared/constants';

export class DeliveryController {
  private repository: DeliveryRepository;

  constructor() {
    this.repository = new DeliveryRepository();
  }

  getDeliveryHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { user_id, tenant_id } = req.user!;
      const targetUserId = (req.query.userId as string | undefined) || user_id;

      const records = await this.repository.findByUserAndTenant(
        targetUserId,
        tenant_id,
      );

      sendSuccess(res, records, 'Delivery history retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  };

  getDeliveryHistoryByEvent = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { tenant_id } = req.user!;
      const eventId = req.params['eventId'] as string;

      if (!eventId) {
        throw new AppError('eventId is required', HTTP_STATUS.BAD_REQUEST);
      }

      const records = await this.repository.findByEventId(eventId, tenant_id);

      sendSuccess(res, records, 'Event delivery history retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  };
}