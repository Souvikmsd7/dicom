// =============================================================================
// DocMed EHR — Canonical Ophthalmology Device Data JSON Contract Types
// Preserves the exact structure of DocMed_Ophthalmology_Device_Data_Examples_Compatible.json
// =============================================================================

export type CanonicalDeviceType =
  | 'OCT / OCT Angiography'
  | 'Fundus Camera / Retinal Photography'
  | 'Autorefractor / Keratometer'
  | 'Automated Visual Field Analyzer / Perimetry'
  | 'Corneal Topographer / Tomographer'
  | 'Optical Biometer'
  | 'Slit Lamp / Anterior Segment Imaging'
  | 'Lensometer / Lensmeter'
  | 'Ophthalmic Ultrasound / A-Scan / B-Scan'
  | 'Contact Lens Fitting (usually DocMed form/vendor integration)';

export const CANONICAL_DEVICE_TYPES: CanonicalDeviceType[] = [
  'OCT / OCT Angiography',
  'Fundus Camera / Retinal Photography',
  'Autorefractor / Keratometer',
  'Automated Visual Field Analyzer / Perimetry',
  'Corneal Topographer / Tomographer',
  'Optical Biometer',
  'Slit Lamp / Anterior Segment Imaging',
  'Lensometer / Lensmeter',
  'Ophthalmic Ultrasound / A-Scan / B-Scan',
  'Contact Lens Fitting (usually DocMed form/vendor integration)',
];

/** Canonical DICOM Instance Reference matching dicom_instance_reference_schema */
export interface DicomInstanceReference {
  sop_class_uid: string | null;
  sop_instance_uid: string | null;
  series_instance_uid: string | null;
  instance_number: number | null;
  modality: string | null;
  mime_type: string | null;
  transfer_syntax_uid: string | null;
  rows: number | null;
  columns: number | null;
  number_of_frames: number | null;
  photometric_interpretation: string | null;
  bits_allocated: number | null;
  laterality: string | null;
  content_datetime: string | null;
  orthanc_instance_id: string | null;
  wado_rs_url: string | null;
  thumbnail_url: string | null;
  is_original: boolean | null;
  is_derived: boolean | null;
}

export interface CanonicalPatient {
  docmed_patient_id: string | null;
  dicom_patient_id: string | null;
  patient_id_mapping_id: string | null;
  patient_name: string | null;
  date_of_birth: string | null;
  sex: string | null;
  issuer_of_patient_id: string | null;
}

export interface CanonicalEncounter {
  encounter_id: string | null;
  appointment_id: string | null;
  exam_date: string | null;
  exam_time: string | null;
  timezone: string | null;
  ordering_provider_id: string | null;
  performing_provider_id: string | null;
  department: string | null;
  laterality: string | null;
}

export interface CanonicalDevice {
  manufacturer: string | null;
  model: string | null;
  software_version: string | null;
  station_name: string | null;
  serial_number: string | null;
  modality: string | null;
  dicom_conformance_statement_version: string | null;
}

export interface CanonicalSeries {
  series_instance_uid: string | null;
  series_number: number | null;
  series_description: string | null;
  modality: string | null;
  laterality: string | null;
  number_of_instances: number | null;
  image_references: DicomInstanceReference[];
}

export interface CanonicalDicomweb {
  qido_rs_url: string | null;
  wado_rs_url: string | null;
  stow_rs_url: string | null;
  orthanc_study_id: string | null;
}

export interface CanonicalStudy {
  study_instance_uid: string | null;
  accession_number: string | null;
  study_id: string | null;
  study_date: string | null;
  study_time: string | null;
  study_description: string | null;
  requested_procedure_description: string | null;
  series: CanonicalSeries[];
  instances: DicomInstanceReference[];
  dicomweb: CanonicalDicomweb;
}

export interface CanonicalReport {
  report_type: string | null;
  status: string | null;
  report_text: string | null;
  impression: string | null;
  recommendations: unknown[];
  interpreting_provider_id: string | null;
  signed_at: string | null;
}

export interface CanonicalIntegrationStatus {
  metadata_received: boolean;
  images_available: boolean;
  measurements_parsed: boolean;
  report_available: boolean;
  patient_match_status: string;
  validation_errors: string[];
  missing_fields: string[];
  unsupported_fields: string[];
  validation_status: string;
}

/** Complete Canonical Device Record conforming to the JSON schema */
export interface CanonicalOphthalmologyDeviceRecord<TClinicalData = Record<string, unknown>> {
  integration_id: string;
  source_system: string;
  patient: CanonicalPatient;
  encounter: CanonicalEncounter;
  device: CanonicalDevice;
  study: CanonicalStudy;
  report: CanonicalReport;
  integration_status: CanonicalIntegrationStatus;
  device_type: CanonicalDeviceType | string;
  clinical_data: TClinicalData;
  schema_version: string;
}

export interface CanonicalDocumentMetadata {
  title: string;
  version: string;
  created_date: string;
  purpose: string;
  data_status: string;
  notes: string[];
}

export interface CanonicalContractFile {
  document_metadata: CanonicalDocumentMetadata;
  dicom_instance_reference_schema: DicomInstanceReference;
  devices: CanonicalOphthalmologyDeviceRecord[];
  implementation_rules: string[];
  contract_rules: string[];
}
