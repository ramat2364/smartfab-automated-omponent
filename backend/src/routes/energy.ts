import { Router, Response } from 'express';
import prisma from '../db';
import { AuthenticatedRequest, authenticateToken, checkPlantAccess } from '../middleware/auth';

const router = Router();

// GET /energy/overview
router.get('/overview', authenticateToken, checkPlantAccess, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { plantId, range } = req.query; // range: daily, weekly, monthly

    const whereClause: any = {};
    if (plantId) {
      whereClause.plantId = plantId as string;
    } else if (req.user?.plantAccessId) {
      whereClause.plantId = req.user.plantAccessId;
    }

    const now = new Date();
    let startDate = new Date();
    if (range === 'weekly') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'monthly') {
      startDate.setDate(now.getDate() - 30);
    } else {
      // default: daily (last 24 hours or past 7 days daily summaries)
      startDate.setDate(now.getDate() - 7); // Show 7 days trend
    }
    
    whereClause.timestamp = { gte: startDate };

    const energyReadings = await prisma.energyReading.findMany({
      where: whereClause,
      include: {
        plant: { select: { name: true } }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Fetch corresponding production volume to calculate cost per unit
    const productionEntries = await prisma.productionEntry.findMany({
      where: {
        plantId: whereClause.plantId,
        date: { gte: startDate }
      }
    });

    // Aggregate by date
    const dailyMap: { [key: string]: any } = {};
    energyReadings.forEach(r => {
      const dateStr = r.timestamp.toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          kwh: 0,
          cost: 0,
          producedUnits: 0
        };
      }
      dailyMap[dateStr].kwh += r.kwhConsumption;
      dailyMap[dateStr].cost += r.kwhConsumption * r.costPerUnit;
    });

    productionEntries.forEach(p => {
      const dateStr = p.date.toISOString().split('T')[0];
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].producedUnits += p.unitsProduced;
      }
    });

    const dailyTrend = Object.values(dailyMap).map((day: any) => {
      const costPerUnit = day.producedUnits > 0
        ? Math.round((day.cost / day.producedUnits) * 100) / 100
        : 0;

      return {
        date: day.date,
        kwh: Math.round(day.kwh * 10) / 10,
        cost: Math.round(day.cost),
        producedUnits: day.producedUnits,
        costPerUnit
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    // Summary calculations
    const totalKwh = energyReadings.reduce((sum, r) => sum + r.kwhConsumption, 0);
    const totalCost = energyReadings.reduce((sum, r) => sum + r.kwhConsumption * r.costPerUnit, 0);
    const totalProduced = productionEntries.reduce((sum, p) => sum + p.unitsProduced, 0);
    const avgCostPerUnit = totalProduced > 0 ? totalCost / totalProduced : 0;

    res.json({
      summary: {
        totalKwh: Math.round(totalKwh),
        totalCost: Math.round(totalCost),
        totalProduced,
        costPerUnitProduced: Math.round(avgCostPerUnit * 100) / 100
      },
      trend: dailyTrend
    });
  } catch (error) {
    console.error('Error fetching energy overview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /energy/machines (Breakdown)
router.get('/machines', authenticateToken, checkPlantAccess, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { plantId } = req.query;

    const whereClause: any = {};
    if (plantId) {
      whereClause.plantId = plantId as string;
    } else if (req.user?.plantAccessId) {
      whereClause.plantId = req.user.plantAccessId;
    }

    // Get last 7 days energy readings
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    whereClause.timestamp = { gte: sevenDaysAgo };
    whereClause.machineId = { not: null };

    const readings = await prisma.energyReading.findMany({
      where: whereClause,
      include: {
        machine: {
          select: { name: true, code: true, type: true }
        },
        line: {
          select: { name: true }
        }
      }
    });

    const machineMap: { [key: string]: any } = {};
    readings.forEach(r => {
      if (!r.machineId) return;
      if (!machineMap[r.machineId]) {
        machineMap[r.machineId] = {
          machineId: r.machineId,
          machineName: r.machine?.name || 'Unknown',
          machineCode: r.machine?.code || 'N/A',
          machineType: r.machine?.type || 'N/A',
          lineName: r.line?.name || 'N/A',
          kwh: 0,
          cost: 0
        };
      }
      machineMap[r.machineId].kwh += r.kwhConsumption;
      machineMap[r.machineId].cost += r.kwhConsumption * r.costPerUnit;
    });

    const machinesBreakdown = Object.values(machineMap).map((m: any) => ({
      ...m,
      kwh: Math.round(m.kwh * 10) / 10,
      cost: Math.round(m.cost)
    })).sort((a, b) => b.kwh - a.kwh);

    res.json(machinesBreakdown);
  } catch (error) {
    console.error('Error fetching machine energy breakdown:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /energy/pat (PAT Compliance Status)
router.get('/pat', authenticateToken, checkPlantAccess, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { plantId } = req.query;

    const queryPlantId = plantId as string || req.user?.plantAccessId;

    const plants = await prisma.plant.findMany({
      where: queryPlantId ? { id: queryPlantId } : {}
    });

    // Compute specific energy consumption (SEC) = Total energy (kWh) / Total production volume (units)
    // Over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const patData = [];

    for (const plant of plants) {
      const energySum = await prisma.energyReading.aggregate({
        where: {
          plantId: plant.id,
          timestamp: { gte: thirtyDaysAgo }
        },
        _sum: {
          kwhConsumption: true
        }
      });

      const prodSum = await prisma.productionEntry.aggregate({
        where: {
          plantId: plant.id,
          date: { gte: thirtyDaysAgo }
        },
        _sum: {
          unitsProduced: true
        }
      });

      const totalKwh = energySum._sum.kwhConsumption || 0;
      const totalUnits = prodSum._sum.unitsProduced || 0;
      const sec = totalUnits > 0 ? (totalKwh / totalUnits) : 0;

      // Indian PAT Target reference values (Specific energy consumption targets in kWh per production unit)
      // Pune Target: 0.90 kWh/unit
      // Nashik Target: 0.85 kWh/unit
      // Chennai Target: 0.80 kWh/unit
      let targetSec = 0.80;
      if (plant.name.includes('Pune')) targetSec = 0.90;
      if (plant.name.includes('Nashik')) targetSec = 0.85;

      const savingCertificateEarned = sec < targetSec
        ? Math.round((targetSec - sec) * totalUnits * 0.0001) // ESCerts calculation
        : 0;

      patData.push({
        plantId: plant.id,
        plantName: plant.name,
        totalKwh: Math.round(totalKwh),
        totalUnitsProduced: totalUnits,
        actualSec: Math.round(sec * 100) / 100,
        targetSec,
        compliant: sec <= targetSec,
        savingsCertificates: savingCertificateEarned
      });
    }

    res.json(patData);
  } catch (error) {
    console.error('Error fetching PAT compliance details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
