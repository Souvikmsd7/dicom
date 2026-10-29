// =============================================================================
// DocMed DICOM POC — Frontend Imaging Service
// =============================================================================
// All API calls to the backend. The frontend NEVER contacts Orthanc directly.
// =============================================================================
import type {
  ApiResponse,
  ApiErrorResponse,
  EhrPatient,
  StudyMetadata,
  SeriesMetadata,
  PatientMapping,
  ViewerLaunchInfo,
  HealthStatus,
  DeviceConfiguration,
} from '../types/imaging.types';

export const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3005';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class ImagingApiError extends Error {
  code: string;
  details?: string;

  constructor(code: string, message: string, details?: string) {
    super(message);
    this.name = 'ImagingApiError';
    this.code = code;
    this.details = details;
  }
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (err) {
    throw new ImagingApiError(
      'NETWORK_ERROR',
      'Unable to connect to the backend server. Is it running?',
      String(err)
    );
  }

  if (!response.ok) {
    let errorBody: ApiErrorResponse | undefined;
    try {
      errorBody = await response.json();
    } catch {
      // Response body wasn't JSON
    }

    if (errorBody && !errorBody.success) {
      throw new ImagingApiError(
        errorBody.error.code,
        errorBody.error.message,
        errorBody.error.details
      );
    }

    throw new ImagingApiError(
      'HTTP_ERROR',
      `Request failed with status ${response.status}`,
      `${response.statusText}: ${url}`
    );
  }

  const json = (await response.json()) as ApiResponse<T>;
  return json.data;
}

// ---------------------------------------------------------------------------
// Patient API
// ---------------------------------------------------------------------------

export async function getPatients(): Promise<EhrPatient[]> {
  return apiFetch<EhrPatient[]>('/api/patients');
}

export async function searchPatients(query: string): Promise<EhrPatient[]> {
  return apiFetch<EhrPatient[]>(`/api/patients/search?q=${encodeURIComponent(query)}`);
}

export async function getPatient(ehrPatientId: string): Promise<EhrPatient> {
  return apiFetch<EhrPatient>(`/api/patients/${encodeURIComponent(ehrPatientId)}`);
}

// ---------------------------------------------------------------------------
// Mapping API
// ---------------------------------------------------------------------------

export async function getMappings(): Promise<PatientMapping[]> {
  return apiFetch<PatientMapping[]>('/api/mappings');
}

export async function createMapping(
  ehrPatientId: string,
  dicomPatientId: string,
  patientName: string
): Promise<PatientMapping> {
  return apiFetch<PatientMapping>('/api/mappings', {
    method: 'POST',
    body: JSON.stringify({ ehrPatientId, dicomPatientId, patientName }),
  });
}

// ---------------------------------------------------------------------------
// Studies API
// ---------------------------------------------------------------------------

export async function getStudies(params?: {
  patientId?: string;
  patientName?: string;
  modality?: string;
}): Promise<StudyMetadata[]> {
  const searchParams = new URLSearchParams();
  if (params?.patientId) searchParams.set('patientId', params.patientId);
  if (params?.patientName) searchParams.set('patientName', params.patientName);
  if (params?.modality) searchParams.set('modality', params.modality);

  const qs = searchParams.toString();
  return apiFetch<StudyMetadata[]>(`/api/studies${qs ? `?${qs}` : ''}`);
}

export async function getPatientStudies(
  ehrPatientId: string
): Promise<StudyMetadata[]> {
  return apiFetch<StudyMetadata[]>(
    `/api/studies/patient/${encodeURIComponent(ehrPatientId)}`
  );
}

export async function getStudySeries(
  studyInstanceUID: string,
  ehrPatientId?: string
): Promise<SeriesMetadata[]> {
  const qs = ehrPatientId
    ? `?ehrPatientId=${encodeURIComponent(ehrPatientId)}`
    : '';
  return apiFetch<SeriesMetadata[]>(
    `/api/studies/${encodeURIComponent(studyInstanceUID)}/series${qs}`
  );
}

// ---------------------------------------------------------------------------
// Viewer API
// ---------------------------------------------------------------------------

