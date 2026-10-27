// =============================================================================
// DocMed DICOM POC — Synthetic DICOM File Generator
// =============================================================================
// Generates a valid minimal synthetic DICOM Secondary Capture file with
// standard 128-byte preamble + "DICM" magic and core DICOM tags.
//
// Usage: npx tsx scripts/generate-synthetic-dicom.ts [outputPath]
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function writeTag(
  buf: number[],
  group: number,
  element: number,
  vr: string,
  value: string | number[]
) {
  // Group & Element (Little Endian, 2 bytes each)
  buf.push(group & 0xff, (group >> 8) & 0xff);
  buf.push(element & 0xff, (element >> 8) & 0xff);

  // VR (2 ASCII chars)
  buf.push(vr.charCodeAt(0), vr.charCodeAt(1));

  let valBytes: number[];
  if (typeof value === 'string') {
    valBytes = Array.from(Buffer.from(value, 'latin1'));
    // DICOM values must be even-length
    if (valBytes.length % 2 !== 0) {
      valBytes.push(0x20); // Pad with space
    }
  } else {
    valBytes = value;
  }

  // Length (2 bytes for short VRs)
  const len = valBytes.length;
  buf.push(len & 0xff, (len >> 8) & 0xff);

  // Value bytes
  buf.push(...valBytes);
}

export function generateSyntheticDicom(
  patientId = 'BRAINIX_001',
  patientName = 'Brainix^Patient',
  studyUid = '1.2.826.0.1.3680043.8.498.1001',
  seriesUid = '1.2.826.0.1.3680043.8.498.1001.1',
  sopUid = '1.2.826.0.1.3680043.8.498.1001.1.1'
): Buffer {
  const bytes: number[] = [];

  // 1. 128-byte preamble (zeros)
  for (let i = 0; i < 128; i++) {
    bytes.push(0x00);
  }

  // 2. "DICM" Prefix (4 bytes)
  bytes.push('D'.charCodeAt(0), 'I'.charCodeAt(0), 'C'.charCodeAt(0), 'M'.charCodeAt(0));

  // 3. File Meta Information
  // (0002,0010) Transfer Syntax UID: Explicit VR Little Endian (1.2.840.10008.1.2.1)
  writeTag(bytes, 0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1');
  // (0002,0002) Media Storage SOP Class UID: Secondary Capture (1.2.840.10008.5.1.4.1.1.7)
  writeTag(bytes, 0x0002, 0x0002, 'UI', '1.2.840.10008.5.1.4.1.1.7');
  // (0002,0003) Media Storage SOP Instance UID
  writeTag(bytes, 0x0002, 0x0003, 'UI', sopUid);

  // 4. Dataset Attributes
  // (0008,0016) SOP Class UID
  writeTag(bytes, 0x0008, 0x0016, 'UI', '1.2.840.10008.5.1.4.1.1.7');
  // (0008,0018) SOP Instance UID
  writeTag(bytes, 0x0008, 0x0018, 'UI', sopUid);
  // (0008,0020) Study Date
  writeTag(bytes, 0x0008, 0x0020, 'DA', '20241026');
  // (0008,0030) Study Time
  writeTag(bytes, 0x0008, 0x0030, 'TM', '143000');
  // (0008,0050) Accession Number
  writeTag(bytes, 0x0008, 0x0050, 'SH', 'ACC-2024-001');
  // (0008,0060) Modality
  writeTag(bytes, 0x0008, 0x0060, 'CS', 'OT');
  // (0008,0090) Referring Physician Name
  writeTag(bytes, 0x0008, 0x0090, 'PN', 'Welch^Marcus^Dr');
  // (0008,1030) Study Description
  writeTag(bytes, 0x0008, 0x1030, 'LO', 'Synthetic Diagnostic Quality Assurance Study');

  // Patient Info
  // (0010,0010) Patient's Name
  writeTag(bytes, 0x0010, 0x0010, 'PN', patientName);
  // (0010,0020) Patient ID
  writeTag(bytes, 0x0010, 0x0020, 'LO', patientId);
  // (0010,0030) Patient's Birth Date
  writeTag(bytes, 0x0010, 0x0030, 'DA', '19850315');
  // (0010,0040) Patient's Sex
  writeTag(bytes, 0x0010, 0x0040, 'CS', 'M');

  // Study / Series / Instance Info
  // (0020,000D) Study Instance UID
  writeTag(bytes, 0x0020, 0x000d, 'UI', studyUid);
  // (0020,000E) Series Instance UID
  writeTag(bytes, 0x0020, 0x000e, 'UI', seriesUid);
  // (0020,0011) Series Number
  writeTag(bytes, 0x0020, 0x0011, 'IS', '1');
  // (0020,0013) Instance Number
  writeTag(bytes, 0x0020, 0x0013, 'IS', '1');

  // Image Pixel Metadata
  // (0028,0002) Samples Per Pixel = 1 (Monochrome)
  writeTag(bytes, 0x0028, 0x0002, 'US', [0x01, 0x00]);
  // (0028,0004) Photometric Interpretation
  writeTag(bytes, 0x0028, 0x0004, 'CS', 'MONOCHROME2');
  // (0028,0010) Rows = 64
  writeTag(bytes, 0x0028, 0x0010, 'US', [0x40, 0x00]);
  // (0028,0011) Columns = 64
  writeTag(bytes, 0x0028, 0x0011, 'US', [0x40, 0x00]);
  // (0028,0100) Bits Allocated = 8
  writeTag(bytes, 0x0028, 0x0100, 'US', [0x08, 0x00]);
  // (0028,0101) Bits Stored = 8
  writeTag(bytes, 0x0028, 0x0101, 'US', [0x08, 0x00]);
  // (0028,0102) High Bit = 7
  writeTag(bytes, 0x0028, 0x0102, 'US', [0x07, 0x00]);
  // (0028,0103) Pixel Representation = 0 (Unsigned)
  writeTag(bytes, 0x0028, 0x0103, 'US', [0x00, 0x00]);

  // Pixel Data (7FE0,0010) - 64x64 synthetic gradient pattern
  const pixelBytes: number[] = [];
  for (let r = 0; r < 64; r++) {
    for (let c = 0; c < 64; c++) {
      // Checkerboard/gradient synthetic pattern
      const val = (r * 4 + c * 4) % 256;
      pixelBytes.push(val);
    }
  }

  // (7FE0,0010) OB VR
  bytes.push(0xe0, 0x7f, 0x10, 0x00); // Tag (7FE0,0010)
  bytes.push('O'.charCodeAt(0), 'B'.charCodeAt(0)); // VR
  bytes.push(0x00, 0x00); // 2 reserved bytes for OB
  // 4-byte length
  const pLen = pixelBytes.length;
  bytes.push(pLen & 0xff, (pLen >> 8) & 0xff, (pLen >> 16) & 0xff, (pLen >> 24) & 0xff);
  bytes.push(...pixelBytes);

  return Buffer.from(bytes);
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('generate-synthetic-dicom.ts')) {
  const targetDir = path.resolve(__dirname, '../../sample-data');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const outPath = path.join(targetDir, 'synthetic-study-001.dcm');
  const buffer = generateSyntheticDicom();
  fs.writeFileSync(outPath, buffer);

  console.log(`✓ Synthetic DICOM generated successfully at: ${outPath}`);
  console.log(`  File size: ${buffer.length} bytes`);
  console.log(`  Patient ID: BRAINIX_001`);
  console.log(`  Study UID:  1.2.826.0.1.3680043.8.498.1001`);
}
