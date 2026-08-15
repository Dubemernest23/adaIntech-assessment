import { orchestrationQueue } from '../shared/queues/queue.config';

// Environment – must be set before any module is imported
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';


jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));


jest.mock('../shared/queues/queue.config', () => ({
  digestQueue: {
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
    obliterate: jest.fn().mockResolvedValue(undefined),
  },
  orchestrationQueue: {
    add: jest.fn().mockResolvedValue({id: 'mock-orchestration-id'}),
    close: jest.fn().mockResolvedValue(undefined),
    obliterate: jest.fn().mockResolvedValue(undefined)
  },
  dlqQueue: {
    add: jest.fn().mockResolvedValue({ id: 'mock-dlq-job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
    obliterate: jest.fn().mockResolvedValue(undefined),
  },
}));

afterAll(async () => {
    try {
        const { digestQueue, dlqQueue, orchestrationQueue } = await import('../shared/queues/queue.config');
        await Promise.allSettled([
            digestQueue.close(),
            dlqQueue.close(),
            orchestrationQueue.close(),
        ]);
    } catch {
        // Queues were never instantiated — nothing to close.
    }
});