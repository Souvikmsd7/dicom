// =============================================================================
// DocMed DICOM POC — TypeScript Types for DICOM data
// Extended for Ophthalmic Modalities (OCT, Fundus, Visual Field)
// =============================================================================

/** Represents a single DICOM tag value from QIDO-RS JSON responses */
export interface DicomTagValue {
  vr: string;
  Value?: Array<string | number | Record<string, unknown>>;
}

/** Raw QIDO-RS study result — maps DICOM tag keys to values */
export type QidoStudyResult = Record<string, DicomTagValue>;

/** Study Identity Reconciliation Status */
export type StudyReconciliationStatus =
  | 'VERIFIED'
  | 'UNMAPPED'
  | 'DEMOGRAPHIC_MISMATCH'
  | 'QUARANTINED';

/** Parsed study metadata for the clinical frontend */
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
  laterality?: 'R' | 'L' | 'B' | string; // R = OD (Right), L = OS (Left), B = OU (Bilateral)
  manufacturer?: string;
  manufacturerModelName?: string;

  // Server-side identity reconciliation
  reconciliationStatus?: StudyReconciliationStatus;
  reconciliationReason?: string;
}

/** Parsed series metadata */
export interface SeriesMetadata {
  seriesInstanceUID: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  numberOfInstances: number;
  bodyPartExamined: string;
  laterality?: 'R' | 'L' | 'B' | string;
}

/** Standard Ophthalmic SOP Classes */
export const OphthalmicSopClasses = {
  OphthalmicPhotography8Bit: '1.2.840.10008.5.1.4.1.1.77.1.5.1',
  OphthalmicPhotography16Bit: '1.2.840.10008.5.1.4.1.1.77.1.5.2',
  OphthalmicTomography: '1.2.840.10008.5.1.4.1.1.77.1.5.4', // OCT volume/b-scans
  OphthalmicVisualField: '1.2.840.10008.5.1.4.1.1.77.1.5.6',
  EncapsulatedPDF: '1.2.840.10008.5.1.4.1.1.104.1', // Visual field & OCT structured reports
  RawDataStorage: '1.2.840.10008.5.1.4.1.1.66',
  VLPhotographicImageStorage: '1.2.840.10008.5.1.4.1.1.77.1.4',
  SecondaryCaptureImageStorage: '1.2.840.10008.5.1.4.1.1.7',
} as const;

/** Well-known DICOM tag addresses used in QIDO-RS JSON */
export const DicomTags = {
  // Identification
  StudyInstanceUID: '0020000D',
  SeriesInstanceUID: '0020000E',
  SOPInstanceUID: '00080018',
  SOPClassUID: '00080016',

  // Examination Attributes
  StudyDate: '00080020',
  StudyTime: '00080030',
  StudyDescription: '00081030',
  AccessionNumber: '00080050',
  Modality: '00080060',
  ModalitiesInStudy: '00080061',
  ReferringPhysicianName: '00080090',

  // Patient Demographics
  PatientName: '00100010',
  PatientID: '00100020',
  PatientBirthDate: '00100030',
  PatientSex: '00100040',

  // Series / Anatomy / Device Attributes
  SeriesNumber: '00200011',
  SeriesDescription: '0008103E',
  BodyPartExamined: '00180015',
  Laterality: '00200060', // Crucial for Ophthalmology: R (OD), L (OS), B (OU)
  ImageLaterality: '00200062',
  Manufacturer: '00080070',
  ManufacturerModelName: '00081090',
  DeviceSerialNumber: '00181000',
  SoftwareVersions: '00181020',

  // Statistics
  NumberOfStudyRelatedSeries: '00201206',
  NumberOfStudyRelatedInstances: '00201208',
  NumberOfSeriesRelatedInstances: '00201209',
} as const;
