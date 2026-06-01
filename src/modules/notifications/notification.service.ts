import { NotificationRepository } from './notification.repo';
import { PreferenceContext, UpdatePreferenceInput, ToggleCategoryInput } from './notification.types';
import { AppError } from '../../shared/errors/app.error';
import { HTTP_STATUS } from '../../shared/constants';
import { logger } from '../../shared/logger/pino.logger';

export class NotificationService {
    private repository: NotificationRepository;

    constructor() {
        this.repository = new NotificationRepository();
    }

    async getPreferences(context: PreferenceContext) {
        const preference = await this.repository.findByUserAndTenant(context);
        
        if (!preference) {
            throw new AppError(
                'Notification preferences not found',
                HTTP_STATUS.NOT_FOUND,
            );
        }

        logger.info(
            { userId: context.userId, tenantId: context.tenantId },
            'Preferences retrieved',
        );

        return preference;
    }

    async upsertPreferences(context: PreferenceContext, data: UpdatePreferenceInput) {
        const preference = await this.repository.upsertPreference(context, data);

        logger.info(
            { userId: context.userId, tenantId: context.tenantId },
            'Preferences upserted',
        );

        return preference;
    }

    async toggleCategory(context: PreferenceContext, data: ToggleCategoryInput) {
        const result = await this.repository.toggleCategory(context, data);

        if (!result) {
            throw new AppError(
                'Notification preferences not found. Create preferences first.',
                HTTP_STATUS.NOT_FOUND,
            );
        }

        logger.info(
            {
                userId: context.userId,
                tenantId: context.tenantId,
                category: data.category,
                enabled: data.enabled,
            },
            'Category toggled',
        );

        return result;
    }
}