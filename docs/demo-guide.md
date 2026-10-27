# DocMed EHR — DICOM Integration POC: Demonstration Guide

This guide is designed for engineering leads, healthcare product owners, and developers to walk through the end-to-end medical imaging workflow.

---

## 1. Quick Start (Terminal Commands)

Open three PowerShell windows:

### Terminal 1: Docker Services (PACS & Viewer)
```powershell
cd d:\dicom
docker compose up -d
```
> Orthanc PACS will run at `http://localhost:8042` and OHIF Viewer at `http://localhost:3001`.

### Terminal 2: Backend API Proxy
```powershell
cd d:\dicom\backend
npm run dev
```
> Backend API will run at `http://localhost:3000`.

### Terminal 3: EHR Frontend
```powershell
cd d:\dicom\frontend
npm run dev
```
> EHR web interface will run at `http://localhost:5173`.

---

## 2. Interactive Demonstration Walkthrough

### Step 1: Open the EHR Interface
1. Open your browser and navigate to `http://localhost:5173`.
2. Notice the top status bar:
   - **API: Active** (Green pulse indicator)
   - **Orthanc PACS: Connected** (Reflects live `/system` readiness check)
   - Safety banner indicating **Synthetic/De-identified data only**.

### Step 2: Select an EHR Patient
1. On the left sidebar, click on **Alex Thompson** (`EHR-001`, `MRN-100001`).
2. Notice the **Patient Demographics & Identity Verification** card.
3. Observe the **Associated DICOM ID** currently shows **Unmapped** or **Identity Mapping Required**.
   - *Architecture Note:* The EHR does **not** assume an EHR patient ID matches imaging PACS IDs.

### Step 3: Ingest a Synthetic DICOM Study
1. In the top right header, click **"Ingest DICOM Data"**.
2. A synthetic DICOM file is pre-generated in `sample-data/synthetic-study-001.dcm`.
   - Alternatively, generate new ones at any time via:
     `npx tsx backend/scripts/generate-synthetic-dicom.ts`
3. Drag and drop `sample-data/synthetic-study-001.dcm` into the dropzone.
4. The file is uploaded through the backend proxy (`POST /api/import`), validated for DICOM magic bytes, and ingested into Orthanc.
5. A green confirmation banner displays the Orthanc instance UUID.

### Step 4: Establish the Verified Identity Mapping
1. In the same tool drawer under **Explicit EHR ↔ DICOM Patient Identifier Mapping**:
   - EHR Patient: Select **EHR-001 — Thompson, Alex**
   - DICOM PatientID: Enter `BRAINIX_001` (matches tag `0010,0020` in the sample study)
2. Click **Confirm Mapping**.
3. The association is cryptographically stored in the backend identity registry.

### Step 5: Query Studies (QIDO-RS)
1. The study list refreshes automatically.
2. The table displays:
   - **Study Date:** 2024-10-26
   - **Modality:** OT (or MR/CT for clinical datasets)
   - **Description:** Synthetic Diagnostic Quality Assurance Study
   - **Accession #:** ACC-2024-001
   - **Series / Instances:** 1 series • 1 inst.
3. Click the **"Details"** button:
   - The breakdown drawer queries `/api/studies/:studyInstanceUID/series`.
   - Modality, frame count, body part, and Series Instance UID are presented.

### Step 6: Launch OHIF Medical Viewer
1. Click the primary button: **"View in OHIF"**.
2. The browser dispatches `POST /api/viewer/launch`:
   - The backend validates that `EHR-001` is authorized for `BRAINIX_001`'s study.
   - The backend produces an authorized launch URL:
     `http://localhost:3001/viewer?StudyInstanceUIDs=1.2.826.0.1.3680043.8.498.1001`
3. A new tab opens OHIF Viewer.
4. OHIF uses DICOMweb WADO-RS to retrieve and render the image slice with full diagnostic tools (windowing, zoom, pan, measurements).

### Step 7: Inspect Audit Logging
1. In your browser or curl, visit:
   `http://localhost:3000/api/audit`
2. Notice detailed audit records:
   - `QUERY_PATIENT_STUDIES`
   - `IMPORT_DICOM`
   - `VIEWER_LAUNCH`
   - IP address, timestamp, status code, and patient context are preserved.
