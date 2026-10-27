// =============================================================================
// DocMed EHR — Canonical Ophthalmology Device Data Contract Service
// Adapts DICOM study metadata, series, and instances to the canonical schema in
// DocMed_Ophthalmology_Device_Data_Examples_Compatible.json
// =============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  CanonicalContractFile,
  CanonicalOphthalmologyDeviceRecord,
  CanonicalDeviceType,
  DicomInstanceReference,
  CanonicalSeries,
} from '../types/ophthalmology-device-contract.types.js';
import type { StudyMetadata, SeriesMetadata } from '../types/dicom.types.js';
import {
  getEhrPatient,
  getDicomIdForEhrPatient,
  reconcileStudy,
} from './patient-mapping.service.js';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Canonical JSON Contract Loader
// ---------------------------------------------------------------------------

let cachedContractFile: CanonicalContractFile | null = null;
let templateMap: Map<string, CanonicalOphthalmologyDeviceRecord> = new Map();

/**
 * Resolve the canonical JSON contract file path safely across working directories.
 */
function resolveContractPath(): string {
  const candidatePaths = [
    path.resolve(process.cwd(), 'DocMed_Ophthalmology_Device_Data_Examples_Compatible.json'),
    path.resolve(process.cwd(), '../DocMed_Ophthalmology_Device_Data_Examples_Compatible.json'),
    path.resolve(__dirname, '../../../DocMed_Ophthalmology_Device_Data_Examples_Compatible.json'),
    path.resolve(__dirname, '../../../../DocMed_Ophthalmology_Device_Data_Examples_Compatible.json'),
    'd:/dicom/DocMed_Ophthalmology_Device_Data_Examples_Compatible.json',
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'DocMed_Ophthalmology_Device_Data_Examples_Compatible.json not found in project workspace. Please ensure the file is present.'
  );
}

/**
 * Load and cache the canonical JSON file.
 */
export function getCanonicalFile(): CanonicalContractFile {
  if (cachedContractFile) {
    return cachedContractFile;
  }

  const filePath = resolveContractPath();
  const raw = fs.readFileSync(filePath, 'utf-8');
  cachedContractFile = JSON.parse(raw) as CanonicalContractFile;

  templateMap.clear();
  for (const device of cachedContractFile.devices) {
    templateMap.set(device.device_type, device);
  }

  return cachedContractFile;
}

/**
 * Deep clone utility that preserves valid zero values, false, and empty strings.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Return all 10 canonical device templates from the source JSON.
 */
export function getCanonicalTemplates(): CanonicalOphthalmologyDeviceRecord[] {
  const file = getCanonicalFile();
  return deepClone(file.devices);
}

/**
 * Return a specific category template.
 */
export function getCanonicalTemplateForCategory(
  category: string
): CanonicalOphthalmologyDeviceRecord {
  getCanonicalFile();
  const template = templateMap.get(category);
  if (!template) {
    // If not exact match, find partial or default to first (OCT)
    for (const [key, val] of templateMap.entries()) {
      if (key.toLowerCase().includes(category.toLowerCase())) {
        return deepClone(val);
      }
    }
    const defaultTemplate = templateMap.get('OCT / OCT Angiography');
    if (defaultTemplate) return deepClone(defaultTemplate);
    throw new Error(`Device category "${category}" not found in canonical contract.`);
  }
  return deepClone(template);
}

// ---------------------------------------------------------------------------
// Category Identification
// ---------------------------------------------------------------------------

/**
 * Confidently detect device category from DICOM metadata.
 */
