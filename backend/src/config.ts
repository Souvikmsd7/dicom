// =============================================================================
// DocMed DICOM POC — Environment-based Configuration
// =============================================================================
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level up from backend/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.BACKEND_PORT || '3000', 10),

  orthanc: {
    baseUrl: `http://${process.env.ORTHANC_HOST || '127.0.0.1'}:${process.env.ORTHANC_HTTP_PORT || '8042'}`,
    username: process.env.ORTHANC_USERNAME || 'orthanc',
    password: process.env.ORTHANC_PASSWORD || 'orthanc',
    dicomWebRoot: '/dicom-web',
  },

  ohif: {
    baseUrl: `http://localhost:${process.env.OHIF_PORT || '3001'}`,
  },

  cors: {
    origin: process.env.BACKEND_CORS_ORIGIN || 'http://localhost:5173',
  },
} as const;

/**
 * Returns Basic Auth header value for Orthanc API requests.
 * This is kept server-side only — never exposed to the frontend.
 */
export function getOrthancAuthHeader(): string {
  const credentials = Buffer.from(
    `${config.orthanc.username}:${config.orthanc.password}`
  ).toString('base64');
  return `Basic ${credentials}`;
}
