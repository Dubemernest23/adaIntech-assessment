import { z } from 'zod';
import { NOTIFICATION_CATEGORIES, DELIVERY_MODES } from '../../shared/constants';

const categorySchema = z.object({
  category: z.enum([...NOTIFICATION_CATEGORIES]),
  enabled: z.boolean(),
  deliveryMode: z.enum([...DELIVERY_MODES]),
});

export const updatePreferenceSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be in HH:MM format')
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be in HH:MM format')
    .optional(),
  timezone: z.string().optional(),
  categories: z.array(categorySchema).optional(),
});

export const toggleCategorySchema = z.object({
  category: z.enum([...NOTIFICATION_CATEGORIES]),
  enabled: z.boolean(),
});

export type UpdatePreferenceDto = z.infer<typeof updatePreferenceSchema>;
export type ToggleCategoryDto = z.infer<typeof toggleCategorySchema>;