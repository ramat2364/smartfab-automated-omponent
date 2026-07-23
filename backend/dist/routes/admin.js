"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// GET /admin/plants (Config utility) - accessible by any authenticated user
router.get('/plants', auth_1.authenticateToken, async (req, res) => {
    try {
        const plants = await db_1.default.plant.findMany({
            include: {
                lines: true
            }
        });
        res.json(plants);
    }
    catch (error) {
        console.error('Error fetching admin plants:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// GET /admin/shifts - accessible by any authenticated user
router.get('/shifts', auth_1.authenticateToken, async (req, res) => {
    try {
        const shifts = await db_1.default.shift.findMany();
        res.json(shifts);
    }
    catch (error) {
        console.error('Error fetching admin shifts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Protect all other admin routes
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)([client_1.Role.ADMIN]));
// GET /admin/users (Get all users)
router.get('/users', async (req, res) => {
    try {
        const users = await db_1.default.user.findMany({
            include: {
                plantAccess: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Remove password hashes for safety
        const safeUsers = users.map(u => {
            const { passwordHash, ...rest } = u;
            return rest;
        });
        res.json(safeUsers);
    }
    catch (error) {
        console.error('Error fetching admin users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// POST /admin/users (Create new user)
router.post('/users', async (req, res) => {
    const { email, password, name, role, plantAccessId } = req.body;
    if (!email || !password || !name || !role) {
        res.status(400).json({ message: 'Email, password, name, and role are required' });
        return;
    }
    try {
        // Check if user already exists
        const existing = await db_1.default.user.findUnique({ where: { email } });
        if (existing) {
            res.status(400).json({ message: 'User with this email already exists' });
            return;
        }
        const saltRounds = 10;
        const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
        const user = await db_1.default.user.create({
            data: {
                email,
                passwordHash,
                name,
                role: role,
                plantAccessId: plantAccessId || null
            },
            include: { plantAccess: true }
        });
        const { passwordHash: _, ...safeUser } = user;
        res.status(201).json(safeUser);
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// PUT /admin/users/:id (Update user role/access/details)
router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, role, plantAccessId, password } = req.body;
    try {
        const data = {
            name,
            email,
            role: role,
            plantAccessId: plantAccessId || null
        };
        if (password) {
            const saltRounds = 10;
            data.passwordHash = await bcrypt_1.default.hash(password, saltRounds);
        }
        const user = await db_1.default.user.update({
            where: { id },
            data,
            include: { plantAccess: true }
        });
        const { passwordHash: _, ...safeUser } = user;
        res.json(safeUser);
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// DELETE /admin/users/:id (Delete/De-register user)
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Prevent admin from deleting their own active account
        if (req.user?.id === id) {
            res.status(400).json({ message: 'You cannot delete your own active admin account.' });
            return;
        }
        const user = await db_1.default.user.findUnique({ where: { id } });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        await db_1.default.user.delete({ where: { id } });
        res.json({ message: `User ${user.name} (${user.email}) deleted successfully.` });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// POST /admin/machines (Add new machine to registry)
router.post('/machines', async (req, res) => {
    const { name, code, type, plantId, lineId, criticality, tempThresholdMax, vibThresholdMax, rpmThresholdMax } = req.body;
    if (!name || !code || !type || !plantId || !lineId) {
        res.status(400).json({ message: 'Name, code, type, plantId, and lineId are required' });
        return;
    }
    try {
        const existing = await db_1.default.machine.findUnique({ where: { code } });
        if (existing) {
            res.status(400).json({ message: 'Machine with this code already exists' });
            return;
        }
        const machine = await db_1.default.machine.create({
            data: {
                name,
                code,
                type,
                plantId,
                lineId,
                criticality: criticality || client_1.Criticality.MEDIUM,
                tempThresholdMax: parseFloat(tempThresholdMax || '85'),
                vibThresholdMax: parseFloat(vibThresholdMax || '4.5'),
                rpmThresholdMax: parseFloat(rpmThresholdMax || '3000'),
                installDate: new Date(),
                lastMaintenanceDate: new Date(),
                status: client_1.MachineStatus.OPERATIONAL
            }
        });
        res.status(201).json(machine);
    }
    catch (error) {
        console.error('Error adding machine:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// PUT /admin/machines/:id (Update machine details and thresholds)
router.put('/machines/:id', async (req, res) => {
    const { id } = req.params;
    const { name, criticality, status, tempThresholdMax, vibThresholdMax, rpmThresholdMax, lineId } = req.body;
    try {
        const data = {};
        if (name)
            data.name = name;
        if (criticality)
            data.criticality = criticality;
        if (status)
            data.status = status;
        if (lineId)
            data.lineId = lineId;
        if (tempThresholdMax !== undefined)
            data.tempThresholdMax = parseFloat(tempThresholdMax);
        if (vibThresholdMax !== undefined)
            data.vibThresholdMax = parseFloat(vibThresholdMax);
        if (rpmThresholdMax !== undefined)
            data.rpmThresholdMax = parseFloat(rpmThresholdMax);
        const machine = await db_1.default.machine.update({
            where: { id },
            data
        });
        res.json(machine);
    }
    catch (error) {
        console.error('Error updating machine configuration:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// POST /admin/plants (Add new plant facility e.g. Riyadh, Dammam, Gujarat)
router.post('/plants', async (req, res) => {
    const { name, code, location } = req.body;
    if (!name || !code || !location) {
        res.status(400).json({ message: 'Name, code, and location are required' });
        return;
    }
    try {
        const existing = await db_1.default.plant.findFirst({
            where: { OR: [{ name }, { code }] }
        });
        if (existing) {
            res.status(400).json({ message: 'A plant with this name or code already exists' });
            return;
        }
        const plant = await db_1.default.plant.create({
            data: { name, code, location }
        });
        res.status(201).json(plant);
    }
    catch (error) {
        console.error('Error creating plant:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// PUT /admin/plants/:id (Update plant details)
router.put('/plants/:id', async (req, res) => {
    const { id } = req.params;
    const { name, code, location } = req.body;
    try {
        const data = {};
        if (name)
            data.name = name;
        if (code)
            data.code = code;
        if (location)
            data.location = location;
        const plant = await db_1.default.plant.update({
            where: { id },
            data
        });
        res.json(plant);
    }
    catch (error) {
        console.error('Error updating plant:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// DELETE /admin/plants/:id (Delete plant facility)
router.delete('/plants/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const plant = await db_1.default.plant.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { lines: true, machines: true, users: true }
                }
            }
        });
        if (!plant) {
            res.status(404).json({ message: 'Plant not found' });
            return;
        }
        // Delete plant (cascade will clean up associated production lines/machines if configured or delete directly)
        await db_1.default.plant.delete({ where: { id } });
        res.json({ message: `Plant ${plant.name} deleted successfully.` });
    }
    catch (error) {
        console.error('Error deleting plant:', error);
        res.status(500).json({ message: 'Internal server error or plant has active dependent records.' });
    }
});
// POST /admin/shifts (Add new shift schedule)
router.post('/shifts', async (req, res) => {
    const { name, startTime, endTime } = req.body;
    if (!name || !startTime || !endTime) {
        res.status(400).json({ message: 'Name, startTime, and endTime are required' });
        return;
    }
    try {
        const existing = await db_1.default.shift.findUnique({ where: { name } });
        if (existing) {
            res.status(400).json({ message: 'A shift with this name already exists' });
            return;
        }
        const shift = await db_1.default.shift.create({
            data: { name, startTime, endTime }
        });
        res.status(201).json(shift);
    }
    catch (error) {
        console.error('Error creating shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// PUT /admin/shifts/:id (Update shift timings)
router.put('/shifts/:id', async (req, res) => {
    const { id } = req.params;
    const { name, startTime, endTime } = req.body;
    try {
        const data = {};
        if (name)
            data.name = name;
        if (startTime)
            data.startTime = startTime;
        if (endTime)
            data.endTime = endTime;
        const shift = await db_1.default.shift.update({
            where: { id },
            data
        });
        res.json(shift);
    }
    catch (error) {
        console.error('Error updating shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// GET /admin/logs (System Logs, Audit Trail & AI Event Cockpit)
router.get('/logs', async (req, res) => {
    try {
        const [aiLogs, alerts, maintenanceLogs, defectLogs] = await Promise.all([
            db_1.default.aiCallLog.findMany({
                orderBy: { timestamp: 'desc' },
                take: 50
            }),
            db_1.default.maintenanceAlert.findMany({
                include: {
                    machine: { select: { name: true, code: true, plant: { select: { name: true } } } },
                    assignedTo: { select: { name: true, email: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            db_1.default.maintenanceLog.findMany({
                include: {
                    machine: { select: { name: true, code: true } },
                    technician: { select: { name: true, email: true } }
                },
                orderBy: { completedAt: 'desc' },
                take: 50
            }),
            db_1.default.defectEntry.findMany({
                include: {
                    plant: { select: { name: true } },
                    inspector: { select: { name: true } },
                    rootCauseCategory: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            })
        ]);
        // Format into unified log entry format
        const unifiedLogs = [];
        // AI Call logs
        aiLogs.forEach(log => {
            unifiedLogs.push({
                id: log.id,
                type: 'AI_ENGINE',
                severity: 'INFO',
                service: log.serviceName,
                title: `AI Call: ${log.serviceName}`,
                details: log.response,
                payload: log.prompt,
                tokensUsed: log.tokensUsed || 0,
                timestamp: log.timestamp
            });
        });
        // Alert Logs
        alerts.forEach(alert => {
            unifiedLogs.push({
                id: alert.id,
                type: 'MACHINE_ANOMALY',
                severity: alert.severity,
                service: `Machine Diagnostics (${alert.machine?.code || 'N/A'})`,
                title: `Sensor Breach: ${alert.triggerValue}`,
                details: alert.message,
                payload: alert.aiRecommendation || 'No AI payload',
                plant: alert.machine?.plant?.name || 'N/A',
                status: alert.status,
                timestamp: alert.createdAt
            });
        });
        // Maintenance Logs
        maintenanceLogs.forEach(ml => {
            unifiedLogs.push({
                id: ml.id,
                type: 'WORK_ORDER',
                severity: 'INFO',
                service: `Maintenance (${ml.machine?.code || 'N/A'})`,
                title: `Work Order Completed by ${ml.technician?.name || 'Technician'}`,
                details: ml.workDescription,
                payload: `Parts Used: ${ml.partsUsed} | Downtime: ${ml.downtimeMinutes} mins`,
                timestamp: ml.completedAt
            });
        });
        // Quality Defect Logs
        defectLogs.forEach(def => {
            unifiedLogs.push({
                id: def.id,
                type: 'QUALITY_DEFECT',
                severity: def.status === 'PENDING' ? 'WARNING' : 'INFO',
                service: `Quality Audit (${def.partNumber})`,
                title: `Defect logged: ${def.defectType} (Qty: ${def.quantity})`,
                details: def.description,
                payload: `Root Cause: ${def.rootCauseCategory?.name || 'Under Investigation'}`,
                plant: def.plant?.name || 'N/A',
                photoUrl: def.photoUrl,
                timestamp: def.createdAt
            });
        });
        // Sort descending by timestamp
        unifiedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        res.json({
            totalLogs: unifiedLogs.length,
            aiLogsCount: aiLogs.length,
            anomaliesCount: alerts.filter(a => a.status === 'ACTIVE').length,
            logs: unifiedLogs
        });
    }
    catch (error) {
        console.error('Error fetching admin system logs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
