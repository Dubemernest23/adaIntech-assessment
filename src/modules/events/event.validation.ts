import { z } from 'zod';

export const SUPPORTED_SCHEMA_VERSIONS = ['1.0'] as const;

export const incomingEventSchema = z.object({
  eventId: z.uuid(),
  eventType: z.enum([
    'transaction_created',
    'invoice_due',
    'user_onboarded',
    'compliance_flagged',
    'system_alert',
  ]),
  tenantId: z.string().min(1),
  userId: z.string().optional(),
  productLine: z.enum(['saas', 'fintech', 'ple']),
  schemaVersion: z.enum([...SUPPORTED_SCHEMA_VERSIONS]).refine(
    (val) => SUPPORTED_SCHEMA_VERSIONS.includes(val as '1.0'),
    { message: 'Unsupported schema version' },
  ),
  payload: z.record(z.string(), z.unknown()),
  occurredAt: z.iso.datetime(),
});

export type IncomingEventInput = z.infer<typeof incomingEventSchema>;