export async function launchViewer(
  ehrPatientId: string,
  studyInstanceUID: string
): Promise<ViewerLaunchInfo> {
  return apiFetch<ViewerLaunchInfo>('/api/viewer/launch', {
    method: 'POST',
    body: JSON.stringify({ ehrPatientId, studyInstanceUID }),
  });
}

// ---------------------------------------------------------------------------
// Import API
// ---------------------------------------------------------------------------

export async function importDicomFile(file: File): Promise<{
  orthancId: string;
  status: string;
}> {
  const buffer = await file.arrayBuffer();

  const response = await fetch(`${API_BASE}/api/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/dicom' },
    body: buffer,
  });

  if (!response.ok) {
    let errorBody: ApiErrorResponse | undefined;
    try {
      errorBody = await response.json();
    } catch {
      // pass
    }
    throw new ImagingApiError(
      errorBody?.error?.code || 'IMPORT_ERROR',
      errorBody?.error?.message || `Import failed: ${response.status}`,
    );
  }

  const json = (await response.json()) as ApiResponse<{
    orthancId: string;
    status: string;
  }>;
  return json.data;
}

// ---------------------------------------------------------------------------
// Health API
// ---------------------------------------------------------------------------

export async function checkHealth(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>('/api/health');
}

// ---------------------------------------------------------------------------
// Physical Device Integration API
// ---------------------------------------------------------------------------

export async function getDeviceModalities(): Promise<DeviceConfiguration> {
  return apiFetch<DeviceConfiguration>('/api/devices/modalities');
}

// ---------------------------------------------------------------------------
// Canonical Device Data Contract API
// ---------------------------------------------------------------------------

export async function getStudyDeviceData(
  studyInstanceUID: string,
  ehrPatientId?: string
): Promise<import('../types/imaging.types').CanonicalContractDocument> {
  const qs = ehrPatientId
    ? `?ehrPatientId=${encodeURIComponent(ehrPatientId)}`
    : '';
  return apiFetch<import('../types/imaging.types').CanonicalContractDocument>(
    `/api/devices/study/${encodeURIComponent(studyInstanceUID)}${qs}`
  );
}

export async function getStudyDeviceRecord(
  studyInstanceUID: string,
  ehrPatientId?: string
): Promise<import('../types/imaging.types').CanonicalDeviceRecord> {
  const qs = ehrPatientId
    ? `?ehrPatientId=${encodeURIComponent(ehrPatientId)}&view=record`
    : '?view=record';
  return apiFetch<import('../types/imaging.types').CanonicalDeviceRecord>(
    `/api/devices/study/${encodeURIComponent(studyInstanceUID)}${qs}`
  );
}

export async function getCanonicalDocument(): Promise<
  import('../types/imaging.types').CanonicalContractDocument
> {
  return apiFetch<import('../types/imaging.types').CanonicalContractDocument>(
    '/api/devices/contract/document'
  );
}

export async function getCanonicalContractTemplates(): Promise<
  import('../types/imaging.types').CanonicalDeviceRecord[]
> {
  return apiFetch<import('../types/imaging.types').CanonicalDeviceRecord[]>(
    '/api/devices/contract/templates'
  );
}

// ---------------------------------------------------------------------------
// Multi-Device Registry & Monitoring API
// ---------------------------------------------------------------------------

export async function getDevices(params?: {
  status?: string;
  device_type?: string;
  connection_type?: string;
  query?: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: import('../types/imaging.types').DeviceRecord[];
  total: number;
  page: number;
  limit: number;
}> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.device_type) query.set('device_type', params.device_type);
  if (params?.connection_type) query.set('connection_type', params.connection_type);
  if (params?.query) query.set('q', params.query);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  return apiFetch<{
    items: import('../types/imaging.types').DeviceRecord[];
    total: number;
    page: number;
    limit: number;
  }>(`/api/devices${qs ? `?${qs}` : ''}`);
}

export async function getDevice(deviceId: string): Promise<import('../types/imaging.types').DeviceRecord> {
  return apiFetch<import('../types/imaging.types').DeviceRecord>(`/api/devices/${encodeURIComponent(deviceId)}`);
}

export async function registerDevice(
  data: Partial<import('../types/imaging.types').DeviceRecord>
): Promise<import('../types/imaging.types').DeviceRecord> {
  return apiFetch<import('../types/imaging.types').DeviceRecord>('/api/devices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDevice(
  deviceId: string,
  data: Partial<import('../types/imaging.types').DeviceRecord>
): Promise<import('../types/imaging.types').DeviceRecord> {
  return apiFetch<import('../types/imaging.types').DeviceRecord>(`/api/devices/${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDevice(deviceId: string): Promise<{ device_id: string; deleted: boolean }> {
  return apiFetch<{ device_id: string; deleted: boolean }>(`/api/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
  });
}

export async function toggleDevice(
  deviceId: string,
  isEnabled: boolean
): Promise<import('../types/imaging.types').DeviceRecord> {
  return apiFetch<import('../types/imaging.types').DeviceRecord>(`/api/devices/${encodeURIComponent(deviceId)}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ is_enabled: isEnabled }),
  });
}

