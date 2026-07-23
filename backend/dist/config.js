"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env variables dynamically based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '../.env.production' : '../.env';
dotenv_1.default.config({ path: path_1.default.join(__dirname, envFile) });
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
exports.config = {
    port: parseInt(process.env.PORT || '5001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    backendPublicUrl: process.env.BACKEND_PUBLIC_URL || 'http://localhost:5001',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smartfactory?schema=public',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'super-secret-access-token-key-1234567890',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-token-key-0987654321',
    jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    s3: {
        bucketName: process.env.S3_BUCKET_NAME || 'smartfab-quality-docs',
        endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
        region: process.env.S3_REGION || 'us-east-1',
    }
};
