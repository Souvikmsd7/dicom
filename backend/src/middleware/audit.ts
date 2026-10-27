// =============================================================================
// DocMed DICOM POC — Audit Logging Middleware
// =============================================================================
// Logs access and import actions with timestamp, user context, and action type.
// In production, this would write to a persistent audit store.
// =============================================================================
import type { Request, Response, NextFunction } from 'express';

export interface AuditEntry {
  timestamp: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  ehrPatientId?: string;
  studyInstanceUID?: string;
  statusCode?: number;
}

// In-memory audit log for the POC
const auditLog: AuditEntry[] = [];

/** Get all audit entries */
export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}

/** Create audit logging middleware for a specific action */
export function auditAction(action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ehrPatientId = req.params.ehrPatientId
      ? String(req.params.ehrPatientId)
      : typeof req.query.ehrPatientId === 'string'
      ? req.query.ehrPatientId
      : undefined;

    const studyInstanceUID = req.params.studyInstanceUID
      ? String(req.params.studyInstanceUID)
      : typeof req.query.studyInstanceUID === 'string'
      ? req.query.studyInstanceUID
      : undefined;

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      resource: req.originalUrl,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      ehrPatientId,
      studyInstanceUID,
    };

    // Capture response status after the response is sent
    const originalEnd = res.end;
    res.end = function (this: Response, ...args: Parameters<typeof res.end>) {
      entry.statusCode = res.statusCode;
      auditLog.push(entry);

      console.log(
        `[AUDIT] ${entry.timestamp} | ${entry.action} | ${entry.resource} | ${entry.statusCode} | patient=${entry.ehrPatientId || 'N/A'}`
      );

      return originalEnd.apply(this, args);
    } as typeof res.end;

    next();
  };
}
