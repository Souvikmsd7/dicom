// =============================================================================
// DocMed EHR — Device Management & Monitoring Routes
// Exposes REST APIs for Multi-Device Registry, Testing, Discovery & Monitoring
// =============================================================================
import { Router } from 'express';
import {
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  toggleDevice,
  testConnectionForDevice,
  getConnectionHistory,
  getMonitoringSummary,
  getIngestionErrors,
  retryIngestionJob,
} from '../services/device-registry.service.js';
import {
  getDiscoveredCandidates,
  getCandidateById,
  removeCandidate,
  runDiscoveryScan,
} from '../services/device-adapters/discovery.service.js';
import { successResponse, errorResponse } from '../types/api.types.js';
import { auditAction } from '../middleware/audit.js';

const router = Router();

// ---------------------------------------------------------------------------
// Monitoring & Aggregates
// ---------------------------------------------------------------------------

/** GET /api/devices/monitoring/summary — Aggregate monitoring metrics */
router.get('/monitoring/summary', (_req, res) => {
  const summary = getMonitoringSummary();
  res.json(successResponse(summary));
});

// ---------------------------------------------------------------------------
// Discovery Endpoints
// ---------------------------------------------------------------------------

/** GET /api/devices/discovery/candidates — List unverified discovered devices */
router.get('/discovery/candidates', (_req, res) => {
  const candidates = getDiscoveredCandidates();
  res.json(successResponse(candidates));
});

/** POST /api/devices/discovery/scan — Scan network for candidate nodes */
router.post(
  '/discovery/scan',
  auditAction('DISCOVERY_SCAN'),
  async (req, res) => {
    const subnet = req.body.subnet || '127.0.0.1';
    const result = await runDiscoveryScan(subnet);
    res.json(successResponse(result));
  }
);

/** POST /api/devices/discovery/approve — Admin approves candidate and registers device */
router.post(
  '/discovery/approve',
  auditAction('APPROVE_DISCOVERED_DEVICE'),
  (req, res) => {
    const { candidate_id, display_name, clinic_id } = req.body;
    if (!candidate_id) {
      res.status(400).json(errorResponse('MISSING_FIELDS', 'candidate_id is required'));
      return;
    }

    const candidate = getCandidateById(candidate_id);
    if (!candidate) {
      res.status(404).json(errorResponse('CANDIDATE_NOT_FOUND', 'Candidate device not found'));
      return;
    }

    try {
      const deviceId = `DEV-${candidate.detected_category ? candidate.detected_category.slice(0, 3).toUpperCase() : 'DICOM'}-${Date.now().toString().slice(-4)}`;
      const registered = createDevice({
        device_id: deviceId,
        display_name: display_name || candidate.suggested_name,
        device_type: candidate.detected_category || 'OCT / OCT Angiography',
        manufacturer: candidate.manufacturer_guess || null,
        connection_type: candidate.connection_type,
        ip_address: candidate.ip_address,
        port: candidate.port,
        ae_title: candidate.ae_title || null,
        clinic_id: clinic_id || 'CLINIC-MAIN',
        is_enabled: true,
      });

      removeCandidate(candidate_id);
      res.status(201).json(successResponse(registered));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      res.status(400).json(errorResponse('REGISTRATION_FAILED', message));
    }
  }
);

/** DELETE /api/devices/discovery/:candidateId — Dismiss discovered candidate */
router.delete('/discovery/:candidateId', (req, res) => {
  const removed = removeCandidate(req.params.candidateId);
  res.json(successResponse({ candidate_id: req.params.candidateId, dismissed: removed }));
});

// ---------------------------------------------------------------------------
// Ingestion Jobs & Errors
// ---------------------------------------------------------------------------

/** GET /api/devices/jobs/errors — View ingestion error jobs */
router.get('/jobs/errors', (_req, res) => {
  const errors = getIngestionErrors();
  res.json(successResponse(errors));
});

