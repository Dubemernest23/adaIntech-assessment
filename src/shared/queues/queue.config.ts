import { Queue } from 'bullmq';
import { redisConfig } from '../../config';
import { QUEUE_NAMES } from '../constants';

const connection = {
  host: redisConfig.host,
  port: redisConfig.port,
};

export const digestQueue = new Queue(QUEUE_NAMES.DIGEST, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const dlqQueue = new Queue(QUEUE_NAMES.DLQ, {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: false,
    removeOnFail: false,
  },
});