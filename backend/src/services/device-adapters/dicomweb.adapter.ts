// =============================================================================
// DocMed EHR — DICOMweb Connection Adapter
// Tests QIDO-RS / WADO-RS / STOW-RS HTTP endpoints
// =============================================================================
import type { DeviceRecord } from '../../types/device-registry.types.js';
import type { AdapterTestResult } from './dicom.adapter.js';

export async function testDicomwebConnection(device: DeviceRecord): Promise<AdapterTestResult> {
  const startTime = Date.now();
  const endpoint = device.integration_endpoint || (device.ip_address ? `http://${device.ip_address}:${device.port || 8042}/dicom-web` : null);

  if (!endpoint) {
    return {
      status: 'FAILED',
      latency_ms: 0,
      message: 'Integration endpoint URL is required for DICOMweb connection',
      details: { missing: 'integration_endpoint' },
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const headers: Record<string, string> = {
      Accept: 'application/json, application/dicom+json',
    };

    if (device.secrets?.auth_header) {
      headers.Authorization = device.secrets.auth_header;
    } else if (device.secrets?.username && device.secrets?.password) {
      const basic = Buffer.from(`${device.secrets.username}:${device.secrets.password}`).toString('base64');
      headers.Authorization = `Basic ${basic}`;
    }

    const res = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latency = Date.now() - startTime;
    if (res.ok || res.status === 401 || res.status === 403) {
      if (res.status === 401 || res.status === 403) {
        return {
          status: 'FAILED',
          latency_ms: latency,
          message: `DICOMweb endpoint reached at ${endpoint}, but authentication failed (HTTP ${res.status}). Verify credentials.`,
          details: { status: res.status, endpoint },
        };
      }
      return {
        status: 'SUCCESS',
        latency_ms: latency,
        message: `DICOMweb endpoint verified at ${endpoint} (HTTP ${res.status} OK)`,
        details: { status: res.status, endpoint },
      };
    } else {
      return {
        status: 'FAILED',
        latency_ms: latency,
        message: `DICOMweb endpoint returned error HTTP ${res.status} ${res.statusText}`,
        details: { status: res.status, endpoint },
      };
    }
  } catch (err: unknown) {
    const latency = Date.now() - startTime;
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      status: isAbort ? 'TIMEOUT' : 'FAILED',
      latency_ms: latency,
      message: isAbort
        ? `DICOMweb endpoint timed out after 4000ms: ${endpoint}`
        : `Failed to reach DICOMweb endpoint: ${err instanceof Error ? err.message : String(err)}`,
      details: { endpoint, error: err instanceof Error ? err.message : String(err) },
    };
  }
}
