import { Router, Response } from 'express';
import prisma from '../db';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';
import { calculateOee } from './production';
import { AiService } from '../services/ai';

const router = Router();

// GET /executive/kpi (Cross-plant KPI overview)
router.get('/kpi', authenticateToken, requireRole([Role.CEO, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const plants = await prisma.plant.findMany();
    const result = [];

    // Calculate over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const plant of plants) {
      // Production entries for OEE & downtime
      const entries = await prisma.productionEntry.findMany({
        where: {
          plantId: plant.id,
          date: { gte: thirtyDaysAgo }
        }
      });

      const oeeMetrics = calculateOee(entries);
      const totalDowntimeHours = entries.reduce((sum, e) => sum + e.downtimeMinutes, 0) / 60;

      // Quality defects count
      const defectCount = await prisma.defectEntry.aggregate({
        where: {
          plantId: plant.id,
          date: { gte: thirtyDaysAgo }
        },
        _sum: {
          quantity: true
        }
      });

      // Energy consumption and cost
      const energyStats = await prisma.energyReading.aggregate({
        where: {
          plantId: plant.id,
          timestamp: { gte: thirtyDaysAgo }
        },
        _sum: {
          kwhConsumption: true
        }
      });

      const totalKwh = energyStats._sum.kwhConsumption || 0;
      const energyCost = Math.round(totalKwh * 7.8);

      result.push({
        plantId: plant.id,
        plantName: plant.name,
        plantCode: plant.code,
        oee: oeeMetrics.oee,
        availability: oeeMetrics.availability,
        performance: oeeMetrics.performance,
        quality: oeeMetrics.quality,
        downtimeHours: Math.round(totalDowntimeHours * 10) / 10,
        defectQuantity: defectCount._sum.quantity || 0,
        energyCost
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching executive KPIs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /executive/trends (90-day trend lines)
router.get('/trends', authenticateToken, requireRole([Role.CEO, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const entries = await prisma.productionEntry.findMany({
      where: {
        date: { gte: ninetyDaysAgo }
      },
      include: {
        plant: { select: { id: true, name: true } }
      },
      orderBy: { date: 'asc' }
    });

    // Group entries by Date + Plant
    const dailyMap: { [key: string]: { [key: string]: any[] } } = {};
    
    entries.forEach(e => {
      const dateStr = e.date.toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {};
      }
      if (!dailyMap[dateStr][e.plant.name]) {
        dailyMap[dateStr][e.plant.name] = [];
      }
      dailyMap[dateStr][e.plant.name].push(e);
    });

    const trendData = Object.entries(dailyMap).map(([date, plantsData]) => {
      const row: any = { date };
      Object.entries(plantsData).forEach(([plantName, plantEntries]) => {
        const metrics = calculateOee(plantEntries);
        const nameKey = plantName.split(' ')[0].toLowerCase(); // pune, nashik, chennai
        row[`${nameKey}_oee`] = metrics.oee;
        row[`${nameKey}_downtime`] = plantEntries.reduce((sum, e) => sum + e.downtimeMinutes, 0) / 60;
        row[`${nameKey}_defects`] = plantEntries.reduce((sum, e) => sum + e.scrapCount, 0);
      });
      return row;
    }).sort((a, b) => a.date.localeCompare(b.date));

    res.json(trendData);
  } catch (error) {
    console.error('Error fetching executive trend lines:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /executive/summary (AI executive summary)
router.post('/summary', authenticateToken, requireRole([Role.CEO, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // 1. Gather OEE, downtime, defect quantities and cost for the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const plants = await prisma.plant.findMany();
    const metrics: any = {};

    for (const plant of plants) {
      const nameKey = plant.name.split(' ')[0].toLowerCase(); // pune, nashik, chennai
      
      const entries = await prisma.productionEntry.findMany({
        where: { plantId: plant.id, date: { gte: thirtyDaysAgo } }
      });
      const oeeMetrics = calculateOee(entries);
      const downtime = entries.reduce((sum, e) => sum + e.downtimeMinutes, 0) / 60;
      
      const defectCount = await prisma.defectEntry.aggregate({
        where: { plantId: plant.id, date: { gte: thirtyDaysAgo } },
        _sum: { quantity: true }
      });

      const energyStats = await prisma.energyReading.aggregate({
        where: { plantId: plant.id, timestamp: { gte: thirtyDaysAgo } },
        _sum: { kwhConsumption: true }
      });
      const energyCost = Math.round((energyStats._sum.kwhConsumption || 0) * 7.8);

      metrics[nameKey] = {
        oee: oeeMetrics.oee,
        downtime: Math.round(downtime * 10) / 10,
        defects: defectCount._sum.quantity || 0,
        energyCost
      };
    }

    // 2. Gather recent defects & active alerts
    const recentDefects = await prisma.defectEntry.findMany({
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        partNumber: true,
        defectType: true,
        quantity: true,
        plant: { select: { name: true } }
      }
    });

    const activeAlerts = await prisma.maintenanceAlert.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { severity: 'desc' },
      take: 10,
      select: {
        severity: true,
        message: true,
        machine: { select: { name: true, code: true } }
      }
    });

    // 3. Invoke AI service
    const summaryMarkdown = await AiService.generateExecutiveSummary({
      pune: metrics.pune,
      nashik: metrics.nashik,
      chennai: metrics.chennai,
      recentDefects,
      activeAlerts
    });

    res.json({ summary: summaryMarkdown });
  } catch (error) {
    console.error('Error generating executive summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
