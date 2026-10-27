// =============================================================================
// DocMed DICOM POC — Patient Mapping Service
// =============================================================================
// Implements explicit EHR Patient ID ↔ DICOM Patient ID mapping.
// In production this would be backed by a database. For the POC we use an
// in-memory store seeded with sample demo patients.
//
// IMPORTANT: A DICOM PatientID is NOT assumed to match the EHR patient ID.
// Every association must go through this mapping service.
// =============================================================================
import { type PatientMapping } from '../types/api.types.js';
import type { StudyMetadata, StudyReconciliationStatus } from '../types/dicom.types.js';

/** Demo EHR patients — synthetic data only */
export interface EhrPatient {
  ehrPatientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'M' | 'F' | 'O';
  mrn: string; // Medical Record Number
}

// In-memory stores
const mappings = new Map<string, PatientMapping>();
const ehrPatients = new Map<string, EhrPatient>();

// ---------------------------------------------------------------------------
// Seed demo data
// ---------------------------------------------------------------------------

const DEMO_PATIENTS: EhrPatient[] = [
  {
    ehrPatientId: 'EHR-001',
    firstName: 'Alex',
    lastName: 'Thompson',
    dateOfBirth: '1985-03-15',
    sex: 'M',
    mrn: 'MRN-100001',
  },
  {
    ehrPatientId: 'EHR-002',
    firstName: 'Jordan',
    lastName: 'Rivera',
    dateOfBirth: '1992-07-22',
    sex: 'F',
    mrn: 'MRN-100002',
  },
  {
    ehrPatientId: 'EHR-003',
    firstName: 'Morgan',
    lastName: 'Chen',
    dateOfBirth: '1978-11-08',
    sex: 'M',
    mrn: 'MRN-100003',
  },
];

/** Initialize demo patients */
export function seedDemoData(): void {
  for (const patient of DEMO_PATIENTS) {
    ehrPatients.set(patient.ehrPatientId, patient);
  }

  // Pre-seed demo mapping for Alex Thompson (EHR-001) <-> BRAINIX_001
  const demoMapping: PatientMapping = {
    ehrPatientId: 'EHR-001',
    dicomPatientId: 'BRAINIX_001',
    patientName: 'Thompson, Alex',
    verified: true,
    createdAt: new Date().toISOString(),
  };
  mappings.set('ehr:EHR-001', demoMapping);
  mappings.set('dicom:BRAINIX_001', demoMapping);

  console.log(`[PatientMapping] Seeded ${DEMO_PATIENTS.length} demo EHR patients and default demo mapping`);
}

// ---------------------------------------------------------------------------
// Patient lookup
// ---------------------------------------------------------------------------

/** Get all demo EHR patients */
export function getAllEhrPatients(): EhrPatient[] {
  return Array.from(ehrPatients.values());
}

/** Find an EHR patient by ID */
export function getEhrPatient(ehrPatientId: string): EhrPatient | undefined {
  return ehrPatients.get(ehrPatientId);
}

/** Search patients by name (case-insensitive partial match) */
export function searchEhrPatients(query: string): EhrPatient[] {
  const q = query.toLowerCase();
  return Array.from(ehrPatients.values()).filter(
    (p) =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.ehrPatientId.toLowerCase().includes(q)
  );
}

// ---------------------------------------------------------------------------
// Mapping CRUD
// ---------------------------------------------------------------------------

/**
 * Create a verified mapping between an EHR patient and a DICOM PatientID.
 * This is the explicit association step — it does NOT assume IDs match.
 */
export function createMapping(
  ehrPatientId: string,
  dicomPatientId: string,
  patientName: string
): PatientMapping {
  // Validate the EHR patient exists
  const ehrPatient = ehrPatients.get(ehrPatientId);
  if (!ehrPatient) {
    throw new Error(`EHR patient not found: ${ehrPatientId}`);
  }

  const mapping: PatientMapping = {
    ehrPatientId,
    dicomPatientId,
    patientName,
    verified: true,
    createdAt: new Date().toISOString(),
  };

  // Key by both directions for bidirectional lookup
  mappings.set(`ehr:${ehrPatientId}`, mapping);
  mappings.set(`dicom:${dicomPatientId}`, mapping);

  console.log(
    `[PatientMapping] Created mapping: EHR ${ehrPatientId} ↔ DICOM ${dicomPatientId}`
  );
  return mapping;
}

/** Look up the DICOM PatientID(s) for a given EHR patient */
export function getDicomIdForEhrPatient(
  ehrPatientId: string
): PatientMapping | undefined {
  return mappings.get(`ehr:${ehrPatientId}`);
}

