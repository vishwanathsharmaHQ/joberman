import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include a user property
declare global {
  namespace Express {
    interface Request {
      user?: any; // In a real app, this would be properly typed
    }
  }
}

/**
 * Middleware to check if user is authenticated via session ID
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Get session ID from the request headers
  const sessionId = req.headers['session-id'] as string;

  // Check if session ID exists
  if (!sessionId) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  // In a real application, you would validate the session ID
  // against a database or cache, check if it's expired, etc.
  // For this simple implementation, we'll just check if it starts with "user_"
  
  if (!sessionId.startsWith('user_')) {
    res.status(401).json({
      success: false,
      message: 'Invalid session'
    });
    return;
  }

  // Extract user ID from the session ID (format: user_ID_TIMESTAMP)
  const userId = sessionId.split('_')[1];
  
  // Attach user ID to the request object
  req.user = { id: parseInt(userId) };
  
  // Continue to the next middleware or route handler
  next();
}; 