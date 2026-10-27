import { describe, it, expect, beforeEach } from 'vitest';
import {
  seedDemoData,
  getAllEhrPatients,
  getEhrPatient,
  searchEhrPatients,
  createMapping,
  getDicomIdForEhrPatient,
  getEhrPatientForDicomId,
  validateStudyAccess,
  getAllMappings,
} from '../src/services/patient-mapping.service.js';
import { generateViewerUrl } from '../src/services/viewer.service.js';
import { parseStudyResult, parseSeriesResult } from '../src/services/dicomweb.service.js';
import { DicomTags, type QidoStudyResult } from '../src/types/dicom.types.js';

describe('Patient Mapping & Identity Verification Service', () => {
  beforeEach(() => {
    seedDemoData();
  });

  it('seeds default demo EHR patients with valid attributes', () => {
    const patients = getAllEhrPatients();
    expect(patients.length).toBeGreaterThanOrEqual(3);
    const p1 = getEhrPatient('EHR-001');
    expect(p1).toBeDefined();
    expect(p1?.firstName).toBe('Alex');
    expect(p1?.mrn).toBe('MRN-100001');
  });

  it('searches patients by name, MRN, or EHR ID case-insensitively', () => {
    const byName = searchEhrPatients('alex');
    expect(byName.length).toBe(1);
    expect(byName[0].ehrPatientId).toBe('EHR-001');

    const byMrn = searchEhrPatients('MRN-100002');
    expect(byMrn.length).toBe(1);
    expect(byMrn[0].lastName).toBe('Rivera');
  });

  it('creates an explicit mapping between EHR patient and DICOM PatientID', () => {
    const mapping = createMapping('EHR-001', 'DICOM_BRAINIX_01', 'Thompson^Alex');
    expect(mapping.ehrPatientId).toBe('EHR-001');
    expect(mapping.dicomPatientId).toBe('DICOM_BRAINIX_01');
    expect(mapping.verified).toBe(true);

    const retrieved = getDicomIdForEhrPatient('EHR-001');
    expect(retrieved?.dicomPatientId).toBe('DICOM_BRAINIX_01');

    const reverse = getEhrPatientForDicomId('DICOM_BRAINIX_01');
    expect(reverse?.ehrPatientId).toBe('EHR-001');
  });

  it('rejects mapping creation for non-existent EHR patient', () => {
    expect(() =>
      createMapping('NON-EXISTENT', 'DICOM_123', 'Ghost')
    ).toThrow('EHR patient not found');
  });

  it('validates study access against verified mappings', () => {
    createMapping('EHR-002', 'DICOM_KNEE_99', 'Rivera^Jordan');

    // Mismatched DICOM PatientID
    const denied = validateStudyAccess('EHR-002', 'DICOM_WRONG_PATIENT');
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toContain('mismatch');

    // Matching DICOM PatientID
    const allowed = validateStudyAccess('EHR-002', 'DICOM_KNEE_99');
    expect(allowed.allowed).toBe(true);
  });

  it('denies access if no mapping exists for the EHR patient', () => {
    const check = validateStudyAccess('EHR-003', 'ANY_DICOM_ID');
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('No DICOM mapping exists');
  });
});

describe('Viewer Launch Service', () => {
  it('generates a compliant OHIF v3 viewer URL with StudyInstanceUIDs query param', () => {
    const launch = generateViewerUrl({
      studyInstanceUID: '1.2.840.113619.2.55.3.60468841.854.1234567890',
      ehrPatientId: 'EHR-001',
    });

    expect(launch.viewerUrl).toContain('http://localhost:3001/viewer?StudyInstanceUIDs=');
    expect(launch.viewerUrl).toContain('1.2.840.113619.2.55.3.60468841.854.1234567890');
    expect(launch.studyInstanceUID).toBe('1.2.840.113619.2.55.3.60468841.854.1234567890');
  });
});

describe('DICOMweb QIDO-RS JSON Parser', () => {
  it('correctly parses raw QIDO-RS study dictionary to typed StudyMetadata', () => {
    const mockQidoStudy: QidoStudyResult = {
      [DicomTags.StudyInstanceUID]: {
        vr: 'UI',
        Value: ['1.2.3.4.5.6.789'],
      },
      [DicomTags.StudyDate]: {
        vr: 'DA',
        Value: ['20241026'],
      },
      [DicomTags.StudyDescription]: {
        vr: 'LO',
        Value: ['MRI BRAIN W WO CONTRAST'],
      },
      [DicomTags.PatientID]: {
        vr: 'LO',
        Value: ['BRAINIX_001'],
      },
      [DicomTags.PatientName]: {
        vr: 'PN',
        Value: [{ Alphabetic: 'Brainix^Patient' }],
      },
      [DicomTags.ModalitiesInStudy]: {
        vr: 'CS',
        Value: ['MR'],
      },
      [DicomTags.NumberOfStudyRelatedSeries]: {
        vr: 'IS',
        Value: [4],
      },
      [DicomTags.NumberOfStudyRelatedInstances]: {
        vr: 'IS',
        Value: [120],
      },
    };

    const parsed = parseStudyResult(mockQidoStudy);

    expect(parsed.studyInstanceUID).toBe('1.2.3.4.5.6.789');
    expect(parsed.studyDate).toBe('20241026');
    expect(parsed.studyDescription).toBe('MRI BRAIN W WO CONTRAST');
    expect(parsed.patientID).toBe('BRAINIX_001');
    expect(parsed.patientName).toBe('Brainix^Patient');
    expect(parsed.modalitiesInStudy).toEqual(['MR']);
    expect(parsed.numberOfSeries).toBe(4);
    expect(parsed.numberOfInstances).toBe(120);
  });

  it('gracefully handles missing optional tags without throwing', () => {
    const minimalStudy: QidoStudyResult = {
      [DicomTags.StudyInstanceUID]: {
        vr: 'UI',
        Value: ['1.2.3.4'],
      },
    };

    const parsed = parseStudyResult(minimalStudy);
    expect(parsed.studyInstanceUID).toBe('1.2.3.4');
    expect(parsed.studyDescription).toBe('');
    expect(parsed.accessionNumber).toBe('');
    expect(parsed.numberOfSeries).toBe(0);
    expect(parsed.numberOfInstances).toBe(0);
  });

  it('correctly parses raw QIDO-RS series dictionary to SeriesMetadata', () => {
    const mockQidoSeries: QidoStudyResult = {
      [DicomTags.SeriesInstanceUID]: {
        vr: 'UI',
        Value: ['1.2.3.4.5.999'],
      },
      [DicomTags.SeriesNumber]: {
        vr: 'IS',
        Value: [2],
      },
      [DicomTags.SeriesDescription]: {
        vr: 'LO',
        Value: ['AXIAL T2 FLAIR'],
      },
      [DicomTags.Modality]: {
        vr: 'CS',
        Value: ['MR'],
      },
      [DicomTags.NumberOfSeriesRelatedInstances]: {
        vr: 'IS',
        Value: [28],
      },
      [DicomTags.BodyPartExamined]: {
        vr: 'CS',
        Value: ['BRAIN'],
      },
    };

    const parsed = parseSeriesResult(mockQidoSeries);
    expect(parsed.seriesInstanceUID).toBe('1.2.3.4.5.999');
    expect(parsed.seriesNumber).toBe(2);
    expect(parsed.seriesDescription).toBe('AXIAL T2 FLAIR');
    expect(parsed.modality).toBe('MR');
    expect(parsed.numberOfInstances).toBe(28);
    expect(parsed.bodyPartExamined).toBe('BRAIN');
  });
});
