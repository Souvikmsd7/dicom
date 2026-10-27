// =============================================================================
// DocMed EHR — Multi-Device Integration & Registry Types
// Conforms to DocMed Multi-Device Architecture & JSON Contract
// =============================================================================

export type DeviceConnectionType = 'DICOM' | 'DICOMweb' | 'FOLDER' | 'USB_VENDOR';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN' | 'DISABLED';
export type IngestionJobStatus = 'PENDING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface DeviceRecord {
  device_id: string;
  display_name: string;
  device_type: string; // Canonical category e.g. "OCT / OCT Angiography"
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
  
  // Audit & tenant fields
  created_at: string;
  updated_at: string;
  created_by?: string;
  clinic_id?: string;

  // Sensitive credentials stored safely on backend, stripped before API responses
  secrets?: Record<string, string>;
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
