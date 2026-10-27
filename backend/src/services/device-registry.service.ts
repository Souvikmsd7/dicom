// =============================================================================
// DocMed EHR — Persistent Multi-Device Registry Service
// Manages device lifecycle, persistent storage, connection history, and error jobs
// =============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  DeviceRecord,
  DeviceConnectionType,
  DeviceStatus,
  ConnectionHistoryEntry,
  IngestionErrorJob,
  DeviceMonitoringSummary,
} from '../types/device-registry.types.js';
import { testDeviceConnectivity } from './device-adapters/adapter-factory.js';
import { validateAeTitle } from './device-adapters/dicom.adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data file path for persistent device storage
const DATA_DIR = path.resolve(__dirname, '../../data');
const REGISTRY_FILE = path.join(DATA_DIR, 'devices-registry.json');
const HISTORY_FILE = path.join(DATA_DIR, 'connection-history.json');
const JOBS_FILE = path.join(DATA_DIR, 'ingestion-jobs.json');

// In-memory runtime caches
const devices = new Map<string, DeviceRecord>();
const connectionHistory: ConnectionHistoryEntry[] = [];
const ingestionJobs: IngestionErrorJob[] = [];

// ---------------------------------------------------------------------------
// Pre-seeded Initial Devices
// ---------------------------------------------------------------------------

const SEED_DEVICES: DeviceRecord[] = [
  {
    device_id: 'OCT-001',
    display_name: 'Clinic OCT — ZEISS CIRRUS 5000',
    device_type: 'OCT / OCT Angiography',
    manufacturer: 'Carl Zeiss Meditec',
    model: 'CIRRUS HD-OCT 5000',
    serial_number: 'CZ-5000-8472',
    connection_type: 'DICOM',
    ip_address: '127.0.0.1',
    port: 4242,
    ae_title: 'CIRRUS_OCT',
    integration_endpoint: 'http://127.0.0.1:8042/dicom-web',
    status: 'ONLINE',
    last_seen_at: new Date(Date.now() - 300000).toISOString(),
    last_successful_connection_at: new Date(Date.now() - 300000).toISOString(),
    last_study_received_at: new Date(Date.now() - 1800000).toISOString(),
    last_received_study_id: '1.2.826.0.1.3680043.8.498.1001',
    last_received_study_status: 'SUCCESS',
    supported_capabilities: ['C-STORE', 'C-ECHO', 'QIDO-RS', 'WADO-RS'],
    configuration_verified: true,
    is_enabled: true,
    created_at: '2026-10-20T08:00:00Z',
    updated_at: '2026-10-27T10:00:00Z',
    clinic_id: 'CLINIC-MAIN',
  },
  {
    device_id: 'FUNDUS-001',
    display_name: 'Retinal Camera — Topcon TRC-NW400',
    device_type: 'Fundus Camera / Retinal Photography',
    manufacturer: 'Topcon',
    model: 'TRC-NW400',
    serial_number: 'TP-NW400-3109',
    connection_type: 'DICOM',
    ip_address: '192.168.1.135',
    port: 4242,
    ae_title: 'TOPCON_TRC',
    integration_endpoint: null,
    status: 'ONLINE',
    last_seen_at: new Date(Date.now() - 900000).toISOString(),
    last_successful_connection_at: new Date(Date.now() - 900000).toISOString(),
    last_study_received_at: new Date(Date.now() - 86400000).toISOString(),
    last_received_study_id: '1.2.826.0.1.3680043.8.498.1002',
    last_received_study_status: 'SUCCESS',
    supported_capabilities: ['C-STORE', 'C-ECHO'],
    configuration_verified: true,
    is_enabled: true,
    created_at: '2026-10-21T09:30:00Z',
    updated_at: '2026-10-27T11:00:00Z',
    clinic_id: 'CLINIC-MAIN',
  },
  {
    device_id: 'SPECTRALIS-001',
    display_name: 'Multimodal OCT — Heidelberg SPECTRALIS',
    device_type: 'OCT / OCT Angiography',
    manufacturer: 'Heidelberg Engineering',
    model: 'SPECTRALIS HRA+OCT',
    serial_number: 'HE-SPEC-1102',
    connection_type: 'DICOMweb',
    ip_address: '127.0.0.1',
    port: 8042,
    ae_title: null,
    integration_endpoint: 'http://127.0.0.1:8042/dicom-web/studies',
    status: 'ONLINE',
    last_seen_at: new Date(Date.now() - 600000).toISOString(),
    last_successful_connection_at: new Date(Date.now() - 600000).toISOString(),
    last_study_received_at: null,
    last_received_study_id: null,
    last_received_study_status: null,
    supported_capabilities: ['QIDO-RS', 'WADO-RS', 'STOW-RS'],
    configuration_verified: true,
    is_enabled: true,
    created_at: '2026-10-22T14:15:00Z',
    updated_at: '2026-10-27T09:45:00Z',
    clinic_id: 'CLINIC-MAIN',
  },
  {
    device_id: 'VF-001',
    display_name: 'Visual Field — Humphrey Field Analyzer 3',
    device_type: 'Automated Visual Field Analyzer / Perimetry',
    manufacturer: 'Carl Zeiss Meditec',
    model: 'HFA 3',
    serial_number: 'CZ-HFA3-4411',
    connection_type: 'DICOM',
    ip_address: '192.168.1.150',
    port: 4242,
    ae_title: 'HFA3_EXAM',
    integration_endpoint: null,
    status: 'OFFLINE',
    last_seen_at: new Date(Date.now() - 172800000).toISOString(),
    last_successful_connection_at: new Date(Date.now() - 172800000).toISOString(),
    last_study_received_at: new Date(Date.now() - 172800000).toISOString(),
    last_received_study_id: '1.2.826.0.1.3680043.8.498.1003',
    last_received_study_status: 'SUCCESS',
    supported_capabilities: ['C-STORE', 'Encapsulated PDF'],
    configuration_verified: true,
    is_enabled: true,
    created_at: '2026-10-15T11:00:00Z',
    updated_at: '2026-10-25T16:30:00Z',
    clinic_id: 'CLINIC-MAIN',
  },
  {
    device_id: 'SLIT-001',
    display_name: 'Digital Slit Lamp — Haag-Streit BX 900',
    device_type: 'Slit Lamp / Anterior Segment Imaging',
    manufacturer: 'Haag-Streit',
    model: 'BX 900',
    serial_number: 'HS-BX900-098',
    connection_type: 'FOLDER',
    ip_address: null,
    port: null,
    ae_title: null,
    integration_endpoint: 'd:/dicom/sample-data',
    status: 'ONLINE',
    last_seen_at: new Date().toISOString(),
    last_successful_connection_at: new Date().toISOString(),
    last_study_received_at: new Date(Date.now() - 3600000).toISOString(),
    last_received_study_id: '1.2.826.0.1.3680043.8.498.1001',
    last_received_study_status: 'SUCCESS',
    supported_capabilities: ['File Polling', 'Vendor Companion Export'],
    configuration_verified: true,
    is_enabled: true,
    created_at: '2026-10-24T10:00:00Z',
    updated_at: '2026-10-27T12:00:00Z',
    clinic_id: 'CLINIC-MAIN',
  },
];

