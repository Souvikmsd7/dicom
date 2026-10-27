// =============================================================================
// DocMed DICOM POC — DICOMweb Service
// Proxies QIDO-RS, WADO-RS, and STOW-RS requests to Orthanc
// =============================================================================
import { config, getOrthancAuthHeader } from '../config.js';
import {
  type QidoStudyResult,
  type StudyMetadata,
  type SeriesMetadata,
  DicomTags,
} from '../types/dicom.types.js';

const ORTHANC_BASE = config.orthanc.baseUrl;
const DICOMWEB_ROOT = config.orthanc.dicomWebRoot;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTagValue(
  result: QidoStudyResult,
  tag: string
): string {
  const entry = result[tag];
  if (!entry?.Value || entry.Value.length === 0) return '';
  const val = entry.Value[0];
  if (typeof val === 'object' && val !== null && 'Alphabetic' in val) {
    return (val as Record<string, string>).Alphabetic;
  }
  return String(val);
}

function getTagNumericValue(
  result: QidoStudyResult,
  tag: string
): number {
  const entry = result[tag];
  if (!entry?.Value || entry.Value.length === 0) return 0;
  return Number(entry.Value[0]) || 0;
}

function getTagArrayValue(
  result: QidoStudyResult,
  tag: string
): string[] {
  const entry = result[tag];
  if (!entry?.Value) return [];
  return entry.Value.map((v) => String(v));
}

/** Parse a raw QIDO-RS study result into our typed StudyMetadata */
export function parseStudyResult(raw: QidoStudyResult): StudyMetadata {
  return {
    studyInstanceUID: getTagValue(raw, DicomTags.StudyInstanceUID),
    studyDate: getTagValue(raw, DicomTags.StudyDate),
    studyTime: getTagValue(raw, DicomTags.StudyTime),
    studyDescription: getTagValue(raw, DicomTags.StudyDescription),
    accessionNumber: getTagValue(raw, DicomTags.AccessionNumber),
    modality: getTagValue(raw, DicomTags.Modality),
    modalitiesInStudy: getTagArrayValue(raw, DicomTags.ModalitiesInStudy),
    patientName: getTagValue(raw, DicomTags.PatientName),
    patientID: getTagValue(raw, DicomTags.PatientID),
    patientBirthDate: getTagValue(raw, DicomTags.PatientBirthDate),
    patientSex: getTagValue(raw, DicomTags.PatientSex),
    numberOfSeries: getTagNumericValue(raw, DicomTags.NumberOfStudyRelatedSeries),
    numberOfInstances: getTagNumericValue(raw, DicomTags.NumberOfStudyRelatedInstances),
    referringPhysicianName: getTagValue(raw, DicomTags.ReferringPhysicianName),

    // Ophthalmic & Device Attributes
    sopClassUID: getTagValue(raw, DicomTags.SOPClassUID),
    laterality: (getTagValue(raw, DicomTags.Laterality) || getTagValue(raw, DicomTags.ImageLaterality)) as 'R' | 'L' | 'B' | string,
    manufacturer: getTagValue(raw, DicomTags.Manufacturer),
    manufacturerModelName: getTagValue(raw, DicomTags.ManufacturerModelName),
  };
}

/** Parse a raw QIDO-RS series result */
export function parseSeriesResult(raw: QidoStudyResult): SeriesMetadata {
  return {
    seriesInstanceUID: getTagValue(raw, DicomTags.SeriesInstanceUID),
    seriesNumber: getTagNumericValue(raw, DicomTags.SeriesNumber),
    seriesDescription: getTagValue(raw, DicomTags.SeriesDescription),
    modality: getTagValue(raw, DicomTags.Modality),
    numberOfInstances: getTagNumericValue(raw, DicomTags.NumberOfSeriesRelatedInstances),
    bodyPartExamined: getTagValue(raw, DicomTags.BodyPartExamined),
    laterality: (getTagValue(raw, DicomTags.Laterality) || getTagValue(raw, DicomTags.ImageLaterality)) as 'R' | 'L' | 'B' | string,
  };
}

// ---------------------------------------------------------------------------
// QIDO-RS: Query
// ---------------------------------------------------------------------------

