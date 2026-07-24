import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';
import prisma from './db';

// Routes
import authRoutes from './routes/auth';
import productionRoutes from './routes/production';
import machineRoutes from './routes/machines';
import qualityRoutes from './routes/quality';
import energyRoutes from './routes/energy';
import executiveRoutes from './routes/executive';
import adminRoutes from './routes/admin';

// BullMQ Queue setup
import { scheduleCronJobs } from './services/queue';
import { startWorkers } from './workers';

const app = express();

// Standard Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading upload images on frontend
}));
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://vnrt3000.elb.cisinlive.com',
  config.frontendUrl
].filter(Boolean);

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(morgan('dev'));

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check Endpoints
app.get('/', (req, res) => {
  res.json({ status: 'healthy', service: 'SmartFab API Backend', timestamp: new Date() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/executive', executiveRoutes);
app.use('/api/admin', adminRoutes);

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express Error Handler:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// Start HTTP Listening Immediately for Railway / Cloud Health Probes
const primaryPort = process.env.PORT ? parseInt(process.env.PORT, 10) : config.port;
console.log(`[Startup] Environment PORT: ${process.env.PORT}, Bound PORT: ${primaryPort}`);

app.listen(primaryPort, '0.0.0.0', () => {
  console.log(`SmartFab Automated Components Backend running on http://0.0.0.0:${primaryPort}`);
});

// Bind to secondary ports so Railway proxy reaches app regardless of domain target port settings
const secondaryPorts = [8080, 3000, 5001].filter(p => p !== primaryPort);
secondaryPorts.forEach(p => {
  try {
    const srv = app.listen(p, '0.0.0.0', () => {
      console.log(`SmartFab Backend also listening on fallback port http://0.0.0.0:${p}`);
    });
    srv.on('error', () => { /* ignore port in use */ });
  } catch (err) {
    /* ignore port in use */
  }
});

// Connect to Database & BullMQ Background Workers Asynchronously
const connectServices = async () => {
  try {
    await prisma.$connect();
    console.log('Successfully connected to the PostgreSQL database via Prisma.');

    // Run Prisma migrations in background safely
    try {
      const { exec } = require('child_process');
      exec('npx prisma migrate deploy', async (err: any, stdout: any, stderr: any) => {
        if (err) {
          console.warn('Prisma migrate deploy warning:', stderr || err.message);
        } else if (stdout) {
          console.log('Prisma migrations executed successfully:\n', stdout);
        }
        // Auto-seed if database contains 0 users
        try {
          const userCount = await prisma.user.count();
          if (userCount === 0) {
            console.log('No users found in database. Auto-seeding initial database data...');
            exec('npx ts-node prisma/seed.ts', (sErr: any, sStdout: any, sStderr: any) => {
              if (sErr) {
                console.warn('Auto-seed warning:', sStderr || sErr.message);
              } else {
                console.log('Database auto-seeded successfully:\n', sStdout);
              }
            });
          }
        } catch (sErr) {
          console.warn('User count check failed:', sErr);
        }
      });
    } catch (migErr) {
      console.warn('Could not run prisma migrate deploy:', migErr);
    }

    try {
      startWorkers();
      await scheduleCronJobs();
      console.log('BullMQ queues & workers scheduled.');
    } catch (queueError) {
      console.warn('Warning: Could not start BullMQ queue system (Redis might be offline). Running HTTP server only.', queueError);
    }
  } catch (err) {
    console.error('Warning: Failed to connect to database on startup. Retrying in background...', err);
  }
};

connectServices();
