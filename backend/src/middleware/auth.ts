// =============================================================================
// DocMed DICOM POC — Auth Middleware
// =============================================================================
// Demo-mode auth middleware. In production, this would validate JWT tokens
// or session cookies from the EHR's authentication system.
//
// For this POC, it checks for a simple X-Demo-Auth header or accepts
// all requests when NODE_ENV !== 'production'.
// =============================================================================
import type { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../types/api.types.js';

/**
 * Demo authentication middleware.
 * In development: all requests are allowed (logged as "demo-user").
 * In production: would validate real auth tokens.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // In development mode, allow all requests
  if (process.env.NODE_ENV !== 'production') {
    // Attach a demo user context for audit logging
    (req as Request & { userId?: string }).userId = 'demo-user';
    next();
    return;
  }

  // Production placeholder — would validate real auth here
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json(
      errorResponse('UNAUTHORIZED', 'Authentication required')
    );
    return;
  }

  // TODO: Validate JWT/session token against EHR auth service
  next();
}