export function detectDeviceCategory(study: Partial<StudyMetadata>): CanonicalDeviceType {
  const mod = (study.modality || '').toUpperCase();
  const sop = (study.sopClassUID || '').toLowerCase();
  const desc = (study.studyDescription || '').toLowerCase();
  const mfr = (study.manufacturer || '').toLowerCase();
  const model = (study.manufacturerModelName || '').toLowerCase();

  // 1. OCT / OCT Angiography
  if (
    mod === 'OPT' ||
    mod === 'OCT' ||
    sop === '1.2.840.10008.5.1.4.1.1.77.1.5.4' ||
    desc.includes('oct') ||
    desc.includes('tomography') ||
    desc.includes('macular cube') ||
    model.includes('cirrus') ||
    model.includes('spectralis')
  ) {
    return 'OCT / OCT Angiography';
  }

  // 2. Fundus Camera / Retinal Photography
  if (
    (mod === 'OP' && !desc.includes('visual field')) ||
    sop === '1.2.840.10008.5.1.4.1.1.77.1.5.1' ||
    sop === '1.2.840.10008.5.1.4.1.1.77.1.5.2' ||
    desc.includes('fundus') ||
    desc.includes('retina') ||
    desc.includes('photo') ||
    model.includes('clarus') ||
    model.includes('visucam') ||
    model.includes('trc') ||
    mfr.includes('optos')
  ) {
    return 'Fundus Camera / Retinal Photography';
  }

  // 4. Automated Visual Field Analyzer / Perimetry
  if (
    mod === 'OPV' ||
    sop === '1.2.840.10008.5.1.4.1.1.77.1.5.6' ||
    sop === '1.2.840.10008.5.1.4.1.1.66' ||
    desc.includes('visual field') ||
    desc.includes('perimetry') ||
    desc.includes('hfa') ||
    model.includes('humphrey') ||
    model.includes('hfa')
  ) {
    return 'Automated Visual Field Analyzer / Perimetry';
  }

  // 3. Autorefractor / Keratometer
  if (mod === 'OPR' || desc.includes('autorefractor') || desc.includes('keratometer')) {
    return 'Autorefractor / Keratometer';
  }

  // 5. Corneal Topographer / Tomographer
  if (
    desc.includes('topography') ||
    desc.includes('pentacam') ||
    desc.includes('corneal') ||
    desc.includes('tomographer')
  ) {
    return 'Corneal Topographer / Tomographer';
  }

  // 6. Optical Biometer
  if (
    desc.includes('biometer') ||
    desc.includes('iolmaster') ||
    desc.includes('lenstar') ||
    desc.includes('biometry')
  ) {
    return 'Optical Biometer';
  }

  // 7. Slit Lamp / Anterior Segment Imaging
  if (
    mod === 'XC' ||
    sop === '1.2.840.10008.5.1.4.1.1.77.1.4' ||
    desc.includes('slit lamp') ||
    desc.includes('anterior segment')
  ) {
    return 'Slit Lamp / Anterior Segment Imaging';
  }

  // 8. Lensometer / Lensmeter
  if (desc.includes('lensometer') || desc.includes('lensmeter')) {
    return 'Lensometer / Lensmeter';
  }

  // 9. Ophthalmic Ultrasound / A-Scan / B-Scan
  if (
    mod === 'US' ||
    sop === '1.2.840.10008.5.1.4.1.1.6.1' ||
    sop === '1.2.840.10008.5.1.4.1.1.3.1' ||
    desc.includes('b-scan') ||
    desc.includes('a-scan') ||
    desc.includes('ultrasound')
  ) {
    return 'Ophthalmic Ultrasound / A-Scan / B-Scan';
  }

  // 10. Contact Lens Fitting
  if (desc.includes('contact lens') || desc.includes('cl fitting')) {
    return 'Contact Lens Fitting (usually DocMed form/vendor integration)';
  }

  // Default fallback for unidentified ophthalmic/general studies
  return 'OCT / OCT Angiography';
}

// ---------------------------------------------------------------------------
// Helpers: Date & Time Formats
// ---------------------------------------------------------------------------

function formatDicomDate(raw?: string): string | null {
  if (!raw) return null;
  const clean = raw.replace(/[-/]/g, '').trim();
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  return raw;
}

function formatDicomTime(raw?: string): string | null {
  if (!raw) return null;
  const clean = raw.replace(/[:.]/g, '').trim();
  if (clean.length >= 6) {
    return `${clean.slice(0, 2)}:${clean.slice(2, 4)}:${clean.slice(4, 6)}`;
  }
  return raw;
}

