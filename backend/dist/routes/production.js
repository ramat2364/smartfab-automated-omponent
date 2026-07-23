"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOee = void 0;
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Helper to calculate OEE metrics from entries
const calculateOee = (entries) => {
    if (entries.length === 0) {
        return { availability: 0, performance: 0, quality: 0, oee: 0 };
    }
    let totalPlannedMinutes = entries.length * 480; // 8 hours per shift entry
    let totalDowntime = 0;
    let totalProduced = 0;
    let totalScrap = 0;
    let totalTarget = 0;
    entries.forEach(e => {
        totalDowntime += e.downtimeMinutes;
        totalProduced += e.unitsProduced;
        totalScrap += e.scrapCount;
        // Assume target of 300 units per shift
        totalTarget += 300;
    });
    const availability = totalPlannedMinutes > 0
        ? Math.max(0, (totalPlannedMinutes - totalDowntime) / totalPlannedMinutes)
        : 0;
    const performance = totalTarget > 0
        ? Math.min(1.0, totalProduced / totalTarget)
        : 0;
    const quality = totalProduced > 0
        ? Math.max(0, (totalProduced - totalScrap) / totalProduced)
        : 0;
    const oee = availability * performance * quality * 100;
    return {
        availability: Math.round(availability * 1000) / 10,
        performance: Math.round(performance * 1000) / 10,
        quality: Math.round(quality * 1000) / 10,
        oee: Math.round(oee * 10) / 10
    };
};
exports.calculateOee = calculateOee;
// GET /production/overview
router.get('/overview', auth_1.authenticateToken, auth_1.checkPlantAccess, async (req, res) => {
    try {
        const { plantId } = req.query;
        const whereClause = {};
        if (plantId) {
            whereClause.plantId = plantId;
        }
        else if (req.user?.plantAccessId) {
            whereClause.plantId = req.user.plantAccessId;
        }
        // Get today's entries
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let activeEntries = await db_1.default.productionEntry.findMany({
            where: {
                ...whereClause,
                date: {
                    gte: today
                }
            },
            include: {
                plant: true,
                line: true,
                shift: true
            }
        });
        // Fallback: If no shift entries logged for today yet, fetch the most recent active shift entries
        if (activeEntries.length === 0) {
            const latestEntry = await db_1.default.productionEntry.findFirst({
                where: whereClause,
                orderBy: { date: 'desc' }
            });
            if (latestEntry) {
                const latestDate = new Date(latestEntry.date);
                latestDate.setHours(0, 0, 0, 0);
                activeEntries = await db_1.default.productionEntry.findMany({
                    where: {
                        ...whereClause,
                        date: {
                            gte: latestDate
                        }
                    },
                    include: {
                        plant: true,
                        line: true,
                        shift: true
                    }
                });
            }
        }
        const oeeMetrics = (0, exports.calculateOee)(activeEntries);
        const totalProduced = activeEntries.reduce((sum, e) => sum + e.unitsProduced, 0);
        const totalScrap = activeEntries.reduce((sum, e) => sum + e.scrapCount, 0);
        const totalDowntime = activeEntries.reduce((sum, e) => sum + e.downtimeMinutes, 0);
        const totalTarget = activeEntries.length * 300; // 300 target per shift entry
        // Group entries by line
        const lineStatsMap = {};
        activeEntries.forEach(entry => {
            if (!lineStatsMap[entry.line.id]) {
                lineStatsMap[entry.line.id] = {
                    lineId: entry.line.id,
                    lineName: entry.line.name,
                    lineCode: entry.line.code,
                    unitsProduced: 0,
                    scrapCount: 0,
                    downtimeMinutes: 0,
                    entries: []
                };
            }
            lineStatsMap[entry.line.id].unitsProduced += entry.unitsProduced;
            lineStatsMap[entry.line.id].scrapCount += entry.scrapCount;
            lineStatsMap[entry.line.id].downtimeMinutes += entry.downtimeMinutes;
            lineStatsMap[entry.line.id].entries.push(entry);
        });
        const lineStats = Object.values(lineStatsMap).map(line => {
            const metrics = (0, exports.calculateOee)(line.entries);
            return {
                ...line,
                oee: metrics.oee,
                availability: metrics.availability,
                performance: metrics.performance,
                quality: metrics.quality,
                target: line.entries.length * 300
            };
        });
        res.json({
            summary: {
                unitsProduced: totalProduced,
                targetUnits: totalTarget || 300,
                scrapCount: totalScrap,
                downtimeMinutes: totalDowntime,
                ...oeeMetrics
            },
            lineStats,
            entries: activeEntries
        });
    }
    catch (error) {
        console.error('Error fetching production overview:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// POST /production/entry
router.post('/entry', auth_1.authenticateToken, (0, auth_1.requireRole)([client_1.Role.PRODUCTION_MANAGER, client_1.Role.PLANT_HEAD, client_1.Role.ADMIN]), async (req, res) => {
    const { date, plantId, lineId, shiftId, unitsProduced, scrapCount, downtimeMinutes } = req.body;
    if (!date || !plantId || !lineId || !shiftId || unitsProduced === undefined || scrapCount === undefined || downtimeMinutes === undefined) {
        res.status(400).json({ message: 'All production entry fields are required' });
        return;
    }
    // Verify plant restriction
    if (req.user?.plantAccessId && req.user.plantAccessId !== plantId) {
        res.status(403).json({ message: 'Forbidden: You do not have write access to this plant' });
        return;
    }
    try {
        const parsedDate = new Date(date);
        parsedDate.setHours(0, 0, 0, 0);
        // Check if duplicate entry exists for plant, line, shift, date
        const existingEntry = await db_1.default.productionEntry.findFirst({
            where: {
                date: parsedDate,
                plantId,
                lineId,
                shiftId
            }
        });
        if (existingEntry) {
            res.status(400).json({ message: 'A production entry already exists for this line, shift, and date.' });
            return;
        }
        const entry = await db_1.default.productionEntry.create({
            data: {
                date: parsedDate,
                plantId,
                lineId,
                shiftId,
                unitsProduced: parseInt(unitsProduced, 10),
                scrapCount: parseInt(scrapCount, 10),
                downtimeMinutes: parseInt(downtimeMinutes, 10),
                loggedById: req.user.id
            },
            include: {
                plant: true,
                line: true,
                shift: true,
                loggedBy: {
                    select: { name: true, email: true }
                }
            }
        });
        res.status(201).json(entry);
    }
    catch (error) {
        console.error('Error creating production entry:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// GET /production/history
router.get('/history', auth_1.authenticateToken, auth_1.checkPlantAccess, async (req, res) => {
    try {
        const { plantId, lineId, startDate, endDate } = req.query;
        const whereClause = {};
        // Plant filtering
        if (plantId) {
            whereClause.plantId = plantId;
        }
        else if (req.user?.plantAccessId) {
            whereClause.plantId = req.user.plantAccessId;
        }
        // Line filtering
        if (lineId) {
            whereClause.lineId = lineId;
        }
        // Date range filtering
        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) {
                whereClause.date.gte = new Date(startDate);
            }
            if (endDate) {
                whereClause.date.lte = new Date(endDate);
            }
        }
        else {
            // Default to last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            whereClause.date = { gte: thirtyDaysAgo };
        }
        const entries = await db_1.default.productionEntry.findMany({
            where: whereClause,
            select: {
                id: true,
                date: true,
                unitsProduced: true,
                scrapCount: true,
                downtimeMinutes: true,
                plant: { select: { id: true, name: true, code: true } },
                line: { select: { id: true, name: true, code: true } },
                shift: { select: { id: true, name: true, startTime: true, endTime: true } }
            },
            orderBy: {
                date: 'desc'
            },
            take: 300
        });
        // Generate daily summary data for chart
        const dailyMap = {};
        entries.forEach(e => {
            const dateString = e.date.toISOString().split('T')[0];
            if (!dailyMap[dateString]) {
                dailyMap[dateString] = {
                    date: dateString,
                    unitsProduced: 0,
                    scrapCount: 0,
                    downtimeMinutes: 0,
                    entries: []
                };
            }
            dailyMap[dateString].unitsProduced += e.unitsProduced;
            dailyMap[dateString].scrapCount += e.scrapCount;
            dailyMap[dateString].downtimeMinutes += e.downtimeMinutes;
            dailyMap[dateString].entries.push(e);
        });
        const dailySummary = Object.values(dailyMap).map(day => {
            const oeeMetrics = (0, exports.calculateOee)(day.entries);
            const scrapRate = day.unitsProduced > 0
                ? Math.round((day.scrapCount / day.unitsProduced) * 1000) / 10
                : 0;
            return {
                date: day.date,
                unitsProduced: day.unitsProduced,
                scrapCount: day.scrapCount,
                downtimeMinutes: day.downtimeMinutes,
                scrapRate,
                oee: oeeMetrics.oee
            };
        }).sort((a, b) => a.date.localeCompare(b.date));
        res.json({
            entries,
            dailySummary
        });
    }
    catch (error) {
        console.error('Error fetching production history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// GET /production/line/:lineId
router.get('/line/:lineId', auth_1.authenticateToken, async (req, res) => {
    const { lineId } = req.params;
    try {
        const line = await db_1.default.productionLine.findUnique({
            where: { id: lineId },
            include: { plant: true }
        });
        if (!line) {
            res.status(404).json({ message: 'Production line not found' });
            return;
        }
        // Verify plant access
        if (req.user?.plantAccessId && req.user.plantAccessId !== line.plantId) {
            res.status(403).json({ message: 'Forbidden: You do not have access to this plant' });
            return;
        }
        // Last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const entries = await db_1.default.productionEntry.findMany({
            where: {
                lineId,
                date: { gte: thirtyDaysAgo }
            },
            include: { shift: true },
            orderBy: { date: 'asc' }
        });
        // Group by date for line trends
        const dailyMap = {};
        entries.forEach(e => {
            const dateStr = e.date.toISOString().split('T')[0];
            if (!dailyMap[dateStr]) {
                dailyMap[dateStr] = {
                    date: dateStr,
                    unitsProduced: 0,
                    scrapCount: 0,
                    downtimeMinutes: 0,
                    entries: []
                };
            }
            dailyMap[dateStr].unitsProduced += e.unitsProduced;
            dailyMap[dateStr].scrapCount += e.scrapCount;
            dailyMap[dateStr].downtimeMinutes += e.downtimeMinutes;
            dailyMap[dateStr].entries.push(e);
        });
        const trend = Object.values(dailyMap).map(day => {
            const oeeMetrics = (0, exports.calculateOee)(day.entries);
            return {
                date: day.date,
                unitsProduced: day.unitsProduced,
                scrapCount: day.scrapCount,
                downtimeMinutes: day.downtimeMinutes,
                oee: oeeMetrics.oee,
                scrapRate: day.unitsProduced > 0 ? (day.scrapCount / day.unitsProduced) * 100 : 0
            };
        });
        // Machine list under line
        const machines = await db_1.default.machine.findMany({
            where: { lineId },
            include: {
                maintenanceAlerts: {
                    where: { status: 'ACTIVE' }
                }
            }
        });
        res.json({
            line,
            trend,
            machines,
            summary: (0, exports.calculateOee)(entries)
        });
    }
    catch (error) {
        console.error('Error fetching line detail:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
