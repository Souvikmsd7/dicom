// =============================================================================
// DocMed DICOM POC — API Response Types
// =============================================================================

/** Standard API success response */
export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

/** Standard API error response */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
  timestamp: string;
}

/** Patient mapping — links an EHR patient ID to DICOM PatientID(s) */
export interface PatientMapping {
  ehrPatientId: string;
  dicomPatientId: string;
  patientName: string;
  verified: boolean;
  createdAt: string;
}

/** Viewer launch response */
export interface ViewerLaunchInfo {
  viewerUrl: string;
  studyInstanceUID: string;
  expiresAt?: string;
}

/** Import result */
export interface ImportResult {
  orthancId: string;
  studyInstanceUID: string;
  patientId: string;
  patientName: string;
  instanceCount: number;
}

/** Builds a success response */
export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/** Builds an error response */
export function errorResponse(
  code: string,
  message: string,
  details?: string
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, details },
    timestamp: new Date().toISOString(),
  };
}
