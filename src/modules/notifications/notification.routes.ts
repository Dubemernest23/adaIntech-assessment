import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { updatePreferenceSchema, toggleCategorySchema } from './notification.validation';

const router = Router();
const controller = new NotificationController();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     description: Retrieves the notification preferences for the authenticated user within their tenant
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationPreference'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Preferences not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/preferences', controller.getPreferences);

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   put:
 *     summary: Create or update notification preferences
 *     description: Creates or updates the notification preferences for the authenticated user within their tenant
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailEnabled:
 *                 type: boolean
 *               smsEnabled:
 *                 type: boolean
 *               inAppEnabled:
 *                 type: boolean
 *               quietHoursStart:
 *                 type: string
 *                 example: "22:00"
 *               quietHoursEnd:
 *                 type: string
 *                 example: "07:00"
 *               timezone:
 *                 type: string
 *                 example: "Africa/Lagos"
 *               categories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                       enum: [compliance, billing, engagement, system]
 *                     enabled:
 *                       type: boolean
 *                     deliveryMode:
 *                       type: string
 *                       enum: [realtime, daily_digest]
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationPreference'
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation failed
 */
router.put(
  '/preferences',
  validate(updatePreferenceSchema),
  controller.upsertPreferences,
);

/**
 * @swagger
 * /api/v1/notifications/preferences/category:
 *   patch:
 *     summary: Toggle a notification category
 *     description: Enables or disables a specific notification category for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - enabled
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [compliance, billing, engagement, system]
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Preferences not found
 *       422:
 *         description: Validation failed
 */
router.patch(
  '/preferences/category',
  validate(toggleCategorySchema),
  controller.toggleCategory,
);

export default router;