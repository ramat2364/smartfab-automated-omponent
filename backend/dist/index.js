"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const db_1 = __importDefault(require("./db"));
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const production_1 = __importDefault(require("./routes/production"));
const machines_1 = __importDefault(require("./routes/machines"));
const quality_1 = __importDefault(require("./routes/quality"));
const energy_1 = __importDefault(require("./routes/energy"));
const executive_1 = __importDefault(require("./routes/executive"));
const admin_1 = __importDefault(require("./routes/admin"));
// BullMQ Queue setup
const queue_1 = require("./services/queue");
const workers_1 = require("./workers");
const app = (0, express_1.default)();
// Standard Middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false // Allow loading upload images on frontend
}));
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://vnrt3000.elb.cisinlive.com',
    config_1.config.frontendUrl
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
// Static uploads serving
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date() });
});
// API Routes mounting
app.use('/api/auth', auth_1.default);
app.use('/api/production', production_1.default);
app.use('/api/machines', machines_1.default);
app.use('/api/quality', quality_1.default);
app.use('/api/energy', energy_1.default);
app.use('/api/executive', executive_1.default);
app.use('/api/admin', admin_1.default);
// Error Handler
app.use((err, req, res, next) => {
    console.error('Express Error Handler:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
});
// Start Server and BullMQ
const PORT = config_1.config.port;
const startServer = async () => {
    try {
        // 1. Verify DB Connection
        await db_1.default.$connect();
        console.log('Successfully connected to the PostgreSQL database via Prisma.');
        // 2. Start BullMQ background systems
        try {
            (0, workers_1.startWorkers)();
            await (0, queue_1.scheduleCronJobs)();
            console.log('BullMQ queues & workers scheduled.');
        }
        catch (queueError) {
            console.warn('Warning: Could not start BullMQ queue system (Redis might be offline). Running HTTP server only.', queueError);
        }
        // 3. Start Listening
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`SmartFab Automated Components Backend running on http://0.0.0.0:${PORT}`);
        });
    }
    catch (err) {
        console.error('Fatal: Failed to connect to database or start backend server:', err);
        process.exit(1);
    }
};
startServer();
