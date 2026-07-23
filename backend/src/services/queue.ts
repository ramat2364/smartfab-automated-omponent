import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';

// Create a single shared Redis connection for queues
export const queueConnection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const sensorQueue = new Queue('sensor-simulation-queue', {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const alertQueue = new Queue('alert-evaluation-queue', {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const energyQueue = new Queue('energy-aggregation-queue', {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const reportQueue = new Queue('report-generation-queue', {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

// Setup recurring background jobs
export const scheduleCronJobs = async () => {
  try {
    console.log('Scheduling recurring background jobs in BullMQ...');
    
    // 1. Sensor simulation every 20 seconds
    await sensorQueue.add(
      'run-sensor-simulation',
      {},
      {
        repeat: {
          pattern: '*/20 * * * * *', // Every 20 seconds
        },
      }
    );

    // 2. Alert evaluation every 30 seconds
    await alertQueue.add(
      'evaluate-machine-alerts',
      {},
      {
        repeat: {
          pattern: '*/30 * * * * *', // Every 30 seconds
        },
      }
    );

    // 3. Energy readings aggregation every 1 minute
    await energyQueue.add(
      'aggregate-energy-readings',
      {},
      {
        repeat: {
          pattern: '*/60 * * * * *', // Every minute
        },
      }
    );

    // 4. Report generation every day at midnight (simulate report prep)
    await reportQueue.add(
      'daily-report-prep',
      {},
      {
        repeat: {
          pattern: '0 0 * * *', // Daily at midnight
        },
      }
    );

    console.log('BullMQ recurring jobs scheduled successfully.');
  } catch (error) {
    console.error('Error scheduling BullMQ recurring jobs:', error);
  }
};