/** Search studies via QIDO-RS. Optionally filter by PatientID or PatientName. */
export async function searchStudies(params?: {
  patientId?: string;
  patientName?: string;
  studyDate?: string;
  modality?: string;
  limit?: number;
  offset?: number;
}): Promise<StudyMetadata[]> {
  const url = new URL(`${ORTHANC_BASE}${DICOMWEB_ROOT}/studies`);

  if (params?.patientId) url.searchParams.set('PatientID', params.patientId);
  if (params?.patientName) url.searchParams.set('PatientName', params.patientName);
  if (params?.studyDate) url.searchParams.set('StudyDate', params.studyDate);
  if (params?.modality) url.searchParams.set('ModalitiesInStudy', params.modality);
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.offset) url.searchParams.set('offset', String(params.offset));

  // Include all fields we care about
  url.searchParams.set('includefield', [
    DicomTags.StudyDescription,
    DicomTags.ModalitiesInStudy,
    DicomTags.NumberOfStudyRelatedSeries,
    DicomTags.NumberOfStudyRelatedInstances,
    DicomTags.PatientBirthDate,
    DicomTags.PatientSex,
    DicomTags.ReferringPhysicianName,
    DicomTags.AccessionNumber,
    DicomTags.Laterality,
    DicomTags.Manufacturer,
    DicomTags.ManufacturerModelName,
    DicomTags.SOPClassUID,
  ].join(','));

  const response = await fetch(url.toString(), {
    headers: { Authorization: getOrthancAuthHeader(), Accept: 'application/dicom+json' },
  });

  if (!response.ok) {
    throw new Error(`QIDO-RS /studies failed: ${response.status} ${response.statusText}`);
  }

  const results: QidoStudyResult[] = await response.json();
  return results.map(parseStudyResult);
}

/** Get metadata for a specific study */
export async function getStudyMetadata(
  studyInstanceUID: string
): Promise<StudyMetadata | null> {
  const studies = await searchStudies();
  return studies.find((s) => s.studyInstanceUID === studyInstanceUID) || null;
}

/** Get series for a study via QIDO-RS */
export async function getStudySeries(
  studyInstanceUID: string
): Promise<SeriesMetadata[]> {
  const url = new URL(
    `${ORTHANC_BASE}${DICOMWEB_ROOT}/studies/${studyInstanceUID}/series`
  );

  url.searchParams.set('includefield', [
    DicomTags.SeriesDescription,
    DicomTags.NumberOfSeriesRelatedInstances,
    DicomTags.BodyPartExamined,
    DicomTags.Laterality,
  ].join(','));

  const response = await fetch(url.toString(), {
    headers: { Authorization: getOrthancAuthHeader(), Accept: 'application/dicom+json' },
  });

  if (!response.ok) {
    throw new Error(`QIDO-RS /series failed: ${response.status} ${response.statusText}`);
  }

  const results: QidoStudyResult[] = await response.json();
  return results.map(parseSeriesResult);
}

/** Get Orthanc internal study ID from StudyInstanceUID using /tools/lookup */
export async function getOrthancStudyId(studyInstanceUID: string): Promise<string | null> {
  try {
    const response = await fetch(`${ORTHANC_BASE}/tools/lookup`, {
      method: 'POST',
      headers: {
        Authorization: getOrthancAuthHeader(),
        'Content-Type': 'text/plain',
      },
      body: studyInstanceUID,
    });

    if (!response.ok) return null;
    const matches = (await response.json()) as Array<{ Type: string; ID: string }>;
    const studyMatch = matches.find((m) => m.Type === 'Study');
    return studyMatch?.ID || null;
  } catch {
    return null;
  }
}

/**
 * Retrieve all instances for a study mapped to the canonical dicom_instance_reference_schema.
 * Uses Orthanc REST API for deep metadata extraction.
 */
