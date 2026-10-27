import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSyntheticDicom } from '../scripts/generate-synthetic-dicom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Synthetic DICOM Generator Verification', () => {
  it('generates a valid DICOM byte buffer with 128-byte preamble and DICM magic identifier', () => {
    const buffer = generateSyntheticDicom('TEST_PATIENT', 'Test^Patient');

    expect(buffer.length).toBeGreaterThan(132);

    // Verify 128-byte preamble
    for (let i = 0; i < 128; i++) {
      expect(buffer[i]).toBe(0x00);
    }

    // Verify 'DICM' magic string at offset 128
    const magic = buffer.subarray(128, 132).toString('ascii');
    expect(magic).toBe('DICM');
  });

  it('verifies generated sample-data/synthetic-study-001.dcm on disk', () => {
    const filePath = path.resolve(__dirname, '../../sample-data/synthetic-study-001.dcm');
    expect(fs.existsSync(filePath)).toBe(true);

    const buffer = fs.readFileSync(filePath);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(128, 132).toString('ascii')).toBe('DICM');
  });
});
