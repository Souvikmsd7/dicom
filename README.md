# DocMed EHR — DICOM Integration Proof of Concept (POC)

A standalone medical imaging integration demonstrating how DICOM medical images are stored, queried via DICOMweb, linked to EHR patient records, and viewed through the OHIF Web Viewer.

Built for **Windows 10/11** using Docker Desktop, Orthanc PACS, OHIF Viewer v3, Express/TypeScript backend, and React/Vite/TypeScript frontend.

---

## Architecture Diagram

```
+------------------------------------------------------------------------------+
|                         Docker Environment (Bridge Network)                  |
|                                                                              |
|  +---------------------------+            +-------------------------------+  |
|  |  Orthanc DICOM Server     |  WADO-RS   |  OHIF Web Viewer              |  |
|  |  (orthancteam/orthanc)    |<-----------|  (ohif/app:v3.9.2)            |  |
|  |  - REST/DICOMweb: :8042   |            |  - Web UI: :3001              |  |
|  |  - DICOM C-STORE: :4242   |            +-------------------------------+  |
|  |  - Storage: Docker Volume |                                               |
|  +---------------------------+                                               |
+---------------^--------------------------------------------------------------+
                |
                | Backend Proxy (Credentials stay server-side)
                | QIDO-RS / WADO-RS / Ingest REST
                |
+---------------v--------------------------------------------------------------+
|  Local Host Services                                                         |
|                                                                              |
|  +-------------------------------------+      +---------------------------+  |
|  |  DocMed Backend Proxy (:3000)       | REST |  DocMed EHR UI (:5173)    |  |
|  |  - Patient Mapping Service          |<-----|  - Patient Directory      |  |
|  |  - Access Control & Verification    |      |  - Demographics Summary   |  |
|  |  - Ingestion Validation & Audit Log |      |  - DICOM Studies Table    |  |
|  |  - OHIF Launch URL Generator        |----->|  - Series Breakdown       |  |
|  +-------------------------------------+      |  - Synthetic Ingestion    |  |
|                                               +---------------------------+  |
+------------------------------------------------------------------------------+
```

---

## Port Allocation Matrix

| Service | Port | Host Binding | Avoid Conflicts / Notes |
|---|---|---|---|
| **Orthanc HTTP/DICOMweb** | `8042` | `localhost:8042` | Change `ORTHANC_HTTP_PORT` in `.env` if occupied |
| **Orthanc DICOM Storage** | `4242` | Internal | Kept inside Docker network for security |
| **OHIF Viewer** | `3001` | `localhost:3001` | Change `OHIF_PORT` in `.env` if occupied |
| **Backend API Proxy** | `3000` | `localhost:3000` | Change `BACKEND_PORT` in `.env` if occupied |
| **Frontend EHR UI** | `5173` | `localhost:5173` | Default Vite port |

---

## Prerequisites

1. **Windows 10/11 64-bit** with PowerShell 5.1 or PowerShell 7+
2. **Node.js 18+ (LTS)** with npm
3. **Docker Desktop for Windows** (with WSL2 backend enabled)

---

## Setup & Running Guide (Exact Windows PowerShell Commands)

### 1. Environment Configuration
Copy `.env.example` to `.env` (already done for local development):
```powershell
cd d:\dicom
Copy-Item .env.example .env
```

### 2. Start PACS & Viewer (Docker)
Ensure Docker Desktop is running, then execute:
```powershell
docker compose up -d
```
Verify container health:
```powershell
docker compose ps
```

### 3. Start the Backend API
In a new PowerShell window:
```powershell
cd d:\dicom\backend
npm install
npm run dev
```
> Verify backend health at: `http://localhost:3000/api/health`

### 4. Start the Frontend EHR Interface
In a third PowerShell window:
```powershell
cd d:\dicom\frontend
npm install
npm run dev
```
> Open `http://localhost:5173` in your browser.

---

## Documentation Suite & Guides

