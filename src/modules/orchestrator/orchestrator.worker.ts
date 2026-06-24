import { Worker,Job } from "bullmq";
import { redisConfig } from "../../config";
import { QUEUE_NAMES, JOB_NAMES } from "../../shared/constants";
import { logger } from "../../shared/logger/pino.logger";
import { dlqQueue } from "../../shared/queues/queue.config";
import { OrchestratorService } from "./orchestrator.service";


export const startOrchestrationWorker = (): Worker =>{
    const worker = new Worker(
        QUEUE_NAMES.ORCHESTRATION,
        async (job: Job) =>{
            if(job.name === JOB_NAMES.ORCHESTRATE){
                await processOrchestration(job)
            }
        },
        {
            connection: {
                host: redisConfig.host,
                port: redisConfig.port,
            }
        }
        
    )
    worker.on('completed', (job: Job) =>{
        logger.info({
            jobId: job.id,
            jobName: job.name
        }, "Job completed")
    })
    worker.on('failed', onFailedHandler);
    logger.info('Orchestration worker started')
    return worker;
}


export const processOrchestration = async (job: Job): Promise<void> => {
    const orchestratorService = new OrchestratorService();
    await orchestratorService.orchestrate(job.data);
};

export const onFailedHandler = async (job: Job | undefined, error: Error): Promise<void> => {
    if (job && job.attemptsMade >= 3) {
        await dlqQueue.add(JOB_NAMES.DLQ_EVENT, {
            eventId: job.data.eventId,
            tenantId: job.data.tenantId,
            correlationId: job.data.correlationId,
            error: error.message,
            failedAt: new Date().toISOString(),
        });
    }
};