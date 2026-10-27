// =============================================================================
// DocMed EHR — Device Adapter Factory
// Dispatches connectivity checks to the appropriate protocol adapter
// =============================================================================
import type { DeviceRecord, ConnectionHistoryEntry } from '../../types/device-registry.types.js';
import { testDicomConnection, type AdapterTestResult } from './dicom.adapter.js';
import { testDicomwebConnection } from './dicomweb.adapter.js';
import { testFolderConnection } from './folder.adapter.js';

export async function testDeviceConnectivity(device: DeviceRecord): Promise<AdapterTestResult> {
  switch (device.connection_type) {
    case 'DICOM':
      return testDicomConnection(device);
    case 'DICOMweb':
      return testDicomwebConnection(device);
    case 'FOLDER':
    case 'USB_VENDOR':
      return testFolderConnection(device);
    default:
      return {
        status: 'FAILED',
        latency_ms: 0,
        message: `Unsupported connection type: "${device.connection_type}"`,
        details: { connection_type: device.connection_type },
      };
  }
}
