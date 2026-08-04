jest.mock('../../config', () => ({
    jwtConfig: {
        privateKey: 'test-secret',
        publicKey: 'test-secret',
        algorithm: 'HS256' as const,
    },
    appConfig: {
        port: 3000,
        env: 'test',
    },
    redisConfig: {
        host: 'localhost',
        port: 6379,
    },
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { jwtConfig } from '../../config';

jest.mock('../../database/prisma.client', () => ({
    prisma: {
        deliveryRecord: {
            findMany: jest.fn(),
            create: jest.fn(),
            groupBy: jest.fn(),
        },
    },
    connectDatabase: jest.fn(),
    disconnectDatabase: jest.fn(),
}));

jest.mock('../../shared/logger/pino.logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '../../database/prisma.client';

const mockFindMany = prisma.deliveryRecord.findMany as jest.Mock;
const mockGroupBy = prisma.deliveryRecord.groupBy as jest.Mock;

const makeToken = (userId: string, tenantId: string, role = 'user') =>
    jwt.sign({ user_id: userId, tenant_id: tenantId, role }, jwtConfig.privateKey, {
        algorithm: jwtConfig.algorithm,
    });

const tenant1Token = makeToken('user-001', 'tenant-001');
const tenant2Token = makeToken('user-002', 'tenant-002');
const adminToken = makeToken('admin-001', 'tenant-001', 'admin');

const sampleRecord = {
    id: 'record-001',
    eventId: 'event-001',
    userId: 'user-001',
    tenantId: 'tenant-001',
    channel: 'email',
    status: 'sent',
    correlationId: 'corr-001',
    attemptedAt: new Date().toISOString(),
};

describe('Delivery API — D3', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    //GET /api/v1/delivery/history 

    describe('GET /api/v1/delivery/history', () => {
        it('should return 401 when no token provided', async () => {
            const res = await request(app).get('/api/v1/delivery/history');
            expect(res.status).toBe(401);
        });

        it('should return 200 with delivery records for authenticated user', async () => {
            mockFindMany.mockResolvedValue([sampleRecord]);

            const res = await request(app)
                .get('/api/v1/delivery/history')
                .set('Authorization', `Bearer ${tenant1Token}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(mockFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        tenantId: 'tenant-001',
                        userId: 'user-001',
                    }),
                }),
            );
        });

        it('should enforce tenant isolation — tenant-002 token cannot see tenant-001 records', async () => {
            mockFindMany.mockResolvedValue([]);

            const res = await request(app)
                .get('/api/v1/delivery/history')
                .set('Authorization', `Bearer ${tenant2Token}`);

            expect(res.status).toBe(200);
            expect(mockFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ tenantId: 'tenant-002' }),
                }),
            );
            const callArgs = (mockFindMany.mock.calls[0][0] as any).where;
            expect(callArgs.tenantId).not.toBe('tenant-001');
        });

        it('should return 400 for invalid status query param', async () => {
            const res = await request(app)
                .get('/api/v1/delivery/history?status=bogus')
                .set('Authorization', `Bearer ${tenant1Token}`);

            expect(res.status).toBe(400);
        });

        it('should return 400 for invalid channel query param', async () => {
            const res = await request(app)
                .get('/api/v1/delivery/history?channel=carrier_pigeon')
                .set('Authorization', `Bearer ${tenant1Token}`);

            expect(res.status).toBe(400);
        });

        it('should return 400 for invalid from date', async () => {
            const res = await request(app)
                .get('/api/v1/delivery/history?from=not-a-date')
                .set('Authorization', `Bearer ${tenant1Token}`);

            expect(res.status).toBe(400);
        });
        // test for invalid to date
        it('should return 400 for invalid to date', async () => {
            const res = await request(app)
                .get('/api/v1/delivery/history?to=not-a-date')
                .set('Authorization', `Bearer ${tenant1Token}`);
            expect(res.status).toBe(400);
        });

        it('should apply limit query param correctly', async () => {
            mockFindMany.mockResolvedValue([]);

            await request(app)
                .get('/api/v1/delivery/history?limit=10')
                .set('Authorization', `Bearer ${tenant1Token}`);

            expect(mockFindMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 10 }),
            );
        });

        //test for limit less than 1 returns 400
        it('should return 400 when limit is less than 1', async () => {
            const res = await request(app)
                .get('/api/v1/delivery/history?limit=0')
                .set('Authorization', `Bearer ${tenant1Token}`);
            expect(res.status).toBe(400);
        });

        // test for limit more than 200 returns 400
        it('should return 400 when limit exceeds 200', async () => {
            const res = await request(app)
                .get('/api/v1/delivery/history?limit=201')
                .set('Authorization', `Bearer ${tenant1Token}`);
            expect(res.status).toBe(400);
        });

        it('should allow admin to query by userId', async () => {
            mockFindMany.mockResolvedValue([]);

            await request(app)
                .get('/api/v1/delivery/history?userId=user-999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(mockFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ userId: 'user-999' }),
                }),
            );
        });

        it('should ignore userId query param for non-admin users', async () => {
            mockFindMany.mockResolvedValue([]);

            await request(app)
                .get('/api/v1/delivery/history?userId=user-999')
                .set('Authorization', `Bearer ${tenant1Token}`);

            const callArgs = (mockFindMany.mock.calls[0][0] as any).where;
            expect(callArgs.userId).toBe('user-001');
            expect(callArgs.userId).not.toBe('user-999');
        });
    });

    //GET /api/v1/delivery/history/:eventId

    describe('GET /api/v1/delivery/history/:eventId', () => {
        it('should return 401 when no token provided', async () => {
            const res = await request(app).get('/api/v1/delivery/history/event-001');
            expect(res.status).toBe(401);
        });

        it('should return records for the event scoped to the caller tenant', async () => {
            mockFindMany.mockResolvedValue([sampleRecord]);

            const res = await request(app)
                .get('/api/v1/delivery/history/event-001')
                .set('Authorization', `Bearer ${tenant1Token}`);

            expect(res.status).toBe(200);
            expect(mockFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        eventId: 'event-001',
                        tenantId: 'tenant-001',
                    }),
                }),
            );
        });

        it('should not return records for a different tenant', async () => {
            mockFindMany.mockResolvedValue([]);

            const res = await request(app)
                .get('/api/v1/delivery/history/event-001')
                .set('Authorization', `Bearer ${tenant2Token}`);

            expect(res.status).toBe(200);
            const callArgs = (mockFindMany.mock.calls[0][0] as any).where;
            expect(callArgs.tenantId).toBe('tenant-002');
            expect(callArgs.tenantId).not.toBe('tenant-001');
        });
    });

    // GET /api/v1/delivery/summary

    describe('GET /api/v1/delivery/summary', () => {
        it('should return 401 when no token provided', async () => {
            const res = await request(app).get('/api/v1/delivery/summary');
            expect(res.status).toBe(401);
        });

        it('should return summary grouped by status and channel', async () => {
            mockGroupBy
                .mockResolvedValueOnce([{ status: 'sent', _count: { _all: 5 } }])
                .mockResolvedValueOnce([{ channel: 'email', _count: { _all: 5 } }]);

            const res = await request(app)
                .get('/api/v1/delivery/summary')
                .set('Authorization', `Bearer ${tenant1Token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.byStatus).toEqual([{ status: 'sent', count: 5 }]);
            expect(res.body.data.byChannel).toEqual([{ channel: 'email', count: 5 }]);
            expect(res.body.data.total).toBe(5);
        });

        it('should scope summary to the authenticated tenant', async () => {
            mockGroupBy.mockResolvedValue([]);

            await request(app)
                .get('/api/v1/delivery/summary')
                .set('Authorization', `Bearer ${tenant1Token}`);

            expect(mockGroupBy).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ tenantId: 'tenant-001' }),
                }),
            );
        });
    });
});