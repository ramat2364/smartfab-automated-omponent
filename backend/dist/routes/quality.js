"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const ai_1 = require("../services/ai");
const router = (0, express_1.Router)();
// Setup Multer for photo uploads
const uploadDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
});
// GET /quality/defects
router.get('/defects', auth_1.authenticateToken, auth_1.checkPlantAccess, async (req, res) => {
    try {
        const { plantId, lineId, partNumber, status, startDate, endDate, search } = req.query;
        const whereClause = {};
        if (plantId) {
            whereClause.plantId = plantId;
        }
        else if (req.user?.plantAccessId) {
            whereClause.plantId = req.user.plantAccessId;
        }
        if (lineId) {
            whereClause.lineId = lineId;
        }
        if (partNumber) {
            whereClause.partNumber = partNumber;
        }
        if (status) {
            whereClause.status = status;
        }
        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate)
                whereClause.date.gte = new Date(startDate);
            if (endDate)
                whereClause.date.lte = new Date(endDate);
        }
        if (search) {
            whereClause.OR = [
                { partNumber: { contains: search, mode: 'insensitive' } },
                { defectType: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        const defects = await db_1.default.defectEntry.findMany({
            where: whereClause,
            include: {
                plant: { select: { name: true } },
                line: { select: { name: true } },
                machine: { select: { name: true, code: true } },
                inspector: { select: { name: true } },
                rootCauseCategory: true
            },
            orderBy: {
                date: 'desc'
            }
        });
        res.json(defects);
    }
    catch (error) {
        console.error('Error fetching quality defects:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// POST /quality/defects (Inspector logs new defect)
router.post('/defects', auth_1.authenticateToken, (0, auth_1.requireRole)([client_1.Role.QUALITY_ENGINEER, client_1.Role.PLANT_HEAD, client_1.Role.ADMIN]), upload.single('photo'), async (req, res) => {
    try {
        const { date, plantId, lineId, machineId, partNumber, defectType, quantity, description, rootCauseCategoryId } = req.body;
        if (!date || !plantId || !lineId || !partNumber || !defectType || !quantity || !description) {
            res.status(400).json({ message: 'Missing required defect parameters' });
            return;
        }
        // Check plant access
        if (req.user?.plantAccessId && req.user.plantAccessId !== plantId) {
            res.status(403).json({ message: 'Forbidden: You do not have permissions for this plant' });
            return;
        }
        const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
        const defect = await db_1.default.defectEntry.create({
            data: {
                date: new Date(date),
                plantId,
                lineId,
                machineId: machineId || null,
                partNumber,
                defectType,
                quantity: parseInt(quantity, 10),
                description,
                photoUrl,
                rootCauseCategoryId: rootCauseCategoryId || null,
                status: client_1.DefectStatus.PENDING,
                inspectorId: req.user.id
            },
            include: {
                plant: true,
                line: true,
                rootCauseCategory: true
            }
        });
        res.status(201).json(defect);
    }
    catch (error) {
        console.error('Error creating defect entry:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// GET /quality/root-cause (Aggregated chart data)
router.get('/root-cause', auth_1.authenticateToken, auth_1.checkPlantAccess, async (req, res) => {
    try {
        const { plantId } = req.query;
        const whereClause = {};
        if (plantId) {
            whereClause.plantId = plantId;
        }
        else if (req.user?.plantAccessId) {
            whereClause.plantId = req.user.plantAccessId;
        }
        // 1. Group by root cause categories
        const categories = await db_1.default.rootCauseCategory.findMany({
            include: {
                defectEntries: {
                    where: whereClause
                }
            }
        });
        const categorySummary = categories.map(cat => {
            const quantity = cat.defectEntries.reduce((sum, d) => sum + d.quantity, 0);
            const count = cat.defectEntries.length;
            return {
                id: cat.id,
                name: cat.name,
                count,
                quantity
            };
        });
        // 2. Group by part number
        const defects = await db_1.default.defectEntry.findMany({
            where: whereClause
        });
        const partMap = {};
        const typeMap = {};
        defects.forEach(d => {
            partMap[d.partNumber] = (partMap[d.partNumber] || 0) + d.quantity;
            typeMap[d.defectType] = (typeMap[d.defectType] || 0) + d.quantity;
        });
        const partSummary = Object.entries(partMap).map(([partNumber, quantity]) => ({
            partNumber,
            quantity
        }));
        const typeSummary = Object.entries(typeMap).map(([defectType, quantity]) => ({
            defectType,
            quantity
        }));
        res.json({
            categories: categorySummary,
            parts: partSummary,
            types: typeSummary
        });
    }
    catch (error) {
        console.error('Error fetching root cause analytics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// POST /quality/ai-root-cause-assist (AI Root cause helper)
router.post('/ai-root-cause-assist', auth_1.authenticateToken, (0, auth_1.requireRole)([client_1.Role.QUALITY_ENGINEER, client_1.Role.PLANT_HEAD, client_1.Role.ADMIN]), async (req, res) => {
    const { description, partNumber, machineId } = req.body;
    if (!description || !partNumber) {
        res.status(400).json({ message: 'Description and Part Number are required' });
        return;
    }
    try {
        let machineCode = undefined;
        if (machineId) {
            const machine = await db_1.default.machine.findUnique({ where: { id: machineId } });
            if (machine)
                machineCode = machine.code;
        }
        const aiResponse = await ai_1.AiService.suggestQualityRootCause(description, partNumber, machineCode);
        // Parse out category name if present to map to DB IDs
        const categories = await db_1.default.rootCauseCategory.findMany();
        let matchedCategory = null;
        for (const cat of categories) {
            if (aiResponse.toLowerCase().includes(cat.name.toLowerCase())) {
                matchedCategory = cat;
                break;
            }
        }
        res.json({
            recommendation: aiResponse,
            suggestedCategory: matchedCategory
        });
    }
    catch (error) {
        console.error('Error in AI root cause helper:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
