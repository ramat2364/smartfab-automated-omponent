"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPlantAccess = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: 'Authentication token required' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtAccessSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
// Check if user has access to a specific plant
const checkPlantAccess = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    // CEO and ADMIN have cross-plant access
    if (req.user.role === client_1.Role.CEO || req.user.role === client_1.Role.ADMIN) {
        next();
        return;
    }
    // Get plantId from request (either query parameter, body, or path parameter)
    const plantId = req.query.plantId || req.body.plantId || req.params.plantId;
    if (!plantId) {
        // If no plantId is specified, let them proceed (filters can filter automatically or reject in service)
        next();
        return;
    }
    if (req.user.plantAccessId && req.user.plantAccessId !== plantId) {
        res.status(403).json({ message: 'Forbidden: You do not have access to this plant' });
        return;
    }
    next();
};
exports.checkPlantAccess = checkPlantAccess;