// ---------------------------------------------------------------------------
// Disk Persistence Helpers
// ---------------------------------------------------------------------------

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function persistDevices(): void {
  try {
    ensureDataDir();
    const data = Array.from(devices.values());
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DeviceRegistry] Failed to write registry to disk:', err);
  }
}

function persistHistory(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(connectionHistory.slice(-200), null, 2), 'utf-8');
  } catch (err) {
    console.error('[DeviceRegistry] Failed to write history to disk:', err);
  }
}

function persistJobs(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(JOBS_FILE, JSON.stringify(ingestionJobs.slice(-100), null, 2), 'utf-8');
  } catch (err) {
    console.error('[DeviceRegistry] Failed to write jobs to disk:', err);
  }
}

/**
 * Initialize registry from disk or seed data.
 * @param forceReset When true, discards runtime data and restores factory seed records
 */
export function initializeDeviceRegistry(forceReset = false): void {
  devices.clear();
  connectionHistory.length = 0;
  ingestionJobs.length = 0;

  ensureDataDir();

  if (!forceReset && fs.existsSync(REGISTRY_FILE)) {
    try {
      const raw = fs.readFileSync(REGISTRY_FILE, 'utf-8');
      const loaded: DeviceRecord[] = JSON.parse(raw);
      for (const d of loaded) {
        devices.set(d.device_id, d);
      }
      console.log(`[DeviceRegistry] Loaded ${devices.size} devices from disk (${REGISTRY_FILE})`);
    } catch (err) {
      console.error('[DeviceRegistry] Error reading registry file, using defaults:', err);
    }
  }

  // If still empty or forceReset requested, seed defaults
  if (devices.size === 0 || forceReset) {
    devices.clear();
    for (const d of SEED_DEVICES) {
      devices.set(d.device_id, { ...d });
    }
    persistDevices();
    console.log(`[DeviceRegistry] Initialized and seeded ${devices.size} devices`);
  }

  // Load history if present
  if (!forceReset && fs.existsSync(HISTORY_FILE)) {
    try {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
      const loaded: ConnectionHistoryEntry[] = JSON.parse(raw);
      connectionHistory.push(...loaded);
    } catch {
      // pass
    }
  }

  // Load jobs if present
  if (!forceReset && fs.existsSync(JOBS_FILE)) {
    try {
      const raw = fs.readFileSync(JOBS_FILE, 'utf-8');
      const loaded: IngestionErrorJob[] = JSON.parse(raw);
      ingestionJobs.push(...loaded);
    } catch {
      // pass
    }
  } else {
    // Seed initial demo ingestion error job for demonstration
    ingestionJobs.push({
      id: 'JOB-ERR-1001',
      device_id: 'OCT-001',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      source: 'CIRRUS_OCT',
      studyInstanceUID: '1.2.826.0.1.3680043.8.498.9999',
      patientId: 'UNKNOWN_99',
      status: 'FAILED',
      error_code: 'UNMAPPED_PATIENT_IDENTITY',
      error_message: 'Incoming DICOM PatientID "UNKNOWN_99" has no mapped EHR patient. Awaiting admin review.',
      retryable: true,
      retry_count: 0,
      payload_summary: 'Macular Cube OD (128 instances)',
    });
    persistJobs();
  }
}

