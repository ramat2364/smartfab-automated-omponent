import { PrismaClient, Role, Criticality, MachineStatus, AlertSeverity, AlertStatus, DefectStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Clear existing data
  await prisma.aiCallLog.deleteMany();
  await prisma.energyReading.deleteMany();
  await prisma.defectEntry.deleteMany();
  await prisma.rootCauseCategory.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.maintenanceAlert.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.productionEntry.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.productionLine.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plant.deleteMany();

  console.log('Cleared existing database tables.');

  // 2. Create Plants
  const pune = await prisma.plant.create({
    data: { name: 'Pune Plant', code: 'PLN-PUN', location: 'Chakan MIDC, Pune, Maharashtra' }
  });
  const nashik = await prisma.plant.create({
    data: { name: 'Nashik Plant', code: 'PLN-NAS', location: 'Ambad MIDC, Nashik, Maharashtra' }
  });
  const chennai = await prisma.plant.create({
    data: { name: 'Chennai Plant', code: 'PLN-CHE', location: 'Sriperumbudur, Chennai, Tamil Nadu' }
  });
  const plants = [pune, nashik, chennai];
  console.log('Seeded Plants.');

  // 3. Create Production Lines per plant
  const lines: any[] = [];
  for (const plant of plants) {
    const l1 = await prisma.productionLine.create({
      data: { name: 'Gears & Shafts Line', code: 'LINE-GS', plantId: plant.id }
    });
    const l2 = await prisma.productionLine.create({
      data: { name: 'Suspension & Braking Line', code: 'LINE-SB', plantId: plant.id }
    });
    lines.push(l1, l2);
  }
  console.log('Seeded Production Lines.');

  // 4. Create Shifts
  const shiftA = await prisma.shift.create({
    data: { name: 'Shift A (Morning)', startTime: '06:00', endTime: '14:00' }
  });
  const shiftB = await prisma.shift.create({
    data: { name: 'Shift B (Evening)', startTime: '14:00', endTime: '22:00' }
  });
  const shiftC = await prisma.shift.create({
    data: { name: 'Shift C (Night)', startTime: '22:00', endTime: '06:00' }
  });
  const shifts = [shiftA, shiftB, shiftC];
  console.log('Seeded Shifts.');

  // 5. Create Root Cause Categories
  const rc1 = await prisma.rootCauseCategory.create({ data: { name: 'Material Defect', description: 'Raw material composition or casting defect' } });
  const rc2 = await prisma.rootCauseCategory.create({ data: { name: 'Operator Error', description: 'Improper manual handling or machine loading' } });
  const rc3 = await prisma.rootCauseCategory.create({ data: { name: 'Machine Calibration', description: 'Out of tolerance tool alignment or calibration offset' } });
  const rc4 = await prisma.rootCauseCategory.create({ data: { name: 'Tool Wear', description: 'Worn out drill bits, cutters, or mold deterioration' } });
  const rc5 = await prisma.rootCauseCategory.create({ data: { name: 'Design Flaw', description: 'Specification issue in drawing or process sheet' } });
  const rootCauses = [rc1, rc2, rc3, rc4, rc5];
  console.log('Seeded Root Cause Categories.');

  // 6. Hash Password and Create Users
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('password123', saltRounds);

  const ceo = await prisma.user.create({
    data: {
      email: 'ceo@smartfab.com',
      passwordHash,
      name: 'Ramesh Kalyani',
      role: Role.CEO,
    }
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@smartfab.com',
      passwordHash,
      name: 'Admin User',
      role: Role.ADMIN,
    }
  });

  const headPune = await prisma.user.create({
    data: {
      email: 'head.pune@smartfab.com',
      passwordHash,
      name: 'Milind Deshmukh',
      role: Role.PLANT_HEAD,
      plantAccessId: pune.id
    }
  });

  const headNashik = await prisma.user.create({
    data: {
      email: 'head.nashik@smartfab.com',
      passwordHash,
      name: 'Sanjay Shinde',
      role: Role.PLANT_HEAD,
      plantAccessId: nashik.id
    }
  });

  const headChennai = await prisma.user.create({
    data: {
      email: 'head.chennai@smartfab.com',
      passwordHash,
      name: 'R. Srinivasan',
      role: Role.PLANT_HEAD,
      plantAccessId: chennai.id
    }
  });

  const prodMgr = await prisma.user.create({
    data: {
      email: 'prod.mgr@smartfab.com',
      passwordHash,
      name: 'Vikas Patil',
      role: Role.PRODUCTION_MANAGER,
      plantAccessId: pune.id
    }
  });

  const maintEng = await prisma.user.create({
    data: {
      email: 'maint.eng@smartfab.com',
      passwordHash,
      name: 'Arjun Mehta',
      role: Role.MAINTENANCE_ENGINEER,
      plantAccessId: pune.id
    }
  });

  const qualEng = await prisma.user.create({
    data: {
      email: 'qual.eng@smartfab.com',
      passwordHash,
      name: 'Anjali Sharma',
      role: Role.QUALITY_ENGINEER,
      plantAccessId: pune.id
    }
  });

  const users = [ceo, admin, headPune, headNashik, headChennai, prodMgr, maintEng, qualEng];
  console.log('Seeded Users.');

  // 7. Seed Machines
  const machines: any[] = [];
  const machineTypes = [
    { name: 'CNC Milling Machine', code: 'CNC', type: 'CNC' },
    { name: 'Hydraulic Press', code: 'PRS', type: 'Press' },
    { name: 'Injection Molding Machine', code: 'INJ', type: 'Injection Molding' },
    { name: 'Assembly Conveyor System', code: 'ASM', type: 'Assembly' },
    { name: 'Paint Spray Booth', code: 'PNT', type: 'Paint Shop' }
  ];

  for (const plant of plants) {
    const plantLines = lines.filter(l => l.plantId === plant.id);
    for (const line of plantLines) {
      for (let i = 0; i < machineTypes.length; i++) {
        const mType = machineTypes[i];
        const machine = await prisma.machine.create({
          data: {
            name: `${plant.name.split(' ')[0]} ${mType.name} ${i + 1}`,
            code: `${plant.code.split('-')[1]}-${line.code.split('-')[1]}-${mType.code}-0${i + 1}`,
            type: mType.type,
            plantId: plant.id,
            lineId: line.id,
            criticality: i % 2 === 0 ? Criticality.HIGH : i % 3 === 0 ? Criticality.MEDIUM : Criticality.LOW,
            installDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * 3), // 3 years ago
            lastMaintenanceDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
            tempThresholdMin: 15,
            tempThresholdMax: mType.type === 'CNC' ? 75 : mType.type === 'Press' ? 80 : 85,
            vibThresholdMin: 0,
            vibThresholdMax: mType.type === 'CNC' ? 3.5 : 4.5,
            rpmThresholdMin: 0,
            rpmThresholdMax: mType.type === 'CNC' ? 4000 : 1500,
            status: MachineStatus.OPERATIONAL
          }
        });
        machines.push(machine);
      }
    }
  }
  console.log(`Seeded ${machines.length} Machines.`);

  // 8. Generate 90 Days of Historical Data
  const historyDays = 90;
  const now = new Date();
  
  // Lists for bulk create
  const productionEntriesData: any[] = [];
  const energyReadingsData: any[] = [];
  const sensorReadingsData: any[] = [];

  console.log('Generating 90 days of production and energy readings...');

  for (let day = historyDays; day >= 0; day--) {
    const currentDate = new Date(now);
    currentDate.setDate(now.getDate() - day);
    // Remove time parts for consistency
    currentDate.setHours(0, 0, 0, 0);

    // Weekday vs Weekend effect
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const volumeModifier = isWeekend ? 0.4 : 1.0; // lower production on weekends

    for (const plant of plants) {
      const plantLines = lines.filter(l => l.plantId === plant.id);
      
      for (const line of plantLines) {
        // Line-level energy (aggregate)
        const lineMachines = machines.filter(m => m.lineId === line.id);

        for (const shift of shifts) {
          // A: Morning, B: Evening, C: Night
          // Shift volume differences
          let shiftModifier = 1.0;
          if (shift.name.includes('Shift B')) shiftModifier = 0.95;
          if (shift.name.includes('Shift C')) shiftModifier = 0.75; // Night shift usually has slightly lower efficiency

          // Production Entry
          const baseTarget = line.code.includes('GS') ? 350 : 250;
          const unitsProduced = Math.round(baseTarget * volumeModifier * shiftModifier * (0.85 + Math.random() * 0.25));
          const scrapCount = Math.round(unitsProduced * (0.01 + Math.random() * 0.03)); // 1% to 4% scrap rate
          const downtimeMinutes = isWeekend && Math.random() > 0.7 ? Math.round(Math.random() * 120) : Math.round(Math.random() * 30); // occasional maintenance on weekends

          productionEntriesData.push({
            date: currentDate,
            plantId: plant.id,
            lineId: line.id,
            shiftId: shift.id,
            unitsProduced,
            scrapCount,
            downtimeMinutes,
            loggedById: prodMgr.id,
          });
        }

        // Energy readings (Daily summary per machine to save size)
        for (const machine of lineMachines) {
          const baseKwh = machine.criticality === Criticality.HIGH ? 250 : 150;
          const kwhConsumption = Math.round(baseKwh * volumeModifier * (0.8 + Math.random() * 0.4));
          
          energyReadingsData.push({
            plantId: plant.id,
            lineId: line.id,
            machineId: machine.id,
            kwhConsumption,
            costPerUnit: 7.8, // 7.8 INR per kWh
            timestamp: currentDate
          });
        }
      }
    }
  }

  // Bulk inserts in chunks
  console.log(`Inserting ${productionEntriesData.length} production entries...`);
  await prisma.productionEntry.createMany({ data: productionEntriesData });

  console.log(`Inserting ${energyReadingsData.length} energy readings...`);
  // Split into chunks of 1000
  const chunkSize = 1000;
  for (let i = 0; i < energyReadingsData.length; i += chunkSize) {
    await prisma.energyReading.createMany({
      data: energyReadingsData.slice(i, i + chunkSize)
    });
  }

  // 9. Seed some historical Quality Defects
  console.log('Generating quality defects...');
  const partNumbers = ['P-GEAR-440', 'P-BRK-102', 'P-SUS-201', 'P-SFT-305'];
  const defectTypes = ['Surface Scratch', 'Dimension Deviation', 'Blowhole / Void', 'Micro-Crack', 'Thread Strip'];
  const defectComments = [
    'Observed minor surface scoring on outer diameter during random audit.',
    'Bore dimension measured 0.05mm out of tolerance spec.',
    'Ultrasonic scan detected casting air bubble in inner ring.',
    'Hairline crack found on weld collar post thermal testing.',
    'Internal thread shear detected during go/no-go plug gauge check.'
  ];

  const defectsData: any[] = [];
  // Generate ~40 historical defects spread across the last 90 days
  for (let i = 0; i < 45; i++) {
    const daysAgo = Math.floor(Math.random() * 88) + 1;
    const defectDate = new Date(now);
    defectDate.setDate(now.getDate() - daysAgo);

    const machine = machines[Math.floor(Math.random() * machines.length)];
    const part = partNumbers[Math.floor(Math.random() * partNumbers.length)];
    const typeIdx = Math.floor(Math.random() * defectTypes.length);
    const defectType = defectTypes[typeIdx];
    const description = defectComments[typeIdx];
    
    // Status distribution
    const statusVal = i < 35 ? DefectStatus.RESOLVED : i < 40 ? DefectStatus.INVESTIGATING : DefectStatus.PENDING;
    const rootCause = statusVal === DefectStatus.RESOLVED ? rootCauses[Math.floor(Math.random() * rootCauses.length)] : null;

    defectsData.push({
      date: defectDate,
      plantId: machine.plantId,
      lineId: machine.lineId,
      machineId: machine.id,
      partNumber: part,
      defectType,
      quantity: Math.floor(Math.random() * 8) + 1,
      inspectorId: qualEng.id,
      description,
      rootCauseCategoryId: rootCause ? rootCause.id : null,
      status: statusVal,
      createdAt: defectDate
    });
  }
  await prisma.defectEntry.createMany({ data: defectsData });

  // 10. Seed Maintenance Logs and Alerts
  console.log('Generating maintenance logs and alerts...');
  const maintenanceActions = [
    { desc: 'Replaced worn hydraulic cylinder seals and topped up oil levels.', parts: 'Oil seals, Hydraulic Fluid Grade 46' },
    { desc: 'Calibrated spindle alignment and corrected offset error in axis controller.', parts: 'None' },
    { desc: 'Replaced conveyor drive sprocket and adjusted chain tension.', parts: 'Conveyor Sprocket, Tension Link' },
    { desc: 'Cleaned spray nozzles and flushed manifold lines to resolve uneven pressure.', parts: 'Solvent, Manifold O-Rings' },
    { desc: 'Inspected mold heater bands and replaced faulty thermocouple unit.', parts: 'Type-K Thermocouple' }
  ];

  // Past logs: 2-3 logs per machine over 90 days
  const logsData: any[] = [];
  for (const machine of machines) {
    const numLogs = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numLogs; i++) {
      const daysAgo = Math.floor(Math.random() * 80) + 10; // completed past logs
      const logDate = new Date(now);
      logDate.setDate(now.getDate() - daysAgo);

      const act = maintenanceActions[Math.floor(Math.random() * maintenanceActions.length)];
      
      logsData.push({
        machineId: machine.id,
        technicianId: maintEng.id,
        workDescription: act.desc,
        partsUsed: act.parts,
        downtimeMinutes: Math.floor(Math.random() * 90) + 30,
        completedAt: logDate
      });
    }
  }
  await prisma.maintenanceLog.createMany({ data: logsData });

  // Active/Past Alerts
  // Active warnings/criticals
  const activeAlerts = [
    {
      machine: machines.find(m => m.type === 'CNC' && m.plantId === pune.id)!,
      severity: AlertSeverity.CRITICAL,
      trigger: 'Vibration: 4.8 mm/s',
      msg: 'High vibration detected in spindle bearing assembly. Above threshold (3.5 mm/s).',
      ai: 'AI Predictive Analysis: High probability of spindle bearing fatigue. Urgent action required to avoid catastrophic shaft seizure.\n\nSeverity: CRITICAL\nFailure Mode: Bearing failure due to lubrication breakdown.\nRecommended Action: Immediately halt operations on CNC, inspect lubrication feed line, check bearing play, and schedule replacement of bearing pack within 24 hours.'
    },
    {
      machine: machines.find(m => m.type === 'Press' && m.plantId === nashik.id)!,
      severity: AlertSeverity.WARNING,
      trigger: 'Temp: 82.5 °C',
      msg: 'Main hydraulic manifold temperature elevated. Above threshold (80.0 °C).',
      ai: 'AI Predictive Analysis: Hydraulic fluid degradation predicted within 7 days. High operating temperature will cause viscosity loss, reducing pressing pressure.\n\nSeverity: WARNING\nFailure Mode: Manifold overheating / Heat exchanger clogging.\nRecommended Action: Inspect heat exchanger cooling water flow rates, clean heat exchanger plates, and measure hydraulic fluid viscosity.'
    },
    {
      machine: machines.find(m => m.type === 'Injection Molding' && m.plantId === chennai.id)!,
      severity: AlertSeverity.WARNING,
      trigger: 'RPM: 1650 (Fluctuating)',
      msg: 'Plasticizing screw motor RPM showing irregular speed fluctuations.',
      ai: 'AI Predictive Analysis: Screw motor drive showing current draw spikes. Suggests partial solid jam or heating band failure in Zone 3.\n\nSeverity: WARNING\nFailure Mode: Extruder drive overload.\nRecommended Action: Check heating band continuity in Zone 2 and 3, verify melt temperature, and check gearbox lubrication.'
    }
  ];

  for (const item of activeAlerts) {
    if (item.machine) {
      await prisma.maintenanceAlert.create({
        data: {
          machineId: item.machine.id,
          severity: item.severity,
          status: AlertStatus.ACTIVE,
          triggerValue: item.trigger,
          message: item.msg,
          aiRecommendation: item.ai,
          assignedToId: maintEng.id
        }
      });
      // also set machine status accordingly
      await prisma.machine.update({
        where: { id: item.machine.id },
        data: { status: item.severity === AlertSeverity.CRITICAL ? MachineStatus.ERROR : MachineStatus.WARNING }
      });
    }
  }

  // 11. Seed Sensor readings for last 24 hours (for graphing)
  console.log('Generating sensor readings for last 24 hours...');
  for (const machine of machines) {
    // Generate readings every 2 hours for the last 24 hours
    const readings: any[] = [];
    const baseTemp = machine.type === 'CNC' ? 45 : machine.type === 'Press' ? 50 : 60;
    const baseVib = machine.type === 'CNC' ? 1.8 : machine.type === 'Press' ? 2.5 : 1.2;
    const baseRpm = machine.type === 'CNC' ? 2200 : machine.type === 'Press' ? 800 : 1200;

    for (let h = 24; h >= 0; h -= 2) {
      const readingTime = new Date(now);
      readingTime.setHours(now.getHours() - h);

      // Add a slight fluctuation
      const temperature = baseTemp + (Math.random() * 10 - 5);
      const vibration = baseVib + (Math.random() * 0.8 - 0.4);
      const rpm = baseRpm + (Math.random() * 100 - 50);

      readings.push({
        machineId: machine.id,
        temperature,
        vibration,
        rpm,
        timestamp: readingTime
      });
    }
    await prisma.sensorReading.createMany({ data: readings });
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
