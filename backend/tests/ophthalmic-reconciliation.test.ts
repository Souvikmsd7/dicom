import { describe, it, expect, beforeEach } from 'vitest';
import {
  seedDemoData,
  reconcileStudy,
  createMapping,
} from '../src/services/patient-mapping.service.js';
import { parseStudyResult } from '../src/services/dicomweb.service.js';
import { DicomTags, type QidoStudyResult, type StudyMetadata } from '../src/types/dicom.types.js';

describe('Ophthalmic Identity Reconciliation & Demographic Cross-Checks', () => {
  beforeEach(() => {
    seedDemoData();
  });

  const baseStudy: StudyMetadata = {
    studyInstanceUID: '1.2.826.0.1.3680043.8.498.9999',
    studyDate: '20261027',
    studyTime: '100000',
    studyDescription: 'OCT Macula Fast Map OD',
    accessionNumber: 'ACC-OCT-001',
    modality: 'OPT',
    modalitiesInStudy: ['OPT'],
    patientName: 'Thompson^Alex',
    patientID: 'BRAINIX_001',
    patientBirthDate: '19850315',
    patientSex: 'M',
    numberOfSeries: 1,
    numberOfInstances: 128,
    referringPhysicianName: 'Ophthalmologist^Sarah^Dr',
    laterality: 'R', // Right Eye (OD)
    manufacturer: 'Carl Zeiss Meditec',
    manufacturerModelName: 'CIRRUS HD-OCT 5000',
  };

  it('verifies study identity when PatientID mapping, DOB, and Sex all match EHR record', () => {
    // EHR-001 is mapped to BRAINIX_001 with DOB 1985-03-15, Sex M
    const result = reconcileStudy(baseStudy, 'EHR-001');

    expect(result.status).toBe('VERIFIED');
    expect(result.ehrPatient?.ehrPatientId).toBe('EHR-001');
    expect(result.reason).toContain('demographic cross-checks passed');
  });

  it('flags DEMOGRAPHIC_MISMATCH when DICOM Date of Birth conflicts with EHR record', () => {
    const conflictingDobStudy: StudyMetadata = {
      ...baseStudy,
      patientBirthDate: '19900101', // Conflicting DOB
    };

    const result = reconcileStudy(conflictingDobStudy, 'EHR-001');

    expect(result.status).toBe('DEMOGRAPHIC_MISMATCH');
    expect(result.reason).toContain('Date of Birth');
    expect(result.reason).toContain('19900101');
    expect(result.reason).toContain('1985-03-15');
  });

  it('flags DEMOGRAPHIC_MISMATCH when DICOM Sex conflicts with EHR record', () => {
    const conflictingSexStudy: StudyMetadata = {
      ...baseStudy,
      patientSex: 'F', // EHR-001 is Male
    };

    const result = reconcileStudy(conflictingSexStudy, 'EHR-001');

    expect(result.status).toBe('DEMOGRAPHIC_MISMATCH');
    expect(result.reason).toContain('Sex');
  });

  it('returns UNMAPPED when study is compared against an unmapped EHR patient', () => {
    // EHR-002 (Jordan Rivera) has no mapping initially
    const result = reconcileStudy(baseStudy, 'EHR-002');

    expect(result.status).toBe('UNMAPPED');
    expect(result.reason).toContain('No verified DICOM PatientID mapping registered');
  });

  it('returns QUARANTINED when target EHR patient record does not exist', () => {
    const result = reconcileStudy(baseStudy, 'NON-EXISTENT-ID');

    expect(result.status).toBe('QUARANTINED');
    expect(result.reason).toContain('does not exist');
  });

  it('performs reverse reconciliation matching DICOM PatientID to EHR record without explicit expected patient', () => {
    const result = reconcileStudy(baseStudy);

    expect(result.status).toBe('VERIFIED');
    expect(result.ehrPatient?.ehrPatientId).toBe('EHR-001');
  });
});

describe('Ophthalmic DICOM Tag Parsing', () => {
  it('correctly extracts laterality, manufacturer, and model name from QIDO-RS JSON', () => {
    const rawOphthalmicStudy: QidoStudyResult = {
      [DicomTags.StudyInstanceUID]: { vr: 'UI', Value: ['1.2.3.4.5'] },
      [DicomTags.Modality]: { vr: 'CS', Value: ['OP'] },
      [DicomTags.Laterality]: { vr: 'CS', Value: ['R'] },
      [DicomTags.Manufacturer]: { vr: 'LO', Value: ['Carl Zeiss Meditec'] },
      [DicomTags.ManufacturerModelName]: { vr: 'LO', Value: ['CLARUS 500'] },
      [DicomTags.SOPClassUID]: { vr: 'UI', Value: ['1.2.840.10008.5.1.4.1.1.77.1.5.1'] },
    };

    const parsed = parseStudyResult(rawOphthalmicStudy);

    expect(parsed.modality).toBe('OP');
    expect(parsed.laterality).toBe('R');
    expect(parsed.manufacturer).toBe('Carl Zeiss Meditec');
    expect(parsed.manufacturerModelName).toBe('CLARUS 500');
    expect(parsed.sopClassUID).toBe('1.2.840.10008.5.1.4.1.1.77.1.5.1');
  });
});
