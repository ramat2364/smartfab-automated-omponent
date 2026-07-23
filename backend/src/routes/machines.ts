import { Router, Response } from 'express';
import prisma from '../db';
import { AuthenticatedRequest, authenticateToken, checkPlantAccess, requireRole } from '../middleware/auth';
import { Role, MachineStatus, AlertStatus, AlertSeverity } from '@prisma/client';

const router = Router();

// GET /machines (Registry)
router.get('/', authenticateToken, checkPlantAccess, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { plantId, lineId, status } = req.query;

    const whereClause: any = {};
    if (plantId) {
      whereClause.plantId = plantId as string;
    } else if (req.user?.plantAccessId) {
      whereClause.plantId = req.user.plantAccessId;
    }

    if (lineId) {
      whereClause.lineId = lineId as string;
    }

    if (status) {
      whereClause.status = status as MachineStatus;
    }

    const machines = await prisma.machine.findMany({
      where: whereClause,
      include: {
        line: { select: { id: true, name: true, code: true } },
        plant: { select: { id: true, name: true } },
        maintenanceAlerts: {
          where: { status: AlertStatus.ACTIVE }
        }
      },
      orderBy: {
        criticality: 'desc'
      }
    });

    res.json(machines);
  } catch (error) {
    console.error('Error fetching machine registry:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /machines/live (Live Telemetry)
router.get('/live', authenticateToken, checkPlantAccess, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { plantId } = req.query;

    const whereClause: any = {};
    if (plantId) {
      whereClause.plantId = plantId as string;
    } else if (req.user?.plantAccessId) {
      whereClause.plantId = req.user.plantAccessId;
    }

    const machines = await prisma.machine.findMany({
      where: whereClause,
      include: {
        line: { select: { name: true } },
        plant: { select: { name: true } }
      }
    });

    const liveData = [];
    for (const machine of machines) {
      const latestReading = await prisma.sensorReading.findFirst({
        where: { machineId: machine.id },
        orderBy: { timestamp: 'desc' }
      });

      liveData.push({
        id: machine.id,
        name: machine.name,
        code: machine.code,
        type: machine.type,
        status: machine.status,
        plantId: machine.plantId,
        plantName: machine.plant.name,
        lineName: machine.line.name,
        criticality: machine.criticality,
        telemetry: latestReading ? {
          temperature: latestReading.temperature,
          vibration: latestReading.vibration,
          rpm: latestReading.rpm,
          timestamp: latestReading.timestamp
        } : {
          temperature: 0,
          vibration: 0,
          rpm: 0,
          timestamp: new Date()
        },
        thresholds: {
          tempMax: machine.tempThresholdMax,
          vibMax: machine.vibThresholdMax,
          rpmMax: machine.rpmThresholdMax
        }
      });
    }

    res.json(liveData);
  } catch (error) {
    console.error('Error fetching live machine data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /machines/alerts (All active predictive alerts)
router.get('/alerts', authenticateToken, checkPlantAccess, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { plantId, severity } = req.query;

    const whereClause: any = {
      status: AlertStatus.ACTIVE
    };

    if (plantId) {
      whereClause.machine = { plantId: plantId as string };
    } else if (req.user?.plantAccessId) {
      whereClause.machine = { plantId: req.user.plantAccessId };
    }

    if (severity) {
      whereClause.severity = severity as AlertSeverity;
    }

    const alerts = await prisma.maintenanceAlert.findMany({
      where: whereClause,
      include: {
        machine: {
          include: {
            plant: { select: { name: true } },
            line: { select: { name: true } }
          }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /machines/logs (All completed maintenance logs)
router.get('/logs', authenticateToken, checkPlantAccess, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { plantId } = req.query;

    const whereClause: any = {};
    if (plantId) {
      whereClause.machine = { plantId: plantId as string };
    } else if (req.user?.plantAccessId) {
      whereClause.machine = { plantId: req.user.plantAccessId };
    }

    const logs = await prisma.maintenanceLog.findMany({
      where: whereClause,
      include: {
        machine: {
          select: { name: true, code: true, type: true }
        },
        technician: {
          select: { name: true }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching maintenance logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /machines/:id (Single Machine Detail + Trend + Logs)
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const machine = await prisma.machine.findUnique({
      where: { id },
      include: {
        plant: { select: { id: true, name: true } },
        line: { select: { id: true, name: true } }
      }
    });

    if (!machine) {
      res.status(404).json({ message: 'Machine not found' });
      return;
    }

    // Verify plant access
    if (req.user?.plantAccessId && req.user.plantAccessId !== machine.plantId) {
      res.status(403).json({ message: 'Forbidden: You do not have access to this plant' });
      return;
    }

    // Get active alerts
    const alerts = await prisma.maintenanceAlert.findMany({
      where: { machineId: id, status: AlertStatus.ACTIVE },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // Get past 30 maintenance logs
    const logs = await prisma.maintenanceLog.findMany({
      where: { machineId: id },
      include: { technician: { select: { name: true } } },
      orderBy: { completedAt: 'desc' },
      take: 30
    });

    // Get sensor history (last 24 hours of readings)
    const dayAgo = new Date();
    dayAgo.setHours(dayAgo.getHours() - 24);

    const sensorReadings = await prisma.sensorReading.findMany({
      where: {
        machineId: id,
        timestamp: { gte: dayAgo }
      },
      orderBy: { timestamp: 'asc' }
    });

    res.json({
      machine,
      activeAlerts: alerts,
      maintenanceLogs: logs,
      sensorHistory: sensorReadings
    });
  } catch (error) {
    console.error('Error fetching machine detail:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /machines/alerts/:id/assign
router.post('/alerts/:id/assign', authenticateToken, requireRole([Role.MAINTENANCE_ENGINEER, Role.PLANT_HEAD, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { technicianId } = req.body;

  if (!technicianId) {
    res.status(400).json({ message: 'Technician ID is required' });
    return;
  }

  try {
    const alert = await prisma.maintenanceAlert.findUnique({
      where: { id },
      include: { machine: true }
    });

    if (!alert) {
      res.status(404).json({ message: 'Alert not found' });
      return;
    }

    // Verify plant scope
    if (req.user?.plantAccessId && req.user.plantAccessId !== alert.machine.plantId) {
      res.status(403).json({ message: 'Forbidden: You do not have permissions for this plant' });
      return;
    }

    const updatedAlert = await prisma.maintenanceAlert.update({
      where: { id },
      data: { assignedToId: technicianId },
      include: { assignedTo: { select: { name: true } } }
    });

    res.json(updatedAlert);
  } catch (error) {
    console.error('Error assigning alert:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /machines/alerts/:id/resolve (Resolves alert, changes status, creates log)
router.post('/alerts/:id/resolve', authenticateToken, requireRole([Role.MAINTENANCE_ENGINEER, Role.PLANT_HEAD, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { workDescription, partsUsed, downtimeMinutes } = req.body;

  if (!workDescription) {
    res.status(400).json({ message: 'Work description is required to resolve alert' });
    return;
  }

  try {
    const alert = await prisma.maintenanceAlert.findUnique({
      where: { id },
      include: { machine: true }
    });

    if (!alert) {
      res.status(404).json({ message: 'Alert not found' });
      return;
    }

    // Verify plant scope
    if (req.user?.plantAccessId && req.user.plantAccessId !== alert.machine.plantId) {
      res.status(403).json({ message: 'Forbidden: You do not have permissions for this plant' });
      return;
    }

    // 1. Resolve alert in DB
    const updatedAlert = await prisma.maintenanceAlert.update({
      where: { id },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date()
      }
    });

    // 2. Create maintenance log entry
    await prisma.maintenanceLog.create({
      data: {
        machineId: alert.machineId,
        technicianId: req.user!.id,
        workDescription,
        partsUsed: partsUsed || 'None',
        downtimeMinutes: parseInt(downtimeMinutes || '0', 10),
        completedAt: new Date()
      }
    });

    // 3. Reset Machine status back to operational if no other active alerts
    const otherActiveAlerts = await prisma.maintenanceAlert.findFirst({
      where: {
        machineId: alert.machineId,
        status: AlertStatus.ACTIVE
      }
    });

    if (!otherActiveAlerts) {
      await prisma.machine.update({
        where: { id: alert.machineId },
        data: {
          status: MachineStatus.OPERATIONAL,
          lastMaintenanceDate: new Date()
        }
      });
    }

    res.json({ message: 'Alert resolved and logged successfully', alert: updatedAlert });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /machines/maintenance-log (Manual entry log)
router.post('/maintenance-log', authenticateToken, requireRole([Role.MAINTENANCE_ENGINEER, Role.PLANT_HEAD, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { machineId, workDescription, partsUsed, downtimeMinutes, completedAt } = req.body;

  if (!machineId || !workDescription) {
    res.status(400).json({ message: 'Machine ID and work description are required' });
    return;
  }

  try {
    const machine = await prisma.machine.findUnique({ where: { id: machineId } });
    if (!machine) {
      res.status(404).json({ message: 'Machine not found' });
      return;
    }

    // Plant access check
    if (req.user?.plantAccessId && req.user.plantAccessId !== machine.plantId) {
      res.status(403).json({ message: 'Forbidden: You do not have access to this plant' });
      return;
    }

    const logCompletedDate = completedAt ? new Date(completedAt) : new Date();

    const log = await prisma.maintenanceLog.create({
      data: {
        machineId,
        technicianId: req.user!.id,
        workDescription,
        partsUsed: partsUsed || 'None',
        downtimeMinutes: parseInt(downtimeMinutes || '0', 10),
        completedAt: logCompletedDate
      },
      include: {
        machine: true,
        technician: { select: { name: true } }
      }
    });

    // Update last maintenance date
    await prisma.machine.update({
      where: { id: machineId },
      data: { lastMaintenanceDate: logCompletedDate }
    });


    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating maintenance log:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /machines (Register New Machine Asset)
router.post('/', authenticateToken, requireRole([Role.ADMIN, Role.PLANT_HEAD, Role.MAINTENANCE_ENGINEER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, code, type, plantId, lineId, criticality, installDate, lastMaintenanceDate, status, tempThresholdMax, vibThresholdMax, rpmThresholdMax } = req.body;

  if (!name || !code || !type || !plantId || !lineId) {
    res.status(400).json({ message: 'Name, code, type, plantId, and lineId are required' });
    return;
  }

  try {
    const existing = await prisma.machine.findUnique({ where: { code } });
    if (existing) {
      res.status(400).json({ message: `Machine with asset code ${code} already exists.` });
      return;
    }

    const machine = await prisma.machine.create({
      data: {
        name,
        code,
        type,
        plantId,
        lineId,
        criticality: criticality || 'MEDIUM',
        installDate: installDate ? new Date(installDate) : new Date(),
        lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : new Date(),
        tempThresholdMax: tempThresholdMax ? parseFloat(tempThresholdMax) : 85.0,
        vibThresholdMax: vibThresholdMax ? parseFloat(vibThresholdMax) : 5.0,
        rpmThresholdMax: rpmThresholdMax ? parseFloat(rpmThresholdMax) : 3000.0,
        status: status || MachineStatus.OPERATIONAL
      },
      include: {
        plant: { select: { id: true, name: true } },
        line: { select: { id: true, name: true, code: true } }
      }
    });

    res.status(201).json(machine);
  } catch (error) {
    console.error('Error registering new machine:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /machines/:id (Update Machine asset details / safety thresholds)
router.put('/:id', authenticateToken, requireRole([Role.ADMIN, Role.PLANT_HEAD, Role.MAINTENANCE_ENGINEER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, criticality, installDate, lastMaintenanceDate, status, tempThresholdMax, vibThresholdMax, rpmThresholdMax } = req.body;

  try {
    const data: any = {};
    if (name) data.name = name;
    if (criticality) data.criticality = criticality;
    if (installDate) data.installDate = new Date(installDate);
    if (lastMaintenanceDate) data.lastMaintenanceDate = new Date(lastMaintenanceDate);
    if (status) data.status = status;
    if (tempThresholdMax) data.tempThresholdMax = parseFloat(tempThresholdMax);
    if (vibThresholdMax) data.vibThresholdMax = parseFloat(vibThresholdMax);
    if (rpmThresholdMax) data.rpmThresholdMax = parseFloat(rpmThresholdMax);

    const machine = await prisma.machine.update({
      where: { id },
      data,
      include: {
        plant: { select: { id: true, name: true } },
        line: { select: { id: true, name: true, code: true } }
      }
    });

    res.json(machine);
  } catch (error) {
    console.error('Error updating machine details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /machines/:id (De-register / Delete Machine asset)
router.delete('/:id', authenticateToken, requireRole([Role.ADMIN, Role.PLANT_HEAD]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const machine = await prisma.machine.findUnique({ where: { id } });
    if (!machine) {
      res.status(404).json({ message: 'Machine not found' });
      return;
    }

    await prisma.machine.delete({ where: { id } });
    res.json({ message: `Machine ${machine.name} (${machine.code}) deleted successfully.` });
  } catch (error) {
    console.error('Error deleting machine asset:', error);
    res.status(500).json({ message: 'Internal server error or machine has active dependent logs.' });
  }
});

export default router;
