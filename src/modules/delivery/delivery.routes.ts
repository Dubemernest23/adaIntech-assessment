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
 *         name: userId
 *         schema:
 *           type: string
 *         description: Optional - filter by specific userId (still tenant-scoped)
 *     responses:
 *       200:
 *         description: Delivery history retrieved successfully
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
 *       401:
 *         description: Unauthorized
 */
router.get('/history/:eventId', authenticate, controller.getDeliveryHistoryByEvent);

export default router;