| Document | Audience & Scope |
| :--- | :--- |
| **[Installation & Quick Start Guide](file:///d:/dicom/docs/INSTALLATION_GUIDE.md)** | Non-technical clinic administrators & technicians: plain-language setup, prerequisites, and startup steps. |
| **[Device Connection Guide](file:///d:/dicom/docs/DEVICE_CONNECTION_GUIDE.md)** | Step-by-step instructions for ZEISS CIRRUS, Topcon TRC-NW400, SPECTRALIS, CLARUS, and HFA 3. |
| **[Device Setup Checklist](file:///d:/dicom/docs/DEVICE_SETUP_CHECKLIST.md)** | Printable 15-point clinical readiness and go-live authorization checklist. |
| **[Troubleshooting Guide](file:///d:/dicom/docs/TROUBLESHOOTING.md)** | Solutions for common errors (Docker, port conflicts, AE Title mismatch, demographic conflict). |
| **[Clinic Administrator Manual](file:///d:/dicom/docs/ADMIN_USER_GUIDE.md)** | Daily operations, reviewing failed jobs, retrying transfers, backups, and privacy logs. |
| **[Developer Setup & Architecture](file:///d:/dicom/docs/DEVELOPER_SETUP.md)** | Architecture, custom adapters, directory layout, and testing guide. |

---

## Preflight Diagnostic Tool

Run the automated system readiness check at any time to verify all services and ports:
```powershell
cd d:\dicom
node scripts/preflight-check.js
```

---

## Testing & Sample Data Workflow

### 1. Run Automated Test Suites
```powershell
cd d:\dicom\backend
npm test
```
*Executes 46 automated unit and integration tests across 5 suites covering the canonical 10-device JSON contract (`DocMed_Ophthalmology_Device_Data_Examples_Compatible.json`), multi-device registry & adapters, multi-criteria demographic reconciliation, study access controls, QIDO-RS JSON parsing, and synthetic DICOM binary structure.*

### 2. Validate Canonical Contract Samples
```powershell
cd d:\dicom\backend
npm run validate:samples
```
*Validates that all sample fixtures and templates strictly conform to version 1.0.1 across all 10 device categories.*

### 2. Generate a Synthetic DICOM Study
A valid sample study is already generated in `sample-data/synthetic-study-001.dcm`. To regenerate or produce fresh ones:
```powershell
cd d:\dicom\backend
npx tsx scripts/generate-synthetic-dicom.ts
```

### 3. Upload & View in the EHR
1. Open `http://localhost:5173`.
2. Click **"Ingest DICOM Data"** in the top-right corner.
3. Drag and drop `sample-data/synthetic-study-001.dcm`.
4. In the mapping section below the dropzone:
   - Select patient **EHR-001 — Thompson, Alex**.
   - Enter DICOM PatientID `BRAINIX_001`.
   - Click **"Confirm Mapping"**.
5. The study list will refresh with the newly ingested study.
6. Click **"View in OHIF"** to launch the study in the OHIF Viewer.

---

## Physical Medical Imaging Device Integration (Ophthalmology)

The POC evaluates network connectivity and DICOM conformance for real ophthalmic imaging devices.

### Receiving Destination Parameters
Configure the scanner console or vendor workstation with the following destination:
- **AE Title (AET):** `DOCMED`
- **DICOM Port:** `4242` (C-STORE SCP / C-ECHO SCP)
- **Host / IP Address:** `127.0.0.1` (or local workstation LAN IP)
- **DICOMweb Endpoint:** `http://<host>:8042/dicom-web`

### Candidate Ophthalmology Devices
- **OCT Scanners:** ZEISS CIRRUS (4000/5000/6000), Heidelberg Engineering SPECTRALIS (OCT & HRA+OCT)
- **Fundus Cameras:** ZEISS CLARUS (500/700), ZEISS VISUCAM, Topcon TRC-NW400
- **Ultra-Widefield Retinal Imaging:** Optos California, Optos Daytona
- **Visual Field Analyzers:** ZEISS Humphrey Field Analyzer (HFA 3 / HFA II-i)

### Acceptance Criteria & Verification Status
- **A. Sample-File Integration:** **PASSED & DEMONSTRATED** via synthetic and sample DICOM studies.
- **B. Physical Device Integration:** **BLOCKED / NOT TESTED (NO PHYSICAL HARDWARE)**. Verified ONLY when a physical device or vendor workstation has actually transferred a test study. Do not claim physical device testing passed until on-site hardware verification is complete.
- **Modality Worklist (MWL):** Evaluated as a Phase 2 capability. In production, the hospital EHR/RIS is the authoritative worklist provider, not the PACS archive.
- **Demographic Reconciliation:** Studies are matched against EHR patients using PatientID, DOB, and Sex validation. Mismatches trigger `DEMOGRAPHIC_MISMATCH` quarantine states.

For complete DICOM Conformance Statement analysis, vendor middleware review (ZEISS FORUM, Heidelberg HEYEX 2, Topcon IMAGEnet 6), and clinical engineering onboarding SOP, see [Ophthalmic Device Integration Guide](file:///d:/dicom/docs/ophthalmic-device-integration.md).

---

## Project Structure

```
d:\dicom/
├── docker-compose.yml              # Pinned Orthanc 24.12.1 + OHIF v3.9.2
├── .env.example                    # Template with placeholders
├── .env                            # Local configuration (gitignored)
├── .gitignore                      # Excludes secrets, binaries, volumes
├── README.md                       # Main instructions
│
├── orthanc/
│   └── orthanc.json                # Orthanc DICOMweb plugin & security settings
│
├── ohif/
│   └── ohif-config.js              # OHIF datasource pointing to Orthanc DICOMweb
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                # Express entry point
│   │   ├── config.ts               # Env-based configuration
│   │   ├── middleware/
│   │   │   ├── audit.ts            # Audit logging middleware
│   │   │   └── auth.ts             # Authentication middleware
│   │   ├── services/
│   │   │   ├── dicomweb.service.ts # QIDO-RS, WADO-RS, and import proxy
│   │   │   ├── patient-mapping.service.ts # EHR <-> DICOM identity resolution
│   │   │   └── viewer.service.ts   # OHIF launch URL generation
│   │   ├── routes/
│   │   │   ├── studies.routes.ts   # Study and patient endpoints
│   │   │   ├── import.routes.ts    # DICOM ingestion endpoint
│   │   │   └── viewer.routes.ts    # Viewer launch & health endpoints
│   │   └── types/
│   │       ├── dicom.types.ts      # DICOM tags and QIDO-RS types
│   │       └── api.types.ts        # Typed API responses
│   ├── scripts/
│   │   └── generate-synthetic-dicom.ts # Generates compliant sample DICOM files
│   └── tests/
│       ├── unit-and-integration.test.ts # Mapping & parsing tests
│       └── synthetic-dicom.test.ts      # Binary integrity tests
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── styles/index.css        # Premium dark medical UI design system
│       ├── services/imaging.service.ts # Frontend API client (no direct Orthanc)
│       ├── types/imaging.types.ts  # Frontend TypeScript interfaces
│       ├── pages/ImagingPage.tsx   # Integrated clinical imaging page
│       └── components/
│           ├── Layout.tsx          # Shell with status indicators & safety alert
│           ├── PatientSearch.tsx   # EHR patient directory & filtering
│           ├── PatientDemographics.tsx # Demographics & mapping badge
│           ├── StudyList.tsx       # QIDO-RS studies table & actions
│           ├── StudyDetails.tsx    # Series breakdown drawer & ophthalmic metadata
│           ├── ImportStudy.tsx     # Drag-and-drop ingestion & mapping tool
│           ├── DeviceIntegrationModal.tsx # Physical ophthalmic device connectivity modal
│           └── ui/                 # Spinner, ErrorState, EmptyState
│
├── sample-data/
│   ├── README.md                   # Instructions for acquiring sample datasets
│   └── synthetic-study-001.dcm     # Generated synthetic DICOM study
│
└── docs/
    ├── ophthalmic-device-integration.md # Physical device DCS matrix, MWL, and onboarding SOP
    ├── api-endpoints.md            # Complete API documentation
    ├── test-plan.md                # Test matrix, executed & pending tests
    ├── demo-guide.md               # Step-by-step stakeholder walkthrough
    └── limitations-and-production.md # HIPAA disclaimer & production checklist
```

---

## Troubleshooting

### Port 8042, 4242 or 3001 Already in Use
If another service occupies port 8042 or 3001, update `.env`:
```env
ORTHANC_HTTP_PORT=8045
OHIF_PORT=3005
```
Then restart Docker Compose: `docker compose up -d --force-recreate`.

### Docker Daemon Not Running
If `docker compose up -d` fails with an engine error:
1. Launch **Docker Desktop** from the Windows Start menu.
2. Wait until the whale icon in the taskbar turns solid green.
3. Re-run `docker compose up -d`.

### Patient Shows "No Imaging Studies Found"
Studies are queried by the patient's **mapped DICOM PatientID**. If you ingested a study with PatientID `BRAINIX_001`, ensure you mapped `EHR-001` to `BRAINIX_001` using the ingestion drawer.

---

## Documentation Links
- [Physical Ophthalmic Device Integration Guide](file:///d:/dicom/docs/ophthalmic-device-integration.md)
- [API Endpoints Reference](file:///d:/dicom/docs/api-endpoints.md)
- [Test Plan & Executed Results](file:///d:/dicom/docs/test-plan.md)
- [Demonstration Guide](file:///d:/dicom/docs/demo-guide.md)
- [Security, HIPAA Disclaimer & Production Readiness](file:///d:/dicom/docs/limitations-and-production.md)
