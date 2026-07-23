import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    plantAccessId: string | null;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Authentication token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret) as {
      id: string;
      email: string;
      role: Role;
      plantAccessId: string | null;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

// Check if user has access to a specific plant
export const checkPlantAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // CEO and ADMIN have cross-plant access
  if (req.user.role === Role.CEO || req.user.role === Role.ADMIN) {
    next();
    return;
  }

  // Get plantId from request (either query parameter, body, or path parameter)
  const plantId = req.query.plantId as string || req.body.plantId || req.params.plantId;

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
