import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        stacksAddress: string;
        role: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Access denied. No token provided or invalid format.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    // Fetch user from database to ensure they still exist and get latest info
    const user = await User.findById(decoded.id).select('-__v');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    // Attach user info to request
    req.user = {
      id: user._id.toString(),
      stacksAddress: user.stacksAddress,
      role: user.role,
      email: user.email
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired.' });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Authentication failed.' });
  }
};

/**
 * Authorization middleware to check user roles
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      return next(); // Continue without authentication
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    const user = await User.findById(decoded.id).select('-__v');
    
    if (user) {
      req.user = {
        id: user._id.toString(),
        stacksAddress: user.stacksAddress,
        role: user.role,
        email: user.email
      };
    }

    next();
  } catch (error) {
    // Ignore authentication errors in optional auth
    next();
  }
};
