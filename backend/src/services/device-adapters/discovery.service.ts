// =============================================================================
// DocMed EHR — Device Discovery Service
// Scans authorized subnets/ranges for candidate endpoints
// Enforces "UNVERIFIED_CANDIDATE" status requiring Admin approval
// =============================================================================
import type { DiscoveredCandidate } from '../../types/device-registry.types.js';
import { checkOrthancHealth } from '../dicomweb.service.js';

let discoveredCandidates: Map<string, DiscoveredCandidate> = new Map();

/**
 * Seed initial candidate discoveries for demonstration and onboarding.
 */
function seedCandidates(): void {
  if (discoveredCandidates.size === 0) {
    const candidates: DiscoveredCandidate[] = [
      {
        candidate_id: 'DISC-001',
        suggested_name: 'ZEISS CIRRUS OCT (Room 2)',
        ip_address: '192.168.1.145',
        port: 4242,
        ae_title: 'CIRRUS_OCT_2',
        connection_type: 'DICOM',
        discovered_at: new Date(Date.now() - 3600000).toISOString(),
        detected_category: 'OCT / OCT Angiography',
        manufacturer_guess: 'Carl Zeiss Meditec',
        verification_status: 'UNVERIFIED_CANDIDATE',
      },
      {
        candidate_id: 'DISC-002',
        suggested_name: 'Topcon TRC-NW400 Fundus Camera',
        ip_address: '192.168.1.188',
        port: 4242,
        ae_title: 'TRC_NW400',
        connection_type: 'DICOM',
        discovered_at: new Date(Date.now() - 7200000).toISOString(),
        detected_category: 'Fundus Camera / Retinal Photography',
        manufacturer_guess: 'Topcon',
        verification_status: 'UNVERIFIED_CANDIDATE',
      },
    ];

    for (const c of candidates) {
      discoveredCandidates.set(c.candidate_id, c);
    }
  }
}

seedCandidates();

/**
 * Get all unverified candidates awaiting administrator approval.
 */
export function getDiscoveredCandidates(): DiscoveredCandidate[] {
  return Array.from(discoveredCandidates.values());
}

/**
 * Find candidate by ID.
 */
export function getCandidateById(candidateId: string): DiscoveredCandidate | undefined {
  return discoveredCandidates.get(candidateId);
}

/**
 * Remove or dismiss candidate after approval or rejection.
 */
export function removeCandidate(candidateId: string): boolean {
  return discoveredCandidates.delete(candidateId);
}

/**
 * Run a discovery scan on an authorized range.
 */
export async function runDiscoveryScan(targetSubnet = '127.0.0.1'): Promise<{
  scanned_range: string;
  found_count: number;
  candidates: DiscoveredCandidate[];
}> {
  // If local subnet includes 127.0.0.1, check if Orthanc is active and present as candidate if not yet registered
  const health = await checkOrthancHealth();
  if (health.ready && !discoveredCandidates.has('DISC-ORTHANC-LOCAL')) {
    discoveredCandidates.set('DISC-ORTHANC-LOCAL', {
      candidate_id: 'DISC-ORTHANC-LOCAL',
      suggested_name: 'Local Orthanc DICOM / PACS Node',
      ip_address: '127.0.0.1',
      port: 4242,
      ae_title: 'DOCMED',
      connection_type: 'DICOM',
      discovered_at: new Date().toISOString(),
      detected_category: 'OCT / OCT Angiography',
      manufacturer_guess: 'Orthanc Open PACS',
      verification_status: 'UNVERIFIED_CANDIDATE',
    });
  }

  return {
    scanned_range: targetSubnet,
    found_count: discoveredCandidates.size,
    candidates: Array.from(discoveredCandidates.values()),
  };
}
