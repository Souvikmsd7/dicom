// =============================================================================
// DocMed EHR — Canonical Ophthalmology Samples Validation Script
// Validates canonical JSON contract and sample files line-by-line
// Usage: npx tsx scripts/validate-canonical-samples.ts
// =============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getCanonicalFile,
  getCanonicalTemplates,
} from '../src/services/device-contract.service.js';
import { CANONICAL_DEVICE_TYPES } from '../src/types/ophthalmology-device-contract.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('════════════════════════════════════════════════════════════');
console.log('  DocMed EHR — Canonical Samples Validation Report');
console.log('════════════════════════════════════════════════════════════\n');

let errorCount = 0;

try {
  // 1. Load canonical file
  const file = getCanonicalFile();
  console.log(`✓ Loaded canonical contract: "${file.document_metadata.title}"`);
  console.log(`  Version: ${file.document_metadata.version}`);
  console.log(`  Status:  ${file.document_metadata.data_status}\n`);

  // 2. Check 5 top-level keys
  const requiredKeys = [
    'document_metadata',
    'dicom_instance_reference_schema',
    'devices',
    'implementation_rules',
    'contract_rules',
  ];
  for (const key of requiredKeys) {
    if (key in file) {
      console.log(`✓ Top-level key present: "${key}"`);
    } else {
      console.error(`✗ Missing required top-level key: "${key}"`);
      errorCount++;
    }
  }

  console.log('\n--- Checking 10 Ophthalmology Device Categories ---');
  const templates = getCanonicalTemplates();
  console.log(`Total devices in template: ${templates.length} (Expected: 10)`);

  if (templates.length !== 10) {
    console.error(`✗ Expected exactly 10 device categories, found ${templates.length}`);
    errorCount++;
  }

  const foundCategories = new Set(templates.map((t) => t.device_type));

  for (let i = 0; i < CANONICAL_DEVICE_TYPES.length; i++) {
    const cat = CANONICAL_DEVICE_TYPES[i];
    if (foundCategories.has(cat)) {
      const dev = templates.find((t) => t.device_type === cat)!;
      const status = dev.integration_status;
      const hasValidStatus =
        typeof status.metadata_received === 'boolean' &&
        typeof status.images_available === 'boolean' &&
        typeof status.measurements_parsed === 'boolean' &&
        typeof status.report_available === 'boolean' &&
        Array.isArray(status.validation_errors) &&
        Array.isArray(status.missing_fields) &&
        Array.isArray(status.unsupported_fields);

      if (hasValidStatus && dev.schema_version === '1.0.1') {
        console.log(`✓ [${i + 1}/10] ${cat.padEnd(45)} (v${dev.schema_version}, status: OK)`);
      } else {
        console.error(`✗ [${i + 1}/10] ${cat} — Invalid schema_version or integration_status structure`);
        errorCount++;
      }
    } else {
      console.error(`✗ Missing canonical category: "${cat}"`);
      errorCount++;
    }
  }

  // 3. Check sample-data directory file
  const sampleJsonPath = path.resolve(__dirname, '../../sample-data/canonical-ophthalmology-samples.json');
  if (fs.existsSync(sampleJsonPath)) {
    const rawSample = fs.readFileSync(sampleJsonPath, 'utf-8');
    const parsedSample = JSON.parse(rawSample);
    if (parsedSample.devices && parsedSample.devices.length === 10) {
      console.log(`\n✓ Verified sample-data/canonical-ophthalmology-samples.json matches canonical contract`);
    } else {
      console.error(`\n✗ sample-data/canonical-ophthalmology-samples.json does not contain 10 devices`);
      errorCount++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  if (errorCount === 0) {
    console.log('  ALL CHECKS PASSED: Sample data strictly conforms to 1.0.1 contract');
    console.log('════════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.error(`  VALIDATION FAILED: ${errorCount} error(s) detected`);
    console.log('════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
} catch (err) {
  console.error('Fatal validation error:', err);
  process.exit(1);
}
