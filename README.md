# adaIntech-assessment
assessment for the role of a backend developer at AdaIn tech

src/
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   └── redis.config.ts
│
├── modules/
│   ├── notifications/
│   │   ├── jobs/
│   │   │   ├── digest.job.ts
│   │   │   └── notification.worker.ts
│   │   ├── notification.controller.ts
│   │   ├── notification.service.ts
│   │   ├── notification.repository.ts
│   │   ├── notification.routes.ts
│   │   ├── notification.validation.ts
│   │   └── notification.types.ts
│   │
│   └── health/
│       └── health.routes.ts
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── request-id.middleware.ts
│   ├── error.middleware.ts
│   └── validation.middleware.ts
│
├── shared/
│   ├── logger/
│   │   └── winston.logger.ts
│   ├── queues/
│   │   └── queue.config.ts
│   ├── constants/
│   │   └── index.ts
│   ├── errors/
│   │   └── app.error.ts
│   └── utils/
│       └── response.util.ts
│
├── app.ts
└── server.ts

prisma/
└── schema.prisma

.github/
└── workflows/
    └── ci.yml

Dockerfile
docker-compose.yml
.env.example