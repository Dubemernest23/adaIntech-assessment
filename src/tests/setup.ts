
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

