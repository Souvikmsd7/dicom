// =============================================================================
// DocMed EHR — Sample Data Migration & Canonical Contract Validation Suite
// Validates all sample payloads, test fixtures, and mock definitions against
// DocMed_Ophthalmology_Device_Data_Examples_Compatible.json (Requirement 6)
// =============================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCanonicalFile,
  getCanonicalTemplates,
  getCanonicalTemplateForCategory,
  buildCanonicalContractDocument,
} from '../src/services/device-contract.service.js';
import {
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
  validateDeviceConfig,
  testConnectionForDevice,
  getConnectionHistory,
  getMonitoringSummary,
  getIngestionErrors,
  retryIngestionJob,
  initializeDeviceRegistry,
} from '../src/services/device-registry.service.js';
import { CANONICAL_DEVICE_TYPES } from '../src/types/ophthalmology-device-contract.types.js';
import { seedDemoData } from '../src/services/patient-mapping.service.js';
import type { StudyMetadata } from '../src/types/dicom.types.js';

describe('Sample Data Migration & Canonical Contract Validation Suite', () => {
  beforeEach(() => {
    seedDemoData();
    initializeDeviceRegistry(true);
  });

  // ---------------------------------------------------------------------------
  // 1. Canonical JSON Contract Source-of-Truth Integrity
  // ---------------------------------------------------------------------------
  it('verifies canonical file schema version 1.0.1 and synthetic data disclaimer', () => {
    const file = getCanonicalFile();
    expect(file).toBeDefined();
    expect(file.document_metadata.version).toBe('1.0.0');
    expect(file.document_metadata.data_status).toContain('Synthetic examples');

    // Ensure all 10 device templates carry schema_version "1.0.1"
    for (const dev of file.devices) {
      expect(dev.schema_version).toBe('1.0.1');
      expect(dev.source_system).toBe('DocMed EHR');
      expect(dev.integration_id).toMatch(/^DICOM-INT-/);
    }
  });

  it('verifies all 10 canonical device categories are present with complete structures', () => {
    const templates = getCanonicalTemplates();
    expect(templates).toHaveLength(10);

    const categoriesFound = templates.map((t) => t.device_type);
    for (const expectedCategory of CANONICAL_DEVICE_TYPES) {
      expect(categoriesFound).toContain(expectedCategory);
    }
  });

  it('validates integration_status fields and types across all 10 categories', () => {
    const templates = getCanonicalTemplates();

    for (const dev of templates) {
      const status = dev.integration_status;
      expect(status).toBeDefined();

      // Boolean flags
      expect(typeof status.metadata_received).toBe('boolean');
      expect(typeof status.images_available).toBe('boolean');
      expect(typeof status.measurements_parsed).toBe('boolean');
      expect(typeof status.report_available).toBe('boolean');

      // String status tags
      expect(typeof status.patient_match_status).toBe('string');
      expect(typeof status.validation_status).toBe('string');

      // Arrays
      expect(Array.isArray(status.validation_errors)).toBe(true);
      expect(Array.isArray(status.missing_fields)).toBe(true);
      expect(Array.isArray(status.unsupported_fields)).toBe(true);
    }
  });

  it('ensures typed nulls and empty arrays are preserved without coercion to undefined', () => {
    const oct = getCanonicalTemplateForCategory('OCT / OCT Angiography');
    expect(oct.clinical_data).toBeDefined();

    // retiral_measurements
    const retinal = (oct.clinical_data as Record<string, any>).retinal_measurements;
    expect(retinal).toBeDefined();
    expect(retinal.central_subfield_thickness_um).toBeNull();
    expect(Array.isArray(retinal.retinal_layer_thicknesses)).toBe(true);
    expect(retinal.retinal_layer_thicknesses).toHaveLength(0);

    // images
    const images = (oct.clinical_data as Record<string, any>).images;
    expect(images).toBeDefined();
    expect(Array.isArray(images.b_scan_images)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 2. Multi-Device Registry & Operational Safety
  // ---------------------------------------------------------------------------
  it('seeds default clinic devices with unique device_id and independent status', () => {
    const { items: allDevices, total } = listDevices();
    expect(total).toBeGreaterThanOrEqual(5);

    const ids = allDevices.map((d) => d.device_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Check separation of device status and ingestion status
    const cirrus = allDevices.find((d) => d.device_id === 'OCT-001');
    expect(cirrus).toBeDefined();
    expect(cirrus?.status).toBe('ONLINE');
    expect(cirrus?.last_received_study_status).toBe('SUCCESS');

    // Offline device should retain last received study without affecting study access
    const hfa = allDevices.find((d) => d.device_id === 'VF-001');
    expect(hfa).toBeDefined();
    expect(hfa?.status).toBe('OFFLINE');
    expect(hfa?.last_received_study_id).toBe('1.2.826.0.1.3680043.8.498.1003');
    expect(hfa?.last_received_study_status).toBe('SUCCESS');
  });

  it('validates device configuration rules: rejects duplicate IDs, empty names, and bad AE Titles', () => {
    // 1. Duplicate ID rejection
    const duplicateCheck = validateDeviceConfig({ device_id: 'OCT-001', display_name: 'Dup', device_type: 'OCT', connection_type: 'DICOM' }, true);
    expect(duplicateCheck.valid).toBe(false);
    expect(duplicateCheck.errors[0]).toContain('already exists');

    // 2. Empty display name
    const emptyNameCheck = validateDeviceConfig({ device_id: 'NEW-001', display_name: '', device_type: 'OCT', connection_type: 'DICOM' }, true);
    expect(emptyNameCheck.valid).toBe(false);

    // 3. Invalid DICOM AE Title (>16 chars)
    const longAeCheck = validateDeviceConfig({ device_id: 'NEW-002', display_name: 'Test', device_type: 'OCT', connection_type: 'DICOM', ae_title: 'THIS_AE_TITLE_IS_WAY_TOO_LONG' }, true);
    expect(longAeCheck.valid).toBe(false);
    expect(longAeCheck.errors.some((e) => e.includes('16-character limit'))).toBe(true);
  });

  it('registers and updates a new device, resetting verification flag if connection details change', () => {
    const newDev = createDevice({
      device_id: 'TEST-OCT-99',
      display_name: 'Research OCT Zeiss',
      device_type: 'OCT / OCT Angiography',
      connection_type: 'DICOM',
      ip_address: '192.168.1.99',
      port: 4242,
      ae_title: 'ZEISS_RES_99',
    });

    expect(newDev.device_id).toBe('TEST-OCT-99');
    expect(newDev.configuration_verified).toBe(false);

    // Update display name only -> configuration_verified stays unchanged
    const updated = updateDevice('TEST-OCT-99', {
      display_name: 'Research OCT Zeiss (Room 4)',
      configuration_verified: true,
    });
    expect(updated.display_name).toBe('Research OCT Zeiss (Room 4)');
    expect(updated.configuration_verified).toBe(true);

    // Changing IP address must reset configuration_verified to false for clinical safety!
    const updatedIp = updateDevice('TEST-OCT-99', { ip_address: '192.168.1.100' });
    expect(updatedIp.configuration_verified).toBe(false);
  });

  it('executes live connectivity check and appends to connection history', async () => {
    const check = await testConnectionForDevice('OCT-001');
    expect(check.device).toBeDefined();
    expect(check.result).toBeDefined();
    expect(['SUCCESS', 'FAILED', 'TIMEOUT']).toContain(check.result.status);
    expect(typeof check.result.latency_ms).toBe('number');

    const history = getConnectionHistory('OCT-001');
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].device_id).toBe('OCT-001');
  });

  it('manages ingestion error jobs and supports retrying eligible failed jobs', () => {
    const errors = getIngestionErrors();
    expect(errors.length).toBeGreaterThan(0);

    const targetJob = errors[0];
    expect(targetJob.status).toBe('FAILED');
    expect(targetJob.retryable).toBe(true);

    const retried = retryIngestionJob(targetJob.id);
    expect(retried.status).toBe('PENDING');
    expect(retried.retry_count).toBe(1);
  });

  it('generates monitoring summary with accurate counts', () => {
    const summary = getMonitoringSummary();
    expect(summary.total_devices).toBeGreaterThanOrEqual(5);
    expect(summary.online_devices + summary.offline_devices + summary.disabled_devices + summary.unknown_devices).toBe(summary.total_devices);
    expect(summary.total_studies_received).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 3. Clinical Patient Matching Safeguards
  // ---------------------------------------------------------------------------
  it('guarantees normalized document preserves clinical traceability without fake measurements', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '1.2.826.0.1.3680043.8.498.9999',
      studyDate: '20261027',
      studyTime: '120000',
      studyDescription: 'Non-mydriatic Color Fundus Photography',
      accessionNumber: 'ACC-MOCK-99',
      modality: 'OP',
      modalitiesInStudy: ['OP'],
      patientName: 'Thompson^Alex',
      patientID: 'BRAINIX_001',
      numberOfSeries: 1,
      numberOfInstances: 2,
    };

    const doc = buildCanonicalContractDocument({ study, ehrPatientId: 'EHR-001' });
    const fundusDev = doc.devices.find((d) => d.device_type === 'Fundus Camera / Retinal Photography');
    expect(fundusDev).toBeDefined();

    // Verify traceability
    expect(fundusDev?.study.study_instance_uid).toBe('1.2.826.0.1.3680043.8.498.9999');
    expect(fundusDev?.patient.docmed_patient_id).toBe('EHR-001');

    // Clinical measurements must NOT be fabricated!
    const clinical = fundusDev?.clinical_data as Record<string, any>;
    expect(clinical.retinal_measurements?.central_subfield_thickness_um).toBeUndefined();
    expect(fundusDev?.integration_status.measurements_parsed).toBe(false);
  });
});