// Auto-initialize on module load
initializeDeviceRegistry();

// ---------------------------------------------------------------------------
// Security: Sanitization
// ---------------------------------------------------------------------------

/**
 * Strips secrets/credentials before returning device records to callers or API.
 */
export function sanitizeDeviceRecord(device: DeviceRecord): Omit<DeviceRecord, 'secrets'> {
  const { secrets, ...sanitized } = device;
  return sanitized;
}

// ---------------------------------------------------------------------------
// Device Queries & CRUD
// ---------------------------------------------------------------------------

export interface ListDevicesOptions {
  status?: string;
  device_type?: string;
  connection_type?: string;
  query?: string;
  page?: number;
  limit?: number;
}

export function listDevices(options: ListDevicesOptions = {}): {
  items: Omit<DeviceRecord, 'secrets'>[];
  total: number;
  page: number;
  limit: number;
} {
  let list = Array.from(devices.values());

  if (options.status) {
    list = list.filter((d) => d.status.toLowerCase() === options.status?.toLowerCase());
  }

  if (options.device_type) {
    list = list.filter((d) => d.device_type.toLowerCase() === options.device_type?.toLowerCase());
  }

  if (options.connection_type) {
    list = list.filter((d) => d.connection_type.toLowerCase() === options.connection_type?.toLowerCase());
  }

  if (options.query) {
    const q = options.query.toLowerCase().trim();
    list = list.filter(
      (d) =>
        d.display_name.toLowerCase().includes(q) ||
        d.device_id.toLowerCase().includes(q) ||
        (d.manufacturer && d.manufacturer.toLowerCase().includes(q)) ||
        (d.model && d.model.toLowerCase().includes(q)) ||
        (d.ae_title && d.ae_title.toLowerCase().includes(q))
    );
  }

  const total = list.length;
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 50));
  const start = (page - 1) * limit;
  const paged = list.slice(start, start + limit).map(sanitizeDeviceRecord);

  return { items: paged, total, page, limit };
}

export function getDevice(deviceId: string): Omit<DeviceRecord, 'secrets'> | undefined {
  const dev = devices.get(deviceId);
  return dev ? sanitizeDeviceRecord(dev) : undefined;
}

export function getRawDevice(deviceId: string): DeviceRecord | undefined {
  return devices.get(deviceId);
}

/**
 * Validate configuration payload before registration or update.
 */
