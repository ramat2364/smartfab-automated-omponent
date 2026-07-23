"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleCronJobs = exports.reportQueue = exports.energyQueue = exports.alertQueue = exports.sensorQueue = exports.queueConnection = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
// Create a single shared Redis connection for queues
exports.queueConnection = new ioredis_1.default(config_1.config.redisUrl, {
    maxRetriesPerRequest: null,
});
exports.sensorQueue = new bullmq_1.Queue('sensor-simulation-queue', {
    connection: exports.queueConnection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
    },
});
exports.alertQueue = new bullmq_1.Queue('alert-evaluation-queue', {
    connection: exports.queueConnection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
    },
});
exports.energyQueue = new bullmq_1.Queue('energy-aggregation-queue', {
    connection: exports.queueConnection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
    },
});
exports.reportQueue = new bullmq_1.Queue('report-generation-queue', {
    connection: exports.queueConnection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
    },
});
// Setup recurring background jobs
const scheduleCronJobs = async () => {
    try {
        console.log('Scheduling recurring background jobs in BullMQ...');
        // 1. Sensor simulation every 20 seconds
        await exports.sensorQueue.add('run-sensor-simulation', {}, {
            repeat: {
                pattern: '*/20 * * * * *', // Every 20 seconds
            },
        });
        // 2. Alert evaluation every 30 seconds
        await exports.alertQueue.add('evaluate-machine-alerts', {}, {
            repeat: {
                pattern: '*/30 * * * * *', // Every 30 seconds
            },
        });
        // 3. Energy readings aggregation every 1 minute
        await exports.energyQueue.add('aggregate-energy-readings', {}, {
            repeat: {
                pattern: '*/60 * * * * *', // Every minute
            },
        });
        // 4. Report generation every day at midnight (simulate report prep)
        await exports.reportQueue.add('daily-report-prep', {}, {
            repeat: {
                pattern: '0 0 * * *', // Daily at midnight
            },
        });
        console.log('BullMQ recurring jobs scheduled successfully.');
    }
    catch (error) {
        console.error('Error scheduling BullMQ recurring jobs:', error);
    }
};
exports.scheduleCronJobs = scheduleCronJobs;
