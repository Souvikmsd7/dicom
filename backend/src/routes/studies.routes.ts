// =============================================================================
// DocMed DICOM POC — Studies Routes
// =============================================================================
import { Router } from 'express';
import {
  searchStudies,
  getStudySeries,
  getStudyInstances,
  getOrthancStudyId,
} from '../services/dicomweb.service.js';
import {
  getDicomIdForEhrPatient,
  getAllEhrPatients,
  getEhrPatient,
  searchEhrPatients,
  createMapping,
  getAllMappings,
  validateStudyAccess,
  reconcileStudy,
} from '../services/patient-mapping.service.js';
import {
  getCanonicalFile,
  getCanonicalTemplates,
  getCanonicalTemplateForCategory,
  buildCanonicalDeviceRecord,
  buildCanonicalContractDocument,
} from '../services/device-contract.service.js';
import { successResponse, errorResponse } from '../types/api.types.js';
import { auditAction } from '../middleware/audit.js';

const router = Router();

// ---------------------------------------------------------------------------
// EHR Patient endpoints
// ---------------------------------------------------------------------------

/** GET /api/patients — List all demo EHR patients */
router.get('/patients', (_req, res) => {
  const patients = getAllEhrPatients();
  res.json(successResponse(patients));
});

/** GET /api/patients/search?q=... — Search patients */
router.get('/patients/search', (req, res) => {
  const query = req.query.q as string;
  if (!query || query.length < 1) {
    res.status(400).json(errorResponse('INVALID_QUERY', 'Search query is required'));
    return;
  }
  const results = searchEhrPatients(query);
  res.json(successResponse(results));
});

/** GET /api/patients/:ehrPatientId — Get specific patient */
router.get('/patients/:ehrPatientId', (req, res) => {
  const ehrPatientId = String(req.params.ehrPatientId);
  const patient = getEhrPatient(ehrPatientId);
  if (!patient) {
    res.status(404).json(errorResponse('PATIENT_NOT_FOUND', 'EHR patient not found'));
    return;
  }
  res.json(successResponse(patient));
});

// ---------------------------------------------------------------------------
// Patient-DICOM mapping endpoints
// ---------------------------------------------------------------------------

/** GET /api/mappings — List all patient-DICOM mappings */
router.get('/mappings', (_req, res) => {
  const mappings = getAllMappings();
  res.json(successResponse(mappings));
});

/** POST /api/mappings — Create a new patient-DICOM mapping */
router.post('/mappings', (req, res) => {
  const { ehrPatientId, dicomPatientId, patientName } = req.body;

  if (!ehrPatientId || !dicomPatientId) {
    res.status(400).json(
      errorResponse('MISSING_FIELDS', 'ehrPatientId and dicomPatientId are required')
    );
    return;
  }

  try {
    const mapping = createMapping(ehrPatientId, dicomPatientId, patientName || '');
    res.status(201).json(successResponse(mapping));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json(errorResponse('MAPPING_ERROR', message));
  }
});

// ---------------------------------------------------------------------------
// Study endpoints (proxied through backend)
// ---------------------------------------------------------------------------

/** GET /api/studies — Query all studies (optionally filtered) */
router.get(
  '/studies',
  auditAction('QUERY_STUDIES'),
  async (req, res) => {
    try {
      const studies = await searchStudies({
        patientId: req.query.patientId as string,
        patientName: req.query.patientName as string,
        studyDate: req.query.studyDate as string,
        modality: req.query.modality as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      });

      // Perform server-side identity reconciliation for each study
      const reconciled = studies.map((study) => {
        const rec = reconcileStudy(study);
        return {
          ...study,
          reconciliationStatus: rec.status,
          reconciliationReason: rec.reason,
        };
      });

      res.json(successResponse(reconciled));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to query studies';
      console.error('[Studies] Query error:', message);
      res.status(502).json(errorResponse('ORTHANC_ERROR', message));
    }
  }
);

/**
 * GET /api/studies/patient/:ehrPatientId — Get studies for an EHR patient.
 * Uses the mapping service to resolve the DICOM PatientID and validates demographics.
 */