export function validateDeviceConfig(data: Partial<DeviceRecord>, isCreate = false): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (isCreate) {
    if (!data.device_id || data.device_id.trim().length === 0) {
      errors.push('Device ID is required');
    } else if (devices.has(data.device_id.trim())) {
      errors.push(`Device ID "${data.device_id.trim()}" already exists. Device IDs must be unique.`);
    }

    if (!data.display_name || data.display_name.trim().length === 0) {
      errors.push('Display name is required');
    }

    if (!data.device_type || data.device_type.trim().length === 0) {
      errors.push('Device category is required');
    }

    if (!data.connection_type) {
      errors.push('Connection type (DICOM, DICOMweb, FOLDER, USB_VENDOR) is required');
    }
  } else {
    if (data.display_name !== undefined && data.display_name.trim().length === 0) {
      errors.push('Display name cannot be empty');
    }
    if (data.device_type !== undefined && data.device_type.trim().length === 0) {
      errors.push('Device category cannot be empty');
    }
  }

  const connType = data.connection_type;
  if (connType === 'DICOM') {
    if (data.ae_title !== undefined) {
      const aeCheck = validateAeTitle(data.ae_title || null);
      if (!aeCheck.valid && aeCheck.error) {
        errors.push(aeCheck.error);
      }
    }
  } else if (connType === 'DICOMweb') {
    if (isCreate && !data.integration_endpoint && !data.ip_address) {
      errors.push('Integration endpoint or IP address is required for DICOMweb integration');
    }
  } else if (connType === 'FOLDER' || connType === 'USB_VENDOR') {
    if (isCreate && !data.integration_endpoint) {
      errors.push('Folder path is required for folder/USB dropzone integration');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Register a new medical device.
 */
export function createDevice(data: Partial<DeviceRecord>, creator = 'admin'): Omit<DeviceRecord, 'secrets'> {
  const validation = validateDeviceConfig(data, true);
  if (!validation.valid) {
    throw new Error(`Device validation failed: ${validation.errors.join('; ')}`);
  }

  const now = new Date().toISOString();
  const device: DeviceRecord = {
    device_id: (data.device_id || '').trim(),
    display_name: (data.display_name || '').trim(),
    device_type: (data.device_type || '').trim(),
    manufacturer: data.manufacturer || null,
    model: data.model || null,
    serial_number: data.serial_number || null,
    connection_type: data.connection_type || 'DICOM',
    ip_address: data.ip_address || null,
    port: data.port !== undefined && data.port !== null ? Number(data.port) : null,
    ae_title: data.ae_title || null,
    integration_endpoint: data.integration_endpoint || null,
    status: 'UNKNOWN',
    last_seen_at: null,
    last_successful_connection_at: null,
    last_study_received_at: null,
    last_received_study_id: null,
    last_received_study_status: null,
    supported_capabilities: data.supported_capabilities || [],
    configuration_verified: false,
    is_enabled: data.is_enabled !== undefined ? Boolean(data.is_enabled) : true,
    created_at: now,
    updated_at: now,
    created_by: creator,
    clinic_id: data.clinic_id || 'CLINIC-MAIN',
    secrets: data.secrets || {},
  };

  devices.set(device.device_id, device);
  persistDevices();
  console.log(`[DeviceRegistry] Registered device: ${device.device_id} (${device.display_name})`);

  return sanitizeDeviceRecord(device);
}

/**
 * Update existing device configuration.
 */
export function updateDevice(
  deviceId: string,
  updates: Partial<DeviceRecord>
): Omit<DeviceRecord, 'secrets'> {
  const existing = devices.get(deviceId);
  if (!existing) {
    throw new Error(`Device not found: ${deviceId}`);
  }

  const validation = validateDeviceConfig(updates, false);
  if (!validation.valid) {
    throw new Error(`Device update validation failed: ${validation.errors.join('; ')}`);
  }

  // If connection parameters changed, reset configuration_verified
  const connectionParamsChanged =
    (updates.connection_type && updates.connection_type !== existing.connection_type) ||
    (updates.ip_address && updates.ip_address !== existing.ip_address) ||
    (updates.port && updates.port !== existing.port) ||
    (updates.ae_title && updates.ae_title !== existing.ae_title) ||
    (updates.integration_endpoint && updates.integration_endpoint !== existing.integration_endpoint);

  const updated: DeviceRecord = {
    ...existing,
    ...updates,
    device_id: existing.device_id, // Prevent device_id mutation
    configuration_verified: connectionParamsChanged ? false : (updates.configuration_verified ?? existing.configuration_verified),
    updated_at: new Date().toISOString(),
  };

  if (updates.secrets) {
    updated.secrets = { ...(existing.secrets || {}), ...updates.secrets };
  }

  devices.set(deviceId, updated);
  persistDevices();
  return sanitizeDeviceRecord(updated);
}

/**
 * Toggle device active/inactive status.
 */
export function toggleDevice(deviceId: string, is_enabled: boolean): Omit<DeviceRecord, 'secrets'> {
  const existing = devices.get(deviceId);
  if (!existing) {
    throw new Error(`Device not found: ${deviceId}`);
  }

  existing.is_enabled = is_enabled;
  existing.status = is_enabled ? (existing.last_successful_connection_at ? 'ONLINE' : 'UNKNOWN') : 'DISABLED';
  existing.updated_at = new Date().toISOString();

  persistDevices();
  return sanitizeDeviceRecord(existing);
}

/**
 * Delete / unregister a device.
 */
export function deleteDevice(deviceId: string): boolean {
  const existed = devices.delete(deviceId);
  if (existed) {
    persistDevices();
  }
  return existed;
}

// ---------------------------------------------------------------------------
// Live Connectivity Checks & History
// ---------------------------------------------------------------------------

export async function testConnectionForDevice(deviceId: string): Promise<{
  device: Omit<DeviceRecord, 'secrets'>;
  result: ConnectionHistoryEntry;
}> {
  const dev = devices.get(deviceId);
  if (!dev) {
    throw new Error(`Device not found: ${deviceId}`);
  }

  const testResult = await testDeviceConnectivity(dev);
  const now = new Date().toISOString();

  // Create history entry
  const historyEntry: ConnectionHistoryEntry = {
    id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    device_id: deviceId,
    timestamp: now,
    status: testResult.status,
    latency_ms: testResult.latency_ms,
    message: testResult.message,
    details: testResult.details,
  };

  connectionHistory.unshift(historyEntry);
  persistHistory();

  // Update device state
  dev.last_seen_at = now;
  if (testResult.status === 'SUCCESS') {
    dev.status = 'ONLINE';
    dev.last_successful_connection_at = now;
    dev.configuration_verified = true;
  } else if (testResult.status === 'TIMEOUT') {
    dev.status = 'DEGRADED';
  } else {
    dev.status = 'OFFLINE';
  }
  dev.updated_at = now;
  persistDevices();

  return {
    device: sanitizeDeviceRecord(dev),
    result: historyEntry,
  };
}

export function getConnectionHistory(deviceId?: string): ConnectionHistoryEntry[] {
  if (deviceId) {
    return connectionHistory.filter((h) => h.device_id === deviceId);
  }
  return [...connectionHistory];
}

// ---------------------------------------------------------------------------
// Study Association & Ingestion Job Tracking
// ---------------------------------------------------------------------------

export function recordReceivedStudy(
  deviceId: string,
  studyInstanceUID: string,
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
): void {
  const dev = devices.get(deviceId);
  if (dev) {
    const now = new Date().toISOString();
    dev.last_seen_at = now;
    dev.last_study_received_at = now;
    dev.last_received_study_id = studyInstanceUID;
    dev.last_received_study_status = status;
    dev.updated_at = now;
    persistDevices();
  }
}

export function recordIngestionError(job: Omit<IngestionErrorJob, 'id' | 'timestamp' | 'retry_count'>): IngestionErrorJob {
  const entry: IngestionErrorJob = {
    ...job,
    id: `JOB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    retry_count: 0,
  };
  ingestionJobs.unshift(entry);
  persistJobs();
  return entry;
}

export function getIngestionErrors(): IngestionErrorJob[] {
  return [...ingestionJobs];
}

export function retryIngestionJob(jobId: string): IngestionErrorJob {
  const job = ingestionJobs.find((j) => j.id === jobId);
  if (!job) {
    throw new Error(`Ingestion job not found: ${jobId}`);
  }
  if (!job.retryable) {
    throw new Error(`Job ${jobId} is not marked as retryable.`);
  }

  job.retry_count += 1;
  job.status = 'PENDING';
  job.error_message = `Retrying ingestion (attempt #${job.retry_count})...`;
  persistJobs();
  return job;
}

// ---------------------------------------------------------------------------
// Monitoring Summary
// ---------------------------------------------------------------------------

export function getMonitoringSummary(): DeviceMonitoringSummary {
  const devList = Array.from(devices.values());
  let online = 0;
  let offline = 0;
  let disabled = 0;
  let unknown = 0;
  let studiesCount = 0;

  for (const d of devList) {
    if (!d.is_enabled || d.status === 'DISABLED') disabled++;
    else if (d.status === 'ONLINE') online++;
    else if (d.status === 'OFFLINE') offline++;
    else unknown++;

    if (d.last_received_study_id) studiesCount++;
  }

  return {
    total_devices: devList.length,
    online_devices: online,
    offline_devices: offline,
    disabled_devices: disabled,
    unknown_devices: unknown,
    total_studies_received: studiesCount,
    pending_candidates: 2,
    recent_errors_count: ingestionJobs.filter((j) => j.status === 'FAILED').length,
  };
}
