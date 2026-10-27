// =============================================================================
// DocMed DICOM POC — Canonical Ophthalmology Device Data Contract Test Suite
// Verifies compliance with DocMed_Ophthalmology_Device_Data_Examples_Compatible.json
// Covers all 14 mandatory validation scenarios
// =============================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCanonicalFile,
  getCanonicalTemplates,
  getCanonicalTemplateForCategory,
  detectDeviceCategory,
  buildCanonicalDeviceRecord,
  buildCanonicalContractDocument,
} from '../src/services/device-contract.service.js';
import {
  seedDemoData,
  createMapping,
} from '../src/services/patient-mapping.service.js';
import { generateViewerUrl } from '../src/services/viewer.service.js';
import type { StudyMetadata } from '../src/types/dicom.types.js';
import type { DicomInstanceReference } from '../src/types/ophthalmology-device-contract.types.js';

describe('Canonical Ophthalmology Device Data Contract (14 Test Scenarios)', () => {
  beforeEach(() => {
    seedDemoData();
  });

  // -------------------------------------------------------------------------
  // Baseline: Source of Truth Integrity
  // -------------------------------------------------------------------------
  it('loads the source-of-truth JSON file with 10 device categories and metadata', () => {
    const file = getCanonicalFile();
    expect(file).toBeDefined();
    expect(file.document_metadata.title).toBe('DocMed EHR Ophthalmology Device Data JSON Examples');
    expect(file.devices).toHaveLength(10);

    const categories = file.devices.map((d) => d.device_type);
    expect(categories).toContain('OCT / OCT Angiography');
    expect(categories).toContain('Fundus Camera / Retinal Photography');
    expect(categories).toContain('Autorefractor / Keratometer');
    expect(categories).toContain('Automated Visual Field Analyzer / Perimetry');
    expect(categories).toContain('Corneal Topographer / Tomographer');
    expect(categories).toContain('Optical Biometer');
    expect(categories).toContain('Slit Lamp / Anterior Segment Imaging');
    expect(categories).toContain('Lensometer / Lensmeter');
    expect(categories).toContain('Ophthalmic Ultrasound / A-Scan / B-Scan');
    expect(categories).toContain('Contact Lens Fitting (usually DocMed form/vendor integration)');
  });

  it('buildCanonicalContractDocument preserves the 5 top-level keys and all 10 device categories', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '1.2.840.10008.5.1.4.1.1.77.1.5.4.1001',
      studyDate: '20261027',
      studyTime: '103000',
      studyDescription: 'CIRRUS HD-OCT Macular Cube OD',
      accessionNumber: 'ACC-OCT-001',
      modality: 'OPT',
      modalitiesInStudy: ['OPT'],
      patientName: 'Thompson^Alex',
      patientID: 'BRAINIX_001',
      patientBirthDate: '19850315',
      patientSex: 'M',
      numberOfSeries: 1,
      numberOfInstances: 1,
    };

    const doc = buildCanonicalContractDocument({
      study,
      ehrPatientId: 'EHR-001',
    });

    // Check 5 top-level keys
    expect(doc).toHaveProperty('document_metadata');
    expect(doc).toHaveProperty('dicom_instance_reference_schema');
    expect(doc).toHaveProperty('devices');
    expect(doc).toHaveProperty('implementation_rules');
    expect(doc).toHaveProperty('contract_rules');

    // Check devices array has all 10 categories
    expect(doc.devices).toHaveLength(10);

    // Active OCT device is updated with study UIDs and patient mapping
    const octDevice = doc.devices.find((d) => d.device_type === 'OCT / OCT Angiography');
    expect(octDevice).toBeDefined();
    expect(octDevice?.study.study_instance_uid).toBe('1.2.840.10008.5.1.4.1.1.77.1.5.4.1001');
    expect(octDevice?.patient.docmed_patient_id).toBe('EHR-001');
    expect(octDevice?.schema_version).toBe('1.0.1');

    // Other categories remain intact with their canonical schemas
    const fundusDevice = doc.devices.find((d) => d.device_type === 'Fundus Camera / Retinal Photography');
    expect(fundusDevice).toBeDefined();
    expect(fundusDevice?.schema_version).toBe('1.0.1');
    expect(fundusDevice?.clinical_data).toHaveProperty('findings');
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Complete Synthetic OCT Study
  // -------------------------------------------------------------------------
  it('Scenario 1: adapts a complete synthetic OCT study with images and retinal measurements', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '1.2.840.10008.5.1.4.1.1.77.1.5.4.1001',
      studyDate: '20261027',
      studyTime: '103000',
      studyDescription: 'CIRRUS HD-OCT Macular Cube 512x128 OD',
      accessionNumber: 'ACC-OCT-001',
      modality: 'OPT',
      modalitiesInStudy: ['OPT'],
      patientName: 'Thompson^Alex',
      patientID: 'BRAINIX_001',
      patientBirthDate: '19850315',
      patientSex: 'M',
      numberOfSeries: 1,
      numberOfInstances: 1,
      referringPhysicianName: 'Welch^Marcus^Dr',
      sopClassUID: '1.2.840.10008.5.1.4.1.1.77.1.5.4',
      laterality: 'R',
      manufacturer: 'Carl Zeiss Meditec',
      manufacturerModelName: 'CIRRUS HD-OCT 6000',
    };

    const instance: DicomInstanceReference = {
      sop_class_uid: '1.2.840.10008.5.1.4.1.1.77.1.5.4',
      sop_instance_uid: '1.2.840.10008.5.1.4.1.1.77.1.5.4.1001.1',
      series_instance_uid: '1.2.840.10008.5.1.4.1.1.77.1.5.4.1001.0',
      instance_number: 1,
      modality: 'OPT',
      mime_type: 'application/dicom',
      transfer_syntax_uid: '1.2.840.10008.1.2.1',
      rows: 512,
      columns: 512,
      number_of_frames: 128,
      photometric_interpretation: 'MONOCHROME2',
      bits_allocated: 8,
      laterality: 'R',
      content_datetime: '2026-10-27T10:30:00',
      orthanc_instance_id: 'orthanc-oct-instance-001',
      wado_rs_url: 'http://127.0.0.1:8042/dicom-web/studies/1.2.840.10008.5.1.4.1.1.77.1.5.4.1001/series/1/instances/1',
      thumbnail_url: 'http://127.0.0.1:8042/instances/orthanc-oct-instance-001/preview',
      is_original: true,
      is_derived: false,
    };

    const record = buildCanonicalDeviceRecord({
      study,
      instances: [instance],
      ehrPatientId: 'EHR-001',
      measurements: {
        central_subfield_thickness_um: 265,
        average_retinal_thickness_um: 282,
        macular_volume_mm3: 10.1,
        rnfl_global_um: 98,
      },
      scanParameters: {
        scan_width_mm: 6.0,
        scan_height_mm: 6.0,
        number_of_b_scans: 128,
      },
    });

    expect(record.device_type).toBe('OCT / OCT Angiography');
    expect(record.integration_status.metadata_received).toBe(true);
    expect(record.integration_status.images_available).toBe(true);
    expect(record.integration_status.measurements_parsed).toBe(true);
    expect(record.integration_status.patient_match_status).toBe('VERIFIED');
    expect(record.encounter.laterality).toBe('OD');

    const clinical = record.clinical_data as any;
    expect(clinical.retinal_measurements.central_subfield_thickness_um).toBe(265);
    expect(clinical.retinal_measurements.rnfl_global_um).toBe(98);
    expect(clinical.scan_parameters.scan_width_mm).toBe(6.0);
    expect(clinical.images.b_scan_images).toHaveLength(1);
    expect(clinical.images.b_scan_images[0]).toBe(instance.wado_rs_url);
  });

  // -------------------------------------------------------------------------
  // Scenario 2: OCT Study with Images but NO Structured Measurements
  // -------------------------------------------------------------------------
  it('Scenario 2: correctly flags measurements_parsed: false when OCT study has images only', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '2.25.oct.images.only',
      studyDate: '20261027',
      studyTime: '110000',
      studyDescription: 'Heidelberg SPECTRALIS OCT',
      accessionNumber: 'ACC-OCT-002',
      modality: 'OPT',
      modalitiesInStudy: ['OPT'],
      patientName: 'Thompson^Alex',
      patientID: 'BRAINIX_001',
      patientBirthDate: '19850315',
      patientSex: 'M',
      numberOfSeries: 1,
      numberOfInstances: 1,
      referringPhysicianName: '',
      sopClassUID: '1.2.840.10008.5.1.4.1.1.77.1.5.4',
    };

    const instance: DicomInstanceReference = {
      sop_class_uid: '1.2.840.10008.5.1.4.1.1.77.1.5.4',
      sop_instance_uid: '2.25.oct.inst.1',
      series_instance_uid: '2.25.oct.ser.1',
      instance_number: 1,
      modality: 'OPT',
      mime_type: 'application/dicom',
      transfer_syntax_uid: null,
      rows: 496,
      columns: 512,
      number_of_frames: 49,
      photometric_interpretation: 'MONOCHROME2',
      bits_allocated: 8,
      laterality: 'OS',
      content_datetime: null,
      orthanc_instance_id: 'orthanc-id-002',
      wado_rs_url: 'http://wado-link',
      thumbnail_url: null,
      is_original: true,
      is_derived: false,
    };

    const record = buildCanonicalDeviceRecord({
      study,
      instances: [instance],
      ehrPatientId: 'EHR-001',
      // No measurements passed
    });

    expect(record.integration_status.images_available).toBe(true);
    expect(record.integration_status.measurements_parsed).toBe(false);

    const clinical = record.clinical_data as any;
    expect(clinical.retinal_measurements.central_subfield_thickness_um).toBeNull();
    expect(clinical.retinal_measurements.rnfl_global_um).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Fundus Study with Image References and Metadata Only
  // -------------------------------------------------------------------------
  it('Scenario 3: adapts fundus photography with image references and without fabricated findings', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '2.25.fundus.clarus.001',
      studyDate: '20261027',
      studyTime: '113000',
      studyDescription: 'ZEISS CLARUS 500 Color Fundus Photography',
      accessionNumber: 'ACC-CFP-001',
      modality: 'OP',
      modalitiesInStudy: ['OP'],
      patientName: 'Thompson^Alex',
      patientID: 'BRAINIX_001',
      patientBirthDate: '19850315',
      patientSex: 'M',
      numberOfSeries: 1,
      numberOfInstances: 1,
      referringPhysicianName: '',
      sopClassUID: '1.2.840.10008.5.1.4.1.1.77.1.5.1',
      laterality: 'OD',
      manufacturer: 'Carl Zeiss Meditec',
      manufacturerModelName: 'CLARUS 500',
    };

    const instance: DicomInstanceReference = {
      sop_class_uid: '1.2.840.10008.5.1.4.1.1.77.1.5.1',
      sop_instance_uid: '2.25.fundus.sop.1',
      series_instance_uid: '2.25.fundus.ser.1',
      instance_number: 1,
      modality: 'OP',
      mime_type: 'application/dicom',
      transfer_syntax_uid: '1.2.840.10008.1.2.4.50',
      rows: 2048,
      columns: 2048,
      number_of_frames: null,
      photometric_interpretation: 'RGB',
      bits_allocated: 8,
      laterality: 'OD',
      content_datetime: '2026-10-27T11:30:00',
      orthanc_instance_id: 'orthanc-fundus-001',
      wado_rs_url: 'http://wado/fundus/1',
      thumbnail_url: 'http://orthanc/preview/1',
      is_original: true,
      is_derived: false,
    };

    const record = buildCanonicalDeviceRecord({
      study,
      instances: [instance],
      ehrPatientId: 'EHR-001',
    });

    expect(record.device_type).toBe('Fundus Camera / Retinal Photography');
    expect(record.integration_status.images_available).toBe(true);
    expect(record.integration_status.measurements_parsed).toBe(false);

    const clinical = record.clinical_data as any;
    expect(clinical.images.color_fundus_images).toContain('http://wado/fundus/1');
    expect(clinical.findings.optic_disc).toBeNull();
    expect(clinical.findings.cup_disc_ratio_vertical).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Study with Missing Patient Metadata
  // -------------------------------------------------------------------------
  it('Scenario 4: records missing patient metadata paths in integration_status.missing_fields', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '2.25.missing.demographics',
      studyDate: '20261027',
      studyTime: '120000',
      studyDescription: 'OCT Exam',
      accessionNumber: 'ACC-004',
      modality: 'OPT',
      modalitiesInStudy: ['OPT'],
      patientName: 'Anonymous',
      patientID: 'UNKNOWN_999',
      patientBirthDate: '', // MISSING
      patientSex: '',       // MISSING
      numberOfSeries: 1,
      numberOfInstances: 1,
      referringPhysicianName: '',
    };

    const record = buildCanonicalDeviceRecord({
      study,
      instances: [],
    });

    expect(record.patient.date_of_birth).toBeNull();
    expect(record.patient.sex).toBeNull();
    expect(record.integration_status.missing_fields).toContain('patient.date_of_birth');
    expect(record.integration_status.missing_fields).toContain('patient.sex');
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Study with Unsupported DICOM Objects / Subfields
  // -------------------------------------------------------------------------
  it('Scenario 5: records unsupported fields when standard OCT lacks angiography parameters', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '2.25.standard.oct',
      studyDate: '20261027',
      studyTime: '120000',
      studyDescription: 'Standard Structural OCT',
      accessionNumber: 'ACC-005',
      modality: 'OPT',
      modalitiesInStudy: ['OPT'],
      patientName: 'Doe^John',
      patientID: 'BRAINIX_001',
      patientBirthDate: '19850315',
      patientSex: 'M',
      numberOfSeries: 1,
      numberOfInstances: 1,
      referringPhysicianName: '',
    };

    const record = buildCanonicalDeviceRecord({
      study,
      instances: [],
      overrideCategory: 'OCT / OCT Angiography',
    });

    expect(record.integration_status.unsupported_fields).toContain('clinical_data.octa_measurements');
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Study with No Matching DocMed Patient
  // -------------------------------------------------------------------------
  it('Scenario 6: sets patient_match_status to UNMAPPED when study has no matching EHR patient', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '2.25.unmapped.study',
      studyDate: '20261027',
      studyTime: '120000',
      studyDescription: 'OCT Scan',
      accessionNumber: 'ACC-006',
      modality: 'OPT',
      modalitiesInStudy: ['OPT'],
      patientName: 'Unmapped^Person',
      patientID: 'FOREIGN_MRN_9999',
      patientBirthDate: '19900101',
      patientSex: 'F',
      numberOfSeries: 1,
      numberOfInstances: 1,
      referringPhysicianName: '',
    };

    const record = buildCanonicalDeviceRecord({
      study,
      instances: [],
    });

    expect(record.integration_status.patient_match_status).toBe('UNMAPPED');
    expect(record.patient.docmed_patient_id).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Ambiguous Patient Match
  // -------------------------------------------------------------------------
  it('Scenario 7: sets patient_match_status to AMBIGUOUS and records error when PatientID is absent', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '2.25.ambiguous.study',
      studyDate: '20261027',
      studyTime: '120000',
      studyDescription: 'OCT Scan',
      accessionNumber: '',
      modality: 'OPT',
      modalitiesInStudy: ['OPT'],
      patientName: 'Smith^John',
      patientID: '', // NO IDENTIFIER — Ambiguous!
      patientBirthDate: '',
      patientSex: '',
      numberOfSeries: 1,
      numberOfInstances: 1,
      referringPhysicianName: '',
    };

    const record = buildCanonicalDeviceRecord({
      study,
      instances: [],
    });

    expect(record.integration_status.patient_match_status).toBe('AMBIGUOUS');
    expect(record.integration_status.validation_errors.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Invalid or Unreadable DICOM Object
  // -------------------------------------------------------------------------
  it('Scenario 8: flags metadata_received: false when study UID is missing or empty', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '', // Corrupt / Empty
      studyDate: '',
      studyTime: '',
      studyDescription: 'Corrupted Object',
      accessionNumber: '',
      modality: '',
      modalitiesInStudy: [],
      patientName: '',
      patientID: '',
      patientBirthDate: '',
      patientSex: '',
      numberOfSeries: 0,
      numberOfInstances: 0,
      referringPhysicianName: '',
    };

    const record = buildCanonicalDeviceRecord({
      study,
      instances: [],
    });

    expect(record.integration_status.metadata_received).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Empty Study / 0 Instances
  // -------------------------------------------------------------------------
  it('Scenario 9: correctly sets images_available: false when study contains 0 instances', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '2.25.empty.study.999',
      studyDate: '20261027',
      studyTime: '120000',
      studyDescription: 'Study With No Images',
      accessionNumber: 'ACC-EMPTY',
      modality: 'OPT',
      modalitiesInStudy: ['OPT'],
      patientName: 'Thompson^Alex',
      patientID: 'BRAINIX_001',
      patientBirthDate: '19850315',
      patientSex: 'M',
      numberOfSeries: 0,
      numberOfInstances: 0,
      referringPhysicianName: '',
    };

    const record = buildCanonicalDeviceRecord({
      study,
      instances: [],
      ehrPatientId: 'EHR-001',
    });

    expect(record.integration_status.images_available).toBe(false);
    expect(record.study.instances).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Scenario 10: Device Category without Implemented Adapter / Default
  // -------------------------------------------------------------------------
  it('Scenario 10: defaults safely for unknown modality while retaining DICOM references', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '2.25.unknown.device.123',
      studyDate: '20261027',
      studyTime: '120000',
      studyDescription: 'Experimental Ophthalmic Sensor',
      accessionNumber: 'ACC-EXP',
      modality: 'OT', // Generic Other
      modalitiesInStudy: ['OT'],
      patientName: 'Thompson^Alex',
      patientID: 'BRAINIX_001',
      patientBirthDate: '19850315',
      patientSex: 'M',
      numberOfSeries: 1,
      numberOfInstances: 1,
      referringPhysicianName: '',
    };

    const category = detectDeviceCategory(study);
    expect(category).toBe('OCT / OCT Angiography'); // Safe default

    const record = buildCanonicalDeviceRecord({
      study,
      instances: [],
    });

    expect(record.study.study_instance_uid).toBe('2.25.unknown.device.123');
    expect(record.integration_status.measurements_parsed).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Scenario 11: Valid Measurement with Value 0 (Zero Preservation)
  // -------------------------------------------------------------------------
  it('Scenario 11: preserves genuine 0 measurement values without coercing to null', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '2.25.zero.values.test',
      studyDate: '20261027',
      studyTime: '120000',
      studyDescription: 'Autorefractor Test',
      accessionNumber: 'ACC-ZERO',
      modality: 'OPR',
      modalitiesInStudy: ['OPR'],
      patientName: 'Test^Zero',
      patientID: 'BRAINIX_001',
      patientBirthDate: '19850315',
      patientSex: 'M',
      numberOfSeries: 1,
      numberOfInstances: 1,
      referringPhysicianName: '',
    };

    const record = buildCanonicalDeviceRecord({
      study,
      overrideCategory: 'Autorefractor / Keratometer',
      measurements: {
        refraction: {
          sphere_d: 0.0,      // Plano refraction: 0 is clinically significant!
          cylinder_d: 0.0,    // No astigmatism: 0 is clinically significant!
          axis_degrees: 0,
        },
      },
    });

    const clinical = record.clinical_data as any;
    expect(clinical.refraction.sphere_d).toBe(0.0);
    expect(clinical.refraction.cylinder_d).toBe(0.0);
    expect(clinical.refraction.axis_degrees).toBe(0);
    expect(record.integration_status.measurements_parsed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 12: Valid Boolean Field with Value false (False Preservation)
  // -------------------------------------------------------------------------
  it('Scenario 12: preserves valid boolean false values without treating as missing', () => {
    const study: StudyMetadata = {
      studyInstanceUID: '2.25.false.values.test',
      studyDate: '20261027',
      studyTime: '120000',
      studyDescription: 'OCT Exam',
      accessionNumber: 'ACC-FALSE',
      modality: 'OPT',
      modalitiesInStudy: ['OPT'],
      patientName: 'Test^False',
      patientID: 'BRAINIX_001',
      patientBirthDate: '19850315',
      patientSex: 'M',
      numberOfSeries: 1,
      numberOfInstances: 1,
      referringPhysicianName: '',
    };

    const instance: DicomInstanceReference = {
      sop_class_uid: '1.2.840.10008.5.1.4.1.1.77.1.5.4',
      sop_instance_uid: '2.25.inst.false',
      series_instance_uid: '2.25.ser.false',
      instance_number: 1,
      modality: 'OPT',
      mime_type: 'application/dicom',
      transfer_syntax_uid: null,
      rows: 512,
      columns: 512,
      number_of_frames: 1,
      photometric_interpretation: 'MONOCHROME2',
      bits_allocated: 8,
      laterality: 'OD',
      content_datetime: null,
      orthanc_instance_id: 'orthanc-false-001',
      wado_rs_url: 'http://wado',
      thumbnail_url: null,
      is_original: false, // Explicit false!
      is_derived: true,
    };

    const record = buildCanonicalDeviceRecord({
      study,
      instances: [instance],
    });

    expect(record.study.instances[0].is_original).toBe(false);
    expect(record.study.instances[0].is_derived).toBe(true);
    expect(record.integration_status.measurements_parsed).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Scenario 13: 100% Schema Preservation of Unavailable Fields
  // -------------------------------------------------------------------------
  it('Scenario 13: ensures all unavailable fields remain present in response matching template keys', () => {
    const categories = [
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

    for (const cat of categories) {
      const template = getCanonicalTemplateForCategory(cat);
      const study: StudyMetadata = {
        studyInstanceUID: `2.25.schema.test.${encodeURIComponent(cat)}`,
        studyDate: '20261027',
        studyTime: '120000',
        studyDescription: cat,
        accessionNumber: 'ACC-SCHEMA',
        modality: 'OPT',
        modalitiesInStudy: ['OPT'],
        patientName: 'Test^Patient',
        patientID: 'BRAINIX_001',
        patientBirthDate: '19850315',
        patientSex: 'M',
        numberOfSeries: 1,
        numberOfInstances: 1,
        referringPhysicianName: '',
      };

      const record = buildCanonicalDeviceRecord({
        study,
        overrideCategory: cat,
      });

      // Verify top-level keys identical to template
      expect(Object.keys(record)).toEqual(Object.keys(template));
      // Verify clinical_data sections identical to template
      expect(Object.keys(record.clinical_data)).toEqual(Object.keys(template.clinical_data));
      // Verify patient, encounter, device, study, report, integration_status keys identical
      expect(Object.keys(record.patient)).toEqual(Object.keys(template.patient));
      expect(Object.keys(record.encounter)).toEqual(Object.keys(template.encounter));
      expect(Object.keys(record.device)).toEqual(Object.keys(template.device));
      expect(Object.keys(record.study)).toEqual(Object.keys(template.study));
      expect(Object.keys(record.report)).toEqual(Object.keys(template.report));
      expect(Object.keys(record.integration_status)).toEqual(Object.keys(template.integration_status));
    }
  });

  // -------------------------------------------------------------------------
  // Scenario 14: Regression Tests for Existing APIs & OHIF Integration
  // -------------------------------------------------------------------------
  it('Scenario 14: maintains regression compatibility with OHIF viewer URL generator', () => {
    const studyUid = '1.2.826.0.1.3680043.8.498.1001';
    const result = generateViewerUrl({
      studyInstanceUID: studyUid,
      ehrPatientId: 'EHR-001',
    });

    expect(result.viewerUrl).toContain('http://localhost:3001/viewer');
    expect(result.viewerUrl).toContain(`StudyInstanceUIDs=${studyUid}`);
    expect(result.studyInstanceUID).toBe(studyUid);
  });
});
