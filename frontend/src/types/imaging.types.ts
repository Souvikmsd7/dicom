// =============================================================================
// DocMed DICOM POC — Frontend TypeScript Types
// Extended for Physical Ophthalmic Modalities & Clinical Identity Reconciliation
// =============================================================================

/** API response wrapper */
export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
  timestamp: string;
}

/** EHR Patient from the backend */
export interface EhrPatient {
  ehrPatientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'M' | 'F' | 'O';
  mrn: string;
}

/** Identity Reconciliation Status */
export type StudyReconciliationStatus =
  | 'VERIFIED'
  | 'UNMAPPED'
  | 'DEMOGRAPHIC_MISMATCH'
  | 'QUARANTINED';

/** Parsed DICOM study metadata */
export interface StudyMetadata {
  studyInstanceUID: string;
  studyDate: string;
  studyTime: string;
  studyDescription: string;
  accessionNumber: string;
  modality: string;
  modalitiesInStudy: string[];
  patientName: string;
  patientID: string;
  patientBirthDate: string;
  patientSex: string;
  numberOfSeries: number;
  numberOfInstances: number;
  referringPhysicianName: string;

  // Ophthalmic & Device Specific Fields
  sopClassUID?: string;
  laterality?: 'R' | 'L' | 'B' | string; // R = OD, L = OS, B = OU
  manufacturer?: string;
  manufacturerModelName?: string;

  // Clinical reconciliation status
  reconciliationStatus?: StudyReconciliationStatus;
  reconciliationReason?: string;
}

/** Series metadata */
export interface SeriesMetadata {
  seriesInstanceUID: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  numberOfInstances: number;
  bodyPartExamined: string;
  laterality?: 'R' | 'L' | 'B' | string;
}

/** Patient-DICOM mapping */
export interface PatientMapping {
  ehrPatientId: string;
  dicomPatientId: string;
  patientName: string;
  verified: boolean;
  createdAt: string;
}

/** Viewer launch info */
export interface ViewerLaunchInfo {
  viewerUrl: string;
  studyInstanceUID: string;
}

/** Orthanc health */
export interface OrthancHealth {
  ready: boolean;
  version?: string;
  dicomWebEnabled?: boolean;
}

/** Backend health response */
export interface HealthStatus {
  backend: boolean;
  orthanc: OrthancHealth;
  timestamp: string;
}

/** Candidate Device Modality Profile */
export interface CandidateModality {
  id: string;
  name: string;
  vendor: string;
  category: string;
  sopClasses: string[];
  roles: string[];
  licensingPrerequisite: string;
  middlewareWorkstation: string;
}

/** Device Configuration Response */
export interface DeviceConfiguration {
  receivingDestination: {
    aeTitle: string;
    host: string;
    dicomPort: number;
    dicomWebEndpoint: string;
    echoSupported: boolean;
    storeSupported: boolean;
  };
  candidateOphthalmicModalities: CandidateModality[];
}

/** Canonical Ophthalmology Device Data Record conforming to DocMed_Ophthalmology_Device_Data_Examples_Compatible.json */
export interface CanonicalDeviceRecord {
  integration_id: string;
  source_system: string;
  patient: {
    docmed_patient_id: string | null;
    dicom_patient_id: string | null;
    patient_id_mapping_id: string | null;
    patient_name: string | null;
    date_of_birth: string | null;
    sex: string | null;
    issuer_of_patient_id: string | null;
  };
  encounter: {
    encounter_id: string | null;
    appointment_id: string | null;
    exam_date: string | null;
    exam_time: string | null;
    timezone: string | null;
    ordering_provider_id: string | null;
    performing_provider_id: string | null;
    department: string | null;
    laterality: string | null;
  };
  device: {
    manufacturer: string | null;
    model: string | null;
    software_version: string | null;
    station_name: string | null;
    serial_number: string | null;
    modality: string | null;
    dicom_conformance_statement_version: string | null;
  };
  study: {
    study_instance_uid: string | null;
    accession_number: string | null;
    study_id: string | null;
    study_date: string | null;
    study_time: string | null;
    study_description: string | null;
    requested_procedure_description: string | null;
    series: Array<{
      series_instance_uid: string | null;
      series_number: number | null;
      series_description: string | null;
      modality: string | null;
      laterality: string | null;
      number_of_instances: number | null;
      image_references: any[];
    }>;
    instances: Array<{
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
    }>;
    dicomweb: {
      qido_rs_url: string | null;
      wado_rs_url: string | null;
      stow_rs_url: string | null;
      orthanc_study_id: string | null;
    };
  };
  report: {
    report_type: string | null;
    status: string | null;
    report_text: string | null;
    impression: string | null;
    recommendations: unknown[];
    interpreting_provider_id: string | null;
    signed_at: string | null;
  };
  integration_status: {
    metadata_received: boolean;
    images_available: boolean;
    measurements_parsed: boolean;
    report_available: boolean;
    patient_match_status: string;
    validation_errors: string[];
    missing_fields: string[];
    unsupported_fields: string[];
    validation_status: string;
  };
  device_type: string;
  clinical_data: Record<string, any>;
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

export interface CanonicalContractDocument {
  document_metadata: CanonicalDocumentMetadata;
  dicom_instance_reference_schema: Record<string, any>;
  devices: CanonicalDeviceRecord[];
  implementation_rules: string[];
  contract_rules: string[];
}

// ---------------------------------------------------------------------------
// Multi-Device Registry & Monitoring Types
// ---------------------------------------------------------------------------

export type DeviceConnectionType = 'DICOM' | 'DICOMweb' | 'FOLDER' | 'USB_VENDOR';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN' | 'DISABLED';
export type IngestionJobStatus = 'PENDING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface DeviceRecord {
  device_id: string;
  display_name: string;
  device_type: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  connection_type: DeviceConnectionType;
  ip_address: string | null;
  port: number | null;
  ae_title: string | null;
  integration_endpoint: string | null;
  status: DeviceStatus;
  last_seen_at: string | null;
  last_successful_connection_at: string | null;
  last_study_received_at: string | null;
  last_received_study_id?: string | null;
  last_received_study_status?: IngestionJobStatus | null;
  supported_capabilities: string[];
  configuration_verified: boolean;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  clinic_id?: string;
}

export interface ConnectionHistoryEntry {
  id: string;
  device_id: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  latency_ms: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface IngestionErrorJob {
  id: string;
  device_id?: string;
  timestamp: string;
  source: string;
  studyInstanceUID?: string;
  patientId?: string;
  status: IngestionJobStatus;
  error_code: string;
  error_message: string;
  retryable: boolean;
  retry_count: number;
  payload_summary?: string;
}

export interface DiscoveredCandidate {
  candidate_id: string;
  suggested_name: string;
  ip_address: string;
  port: number;
  ae_title?: string;
  connection_type: DeviceConnectionType;
  discovered_at: string;
  detected_category?: string;
  manufacturer_guess?: string;
  verification_status: 'UNVERIFIED_CANDIDATE';
}

export interface DeviceMonitoringSummary {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  disabled_devices: number;
  unknown_devices: number;
  total_studies_received: number;
  pending_candidates: number;
  recent_errors_count: number;
}

