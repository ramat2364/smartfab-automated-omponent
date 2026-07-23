import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth';
import { Role, Criticality, MachineStatus } from '@prisma/client';

const router = Router();

// GET /admin/plants (Config utility) - accessible by any authenticated user
router.get('/plants', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const plants = await prisma.plant.findMany({
      include: {
        lines: true
      }
    });
    res.json(plants);
  } catch (error) {
    console.error('Error fetching admin plants:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /admin/shifts - accessible by any authenticated user
router.get('/shifts', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shifts = await prisma.shift.findMany();
    res.json(shifts);
  } catch (error) {
    console.error('Error fetching admin shifts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Protect all other admin routes
router.use(authenticateToken, requireRole([Role.ADMIN]));

// GET /admin/users (Get all users)
router.get('/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
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
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /admin/users (Create new user)
router.post('/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, password, name, role, plantAccessId } = req.body;

  if (!email || !password || !name || !role) {
    res.status(400).json({ message: 'Email, password, name, and role are required' });
    return;
  }

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role as Role,
        plantAccessId: plantAccessId || null
      },
      include: { plantAccess: true }
    });

    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /admin/users/:id (Update user role/access/details)
router.put('/users/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, email, role, plantAccessId, password } = req.body;

  try {
    const data: any = {
      name,
      email,
      role: role as Role,
      plantAccessId: plantAccessId || null
    };

    if (password) {
      const saltRounds = 10;
      data.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      include: { plantAccess: true }
    });

    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /admin/users/:id (Delete/De-register user)
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Prevent admin from deleting their own active account
    if (req.user?.id === id) {
      res.status(400).json({ message: 'You cannot delete your own active admin account.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: `User ${user.name} (${user.email}) deleted successfully.` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /admin/machines (Add new machine to registry)
router.post('/machines', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, code, type, plantId, lineId, criticality, tempThresholdMax, vibThresholdMax, rpmThresholdMax } = req.body;

  if (!name || !code || !type || !plantId || !lineId) {
    res.status(400).json({ message: 'Name, code, type, plantId, and lineId are required' });
    return;
  }

  try {
    const existing = await prisma.machine.findUnique({ where: { code } });
    if (existing) {
      res.status(400).json({ message: 'Machine with this code already exists' });
      return;
    }

    const machine = await prisma.machine.create({
      data: {
        name,
        code,
        type,
        plantId,
        lineId,
        criticality: (criticality as Criticality) || Criticality.MEDIUM,
        tempThresholdMax: parseFloat(tempThresholdMax || '85'),
        vibThresholdMax: parseFloat(vibThresholdMax || '4.5'),
        rpmThresholdMax: parseFloat(rpmThresholdMax || '3000'),
        installDate: new Date(),
        lastMaintenanceDate: new Date(),
        status: MachineStatus.OPERATIONAL
      }
    });

    res.status(201).json(machine);
  } catch (error) {
    console.error('Error adding machine:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /admin/machines/:id (Update machine details and thresholds)
router.put('/machines/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, criticality, status, tempThresholdMax, vibThresholdMax, rpmThresholdMax, lineId } = req.body;

  try {
    const data: any = {};
    if (name) data.name = name;
    if (criticality) data.criticality = criticality as Criticality;
    if (status) data.status = status as MachineStatus;
    if (lineId) data.lineId = lineId;
    if (tempThresholdMax !== undefined) data.tempThresholdMax = parseFloat(tempThresholdMax);
    if (vibThresholdMax !== undefined) data.vibThresholdMax = parseFloat(vibThresholdMax);
    if (rpmThresholdMax !== undefined) data.rpmThresholdMax = parseFloat(rpmThresholdMax);

    const machine = await prisma.machine.update({
      where: { id },
      data
    });

    res.json(machine);
  } catch (error) {
    console.error('Error updating machine configuration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /admin/plants (Add new plant facility e.g. Riyadh, Dammam, Gujarat)
router.post('/plants', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, code, location } = req.body;

  if (!name || !code || !location) {
    res.status(400).json({ message: 'Name, code, and location are required' });
    return;
  }

  try {
    const existing = await prisma.plant.findFirst({
      where: { OR: [{ name }, { code }] }
    });

    if (existing) {
      res.status(400).json({ message: 'A plant with this name or code already exists' });
      return;
    }

    const plant = await prisma.plant.create({
      data: { name, code, location }
    });

    res.status(201).json(plant);
  } catch (error) {
    console.error('Error creating plant:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /admin/plants/:id (Update plant details)
router.put('/plants/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, code, location } = req.body;

  try {
    const data: any = {};
    if (name) data.name = name;
    if (code) data.code = code;
    if (location) data.location = location;

    const plant = await prisma.plant.update({
      where: { id },
      data
    });

    res.json(plant);
  } catch (error) {
    console.error('Error updating plant:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /admin/plants/:id (Delete plant facility)
router.delete('/plants/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const plant = await prisma.plant.findUnique({
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
    await prisma.plant.delete({ where: { id } });

    res.json({ message: `Plant ${plant.name} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting plant:', error);
    res.status(500).json({ message: 'Internal server error or plant has active dependent records.' });
  }
});

// POST /admin/shifts (Add new shift schedule)
router.post('/shifts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, startTime, endTime } = req.body;

  if (!name || !startTime || !endTime) {
    res.status(400).json({ message: 'Name, startTime, and endTime are required' });
    return;
  }

  try {
    const existing = await prisma.shift.findUnique({ where: { name } });
    if (existing) {
      res.status(400).json({ message: 'A shift with this name already exists' });
      return;
    }

    const shift = await prisma.shift.create({
      data: { name, startTime, endTime }
    });

    res.status(201).json(shift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /admin/shifts/:id (Update shift timings)
router.put('/shifts/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, startTime, endTime } = req.body;

  try {
    const data: any = {};
    if (name) data.name = name;
    if (startTime) data.startTime = startTime;
    if (endTime) data.endTime = endTime;

    const shift = await prisma.shift.update({
      where: { id },
      data
    });

    res.json(shift);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /admin/logs (System Logs, Audit Trail & AI Event Cockpit)
router.get('/logs', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [aiLogs, alerts, maintenanceLogs, defectLogs] = await Promise.all([
      prisma.aiCallLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 50
      }),
      prisma.maintenanceAlert.findMany({
        include: {
          machine: { select: { name: true, code: true, plant: { select: { name: true } } } },
          assignedTo: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.maintenanceLog.findMany({
        include: {
          machine: { select: { name: true, code: true } },
          technician: { select: { name: true, email: true } }
        },
        orderBy: { completedAt: 'desc' },
        take: 50
      }),
      prisma.defectEntry.findMany({
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
    const unifiedLogs: any[] = [];

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
  } catch (error) {
    console.error('Error fetching admin system logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
