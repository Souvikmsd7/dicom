// =============================================================================
// DocMed EHR — Shared Folder & USB Vendor Companion Adapter
// Validates directory paths, permissions, and vendor export configurations
// =============================================================================
import fs from 'fs';
import path from 'path';
import type { DeviceRecord } from '../../types/device-registry.types.js';
import type { AdapterTestResult } from './dicom.adapter.js';

export async function testFolderConnection(device: DeviceRecord): Promise<AdapterTestResult> {
  const startTime = Date.now();
  const folderPath = device.integration_endpoint;

  if (!folderPath) {
    return {
      status: 'FAILED',
      latency_ms: 0,
      message: 'Folder or file path is required for folder/USB integration',
      details: { missing: 'integration_endpoint' },
    };
  }

  try {
    const resolvedPath = path.resolve(folderPath);
    if (!fs.existsSync(resolvedPath)) {
      // Check if parent directory exists to advise user
      const parent = path.dirname(resolvedPath);
      const parentExists = fs.existsSync(parent);
      return {
        status: 'FAILED',
        latency_ms: Date.now() - startTime,
        message: `Configured path does not exist: "${resolvedPath}". ${
          parentExists ? 'Parent directory exists; please create the dropzone folder.' : 'Please verify disk mount or network share.'
        }`,
        details: { path: resolvedPath, parentExists },
      };
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return {
        status: 'FAILED',
        latency_ms: Date.now() - startTime,
        message: `Path "${resolvedPath}" is a file, not a directory dropzone.`,
        details: { path: resolvedPath },
      };
    }

    // Test read access
    const files = fs.readdirSync(resolvedPath);
    const latency = Date.now() - startTime;

    return {
      status: 'SUCCESS',
      latency_ms: latency,
      message: `Folder dropzone verified at "${resolvedPath}". Currently contains ${files.length} file(s). Ready for incoming studies.`,
      details: { path: resolvedPath, file_count: files.length },
    };
  } catch (err: unknown) {
    return {
      status: 'FAILED',
      latency_ms: Date.now() - startTime,
      message: `Access denied or error reading folder: ${err instanceof Error ? err.message : String(err)}`,
      details: { path: folderPath, error: err instanceof Error ? err.message : String(err) },
    };
  }
}
