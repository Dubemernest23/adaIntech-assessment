import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ABP Connect Notification Preference Service',
      version: '1.0.0',
      description:
        'A multi-tenant notification preference management service that allows authenticated users to configure notification channels, delivery modes, quiet hours, and category preferences.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        CategoryPreference: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            preferenceId: { type: 'string', format: 'uuid' },
            tenantId: { type: 'string' },
            category: {
              type: 'string',
              enum: ['compliance', 'billing', 'engagement', 'system'],
            },
            enabled: { type: 'boolean' },
            deliveryMode: {
              type: 'string',
              enum: ['realtime', 'daily_digest'],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        NotificationPreference: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string' },
            tenantId: { type: 'string' },
            emailEnabled: { type: 'boolean' },
            smsEnabled: { type: 'boolean' },
            inAppEnabled: { type: 'boolean' },
            quietHoursStart: { type: 'string', example: '22:00' },
            quietHoursEnd: { type: 'string', example: '07:00' },
            timezone: { type: 'string', example: 'Africa/Lagos' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            categories: {
              type: 'array',
              items: { $ref: '#/components/schemas/CategoryPreference' },
            },
          },
        },
        DeliveryRecord: {
          type: 'object',
          properties: {
              id: { type: 'string', format: 'uuid' },
              eventId: { type: 'string' },
              userId: { type: 'string' },
              tenantId: { type: 'string' },
              channel: { type: 'string', enum: ['email', 'sms', 'in_app'] },
              status: { type: 'string', enum: ['sent', 'failed', 'skipped', 'queued'] },
              skipReason: { type: 'string', nullable: true },
              correlationId: { type: 'string' },
              attemptedAt: { type: 'string', format: 'date-time' },
          },
      },
      DeliverySummaryResult: {
          type: 'object',
          properties: {
              byStatus: {
                  type: 'array',
                  items: {
                      type: 'object',
                      properties: {
                          status: { type: 'string' },
                          count: { type: 'integer' },
                      },
                  },
              },
              byChannel: {
                  type: 'array',
                  items: {
                      type: 'object',
                      properties: {
                          channel: { type: 'string' },
                          count: { type: 'integer' },
                      },
                  },
              },
              total: { type: 'integer' },
          },
      },
      CategoryMapping: {
          type: 'object',
          properties: {
              id: { type: 'string', format: 'uuid' },
              eventType: { type: 'string' },
              category: { type: 'string' },
              productLine: { type: 'string', nullable: true },
              tenantId: { type: 'string', nullable: true },
              isDefault: { type: 'boolean' },
          },
      },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
            requestId: { type: 'string', format: 'uuid' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            requestId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);