export async function getStudyInstances(
  studyInstanceUID: string
): Promise<import('../types/ophthalmology-device-contract.types.js').DicomInstanceReference[]> {
  const orthancStudyId = await getOrthancStudyId(studyInstanceUID);
  if (!orthancStudyId) return [];

  const authHeader = getOrthancAuthHeader();
  const instancesList: import('../types/ophthalmology-device-contract.types.js').DicomInstanceReference[] = [];

  try {
    // 1. Fetch Orthanc Study Resource to get all Series
    const studyRes = await fetch(`${ORTHANC_BASE}/studies/${orthancStudyId}`, {
      headers: { Authorization: authHeader },
    });
    if (!studyRes.ok) return [];
    const studyObj = (await studyRes.json()) as { Series: string[] };

    // 2. Iterate each Series to collect Instances
    for (const seriesId of studyObj.Series || []) {
      const seriesRes = await fetch(`${ORTHANC_BASE}/series/${seriesId}`, {
        headers: { Authorization: authHeader },
      });
      if (!seriesRes.ok) continue;
      const seriesObj = (await seriesRes.json()) as { Instances: string[] };

      // 3. For each Instance, retrieve simplified tags and metadata
      for (const instanceId of seriesObj.Instances || []) {
        const [tagsRes, instRes] = await Promise.all([
          fetch(`${ORTHANC_BASE}/instances/${instanceId}/tags?simplify`, {
            headers: { Authorization: authHeader },
          }),
          fetch(`${ORTHANC_BASE}/instances/${instanceId}`, {
            headers: { Authorization: authHeader },
          }),
        ]);

        if (!tagsRes.ok) continue;
        const tags = (await tagsRes.json()) as Record<string, string>;
        const instMetadata = instRes.ok
          ? ((await instRes.json()) as { FileSize?: number; Header?: { TransferSyntaxUID?: string } })
          : undefined;

        const sopClassUid = tags.SOPClassUID || null;
        const sopInstanceUid = tags.SOPInstanceUID || null;
        const seriesInstanceUid = tags.SeriesInstanceUID || null;
        const modality = tags.Modality || null;
        const laterality = tags.Laterality || tags.ImageLaterality || null;

        const dateStr = tags.ContentDate || tags.AcquisitionDate || tags.InstanceCreationDate || '';
        const timeStr = tags.ContentTime || tags.AcquisitionTime || tags.InstanceCreationTime || '';
        const contentDatetime = dateStr
          ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}${timeStr ? 'T' + timeStr.slice(0, 2) + ':' + timeStr.slice(2, 4) + ':' + timeStr.slice(4, 6) : ''}`
          : null;

        const imageType = tags.ImageType || '';
        const isOriginal = imageType ? imageType.includes('ORIGINAL') : true;
        const isDerived = imageType ? imageType.includes('DERIVED') : false;

        instancesList.push({
          sop_class_uid: sopClassUid,
          sop_instance_uid: sopInstanceUid,
          series_instance_uid: seriesInstanceUid,
          instance_number: tags.InstanceNumber !== undefined && tags.InstanceNumber !== '' ? Number(tags.InstanceNumber) : null,
          modality,
          mime_type: 'application/dicom',
          transfer_syntax_uid: instMetadata?.Header?.TransferSyntaxUID || tags.TransferSyntaxUID || '1.2.840.10008.1.2.1',
          rows: tags.Rows !== undefined && tags.Rows !== '' ? Number(tags.Rows) : null,
          columns: tags.Columns !== undefined && tags.Columns !== '' ? Number(tags.Columns) : null,
          number_of_frames: tags.NumberOfFrames !== undefined && tags.NumberOfFrames !== '' ? Number(tags.NumberOfFrames) : null,
          photometric_interpretation: tags.PhotometricInterpretation || null,
          bits_allocated: tags.BitsAllocated !== undefined && tags.BitsAllocated !== '' ? Number(tags.BitsAllocated) : null,
          laterality,
          content_datetime: contentDatetime,
          orthanc_instance_id: instanceId,
          wado_rs_url: `${ORTHANC_BASE}${DICOMWEB_ROOT}/studies/${studyInstanceUID}/series/${seriesInstanceUid}/instances/${sopInstanceUid}`,
          thumbnail_url: `${ORTHANC_BASE}/instances/${instanceId}/preview`,
          is_original: isOriginal,
          is_derived: isDerived,
        });
      }
    }
  } catch (err) {
    console.error('[DICOMweb] Failed to collect instances for study:', err);
  }

  return instancesList;
}

// ---------------------------------------------------------------------------
// STOW-RS / Orthanc REST: Import
// ---------------------------------------------------------------------------

/**
 * Import DICOM instances into Orthanc via its native REST API.
 * Orthanc's /instances endpoint is simpler for file uploads than STOW-RS
 * multipart encoding. This is documented as a deliberate choice — STOW-RS
 * would be preferred if sending from another PACS or using a standard client.
 */
export async function importDicomInstance(
  dicomBuffer: Buffer
): Promise<{ orthancId: string; status: string }> {
  const response = await fetch(`${ORTHANC_BASE}/instances`, {
    method: 'POST',
    headers: {
      Authorization: getOrthancAuthHeader(),
      'Content-Type': 'application/dicom',
    },
    body: new Uint8Array(dicomBuffer),
  });

  if (!response.ok) {
    throw new Error(`Orthanc import failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as { ID: string; Status: string };
  return { orthancId: result.ID, status: result.Status };
}

/** Check Orthanc system status — used for health checks */
export async function checkOrthancHealth(): Promise<{
  ready: boolean;
  version?: string;
  dicomWebEnabled?: boolean;
}> {
  try {
    const authHeader = getOrthancAuthHeader();
    const [systemRes, pluginsRes] = await Promise.all([
      fetch(`${ORTHANC_BASE}/system`, { headers: { Authorization: authHeader } }),
      fetch(`${ORTHANC_BASE}/plugins`, { headers: { Authorization: authHeader } }).catch(() => null),
    ]);

    if (!systemRes.ok) {
      return { ready: false };
    }

    const system = await systemRes.json() as { Version: string };
    let dicomWebEnabled = false;

    if (pluginsRes && pluginsRes.ok) {
      const plugins = await pluginsRes.json() as string[];
      dicomWebEnabled = plugins.includes('dicom-web');
    }

    return {
      ready: true,
      version: system.Version,
      dicomWebEnabled,
    };
  } catch {
    return { ready: false };
  }
}
