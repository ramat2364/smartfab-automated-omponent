import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../db';
import { AuthenticatedRequest, authenticateToken, checkPlantAccess, requireRole } from '../middleware/auth';
import { Role, DefectStatus } from '@prisma/client';
import { AiService } from '../services/ai';

const router = Router();

// Setup Multer for photo uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
  }
});

// GET /quality/defects
router.get('/defects', authenticateToken, checkPlantAccess, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { plantId, lineId, partNumber, status, startDate, endDate, search } = req.query;

    const whereClause: any = {};
    if (plantId && plantId !== 'all' && plantId !== 'undefined' && plantId !== 'null') {
      whereClause.plantId = plantId as string;
    } else if (req.user?.plantAccessId) {
      whereClause.plantId = req.user.plantAccessId;
    }

    if (lineId) {
      whereClause.lineId = lineId as string;
    }

    if (partNumber) {
      whereClause.partNumber = partNumber as string;
    }

    if (status) {
      whereClause.status = status as DefectStatus;
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate as string);
      if (endDate) whereClause.date.lte = new Date(endDate as string);
    }

    if (search) {
      whereClause.OR = [
        { partNumber: { contains: search as string, mode: 'insensitive' } },
        { defectType: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const defects = await prisma.defectEntry.findMany({
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
  } catch (error) {
    console.error('Error fetching quality defects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /quality/defects (Inspector logs new defect)
router.post('/defects', authenticateToken, requireRole([Role.QUALITY_ENGINEER, Role.PLANT_HEAD, Role.ADMIN]), upload.single('photo'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const defect = await prisma.defectEntry.create({
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
        status: DefectStatus.PENDING,
        inspectorId: req.user!.id
      },
      include: {
        plant: true,
        line: true,
        rootCauseCategory: true
      }
    });

    res.status(201).json(defect);
  } catch (error) {
    console.error('Error creating defect entry:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /quality/root-cause (Aggregated chart data)
router.get('/root-cause', authenticateToken, checkPlantAccess, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { plantId } = req.query;

    const whereClause: any = {};
    if (plantId && plantId !== 'all' && plantId !== 'undefined' && plantId !== 'null') {
      whereClause.plantId = plantId as string;
    } else if (req.user?.plantAccessId) {
      whereClause.plantId = req.user.plantAccessId;
    }

    // 1. Group by root cause categories
    const categories = await prisma.rootCauseCategory.findMany({
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
    const defects = await prisma.defectEntry.findMany({
      where: whereClause
    });

    const partMap: { [key: string]: number } = {};
    const typeMap: { [key: string]: number } = {};

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
  } catch (error) {
    console.error('Error fetching root cause analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /quality/ai-root-cause-assist (AI Root cause helper)
router.post('/ai-root-cause-assist', authenticateToken, requireRole([Role.QUALITY_ENGINEER, Role.PLANT_HEAD, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { description, partNumber, machineId } = req.body;

  if (!description || !partNumber) {
    res.status(400).json({ message: 'Description and Part Number are required' });
    return;
  }

  try {
    let machineCode = undefined;
    if (machineId) {
      const machine = await prisma.machine.findUnique({ where: { id: machineId } });
      if (machine) machineCode = machine.code;
    }

    const aiResponse = await AiService.suggestQualityRootCause(
      description,
      partNumber,
      machineCode
    );

    // Parse out category name if present to map to DB IDs
    const categories = await prisma.rootCauseCategory.findMany();
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
  } catch (error) {
    console.error('Error in AI root cause helper:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
