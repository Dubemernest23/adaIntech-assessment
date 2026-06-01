import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { sendSuccess } from '../../shared/utils/response.utils';
import { HTTP_STATUS } from '../../shared/constants';
import { UpdatePreferenceDto, ToggleCategoryDto } from './notification.validation';

export class NotificationController {
    private service: NotificationService;

    constructor() {
        this.service = new NotificationService();
    }

    getPreferences = async (req: Request, res: Response, next: NextFunction, ): Promise<void> => {
        try {
            const context = {
                userId: req.user!.user_id,
                tenantId: req.user!.tenant_id,
            };

            const preferences = await this.service.getPreferences(context);
            sendSuccess(res, preferences, 'Preferences retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    upsertPreferences = async (req: Request, res: Response, next: NextFunction,): Promise<void> => {
        try {
            const context = {
                userId: req.user!.user_id,
                tenantId: req.user!.tenant_id,
            };

            const preferences = await this.service.upsertPreferences(
                context,
                req.body as UpdatePreferenceDto,
            );

            sendSuccess(
                res,
                preferences,
                'Preferences updated successfully',
                HTTP_STATUS.OK,
            );
        } catch (error) {
            next(error);
        }
    };

    toggleCategory = async (req: Request, res: Response, next: NextFunction,): Promise<void> => {
        try {
            const context = {
                userId: req.user!.user_id,
                tenantId: req.user!.tenant_id,
            };

            const result = await this.service.toggleCategory(
                context,
                req.body as ToggleCategoryDto,
            );

            sendSuccess(res, result, 'Category updated successfully');
        } catch (error) {
            next(error);
        }
  };
}