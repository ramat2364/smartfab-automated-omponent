import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { config } from '../config';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// Helper to generate tokens
const generateTokens = (user: { id: string; email: string; role: string; plantAccessId: string | null }) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    plantAccessId: user.plantAccessId,
  };

  const accessToken = jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpiry as any,
  });

  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiry as any,
  });

  return { accessToken, refreshToken };
};

// POST /login
router.post('/login', async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { plantAccess: true }
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days matching JWT expiration

    await prisma.refreshToken.create({
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /refresh
router.post('/refresh', async (req, res): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ message: 'Refresh token is required' });
    return;
  }

  try {
    // Check if token exists in DB
    const savedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { plantAccess: true } } }
    });

    if (!savedToken || savedToken.expiresAt < new Date()) {
      if (savedToken) {
        await prisma.refreshToken.delete({ where: { id: savedToken.id } });
      }
      res.status(403).json({ message: 'Invalid or expired refresh token' });
      return;
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as any;
    } catch (err) {
      await prisma.refreshToken.delete({ where: { id: savedToken.id } });
      res.status(403).json({ message: 'Invalid refresh token' });
      return;
    }

    // Rotate token: delete old, generate new
    await prisma.refreshToken.delete({ where: { id: savedToken.id } });

    const tokens = generateTokens(savedToken.user);

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.refreshToken.create({
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
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /logout
router.post('/logout', async (req, res): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ message: 'Refresh token is required' });
    return;
  }

  try {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
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
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