router.get(
  '/studies/patient/:ehrPatientId',
  auditAction('QUERY_PATIENT_STUDIES'),
  async (req, res) => {
    const ehrPatientId = String(req.params.ehrPatientId);

    // Validate EHR patient exists
    const patient = getEhrPatient(ehrPatientId);
    if (!patient) {
      res.status(404).json(errorResponse('PATIENT_NOT_FOUND', 'EHR patient not found'));
      return;
    }

    // Look up the DICOM mapping
    const mapping = getDicomIdForEhrPatient(ehrPatientId);
    if (!mapping) {
      // No mapping yet — return empty array, not an error
      res.json(successResponse([]));
      return;
    }

    try {
      const studies = await searchStudies({ patientId: mapping.dicomPatientId });

      // Rigorous clinical identity reconciliation: validates DOB & Sex against EHR patient
      const reconciled = studies.map((study) => {
        const rec = reconcileStudy(study, ehrPatientId);
        return {
          ...study,
          reconciliationStatus: rec.status,
          reconciliationReason: rec.reason,
        };
      });

      res.json(successResponse(reconciled));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to query studies';
      console.error('[Studies] Patient query error:', message);
      res.status(502).json(errorResponse('ORTHANC_ERROR', message));
    }
  }
);

/**
 * GET /api/devices/modalities — Candidate physical ophthalmic device profiles & Orthanc destination parameters.
 */
router.get('/devices/modalities', (_req, res) => {
  res.json(
    successResponse({
      receivingDestination: {
        aeTitle: 'DOCMED',
        host: '127.0.0.1 (or Hospital LAN IP)',
        dicomPort: 4242,
        dicomWebEndpoint: 'http://localhost:8042/dicom-web/',
        echoSupported: true,
        storeSupported: true,
      },
      candidateOphthalmicModalities: [
        {
          id: 'cirrus-oct',
          name: 'ZEISS CIRRUS HD-OCT (4000/5000/6000)',
          vendor: 'Carl Zeiss Meditec',
          category: 'Optical Coherence Tomography (OCT)',
          sopClasses: [
            'Ophthalmic Tomography Image Storage (1.2.840.10008.5.1.4.1.1.77.1.5.4)',
            'Encapsulated PDF Storage (1.2.840.10008.5.1.4.1.1.104.1)',
            'Raw Data Storage (1.2.840.10008.5.1.4.1.1.66)',
          ],
          roles: ['C-STORE SCU', 'MWL C-FIND SCU', 'Storage Commitment SCU'],
          licensingPrerequisite: 'ZEISS DICOM Connectivity Option / FORUM integration license',
          middlewareWorkstation: 'ZEISS FORUM / Glaucoma & Retina Workplace',
        },
        {
          id: 'spectralis-oct',
          name: 'Heidelberg Engineering SPECTRALIS (OCT & HRA+OCT)',
          vendor: 'Heidelberg Engineering',
          category: 'Optical Coherence Tomography / Angiography',
          sopClasses: [
            'Ophthalmic Tomography Image Storage (1.2.840.10008.5.1.4.1.1.77.1.5.4)',
            'Ophthalmic Photography 8 Bit Image Storage (1.2.840.10008.5.1.4.1.1.77.1.5.1)',
            'Secondary Capture Image Storage (1.2.840.10008.5.1.4.1.1.7)',
            'Encapsulated PDF Storage (1.2.840.10008.5.1.4.1.1.104.1)',
          ],
          roles: ['C-STORE SCU', 'MWL C-FIND SCU'],
          licensingPrerequisite: 'HEYEX 2 DICOM Import/Export License / PACS Interface',
          middlewareWorkstation: 'Heidelberg Eye Explorer (HEYEX / HEYEX 2)',
        },
        {
          id: 'clarus-fundus',
          name: 'ZEISS CLARUS 500 / 700 & VISUCAM',
          vendor: 'Carl Zeiss Meditec',
          category: 'Ultra-Widefield True Color Fundus Camera',
          sopClasses: [
            'Ophthalmic Photography 8 Bit Image Storage (1.2.840.10008.5.1.4.1.1.77.1.5.1)',
            'Ophthalmic Photography 16 Bit Image Storage (1.2.840.10008.5.1.4.1.1.77.1.5.2)',
            'VL Photographic Image Storage (1.2.840.10008.5.1.4.1.1.77.1.4)',
          ],
          roles: ['C-STORE SCU', 'MWL C-FIND SCU'],
          licensingPrerequisite: 'ZEISS Connectivity Package',
          middlewareWorkstation: 'Direct DICOM export or ZEISS FORUM',
        },
        {
          id: 'topcon-trc',
          name: 'Topcon TRC-NW400 Non-Mydriatic Retinal Camera',
          vendor: 'Topcon Healthcare',
          category: 'Color Retinal Photography',
          sopClasses: [
            'Ophthalmic Photography 8 Bit Image Storage (1.2.840.10008.5.1.4.1.1.77.1.5.1)',
            'Secondary Capture Image Storage (1.2.840.10008.5.1.4.1.1.7)',
          ],
          roles: ['C-STORE SCU', 'MWL C-FIND SCU'],
          licensingPrerequisite: 'Topcon DICOM Communication License',
          middlewareWorkstation: 'Topcon IMAGEnet 6 or direct network transfer',
        },
        {
          id: 'optos-california',
          name: 'Optos California / Daytona',
          vendor: 'Optos plc',
          category: 'Ultra-Widefield Retinal Imaging (200° optomap)',
          sopClasses: [
            'Ophthalmic Photography 8 Bit Image Storage (1.2.840.10008.5.1.4.1.1.77.1.5.1)',
            'Secondary Capture Image Storage (1.2.840.10008.5.1.4.1.1.7)',
          ],
          roles: ['C-STORE SCU'],
          licensingPrerequisite: 'Optos DICOM Export License',
          middlewareWorkstation: 'OptosAdvance or Vantage Review Station',
        },
        {
          id: 'zeiss-hfa',
          name: 'ZEISS Humphrey Field Analyzer (HFA II-i / HFA 3)',
          vendor: 'Carl Zeiss Meditec',
          category: 'Automated Visual Field Perimetry',
          sopClasses: [
            'Encapsulated PDF Storage (1.2.840.10008.5.1.4.1.1.104.1)',
            'Raw Data Storage (1.2.840.10008.5.1.4.1.1.66)',
            'Ophthalmic Visual Field (1.2.840.10008.5.1.4.1.1.77.1.5.6)',
          ],
          roles: ['C-STORE SCU', 'MWL C-FIND SCU'],
          licensingPrerequisite: 'HFA DICOM Package (standard on HFA3)',
          middlewareWorkstation: 'ZEISS FORUM Visual Field Workplace',
        },
      ],
    })
  );
});