export async function testDeviceConnection(deviceId: string): Promise<{
  device: import('../types/imaging.types').DeviceRecord;
  result: import('../types/imaging.types').ConnectionHistoryEntry;
}> {
  return apiFetch<{
    device: import('../types/imaging.types').DeviceRecord;
    result: import('../types/imaging.types').ConnectionHistoryEntry;
  }>(`/api/devices/${encodeURIComponent(deviceId)}/test-connection`, {
    method: 'POST',
  });
}

export async function getDeviceHistory(
  deviceId: string
): Promise<import('../types/imaging.types').ConnectionHistoryEntry[]> {
  return apiFetch<import('../types/imaging.types').ConnectionHistoryEntry[]>(
    `/api/devices/${encodeURIComponent(deviceId)}/history`
  );
}

export async function getMonitoringSummary(): Promise<import('../types/imaging.types').DeviceMonitoringSummary> {
  return apiFetch<import('../types/imaging.types').DeviceMonitoringSummary>('/api/devices/monitoring/summary');
}

export async function getDiscoveredCandidates(): Promise<import('../types/imaging.types').DiscoveredCandidate[]> {
  return apiFetch<import('../types/imaging.types').DiscoveredCandidate[]>('/api/devices/discovery/candidates');
}

export async function approveDiscoveredCandidate(
  candidateId: string,
  displayName?: string,
  clinicId?: string
): Promise<import('../types/imaging.types').DeviceRecord> {
  return apiFetch<import('../types/imaging.types').DeviceRecord>('/api/devices/discovery/approve', {
    method: 'POST',
    body: JSON.stringify({ candidate_id: candidateId, display_name: displayName, clinic_id: clinicId }),
  });
}

export async function dismissDiscoveredCandidate(
  candidateId: string
): Promise<{ candidate_id: string; dismissed: boolean }> {
  return apiFetch<{ candidate_id: string; dismissed: boolean }>(
    `/api/devices/discovery/${encodeURIComponent(candidateId)}`,
    { method: 'DELETE' }
  );
}

export async function triggerDiscoveryScan(subnet = '127.0.0.1'): Promise<{
  scanned_range: string;
  found_count: number;
  candidates: import('../types/imaging.types').DiscoveredCandidate[];
}> {
  return apiFetch<{
    scanned_range: string;
    found_count: number;
    candidates: import('../types/imaging.types').DiscoveredCandidate[];
  }>('/api/devices/discovery/scan', {
    method: 'POST',
    body: JSON.stringify({ subnet }),
  });
}

export async function getIngestionErrors(): Promise<import('../types/imaging.types').IngestionErrorJob[]> {
  return apiFetch<import('../types/imaging.types').IngestionErrorJob[]>('/api/devices/jobs/errors');
}

export async function retryIngestionJob(
  jobId: string
): Promise<import('../types/imaging.types').IngestionErrorJob> {
  return apiFetch<import('../types/imaging.types').IngestionErrorJob>(
    `/api/devices/jobs/${encodeURIComponent(jobId)}/retry`,
    { method: 'POST' }
  );
}

