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
          'Invalid from date',
          HTTP_STATUS.BAD_REQUEST
        );        
      }

      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      if(limit !== undefined && isNaN(limit)){
          throw new AppError(
              'Invalid limit',
              HTTP_STATUS.BAD_REQUEST
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

  getDeliverySummary = async (req: Request, res: Response, next: NextFunction) : Promise<void> =>{
    try {
      const {user_id, tenant_id} = req.user!;
      const groupSrvRecords = await this.repository.getSummaryByUserAndTenant(user_id, tenant_id);
      
      sendSuccess(res, groupSrvRecords, 'Delivery summary retrieved successfully', HTTP_STATUS.OK);
    } catch (error){
      next(error)
    }
  }

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