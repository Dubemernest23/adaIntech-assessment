export const NOTIFICATION_CATEGORIES = [
  'compliance',
  'billing', 
  'engagement',
  'system',
] as const;

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'in_app'] as const;

export const DELIVERY_MODES = ['realtime', 'daily_digest'] as const;

export const DEFAULT_TIMEZONE = 'UTC';

export const QUEUE_NAMES = {
  DIGEST: 'digest-notifications',
} as const;

export const JOB_NAMES = {
  SEND_DIGEST: 'send-daily-digest',
} as const;

export const HTTP_STATUS = {
  // 2xx Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // 4xx Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;