import { Router } from 'express';
import { DeliveryController } from './delivery.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new DeliveryController();

/**
     * @swagger
     * /api/v1/delivery/history:
     *   get:
     *     summary: Get delivery history for authenticated user
     *     description: Returns all delivery records for the authenticated user scoped to their tenant. Tenant isolation is enforced — a user from Tenant A cannot see Tenant B records.
     *     tags: [Delivery]
     *     security:
     *       - bearerAuth: []
    *     parameters:
    *       - in: query
    *         name: status
    *         schema:
    *           type: string
    *           enum: [sent, failed, skipped, queued]
    *         description: Filter by delivery status
    *       - in: query
    *         name: channel
    *         schema:
    *           type: string
    *         description: Filter by channel (email, sms, in_app)
    *       - in: query
    *         name: from
    *         schema:
    *           type: string
    *           format: date-time
    *         description: Start of date range (ISO 8601)
    *       - in: query
    *         name: to
    *         schema:
    *           type: string
    *           format: date-time
    *         description: End of date range (ISO 8601)
    *       - in: query
    *         name: limit
    *         schema:
    *           type: integer
    *           default: 50
    *           maximum: 200
    *         description: Maximum number of records to return
    *     responses:
    *       200:
    *         description: Delivery history retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/SuccessResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       type: array
    *                       items:
    *                         $ref: '#/components/schemas/DeliveryRecord'
    *       400:
    *         description: Invalid query parameter
    *         content:
    *           application/json:
    *             schema:
    *               $ref: '#/components/schemas/ErrorResponse'
    *       401:
    *         description: Unauthorized
*/

router.get('/history', authenticate, controller.getDeliveryHistory);

/**
 * @swagger
 * /api/v1/delivery/history/{eventId}:
 *   get:
 *     summary: Get delivery history for a specific event
 *     description: Returns all delivery records for a specific eventId scoped to the authenticated user's tenant.
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event delivery history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DeliveryRecord'
 *       401:
 *         description: Unauthorized
 */
router.get('/history/:eventId', authenticate, controller.getDeliveryHistoryByEvent);


/**
 * @swagger
 * /api/v1/delivery/summary:
 *   get:
 *     summary: Get delivery history grouped by status and channel
 *     description: Returns all delivery records grouped by channel and status scoped to the authenticated user's tenant.
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
*       - in: query
*         name: userId
*         schema:
*           type: string
*         description: Admin only — filter summary by specific userId (still tenant-scoped)
 *     responses:
 *       200:
 *         description: Delivery summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DeliverySummaryResult'
 *       401:
 *         description: Unauthorized
 */
router.get('/summary', authenticate, controller.getDeliverySummary);

export default router;
