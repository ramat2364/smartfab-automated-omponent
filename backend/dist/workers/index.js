"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorkers = void 0;
const bullmq_1 = require("bullmq");
const db_1 = __importDefault(require("../db"));
const queue_1 = require("../services/queue");
const ai_1 = require("../services/ai");
const client_1 = require("@prisma/client");
const startWorkers = () => {
    console.log('Initializing BullMQ workers...');
    // 1. Sensor Simulation Worker
    const sensorWorker = new bullmq_1.Worker('sensor-simulation-queue', async (job) => {
        if (job.name === 'run-sensor-simulation') {
            const machines = await db_1.default.machine.findMany();
            if (machines.length === 0)
                return;
            const readingsData = [];
            for (const machine of machines) {
                // Base levels based on status
                let multiplier = 1.0;
                if (machine.status === client_1.MachineStatus.WARNING)
                    multiplier = 1.15;
                if (machine.status === client_1.MachineStatus.ERROR)
                    multiplier = 1.3;
                const baseTemp = machine.type === 'CNC' ? 45 : machine.type === 'Press' ? 50 : 60;
                const baseVib = machine.type === 'CNC' ? 1.8 : machine.type === 'Press' ? 2.5 : 1.2;
                const baseRpm = machine.type === 'CNC' ? 2200 : machine.type === 'Press' ? 800 : 1200;
                // Introduce some random spikes (1% chance of alert trigger)
                const isSpike = Math.random() < 0.02;
                const tempSpike = isSpike ? 25.0 : 0.0;
                const vibSpike = isSpike ? 2.0 : 0.0;
                const temperature = parseFloat((baseTemp * multiplier + (Math.random() * 6 - 3) + tempSpike).toFixed(1));
                const vibration = parseFloat((baseVib * multiplier + (Math.random() * 0.4 - 0.2) + vibSpike).toFixed(2));
                const rpm = parseFloat((baseRpm * multiplier + (Math.random() * 100 - 50)).toFixed(0));
                readingsData.push({
                    machineId: machine.id,
                    temperature,
                    vibration,
                    rpm,
                    timestamp: new Date()
                });
            }
            await db_1.default.sensorReading.createMany({ data: readingsData });
            // Console log a brief notification
            // console.log(`Simulated sensor readings for ${machines.length} machines.`);
        }
    }, { connection: queue_1.queueConnection });
    // 2. Alert Evaluation Worker
    const alertWorker = new bullmq_1.Worker('alert-evaluation-queue', async (job) => {
        if (job.name === 'evaluate-machine-alerts') {
            const machines = await db_1.default.machine.findMany();
            for (const machine of machines) {
                // Get the latest sensor reading
                const latestReading = await db_1.default.sensorReading.findFirst({
                    where: { machineId: machine.id },
                    orderBy: { timestamp: 'desc' }
                });
                if (!latestReading)
                    continue;
                // Check limits
                const tempExceeded = latestReading.temperature > machine.tempThresholdMax;
                const vibExceeded = latestReading.vibration > machine.vibThresholdMax;
                if (tempExceeded || vibExceeded) {
                    // Check if there is already an active alert
                    const activeAlert = await db_1.default.maintenanceAlert.findFirst({
                        where: {
                            machineId: machine.id,
                            status: client_1.AlertStatus.ACTIVE
                        }
                    });
                    if (!activeAlert) {
                        const triggerDetails = tempExceeded
                            ? `Temp: ${latestReading.temperature}°C (Limit: ${machine.tempThresholdMax}°C)`
                            : `Vibration: ${latestReading.vibration}mm/s (Limit: ${machine.vibThresholdMax}mm/s)`;
                        const severity = (latestReading.temperature > machine.tempThresholdMax + 10 || latestReading.vibration > machine.vibThresholdMax + 1.0)
                            ? client_1.AlertSeverity.CRITICAL
                            : client_1.AlertSeverity.WARNING;
                        const message = `Sensor anomaly detected on ${machine.name} (${machine.code}). Trigger: ${triggerDetails}`;
                        console.log(`ALERT TRIGGERED: ${message}`);
                        // Generate AI recommendation
                        const aiRec = await ai_1.AiService.generatePredictiveMaintenance(machine.code, machine.type, latestReading, []);
                        // Save Alert
                        await db_1.default.maintenanceAlert.create({
                            data: {
                                machineId: machine.id,
                                severity,
                                status: client_1.AlertStatus.ACTIVE,
                                triggerValue: triggerDetails,
                                message,
                                aiRecommendation: aiRec
                            }
                        });
                        // Update machine status
                        await db_1.default.machine.update({
                            where: { id: machine.id },
                            data: { status: severity === client_1.AlertSeverity.CRITICAL ? client_1.MachineStatus.ERROR : client_1.MachineStatus.WARNING }
                        });
                    }
                }
            }
        }
    }, { connection: queue_1.queueConnection });
    // 3. Energy Aggregation Worker
    const energyWorker = new bullmq_1.Worker('energy-aggregation-queue', async (job) => {
        if (job.name === 'aggregate-energy-readings') {
            const machines = await db_1.default.machine.findMany();
            const energyData = [];
            for (const machine of machines) {
                const baseKwh = machine.criticality === 'HIGH' ? 12 : 6; // 1-minute usage estimation
                const kwhConsumption = parseFloat((baseKwh / 60 * (0.8 + Math.random() * 0.4)).toFixed(3));
                energyData.push({
                    plantId: machine.plantId,
                    lineId: machine.lineId,
                    machineId: machine.id,
                    kwhConsumption,
                    costPerUnit: 7.8,
                    timestamp: new Date()
                });
            }
            await db_1.default.energyReading.createMany({ data: energyData });
        }
    }, { connection: queue_1.queueConnection });
    // 4. Report Generation Worker
    const reportWorker = new bullmq_1.Worker('report-generation-queue', async (job) => {
        if (job.name === 'daily-report-prep') {
            console.log('[BullMQ Report Worker] Starting daily aggregated report preparation...');
            // Simulates query and aggregation of OEE data
            const plants = await db_1.default.plant.findMany();
            for (const p of plants) {
                console.log(`[BullMQ Report Worker] Aggregating operational stats for ${p.name}`);
            }
        }
    }, { connection: queue_1.queueConnection });
    // Error handling
    sensorWorker.on('failed', (job, err) => console.error(`Sensor Worker job ${job?.id} failed:`, err));
    alertWorker.on('failed', (job, err) => console.error(`Alert Worker job ${job?.id} failed:`, err));
    energyWorker.on('failed', (job, err) => console.error(`Energy Worker job ${job?.id} failed:`, err));
    reportWorker.on('failed', (job, err) => console.error(`Report Worker job ${job?.id} failed:`, err));
    console.log('BullMQ workers initialized.');
};
exports.startWorkers = startWorkers;