/** Look up the EHR patient for a given DICOM PatientID */
export function getEhrPatientForDicomId(
  dicomPatientId: string
): PatientMapping | undefined {
  return mappings.get(`dicom:${dicomPatientId}`);
}

/** Get all current mappings */
export function getAllMappings(): PatientMapping[] {
  // De-duplicate (each mapping stored under two keys)
  const seen = new Set<string>();
  const result: PatientMapping[] = [];
  for (const mapping of mappings.values()) {
    const key = `${mapping.ehrPatientId}:${mapping.dicomPatientId}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(mapping);
    }
  }
  return result;
}

/**
 * Reconciles a study's identity against the EHR patient database.
 * Cross-references PatientID mapping, Date of Birth, and Sex.
 * NEVER links studies based on patient name alone.
 */
export function reconcileStudy(
  study: StudyMetadata,
  expectedEhrPatientId?: string
): {
  status: StudyReconciliationStatus;
  ehrPatient?: EhrPatient;
  reason?: string;
} {
  // If an expected EHR patient is specified, validate that exact relationship
  if (expectedEhrPatientId) {
    const ehrPatient = ehrPatients.get(expectedEhrPatientId);
    if (!ehrPatient) {
      return {
        status: 'QUARANTINED',
        reason: `Target EHR patient record '${expectedEhrPatientId}' does not exist in directory`,
      };
    }

    const mapping = mappings.get(`ehr:${expectedEhrPatientId}`);
    if (!mapping) {
      return {
        status: 'UNMAPPED',
        ehrPatient,
        reason: `No verified DICOM PatientID mapping registered for ${ehrPatient.lastName}, ${ehrPatient.firstName} (${expectedEhrPatientId})`,
      };
    }

    if (mapping.dicomPatientId !== study.patientID) {
      return {
        status: 'DEMOGRAPHIC_MISMATCH',
        ehrPatient,
        reason: `DICOM PatientID mismatch: Study has '${study.patientID}', but EHR patient is mapped to '${mapping.dicomPatientId}'`,
      };
    }

    // Secondary demographic cross-check: Date of Birth
    if (study.patientBirthDate && ehrPatient.dateOfBirth) {
      const dicomDobNormalized = study.patientBirthDate.replace(/-/g, '');
      const ehrDobNormalized = ehrPatient.dateOfBirth.replace(/-/g, '');
      if (dicomDobNormalized !== ehrDobNormalized) {
        return {
          status: 'DEMOGRAPHIC_MISMATCH',
          ehrPatient,
          reason: `Demographic conflict: DICOM Date of Birth (${study.patientBirthDate}) does not match EHR record (${ehrPatient.dateOfBirth})`,
        };
      }
    }

    // Tertiary demographic cross-check: Sex
    if (study.patientSex && ehrPatient.sex) {
      if (study.patientSex.toUpperCase() !== ehrPatient.sex.toUpperCase()) {
        return {
          status: 'DEMOGRAPHIC_MISMATCH',
          ehrPatient,
          reason: `Demographic conflict: DICOM Sex (${study.patientSex}) does not match EHR record (${ehrPatient.sex})`,
        };
      }
    }

    return {
      status: 'VERIFIED',
      ehrPatient,
      reason: 'Identity verified against mapped EHR record and demographic cross-checks passed',
    };
  }

  // If no expected EHR patient specified, attempt reverse lookup by DICOM PatientID
  const reverseMapping = mappings.get(`dicom:${study.patientID}`);
  if (!reverseMapping) {
    return {
      status: 'UNMAPPED',
      reason: `No EHR patient mapped to incoming DICOM PatientID '${study.patientID}'`,
    };
  }

  const resolvedPatient = ehrPatients.get(reverseMapping.ehrPatientId);
  return {
    status: 'VERIFIED',
    ehrPatient: resolvedPatient,
    reason: `Matched verified mapping to ${resolvedPatient?.lastName || reverseMapping.patientName} (${reverseMapping.ehrPatientId})`,
  };
}

/**
 * Validate that a study belongs to the expected patient.
 */
export function validateStudyAccess(
  ehrPatientId: string,
  dicomPatientId: string
): { allowed: boolean; reason?: string } {
  const mapping = mappings.get(`ehr:${ehrPatientId}`);

  if (!mapping) {
    return {
      allowed: false,
      reason: `No DICOM mapping exists for EHR patient ${ehrPatientId}`,
    };
  }

  if (mapping.dicomPatientId !== dicomPatientId) {
    return {
      allowed: false,
      reason: `DICOM PatientID mismatch: expected ${mapping.dicomPatientId}, got ${dicomPatientId}`,
    };
  }

  return { allowed: true };
}
