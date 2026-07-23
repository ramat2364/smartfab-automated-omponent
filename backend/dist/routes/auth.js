"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Helper to generate tokens
const generateTokens = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        plantAccessId: user.plantAccessId,
    };
    const accessToken = jsonwebtoken_1.default.sign(payload, config_1.config.jwtAccessSecret, {
        expiresIn: config_1.config.jwtAccessExpiry,
    });
    const refreshToken = jsonwebtoken_1.default.sign(payload, config_1.config.jwtRefreshSecret, {
        expiresIn: config_1.config.jwtRefreshExpiry,
    });
    return { accessToken, refreshToken };
};
// POST /login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
    }
    try {
        const user = await db_1.default.user.findUnique({
            where: { email },
            include: { plantAccess: true }
        });
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const passwordMatch = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!passwordMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const { accessToken, refreshToken } = generateTokens(user);
        // Save refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days matching JWT expiration
        await db_1.default.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt
            }
        });
        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                plantAccess: user.plantAccess
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// POST /refresh
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ message: 'Refresh token is required' });
        return;
    }
    try {
        // Check if token exists in DB
        const savedToken = await db_1.default.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: { include: { plantAccess: true } } }
        });
        if (!savedToken || savedToken.expiresAt < new Date()) {
            if (savedToken) {
                await db_1.default.refreshToken.delete({ where: { id: savedToken.id } });
            }
            res.status(403).json({ message: 'Invalid or expired refresh token' });
            return;
        }
        // Verify JWT
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshToken, config_1.config.jwtRefreshSecret);
        }
        catch (err) {
            await db_1.default.refreshToken.delete({ where: { id: savedToken.id } });
            res.status(403).json({ message: 'Invalid refresh token' });
            return;
        }
        // Rotate token: delete old, generate new
        await db_1.default.refreshToken.delete({ where: { id: savedToken.id } });
        const tokens = generateTokens(savedToken.user);
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);
        await db_1.default.refreshToken.create({
            data: {
                token: tokens.refreshToken,
                userId: savedToken.user.id,
                expiresAt: newExpiresAt
            }
        });
        res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: savedToken.user.id,
                email: savedToken.user.email,
                name: savedToken.user.name,
                role: savedToken.user.role,
                plantAccess: savedToken.user.plantAccess
            }
        });
    }
    catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// POST /logout
router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ message: 'Refresh token is required' });
        return;
    }
    try {
        await db_1.default.refreshToken.deleteMany({
            where: { token: refreshToken }
        });
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// GET /me
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const user = await db_1.default.user.findUnique({
            where: { id: req.user.id },
            include: { plantAccess: true }
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plantAccess: user.plantAccess
        });
    }
    catch (error) {
        console.error('Me endpoint error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