/**
 * GET /api/studies/:studyInstanceUID/series — Get series for a study.
 * Validates study access if ehrPatientId is provided.
 */
router.get(
  '/studies/:studyInstanceUID/series',
  auditAction('QUERY_SERIES'),
  async (req, res) => {
    const studyInstanceUID = String(req.params.studyInstanceUID);
    const ehrPatientId = typeof req.query.ehrPatientId === 'string' ? req.query.ehrPatientId : undefined;

    try {
      // If ehrPatientId is provided, validate access
      if (ehrPatientId) {
        // We need to first get the study to find its DICOM PatientID
        const studies = await searchStudies();
        const study = studies.find(s => s.studyInstanceUID === studyInstanceUID);

        if (!study) {
          res.status(404).json(errorResponse('STUDY_NOT_FOUND', 'Study not found'));
          return;
        }

        const access = validateStudyAccess(ehrPatientId, study.patientID);
        if (!access.allowed) {
          res.status(403).json(
            errorResponse('ACCESS_DENIED', access.reason || 'Study access denied')
          );
          return;
        }
      }

      const series = await getStudySeries(studyInstanceUID);
      res.json(successResponse(series));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to query series';
      console.error('[Studies] Series query error:', message);
      res.status(502).json(errorResponse('ORTHANC_ERROR', message));
    }
  }
);

// ---------------------------------------------------------------------------
// Canonical Ophthalmology Device Contract Endpoints
// ---------------------------------------------------------------------------

/**
 * GET /api/devices/contract/document — Return the complete canonical contract document
 * preserving all 5 top-level keys and all 10 device categories.
 */
router.get('/devices/contract/document', (_req, res) => {
  try {
    const doc = getCanonicalFile();
    res.json(successResponse(doc));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load canonical contract document';
    res.status(500).json(errorResponse('DOCUMENT_ERROR', message));
  }
});

/**
 * GET /api/devices/contract/templates — List all 10 canonical device templates.
 */
router.get('/devices/contract/templates', (_req, res) => {
  try {
    const templates = getCanonicalTemplates();
    res.json(successResponse(templates));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load canonical templates';
    res.status(500).json(errorResponse('TEMPLATE_ERROR', message));
  }
});

