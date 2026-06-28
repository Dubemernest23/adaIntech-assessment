// import { processOrchestration, onFailedHandler } from '../../modules/orchestrator/orchestrator.worker';
// import { OrchestratorService } from '../../modules/orchestrator/orchestrator.service';
// import { JOB_NAMES } from '../../shared/constants';

// jest.mock('../../modules/orchestrator/orchestrator.service');
// jest.mock('../../shared/logger/pino.logger', () => ({
//     logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
// }));

// import { dlqQueue } from '../../shared/queues/queue.config';

// const mockJob = {
//     id: 'job-001',
//     name: JOB_NAMES.ORCHESTRATE,
//     data: {
//         eventId: 'test-event-id',
//         eventType: 'transaction_created',
//         userId: 'user-001',
//         tenantId: 'tenant-001',
//         payload: { amount: 1000 },
//         correlationId: 'test-correlation-id',
//     },
//     attemptsMade: 0,
// };

// describe('OrchestratorWorker', () => {
//     let mockOrchestrate: jest.Mock;

//     beforeEach(() => {
//         jest.clearAllMocks();
//         mockOrchestrate = jest.fn().mockResolvedValue({});
//         (OrchestratorService as jest.Mock).mockImplementation(() => ({
//             orchestrate: mockOrchestrate,
//         }));
//     });

//     it('should call orchestrate() with job data on success', async () => {
//         await processOrchestration(mockJob as any);

//         expect(mockOrchestrate).toHaveBeenCalledWith(mockJob.data);
//     });

//     it('should not write to DLQ on successful orchestration', async () => {
//         await processOrchestration(mockJob as any);

//         expect(dlqQueue.add).not.toHaveBeenCalled();
//     });

//     it('should write to DLQ with eventId preserved when job exhausts all retries', async () => {
//         const exhaustedJob = { ...mockJob, attemptsMade: 3 };
//         const error = new Error('Orchestration failed');

//         await onFailedHandler(exhaustedJob as any, error);

//         expect(dlqQueue.add).toHaveBeenCalledWith(
//             JOB_NAMES.DLQ_EVENT,
//             expect.objectContaining({
//                 eventId: mockJob.data.eventId,
//                 tenantId: mockJob.data.tenantId,
//                 correlationId: mockJob.data.correlationId,
//                 error: error.message,
//             }),
//         );
//     });

//     it('should not write to DLQ if job has not exhausted retries', async () => {
//         const earlyFailJob = { ...mockJob, attemptsMade: 1 };
//         const error = new Error('Temporary failure');

//         await onFailedHandler(earlyFailJob as any, error);

//         expect(dlqQueue.add).not.toHaveBeenCalled();
//     });
// });


jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

jest.mock('../../modules/orchestrator/orchestrator.service');
jest.mock('../../modules/events/event.repo');
jest.mock('../../database/prisma.client', () => ({
  prisma: {},
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));
jest.mock('../../shared/logger/pino.logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../shared/queues/queue.config', () => ({
  orchestrationQueue: { add: jest.fn() },
  digestQueue: { add: jest.fn() },
  dlqQueue: { add: jest.fn() },
}));

import { processOrchestration, onFailedHandler } from '../../modules/orchestrator/orchestrator.worker';
import { OrchestratorService } from '../../modules/orchestrator/orchestrator.service';
import { EventRepository } from '../../modules/events/event.repo';
import { dlqQueue } from '../../shared/queues/queue.config';
import { JOB_NAMES } from '../../shared/constants';

const mockOrchestrate = jest.fn();
const mockUpdateOrchestrationStatus = jest.fn().mockResolvedValue({});

(OrchestratorService as jest.Mock).mockImplementation(() => ({
  orchestrate: mockOrchestrate,
}));

(EventRepository as jest.Mock).mockImplementation(() => ({
  updateOrchestrationStatus: mockUpdateOrchestrationStatus,
}));

const mockJob = {
  id: 'job-001',
  name: JOB_NAMES.ORCHESTRATE,
  data: {
    eventId: 'test-event-id',
    eventType: 'transaction_created',
    userId: 'user-001',
    tenantId: 'tenant-001',
    payload: { amount: 1000 },
    correlationId: 'test-correlation-id',
  },
  attemptsMade: 0,
};

describe('OrchestratorWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrchestrate.mockResolvedValue({});
  });

  it('should call orchestrate() with job data on success', async () => {
    await processOrchestration(mockJob as any);
    expect(mockOrchestrate).toHaveBeenCalledWith(mockJob.data);
  });

  it('should mark event as COMPLETED on successful orchestration', async () => {
    await processOrchestration(mockJob as any);
    expect(mockUpdateOrchestrationStatus).toHaveBeenCalledWith(
      mockJob.data.eventId,
      'COMPLETED',
    );
  });

  it('should not write to DLQ on successful orchestration', async () => {
    await processOrchestration(mockJob as any);
    expect(dlqQueue.add).not.toHaveBeenCalled();
  });

  it('should write to DLQ with eventId preserved when job exhausts all retries', async () => {
    const exhaustedJob = { ...mockJob, attemptsMade: 3 };
    const error = new Error('Orchestration failed');

    await onFailedHandler(exhaustedJob as any, error);

    expect(dlqQueue.add).toHaveBeenCalledWith(
      JOB_NAMES.DLQ_EVENT,
      expect.objectContaining({
        eventId: mockJob.data.eventId,
        tenantId: mockJob.data.tenantId,
        correlationId: mockJob.data.correlationId,
        error: error.message,
      }),
    );
  });

  it('should not write to DLQ if job has not exhausted retries', async () => {
    const earlyFailJob = { ...mockJob, attemptsMade: 1 };
    const error = new Error('Temporary failure');

    await onFailedHandler(earlyFailJob as any, error);

    expect(dlqQueue.add).not.toHaveBeenCalled();
  });
});