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

// Health Check
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

// Start Server and BullMQ
const PORT = config.port;

const startServer = async () => {
  try {
    // 1. Verify DB Connection
    await prisma.$connect();
    console.log('Successfully connected to the PostgreSQL database via Prisma.');

    // 2. Start BullMQ background systems
    try {
      startWorkers();
      await scheduleCronJobs();
      console.log('BullMQ queues & workers scheduled.');
    } catch (queueError) {
      console.warn('Warning: Could not start BullMQ queue system (Redis might be offline). Running HTTP server only.', queueError);
    }

    // 3. Start Listening
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`SmartFab Automated Components Backend running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Fatal: Failed to connect to database or start backend server:', err);
    process.exit(1);
  }
};

startServer();