/**
 * GET /api/devices/contract/template/:category — Get a specific canonical template.
 */
router.get('/devices/contract/template/:category', (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);
    const template = getCanonicalTemplateForCategory(category);
    res.json(successResponse(template));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load template';
    res.status(404).json(errorResponse('TEMPLATE_NOT_FOUND', message));
  }
});

/**
 * GET /api/devices/study/:studyInstanceUID — Canonical device data contract for a study.
 * Conforms 100% to DocMed_Ophthalmology_Device_Data_Examples_Compatible.json.
 * Returns the full CanonicalContractFile envelope preserving all 10 device categories.
 * Query ?view=record returns just the single device record for the study.
 */
router.get(
  '/devices/study/:studyInstanceUID',
  auditAction('QUERY_DEVICE_DATA'),
  async (req, res) => {
    const studyInstanceUID = String(req.params.studyInstanceUID);
    const ehrPatientId = typeof req.query.ehrPatientId === 'string' ? req.query.ehrPatientId : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const viewMode = req.query.view || (req.query.device_only === 'true' ? 'record' : 'document');

    try {
      // 1. Fetch study from Orthanc QIDO-RS
      const studies = await searchStudies();
      const study = studies.find((s) => s.studyInstanceUID === studyInstanceUID);

      if (!study) {
        res.status(404).json(errorResponse('STUDY_NOT_FOUND', `Study ${studyInstanceUID} not found`));
        return;
      }

      // 2. Validate patient access if ehrPatientId is provided
      if (ehrPatientId) {
        const patient = getEhrPatient(ehrPatientId);
        if (!patient) {
          res.status(404).json(errorResponse('PATIENT_NOT_FOUND', 'EHR patient not found'));
          return;
        }

        const access = validateStudyAccess(ehrPatientId, study.patientID);
        if (!access.allowed) {
          res.status(403).json(errorResponse('ACCESS_DENIED', access.reason || 'Study access denied'));
          return;
        }
      }

      // 3. Fetch series, instances, and internal Orthanc study ID
      const [series, instances, orthancId] = await Promise.all([
        getStudySeries(studyInstanceUID).catch(() => []),
        getStudyInstances(studyInstanceUID).catch(() => []),
        getOrthancStudyId(studyInstanceUID).catch(() => null),
      ]);

      // 4. Build canonical document envelope (all 10 categories, top-level keys preserved)
      const canonicalDocument = buildCanonicalContractDocument({
        study,
        series,
        instances,
        ehrPatientId,
        overrideCategory: category,
      });

      if (orthancId) {
        for (const dev of canonicalDocument.devices) {
          if (dev.study.study_instance_uid === studyInstanceUID) {
            dev.study.dicomweb.orthanc_study_id = orthancId;
          }
        }
      }

      // If client requests single device record view specifically:
      if (viewMode === 'record') {
        const activeRecord =
          canonicalDocument.devices.find(
            (d) => d.study.study_instance_uid === studyInstanceUID
          ) || canonicalDocument.devices[0];
        res.json(successResponse(activeRecord));
        return;
      }

      // Default: Return full CanonicalContractFile document envelope matching file 100%
      res.json(successResponse(canonicalDocument));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate device contract';
      console.error('[DeviceContract] Error:', message);
      res.status(502).json(errorResponse('ORTHANC_ERROR', message));
    }
  }
);

/**
 * GET /api/devices/study/:studyInstanceUID/record — Single device record for a study.
 */
router.get(
  '/devices/study/:studyInstanceUID/record',
  auditAction('QUERY_DEVICE_RECORD'),
  async (req, res) => {
    req.url = `/devices/study/${encodeURIComponent(req.params.studyInstanceUID)}?view=record${
      req.query.ehrPatientId ? `&ehrPatientId=${encodeURIComponent(String(req.query.ehrPatientId))}` : ''
    }`;
    router.handle(req, res);
  }
);

/**
 * GET /api/studies/:studyInstanceUID/device-data — Alias for /api/devices/study/:studyInstanceUID
 */
router.get(
  '/studies/:studyInstanceUID/device-data',
  (req, res) => {
    const studyInstanceUID = encodeURIComponent(req.params.studyInstanceUID);
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(307, `/api/devices/study/${studyInstanceUID}${query}`);
  }
);

export default router;