/** POST /api/devices/jobs/:jobId/retry — Retry failed ingestion job */
router.post(
  '/jobs/:jobId/retry',
  auditAction('RETRY_INGESTION_JOB'),
  (req, res) => {
    try {
      const retried = retryIngestionJob(req.params.jobId);
      res.json(successResponse(retried));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Retry failed';
      res.status(400).json(errorResponse('RETRY_FAILED', message));
    }
  }
);

// ---------------------------------------------------------------------------
// Device Registry CRUD & Management
// ---------------------------------------------------------------------------

/** GET /api/devices — List registered devices with filters and search */
router.get('/', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const device_type = typeof req.query.device_type === 'string' ? req.query.device_type : undefined;
  const connection_type = typeof req.query.connection_type === 'string' ? req.query.connection_type : undefined;
  const query = typeof req.query.q === 'string' ? req.query.q : undefined;
  const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

  const results = listDevices({ status, device_type, connection_type, query, page, limit });
  res.json(successResponse(results));
});

/** POST /api/devices — Register a new medical device */
router.post(
  '/',
  auditAction('REGISTER_DEVICE'),
  (req, res) => {
    try {
      const device = createDevice(req.body);
      res.status(201).json(successResponse(device));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      res.status(400).json(errorResponse('INVALID_DEVICE_PAYLOAD', message));
    }
  }
);

/** GET /api/devices/:deviceId — Get specific device details */
router.get('/:deviceId', (req, res) => {
  const device = getDevice(req.params.deviceId);
  if (!device) {
    res.status(404).json(errorResponse('DEVICE_NOT_FOUND', `Device ${req.params.deviceId} not found`));
    return;
  }
  res.json(successResponse(device));
});

/** PUT /api/devices/:deviceId — Update device configuration */
router.put(
  '/:deviceId',
  auditAction('UPDATE_DEVICE'),
  (req, res) => {
    try {
      const updated = updateDevice(req.params.deviceId, req.body);
      res.json(successResponse(updated));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      const status = message.includes('not found') ? 404 : 400;
      res.status(status).json(errorResponse('UPDATE_FAILED', message));
    }
  }
);

/** DELETE /api/devices/:deviceId — Delete a device */
router.delete(
  '/:deviceId',
  auditAction('DELETE_DEVICE'),
  (req, res) => {
    const deleted = deleteDevice(req.params.deviceId);
    if (!deleted) {
      res.status(404).json(errorResponse('DEVICE_NOT_FOUND', `Device ${req.params.deviceId} not found`));
      return;
    }
    res.json(successResponse({ device_id: req.params.deviceId, deleted: true }));
  }
);

/** POST /api/devices/:deviceId/toggle — Enable or disable integration */
router.post(
  '/:deviceId/toggle',
  auditAction('TOGGLE_DEVICE'),
  (req, res) => {
    const { is_enabled } = req.body;
    if (typeof is_enabled !== 'boolean') {
      res.status(400).json(errorResponse('INVALID_PAYLOAD', 'is_enabled (boolean) is required'));
      return;
    }
    try {
      const toggled = toggleDevice(req.params.deviceId, is_enabled);
      res.json(successResponse(toggled));
    } catch (err) {
      res.status(404).json(errorResponse('DEVICE_NOT_FOUND', `Device ${req.params.deviceId} not found`));
    }
  }
);

/** POST /api/devices/:deviceId/test-connection — Trigger live connectivity check */
router.post(
  '/:deviceId/test-connection',
  auditAction('TEST_DEVICE_CONNECTION'),
  async (req, res) => {
    try {
      const result = await testConnectionForDevice(req.params.deviceId);
      res.json(successResponse(result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed';
      res.status(404).json(errorResponse('DEVICE_NOT_FOUND', message));
    }
  }
);

/** GET /api/devices/:deviceId/history — View connection check history */
router.get('/:deviceId/history', (req, res) => {
  const history = getConnectionHistory(req.params.deviceId);
  res.json(successResponse(history));
});

export default router;
