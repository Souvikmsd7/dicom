// =============================================================================
// DocMed DICOM POC — Viewer Routes
// =============================================================================
import { Router } from 'express';
import { generateViewerUrl } from '../services/viewer.service.js';
import {
  getDicomIdForEhrPatient,
  getEhrPatient,
  validateStudyAccess,
} from '../services/patient-mapping.service.js';
import { searchStudies, checkOrthancHealth } from '../services/dicomweb.service.js';
import { successResponse, errorResponse } from '../types/api.types.js';
import { auditAction } from '../middleware/audit.js';

const router = Router();

/**
 * POST /api/viewer/launch — Generate a viewer launch URL for a study.
 *
 * Requires ehrPatientId + studyInstanceUID.
 * Validates that the study belongs to the specified patient via mapping.
 */
router.post(
  '/launch',
  auditAction('VIEWER_LAUNCH'),
  async (req, res) => {
    const { ehrPatientId, studyInstanceUID } = req.body;

    if (!ehrPatientId || !studyInstanceUID) {
      res.status(400).json(
        errorResponse(
          'MISSING_FIELDS',
          'ehrPatientId and studyInstanceUID are required'
        )
      );
      return;
    }

    // Validate EHR patient exists
    const patient = getEhrPatient(ehrPatientId);
    if (!patient) {
      res.status(404).json(errorResponse('PATIENT_NOT_FOUND', 'EHR patient not found'));
      return;
    }

    // Validate mapping exists
    const mapping = getDicomIdForEhrPatient(ehrPatientId);
    if (!mapping) {
      res.status(400).json(
        errorResponse(
          'NO_MAPPING',
          'No DICOM mapping exists for this patient. Create a mapping first.'
        )
      );
      return;
    }

    // Validate the study belongs to the mapped DICOM patient
    try {
      const studies = await searchStudies({ patientId: mapping.dicomPatientId });
      const study = studies.find((s) => s.studyInstanceUID === studyInstanceUID);

      if (!study) {
        res.status(404).json(
          errorResponse('STUDY_NOT_FOUND', 'Study not found for this patient')
        );
        return;
      }

      // Final access check
      const access = validateStudyAccess(ehrPatientId, study.patientID);
      if (!access.allowed) {
        res.status(403).json(
          errorResponse('ACCESS_DENIED', access.reason || 'Access denied')
        );
        return;
      }

      const launchInfo = generateViewerUrl({
        studyInstanceUID,
        ehrPatientId,
      });

      res.json(successResponse(launchInfo));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to launch viewer';
      console.error('[Viewer] Launch error:', message);
      res.status(502).json(errorResponse('VIEWER_ERROR', message));
    }
  }
);

/** GET /api/viewer/health — Check Orthanc & viewer readiness */
router.get('/health', async (_req, res) => {
  const health = await checkOrthancHealth();
  res.json(successResponse(health));
});

export default router;
