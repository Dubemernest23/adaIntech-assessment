import { DeliveryRecord, DeliveryStatus, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.client';
import { CreateDeliveryRecordInput, 
    DeliveryStatusEnum, 
    DeliveryHistoryFilters, 
    DeliverySummaryResult 
} from './delivery.types';

const STATUS_MAP: Record<DeliveryStatusEnum, DeliveryStatus>={
    sent: DeliveryStatus.sent,
    failed: DeliveryStatus.failed,
    skipped: DeliveryStatus.skipped,
    queued: DeliveryStatus.queued
};


export class DeliveryRepository {
    async createRecord(data: CreateDeliveryRecordInput) {
        return prisma.deliveryRecord.create({
            data: {
                eventId: data.eventId,
                userId: data.userId,
                tenantId: data.tenantId,
                channel: data.channel,
                status: STATUS_MAP[data.status],
                skipReason: data.skipReason,
                correlationId: data.correlationId,
            },
        });
    }

    async findByUserAndTenant(userId: string, tenantId: string) {
        return prisma.deliveryRecord.findMany({
            where: {
                userId,
                tenantId,
            },
            orderBy: {
                attemptedAt: 'desc',
            },
        });
    }

    async findByEventId(eventId: string, tenantId: string) {
        return prisma.deliveryRecord.findMany({
            where: {
                eventId,
                tenantId,
            },
        });
    }

    // new methods - findByUserAndTenantFiltered & getSummaryByUserAndTenant
    async findByUserAndTenantFiltered (userId: string, tenantId: string, filters: DeliveryHistoryFilters): Promise<DeliveryRecord[]> {
      
        const sanitizedLimit = filters.limit ?? 50;
        const whereClause: Prisma.DeliveryRecordWhereInput = {tenantId,userId};
     
        if(filters.status){
            whereClause.status = STATUS_MAP[filters.status];
        }
        if(filters.channel){
            whereClause.channel = filters.channel;
        }
        
        if(filters.from||filters.to){
            whereClause.attemptedAt = {};

            if(filters.from){
                whereClause.attemptedAt.gte = new Date(filters.from);
            }
            if(filters.to){
                whereClause.attemptedAt.lte = new Date(filters.to);
            }
        }

        return prisma.deliveryRecord.findMany({
            where: whereClause,
            take: sanitizedLimit,
            orderBy: {
                attemptedAt: 'desc' // returns the latest history first
            }
        })
        
    }

    async getSummaryByUserAndTenant(userId: string,tenantId: string): Promise<DeliverySummaryResult> {

        const whereClause: Prisma.DeliveryRecordWhereInput = {userId, tenantId}

        const [statusGroups, channelGroups] = await Promise.all([
            // group by status
            prisma.deliveryRecord.groupBy({
                by: ['status'],
                where: whereClause,
                _count: {_all:true} // counts totalper status
            }),
            //group by channel
            prisma.deliveryRecord.groupBy({
                by: ['channel'],
                where: whereClause,
                _count:{_all:true}, // counts total per channel
            }),
        ]);
        const byStatus = statusGroups.map(e => ({
            status: e.status,
            count: e._count._all,
        }));

        const byChannel = channelGroups.map(e => ({
            channel: e.channel,
            count: e._count._all,
        }));

        const total = statusGroups.reduce((sum, e) => sum + e._count._all, 0);

        return { byStatus, byChannel, total };
      
    }
}