function mapLateralityToOphthalmic(lat?: string): string | null {
  if (!lat) return null;
  const upper = lat.toUpperCase();
  if (upper === 'R' || upper === 'OD' || upper === 'RIGHT') return 'OD';
  if (upper === 'L' || upper === 'OS' || upper === 'LEFT') return 'OS';
  if (upper === 'B' || upper === 'OU' || upper === 'BILATERAL') return 'OU';
  return lat;
}

// ---------------------------------------------------------------------------
// Main Adapter Engine
// ---------------------------------------------------------------------------

export interface BuildCanonicalOptions {
  study: StudyMetadata;
  series?: SeriesMetadata[];
  instances?: DicomInstanceReference[];
  ehrPatientId?: string;
  overrideCategory?: CanonicalDeviceType | string;
  measurements?: Record<string, unknown>;
  findings?: Record<string, unknown>;
  scanParameters?: Record<string, unknown>;
}

/**
 * Builds a strictly conforming CanonicalOphthalmologyDeviceRecord from a DICOM study.
 * Preserves the exact structure of DocMed_Ophthalmology_Device_Data_Examples_Compatible.json.
 */
export function buildCanonicalDeviceRecord(
  options: BuildCanonicalOptions
): CanonicalOphthalmologyDeviceRecord {
  const { study, series = [], instances = [], ehrPatientId, overrideCategory } = options;

  // 1. Determine category
  const targetCategory = overrideCategory || detectDeviceCategory(study);

  // 2. Clone canonical template
  const record = getCanonicalTemplateForCategory(targetCategory);

  // 3. Populate integration ID
  const studySuffix = study.studyInstanceUID
    ? study.studyInstanceUID.replace(/[^0-9]/g, '').slice(-6)
    : '1001';
  record.integration_id = `DICOM-INT-${studySuffix}`;
  record.source_system = 'DocMed EHR';

  // 4. Server-Side Patient Identity Reconciliation
  let resolvedEhrPatient = ehrPatientId ? getEhrPatient(ehrPatientId) : null;
  let mapping = ehrPatientId ? getDicomIdForEhrPatient(ehrPatientId) : null;

  // Check if study matches any mapping if ehrPatientId wasn't passed directly
  if (!resolvedEhrPatient && study.patientID) {
    const reconciliation = reconcileStudy(study);
    if (reconciliation.ehrPatient) {
      resolvedEhrPatient = reconciliation.ehrPatient;
      mapping = getDicomIdForEhrPatient(resolvedEhrPatient.ehrPatientId);
    }
  }

  // Populate patient envelope
  record.patient.docmed_patient_id = resolvedEhrPatient?.ehrPatientId || null;
  record.patient.dicom_patient_id = study.patientID || null;
  record.patient.patient_id_mapping_id = mapping ? `MAP-${mapping.ehrPatientId}` : null;
  record.patient.patient_name = study.patientName || (resolvedEhrPatient ? `${resolvedEhrPatient.lastName}^${resolvedEhrPatient.firstName}` : null);
  record.patient.date_of_birth = formatDicomDate(study.patientBirthDate) || resolvedEhrPatient?.dateOfBirth || null;
  record.patient.sex = (study.patientSex || resolvedEhrPatient?.sex || null) as string | null;
  record.patient.issuer_of_patient_id = null;

  // 5. Populate encounter envelope
  const lateralityOphthalmic = mapLateralityToOphthalmic(study.laterality);
  record.encounter.encounter_id = `ENC-${studySuffix}`;
  record.encounter.appointment_id = null;
  record.encounter.exam_date = formatDicomDate(study.studyDate);
  record.encounter.exam_time = formatDicomTime(study.studyTime);
  record.encounter.timezone = 'UTC';
  record.encounter.department = 'Ophthalmology';
  record.encounter.laterality = lateralityOphthalmic;

  // 6. Populate device envelope
  record.device.manufacturer = study.manufacturer || null;
  record.device.model = study.manufacturerModelName || null;
  record.device.modality = study.modality || null;
  record.device.software_version = null;
  record.device.station_name = null;
  record.device.serial_number = null;
  record.device.dicom_conformance_statement_version = null;

  // 7. Populate study envelope
  record.study.study_instance_uid = study.studyInstanceUID || null;
  record.study.accession_number = study.accessionNumber || null;
  record.study.study_id = `STUDY-${studySuffix}`;
  record.study.study_date = formatDicomDate(study.studyDate);
  record.study.study_time = formatDicomTime(study.studyTime);
  record.study.study_description = study.studyDescription || null;
  record.study.requested_procedure_description = null;

  // Build canonical series array
  const canonicalSeries: CanonicalSeries[] = series.map((s) => {
    const seriesImages = instances.filter(
      (inst) => inst.series_instance_uid === s.seriesInstanceUID
    );
    return {
      series_instance_uid: s.seriesInstanceUID || null,
      series_number: s.seriesNumber !== undefined ? s.seriesNumber : null,
      series_description: s.seriesDescription || null,
      modality: s.modality || study.modality || null,
      laterality: mapLateralityToOphthalmic(s.laterality) || lateralityOphthalmic,
      number_of_instances: s.numberOfInstances !== undefined ? s.numberOfInstances : null,
      image_references: seriesImages,
    };
  });

  // If no series were explicitly passed but we have study info, synthesize series 1
  if (canonicalSeries.length === 0 && study.studyInstanceUID) {
    canonicalSeries.push({
      series_instance_uid: `${study.studyInstanceUID}.1`,
      series_number: 1,
      series_description: study.studyDescription || 'Ophthalmic Series',
      modality: study.modality || 'OPT',
      laterality: lateralityOphthalmic,
      number_of_instances: instances.length > 0 ? instances.length : null,
      image_references: instances,
    });
  }
  record.study.series = canonicalSeries;
  record.study.instances = instances;

  // DICOMweb URLs
  const baseDicomWeb = `${config.orthanc.baseUrl}${config.orthanc.dicomWebRoot}`;
  record.study.dicomweb = {
    qido_rs_url: study.studyInstanceUID ? `${baseDicomWeb}/studies?StudyInstanceUID=${study.studyInstanceUID}` : null,
    wado_rs_url: study.studyInstanceUID ? `${baseDicomWeb}/studies/${study.studyInstanceUID}` : null,
    stow_rs_url: `${baseDicomWeb}/studies`,
    orthanc_study_id: null,
  };

  // 8. Populate report envelope
  record.report.report_type = null;
  record.report.status = 'PRELIMINARY';
  record.report.report_text = null;
  record.report.impression = null;
  record.report.recommendations = [];
  record.report.interpreting_provider_id = null;
  record.report.signed_at = null;

  // 9. Device-Specific Clinical Data Population
  const clinical = record.clinical_data as Record<string, any>;
  let measurementsParsed = false;

  // Populate exam common block in clinical_data if present
  if (clinical.exam) {
    clinical.exam.laterality = lateralityOphthalmic;
    if (record.encounter.exam_date && record.encounter.exam_time) {
      clinical.exam.acquisition_datetime = `${record.encounter.exam_date}T${record.encounter.exam_time}`;
    }
  }

  // Route to device-specific adapter
  switch (record.device_type) {
    case 'OCT / OCT Angiography': {
      // Images distribution
      if (clinical.images) {
        clinical.images.b_scan_images = instances.map((inst) => inst.wado_rs_url).filter(Boolean);
      }
      // Populate measurements only if explicitly available
      if (options.measurements) {
        if (clinical.retinal_measurements) {
          Object.assign(clinical.retinal_measurements, options.measurements);
          measurementsParsed = true;
        }
      }
      if (options.scanParameters && clinical.scan_parameters) {
        Object.assign(clinical.scan_parameters, options.scanParameters);
      }
      if (options.findings && clinical.findings) {
        Object.assign(clinical.findings, options.findings);
      }
      break;
    }

    case 'Fundus Camera / Retinal Photography': {
      if (clinical.images) {
        clinical.images.color_fundus_images = instances.map((inst) => inst.wado_rs_url).filter(Boolean);
      }
      if (options.findings && clinical.findings) {
        Object.assign(clinical.findings, options.findings);
        measurementsParsed = true;
      }
      break;
    }

    case 'Autorefractor / Keratometer': {
      if (options.measurements) {
        if (clinical.refraction && options.measurements.refraction) {
          Object.assign(clinical.refraction, options.measurements.refraction);
          measurementsParsed = true;
        }
        if (clinical.keratometry && options.measurements.keratometry) {
          Object.assign(clinical.keratometry, options.measurements.keratometry);
          measurementsParsed = true;
        }
      }
      break;
    }

    case 'Automated Visual Field Analyzer / Perimetry': {
      if (clinical.reports_and_images) {
        const reportUrl = instances[0]?.wado_rs_url || null;
        if (reportUrl) {
          clinical.reports_and_images.printable_report = reportUrl;
        }
      }
      if (options.measurements) {
        if (clinical.global_indices && options.measurements.global_indices) {
          Object.assign(clinical.global_indices, options.measurements.global_indices);
          measurementsParsed = true;
        }
        if (clinical.reliability_indices && options.measurements.reliability_indices) {
          Object.assign(clinical.reliability_indices, options.measurements.reliability_indices);
          measurementsParsed = true;
        }
      }
      break;
    }

    case 'Corneal Topographer / Tomographer': {
      if (clinical.images_and_maps) {
        clinical.images_and_maps.color_maps = instances.map((inst) => inst.wado_rs_url).filter(Boolean);
      }
      if (options.measurements) {
        if (clinical.keratometry && options.measurements.keratometry) {
          Object.assign(clinical.keratometry, options.measurements.keratometry);
          measurementsParsed = true;
        }
        if (clinical.pachymetry && options.measurements.pachymetry) {
          Object.assign(clinical.pachymetry, options.measurements.pachymetry);
          measurementsParsed = true;
        }
      }
      break;
    }

    case 'Optical Biometer': {
      if (options.measurements) {
        if (clinical.ocular_biometry && options.measurements.ocular_biometry) {
          Object.assign(clinical.ocular_biometry, options.measurements.ocular_biometry);
          measurementsParsed = true;
        }
        if (clinical.iol_calculation && options.measurements.iol_calculation) {
          Object.assign(clinical.iol_calculation, options.measurements.iol_calculation);
          measurementsParsed = true;
        }
      }
      break;
    }

    case 'Slit Lamp / Anterior Segment Imaging': {
      if (clinical.images) {
        clinical.images.white_light_images = instances.map((inst) => inst.wado_rs_url).filter(Boolean);
      }
      if (options.findings && clinical.findings) {
        Object.assign(clinical.findings, options.findings);
        measurementsParsed = true;
      }
      break;
    }

    case 'Lensometer / Lensmeter': {
      if (options.measurements) {
        if (clinical.right_lens && options.measurements.right_lens) {
          Object.assign(clinical.right_lens, options.measurements.right_lens);
          measurementsParsed = true;
        }
        if (clinical.left_lens && options.measurements.left_lens) {
          Object.assign(clinical.left_lens, options.measurements.left_lens);
          measurementsParsed = true;
        }
      }
      break;
    }

    case 'Ophthalmic Ultrasound / A-Scan / B-Scan': {
      if (clinical.images) {
        clinical.images.b_scan_frames = instances.map((inst) => inst.wado_rs_url).filter(Boolean);
      }
      if (options.measurements) {
        if (clinical.a_scan_biometry && options.measurements.a_scan_biometry) {
          Object.assign(clinical.a_scan_biometry, options.measurements.a_scan_biometry);
          measurementsParsed = true;
        }
      }
      break;
    }

    case 'Contact Lens Fitting (usually DocMed form/vendor integration)': {
      if (options.measurements) {
        if (clinical.ocular_measurements && options.measurements.ocular_measurements) {
          Object.assign(clinical.ocular_measurements, options.measurements.ocular_measurements);
          measurementsParsed = true;
        }
        if (clinical.fit_assessment && options.measurements.fit_assessment) {
          Object.assign(clinical.fit_assessment, options.measurements.fit_assessment);
          measurementsParsed = true;
        }
      }
      break;
    }
  }

  // 10. Audit Missing & Unsupported Fields
  const missingFields: string[] = [];
  const unsupportedFields: string[] = [];
  const validationErrors: string[] = [];

  // Required envelope fields audit
  if (!record.patient.date_of_birth) missingFields.push('patient.date_of_birth');
  if (!record.patient.sex) missingFields.push('patient.sex');
  if (!record.device.model) missingFields.push('device.model');
  if (!record.device.software_version) missingFields.push('device.software_version');
  if (!record.encounter.laterality) missingFields.push('encounter.laterality');

  // Category specific unsupported checks
  if (record.device_type === 'OCT / OCT Angiography') {
    // If no angiography parameters are present, mark OCTA fields unsupported for this standard OCT run
    if (!options.measurements || !('superficial_capillary_plexus_density_percent' in (options.measurements as any))) {
      unsupportedFields.push('clinical_data.octa_measurements');
    }
  }

  // Reconcile Patient Match Status
  let matchStatus = 'PENDING_VERIFICATION';
  if (ehrPatientId) {
    const reconciliation = reconcileStudy(study, ehrPatientId);
    matchStatus = reconciliation.status;
    if (reconciliation.status === 'DEMOGRAPHIC_MISMATCH' || reconciliation.status === 'QUARANTINED') {
      validationErrors.push(`Patient identity conflict: ${reconciliation.reason}`);
    }
  } else if (resolvedEhrPatient) {
    matchStatus = 'VERIFIED';
  } else if (!study.patientID) {
    matchStatus = 'AMBIGUOUS';
    validationErrors.push('DICOM study lacks PatientID (0010,0020)');
  } else {
    matchStatus = 'UNMAPPED';
  }

  const metadataReceived = Boolean(study.studyInstanceUID);
  const imagesAvailable = instances.length > 0;
  const validationStatus = validationErrors.length > 0 ? 'WARNING' : 'VALID';

  record.integration_status = {
    metadata_received: metadataReceived,
    images_available: imagesAvailable,
    measurements_parsed: measurementsParsed,
    report_available: Boolean(record.report.report_text || record.study.instances.some((i) => i.sop_class_uid === '1.2.840.10008.5.1.4.1.1.104.1')),
    patient_match_status: matchStatus,
    validation_errors: validationErrors,
    missing_fields: missingFields,
    unsupported_fields: unsupportedFields,
    validation_status: validationStatus,
  };

  return record;
}

/**
 * Builds the complete Canonical Contract Document Envelope matching
 * DocMed_Ophthalmology_Device_Data_Examples_Compatible.json line-for-line.
 * Preserves the original 5 top-level keys:
 *  - document_metadata
 *  - dicom_instance_reference_schema
 *  - devices (all 10 categories intact)
 *  - implementation_rules
 *  - contract_rules
 * The study data is merged into the targeted device category in the devices array.
 */
export function buildCanonicalContractDocument(
  options: BuildCanonicalOptions
): CanonicalContractFile {
  const fullDoc = deepClone(getCanonicalFile());

  const targetCategory =
    options.overrideCategory || detectDeviceCategory(options.study);

  const activeRecord = buildCanonicalDeviceRecord(options);

  const targetIdx = fullDoc.devices.findIndex(
    (d) => d.device_type === targetCategory
  );

  if (targetIdx >= 0) {
    fullDoc.devices[targetIdx] = activeRecord;
  } else {
    fullDoc.devices[0] = activeRecord;
  }

  return fullDoc;
}
