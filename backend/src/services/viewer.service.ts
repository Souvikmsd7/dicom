// =============================================================================
// DocMed DICOM POC — Viewer Launch Service
// =============================================================================
// Generates authorized OHIF Viewer launch URLs for specific studies.
// =============================================================================
import { config } from '../config.js';

export interface ViewerLaunchParams {
  studyInstanceUID: string;
  ehrPatientId: string;
}

/**
 * Generate an OHIF Viewer URL for a specific study.
 *
 * OHIF v3 URL pattern: /viewer?StudyInstanceUIDs=<UID>
 *
 * In production, this would generate a short-lived, signed token
 * that the viewer backend validates before serving images.
 * For this POC, we generate the direct URL.
 */
export function generateViewerUrl(params: ViewerLaunchParams): {
  viewerUrl: string;
  studyInstanceUID: string;
} {
  const viewerUrl = `${config.ohif.baseUrl}/viewer?StudyInstanceUIDs=${encodeURIComponent(params.studyInstanceUID)}`;

  return {
    viewerUrl,
    studyInstanceUID: params.studyInstanceUID,
  };
}
