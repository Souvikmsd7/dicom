# DocMed EHR — Developer Setup, Architecture & Testing Guide

This document is intended for software engineers and systems integrators working on the DocMed medical imaging codebase.

---

## 1. Architectural Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                        Docker Environment (docmed-net)                            |
|                                                                                   |
|  +---------------------------+            +----------------------------------+    |
|  |  Orthanc DICOM Server     |  WADO-RS   |  OHIF Web Viewer                 |    |
|  |  (orthancteam/orthanc)    |<-----------|  (ohif/app:latest)               |    |
|  |  - REST/DICOMweb: :8042   |            |  - Web UI: :3001                 |    |
|  |  - DICOM C-STORE: :4242   |            +----------------------------------+    |
|  |  - Storage: Local Volume  |                                                    |
|  +---------------------------+                                                    |
+-----------------^-----------------------------------------------------------------+
                  |
                  | Server-side authenticated DICOMweb (QIDO-RS / WADO-RS)
                  |
+-----------------v-----------------------------------------------------------------+
|  Host Workstation Services                                                        |
|                                                                                   |
|  +------------------------------------+       +--------------------------------+  |
|  |  DocMed Backend Proxy (:3000)      |  REST |  DocMed EHR UI (:5173)         |  |
|  |  - Device Registry Service (Disk)  |<------|  - Clinical Imaging Page       |  |
|  |  - Multi-Device Protocol Adapters  |       |  - Multi-Device Dashboard      |  |
|  |  - Demographic Cross-Check Guard   |       |  - 7-Step Connection Wizard    |  |
|  |  - Canonical 1.0.1 Contract Parser |------>|  - Ingestion Error Retry Queue |  |
|  +------------------------------------+       +--------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Directory Layout

```
d:\dicom\
├── .env                                       # Local active environment configuration
├── .env.example                               # Environment template
├── docker-compose.yml                         # Orthanc and OHIF containers definition
├── DocMed_Ophthalmology_Device_Data_Examples_Compatible.json  # Canonical source of truth
├── scripts\
│   └── preflight-check.js                     # Preflight diagnostic CLI tool
├── backend\
│   ├── data\                                  # Persistent JSON registry files
│   │   ├── devices-registry.json
│   │   └── ingestion-jobs.json
│   ├── scripts\
│   │   ├── generate-synthetic-dicom.ts        # Synthetic DICOM binary generator
│   │   └── validate-canonical-samples.ts      # Canonical contract schema validator
│   ├── src\
│   │   ├── config.ts                          # Loaded environment settings
│   │   ├── index.ts                           # Express app entry point
│   │   ├── middleware\                        # Auth & audit logging
│   │   ├── routes\                            # REST routers (devices, studies, import, viewer)
│   │   ├── services\                          # Business logic & registry
│   │   │   └── device-adapters\               # DICOM, DICOMweb, Folder, Discovery adapters
│   │   └── types\                             # TypeScript definitions
│   └── tests\                                 # Vitest automated test suites
├── frontend\
│   └── src\
│       ├── components\                        # React components (Wizard, Modals, StudyDetails)
│       ├── pages\                             # ImagingPage & DeviceManagementPage
│       └── services\                          # Typed API client
└── docs\                                      # Non-technical and operator manuals
```

---

## 3. Running Automated Tests

DocMed includes 5 comprehensive test suites covering all 16 acceptance criteria:

```powershell
cd d:\dicom\backend
npm test
```

### Test Suites Included:
1. `tests/sample-data-migration.test.ts`:
   - Validates all 10 device categories against `DocMed_Ophthalmology_Device_Data_Examples_Compatible.json`.
   - Confirms schema version `1.0.1`, typed nulls, and integration status flags.
   - Tests device registry CRUD, unique IDs, AE Title validation, and job retries.
2. `tests/device-contract.test.ts`:
   - Validates all 14 test scenarios for canonical contract adaptation.
   - Checks image availability, measurement parsing, and missing fields tracking.
3. `tests/ophthalmic-reconciliation.test.ts`:
   - Validates multi-criteria demographic cross-checks (EHR ID, PatientID, DOB, Sex).
   - Detects `DEMOGRAPHIC_MISMATCH` and `QUARANTINED` conditions.
4. `tests/unit-and-integration.test.ts`:
   - Tests patient mapping service, QIDO-RS JSON parsing, and study access controls.
5. `tests/synthetic-dicom.test.ts`:
   - Tests synthetic DICOM binary structure (128-byte preamble, `DICM` magic header, Little Endian tags).

---

## 4. Validating Canonical Contract Samples

Run the dedicated validator anytime you modify sample payloads or fixtures:

```powershell
cd d:\dicom\backend
npm run validate:samples
```

---

## 5. Adding a Custom Device Adapter

To support a new communication protocol (e.g., proprietary vendor socket):

1. Create `backend/src/services/device-adapters/<protocol>.adapter.ts`.
2. Implement the `AdapterTestResult` contract:
   ```typescript
   export async function testCustomConnection(device: DeviceRecord): Promise<AdapterTestResult> {
     // Implement socket/probe logic
   }
   ```
3. Register the adapter in `backend/src/services/device-adapters/adapter-factory.ts`.
4. Add the connection type to `DeviceConnectionType` in `device-registry.types.ts`.
