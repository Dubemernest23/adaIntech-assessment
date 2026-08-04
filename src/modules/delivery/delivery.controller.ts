import { Request, Response, NextFunction } from 'express';
import { DeliveryRepository } from './delivery.repo';
import { sendSuccess } from '../../shared/utils/response.utils';
import { AppError } from '../../shared/errors/app.error';
import { HTTP_STATUS } from '../../shared/constants';
import { DeliveryStatusEnum } from './delivery.types';

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
      const targetUserId = req.user!.role === 'admin' && req.query.userId ? req.query.userId as string : user_id;
      const status = req.query.status as DeliveryStatusEnum | undefined;
      const channel = req.query.channel as string | undefined;
      const VALID_STATUSES: DeliveryStatusEnum[] = ['sent', 'failed', 'skipped', 'queued'];
      const VALID_CHANNELS: string[] = ['email', 'sms', 'in_app'];

      if (status && !VALID_STATUSES.includes(status)) {
        throw new AppError(
          `Invalid status. Valid statuses are: ${VALID_STATUSES.join(', ')}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      if (channel && !VALID_CHANNELS.includes(channel)) {
        throw new AppError(
          `Invalid channel. Valid channels are: ${VALID_CHANNELS.join(', ')}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const from = req.query.from ? new Date(req.query.from as string): undefined;
      if(from && isNaN(from.getTime())){
          throw new AppError(
            'Invalid from date',
            HTTP_STATUS.BAD_REQUEST
          );
      }

      const to = req.query.to ? new Date(req.query.to as string) : undefined;
      if(to && isNaN(to.getTime())){
        throw new AppError(
          'Invalid to date',
          HTTP_STATUS.BAD_REQUEST
        );        
      }
      
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 200)) {
          throw new AppError(
              'Invalid limit. Must be an integer between 1 and 200',
              HTTP_STATUS.BAD_REQUEST,
          );
      }

      const records =
        await this.repository.findByUserAndTenantFiltered(
          targetUserId,
          tenant_id,
          {
            from,
            to,
            limit,
            status,
            channel,
          },
      );

      sendSuccess(res, records, 'Delivery history retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  };

  
  getDeliverySummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user_id, tenant_id } = req.user!;
        const targetUserId = req.user!.role === 'admin' && req.query.userId
            ? req.query.userId as string
            : user_id;

        const result = await this.repository.getSummaryByUserAndTenant(
            targetUserId,
            tenant_id,
        );
        sendSuccess(res, result, 'Delivery summary retrieved successfully', HTTP_STATUS.OK);
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