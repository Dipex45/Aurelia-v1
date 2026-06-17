import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

const isValidRedisUrl = redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'));

const connection = isValidRedisUrl ? new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
}) : null;

// Helper to create a queue with centralized connection
export function createQueue(name: string) {
  if (!connection) {
    console.warn(`[Queue: ${name}] Redis not connected. Jobs will not be processed.`);
    return null;
  }
  return new Queue(name, { connection });
}

// Helper to create a worker
export function createWorker(name: string, processor: (job: Job) => Promise<any>) {
  if (!connection) {
    console.warn(`[Worker: ${name}] Redis not connected. Worker inactive.`);
    return null;
  }
  return new Worker(name, processor, { connection });
}

export { connection };
