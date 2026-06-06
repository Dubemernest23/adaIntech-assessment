import { Router } from 'express';
import { EventController } from './event.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { incomingEventSchema } from './event.validation';
import { createTenantRateLimit } from '../../middleware/rate-limit.middleware';


const router = Router();
const controller = new EventController();

/**
 * @swagger
 * /api/v1/events:
 *   post:
 *     summary: Ingest a notification event
 *     description: Receives an event from an ABP Connect vertical. Idempotent - submitting the same eventId twice produces one delivery attempt.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - eventType
 *               - tenantId
 *               - productLine
 *               - schemaVersion
 *               - payload
 *               - occurredAt
 *             properties:
 *               eventId:
 *                 type: string
 *                 format: uuid
 *               eventType:
 *                 type: string
 *                 enum: [transaction_created, invoice_due, user_onboarded, compliance_flagged, system_alert]
 *               tenantId:
 *                 type: string
 *               userId:
 *                 type: string
 *               productLine:
 *                 type: string
 *                 enum: [saas, fintech, ple]
 *               schemaVersion:
 *                 type: string
 *                 example: "1.0"
 *               payload:
 *                 type: object
 *               occurredAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Event accepted for processing
 *       200:
 *         description: Duplicate event - already received
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation failed
 */

router.post(
  '/',
  authenticate,
  createTenantRateLimit,
  validate(incomingEventSchema),
  controller.ingestEvent,
);

export default router;