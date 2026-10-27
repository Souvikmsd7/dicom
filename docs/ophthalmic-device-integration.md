# Physical Medical Imaging Device Integration Guide — Ophthalmology

This document provides technical analysis, DICOM Conformance Statement (DCS) reviews, receiving destination networking configurations, and clinical engineering onboarding standard operating procedures (SOPs) for connecting physical ophthalmology imaging modalities to the DocMed EHR / Orthanc PACS Proof of Concept (POC).

---

## 1. Executive Summary & Acceptance Criteria Delineation

To maintain strict regulatory, clinical safety, and engineering integrity, the DocMed DICOM POC explicitly distinguishes between two verification tiers:

| Verification Tier | Scope & Methodology | Verification Status | Notes |
| :--- | :--- | :--- | :--- |
| **A. Sample-File Integration** | Synthetic / de-identified DICOM files (CT, Ophthalmic Tomography slices) ingested into Orthanc via STOW-RS, mapped to EHR patient identifiers, indexed via DICOMweb (QIDO-RS / WADO-RS), and rendered in OHIF Viewer. | **PASSED & DEMONSTRATED** | Fully functional in Docker environment with 19/19 passing automated integration tests. |
| **B. Physical Device Integration** | Direct DICOM network transfer (C-STORE over TCP/IP) from real ophthalmology scanner consoles or vendor acquisition workstations across the clinical LAN into Orthanc. | **BLOCKED / NOT TESTED (NO PHYSICAL HARDWARE)** | Orthanc DICOM C-STORE SCP is active and verified on port `4242` (`DOCMED`), but no physical medical devices are connected to this development workstation. Direct device testing is **not claimed as passed** until verified with physical hardware on-site. |

> [!WARNING]
> **Clinical & IT Authorization Safeguards:**
> - These candidate devices are under technical evaluation and are **not guaranteed compatible integrations** out-of-the-box.
> - Do not claim support for a specific model until its exact software version and manufacturer DICOM Conformance Statement (DCS) have been reviewed.
> - Never modify production scanner configuration settings or transmit real patient studies without hospital clinical engineering and IT security authorization.
> - Always perform initial C-STORE verification using vendor-provided test phantoms or synthetic test examinations.

---

## 2. Orthanc DICOM Receiving Node Configuration

Orthanc is configured as an always-listening DICOM Storage Service Class Provider (C-STORE SCP) and Verification Service Class Provider (C-ECHO SCP) exposed on standard TCP port `4242`.

### Receiving Node Parameters

| Parameter | Value | Description |
| :--- | :--- | :--- |
| **Application Entity Title (AE Title)** | `DOCMED` | Configured in `orthanc/orthanc.json` (`DicomAet`). Must be entered identically in the scanner console (case-sensitive). |
| **DICOM Port** | `4242` | Native DICOM C-STORE / C-ECHO port mapped to host (`0.0.0.0:4242->4242/tcp`). |
| **Host / IP Address** | `127.0.0.1` (Local) / `<LAN_IP>` | Workstation IP on the clinical subnet (e.g., `192.168.1.50`). |
| **C-ECHO Verification** | Supported (`DicomAlwaysAllowEcho: true`) | Allows scanners to perform "DICOM Ping" connectivity tests without pre-registration. |
| **C-STORE Storage** | Supported (`DicomAlwaysAllowStore: true`) | Accepts DICOM objects from configured ophthalmic modalities. |
| **DICOMweb Endpoint** | `http://<host>:8042/dicom-web` | QIDO-RS, WADO-RS, and STOW-RS endpoint for DocMed EHR and OHIF. |
| **Firewall Requirements** | Inbound TCP `4242` & `8042` | Windows Defender Firewall rule allowing inbound TCP connections on port 4242. |

### DCMTK Network Verification Commands

Clinical engineers can test connectivity from a command-line workstation on the same subnet using standard DCMTK utilities:

```bash
# 1. Test DICOM Verification (C-ECHO Ping)
echoscu -v -aec DOCMED 127.0.0.1 4242

# 2. Test DICOM Image Store (C-STORE)
storescu -v -aec DOCMED 127.0.0.1 4242 test_ophthalmic_image.dcm
```

---

## 3. Candidate Ophthalmology Devices & Conformance Analysis

### 3.1 Device Category Matrix

```
+-------------------------------------------------------------------------------------------------------------+
|                                  OPHTHALMIC MODALITY INTEGRATION MATRIX                                      |
+--------------------------+-----------------------+-------------------------+------------------+-------------+
| Device Model             | Modality & Category   | Supported SOP Classes   | Workstation Role | License Req.|
+--------------------------+-----------------------+-------------------------+------------------+-------------+
| ZEISS CIRRUS             | OPT                   | Ophthalmic Tomography   | ZEISS FORUM /    | DICOM Conn. |
| (4000 / 5000 / 6000)     | (OCT Scanner)         | Storage                 | Direct C-STORE   | License     |
+--------------------------+-----------------------+-------------------------+------------------+-------------+
| Heidelberg SPECTRALIS    | OPT                   | Ophthalmic Tomography & | Heidelberg       | HEYEX DICOM |
| (OCT / HRA+OCT)          | (OCT Scanner)         | Secondary Capture       | HEYEX 2 PACS     | Import/Exp. |
+--------------------------+-----------------------+-------------------------+------------------+-------------+
| ZEISS CLARUS             | OP                    | Ophthalmic Photo 8-Bit  | ZEISS FORUM /    | DICOM Export|
| (500 / 700)              | (UWF True-Color)      | & 16-Bit Storage        | Direct C-STORE   | License     |
+--------------------------+-----------------------+-------------------------+------------------+-------------+
| ZEISS VISUCAM            | OP                    | Ophthalmic Photo 8-Bit  | ZEISS FORUM /    | DICOM Export|
| (224 / 524)              | (Fundus Camera)       | & 16-Bit Storage        | Direct C-STORE   | License     |
+--------------------------+-----------------------+-------------------------+------------------+-------------+
| Topcon TRC-NW400         | OP                    | Ophthalmic Photo 8-Bit  | Direct C-STORE / | Built-in or |
|                          | (Non-Mydriatic Fundus)| Storage                 | IMAGEnet 6       | IMAGEnet Lic|
+--------------------------+-----------------------+-------------------------+------------------+-------------+
| Optos California /       | OP                    | Ophthalmic Photo 8-Bit  | OptosAdvance /   | Optos DICOM |
| Daytona                  | (UWF Retinal Camera)  | & 16-Bit Storage        | Direct C-STORE   | Export Lic. |
+--------------------------+-----------------------+-------------------------+------------------+-------------+
| ZEISS Humphrey Field     | OPV / DOC             | Encapsulated PDF &      | ZEISS FORUM /    | HFA-NET Pro |
| Analyzer (HFA 3 / II-i)  | (Visual Field)        | Raw Data Storage        | Direct C-STORE   | (HFA II-i)  |
+--------------------------+-----------------------+-------------------------+------------------+-------------+
```

### 3.2 Detailed SOP Class & Transfer Syntax Specifications

| Device Type | SOP Class Name | SOP Class UID | Supported Transfer Syntaxes |
| :--- | :--- | :--- | :--- |
| **OCT Scanners** (CIRRUS, SPECTRALIS) | Ophthalmic Tomography Image Storage | `1.2.840.10008.5.1.4.1.1.77.1.5.4` | Explicit VR Little Endian (`1.2.840.10008.1.2.1`), Implicit VR Little Endian (`1.2.840.10008.1.2`), JPEG Lossless (`1.2.840.10008.1.2.4.70`) |
| **Fundus Cameras & UWF** (CLARUS, VISUCAM, TRC-NW400, Optos) | Ophthalmic Photography 8-Bit Image Storage | `1.2.840.10008.5.1.4.1.1.77.1.5.1` | Explicit VR Little Endian, JPEG Baseline (Process 1) (`1.2.840.10008.1.2.4.50`) |
| **High Dynamic Range Retinal** (Optos, CLARUS 700) | Ophthalmic Photography 16-Bit Image Storage | `1.2.840.10008.5.1.4.1.1.77.1.5.2` | Explicit VR Little Endian, JPEG 2000 Part 1 Lossless / Lossy (`1.2.840.10008.1.2.4.90` / `.91`) |
| **Visual Field Reports** (HFA 3 / HFA II-i) | Encapsulated PDF Storage | `1.2.840.10008.5.1.4.1.1.104.1` | Explicit VR Little Endian |
| **Visual Field Raw Test Data** (HFA 3) | Raw Data Storage | `1.2.840.10008.5.1.4.1.1.66` | Explicit VR Little Endian |
| **Legacy Scanners** | Secondary Capture Image Storage | `1.2.840.10008.5.1.4.1.1.7` | Explicit VR Little Endian, Implicit VR Little Endian |

---

## 4. Vendor Middleware Workstations vs. Direct PACS Transfer

Most clinical ophthalmology practices do not connect individual scanners directly to a hospital VNA/PACS. Instead, they route images through vendor-specific image management systems:

### 1. Carl Zeiss Meditec: ZEISS FORUM
- **Architecture:** FORUM acts as the central archive for CIRRUS OCT, CLARUS, VISUCAM, and HFA units.
- **Direct vs Middleware:** While CIRRUS 5000/6000 and CLARUS can export directly via DICOM C-STORE SCU, hospital IT typically routes exams to FORUM first for ophthalmic review and multi-modality alignment. FORUM then forwards exams to the hospital PACS via DICOM C-STORE.
- **Licensing Requirement:** Direct C-STORE export from CIRRUS or CLARUS requires the **ZEISS DICOM Connectivity** software license on the device console. If routing through FORUM, the **FORUM DICOM Export** license is required.

### 2. Heidelberg Engineering: HEYEX 2
- **Architecture:** SPECTRALIS scanners are tightly integrated with the Heidelberg Eye Explorer (HEYEX / HEYEX 2) database workstation.
- **Direct vs Middleware:** SPECTRALIS hardware generates proprietary raw scan data (`.vol`, `.e2e`). Direct export to Orthanc requires HEYEX to convert scans into standard DICOM Ophthalmic Tomography (`OPT`) or Secondary Capture objects.
- **Licensing Requirement:** Requires the **HEYEX DICOM Import/Export Software Option** to transmit studies to an external DICOM C-STORE destination (`DOCMED`).

### 3. Topcon Healthcare: IMAGEnet 6
- **Architecture:** The TRC-NW400 non-mydriatic fundus camera features built-in direct DICOM C-STORE SCU capabilities. It can also connect to Topcon IMAGEnet 6 for centralized clinical review.
- **Licensing Requirement:** Standard models include built-in DICOM export. If managed by IMAGEnet 6, the PACS export gateway license is utilized.

### 4. Optos: OptosAdvance VNA
- **Architecture:** Optos California / Daytona capture 200° ultra-widefield images. These are processed by the Optos Vantage acquisition software and sent to OptosAdvance (or an external PACS).
- **Licensing Requirement:** Requires the **Optos DICOM Export License** to transmit exams as 8-bit or 16-bit Ophthalmic Photography DICOM objects.

---

## 5. Modality Worklist (MWL) Architectural Assessment

### Purpose of MWL in Ophthalmology
Modality Worklist (DICOM Basic Worklist Management Service Class, C-FIND SCU) allows imaging technicians to query the day's scheduled patients directly from the scanner console. Technicians select the patient from a list, automatically populating:
- Patient Name (`0010,0010`)
- Patient ID / MRN (`0010,0020`)
- Date of Birth (`0010,0030`)
- Patient Sex (`0010,0040`)
- Accession Number (`0008,0050`)
- Scheduled Procedure Step Description (`0040,0007`)

This completely eliminates manual typographical errors on scanner touchscreens.

### Architectural Recommendation for DocMed EHR
> [!IMPORTANT]
> **Authoritative Worklist Provider Rule:**
> In healthcare IT, **the Hospital Information System / EHR / RIS is the authoritative worklist provider**, not the DICOM storage archive (Orthanc).
> - Do not claim MWL support merely because Orthanc stores DICOM images.
> - While Orthanc includes a Modality Worklist plugin (which can read `.dump` or `.wl` files generated from XML/JSON or via Python scripts), production MWL requires an active feed from the DocMed EHR appointment scheduling service.
> - **Recommendation for POC:** MWL is documented as an evaluated Phase 2 capability. For Phase 1 POC testing, server-side demographic reconciliation safely validates manual entries without requiring an active RIS worklist broker.

---

## 6. DocMed EHR Integration & Clinical Patient Safety

To protect patient safety and prevent medical misattribution:

### 1. Server-Side Identity Reconciliation (Multi-Criteria Validation)
- Studies are reconciled to DocMed EHR patients using the **`reconcileStudy()`** service.
- **Never link studies by patient name alone:** Patient names in DICOM headers frequently suffer from format discrepancies (e.g., `DOE^JOHN` vs `John Doe`), typographical errors, or duplicate common names.
- **Do not assume DICOM PatientID equals internal DocMed PatientID:** Imaging departments frequently use institutional MRNs, temporary emergency IDs, or scanner-generated accession numbers in `(0010,0020)`. The `PatientMappingService` resolves verified mappings between EHR IDs (`EHR-001`) and DICOM IDs (`DICOM_BRAINIX_01`).

### 2. Demographic Cross-Referencing & Discrepancy Quarantine
When a study is reconciled against an EHR patient:
1. **DICOM PatientID Validation:** The study's `patientID` must match a verified mapping for the target EHR record.
2. **Date of Birth Verification:** If present in both records, the DICOM `patientBirthDate` (formatted `YYYYMMDD`) must match the EHR `dateOfBirth` (`YYYY-MM-DD`).
3. **Sex / Gender Verification:** If present in both records, the DICOM `patientSex` (`M`/`F`/`O`) must match the EHR record.
4. **Discrepancy Actions:**
   - Any mismatch in Date of Birth or Sex immediately changes the study status to **`DEMOGRAPHIC_MISMATCH`**.
   - Studies mapped to non-existent patients or with unresolvable identity conflicts are flagged as **`QUARANTINED`**.
   - The EHR frontend renders a warning banner alerting clinicians to verify identity before clinical interpretation.

### 3. Security & Frontend Decoupling
- Orthanc administrator credentials (`ORTHANC_USERNAME` / `ORTHANC_PASSWORD`) are strictly isolated within the Node.js backend environment.
- The frontend never connects to Orthanc directly; all requests flow through authenticated, authorized DocMed backend proxy endpoints.

---

## 7. Step-by-Step Clinical Engineering Onboarding SOP

When a physical ophthalmology device or vendor workstation becomes available on-site, follow this 7-step onboarding procedure:

```mermaid
sequenceDiagram
    autonumber
    participant DEV as Scanner / Workstation (SCU)
    participant NET as Hospital Clinical LAN
    participant ORTH as Orthanc PACS (DOCMED:4242)
    participant BACK as DocMed Backend API
    participant OHIF as OHIF Web Viewer

    Note over DEV,ORTH: Step 1-3: Discovery & DICOM Ping
    DEV->>ORTH: C-ECHO Request (AET: DOCMED)
    ORTH-->>DEV: C-ECHO Response (Success)

    Note over DEV,ORTH: Step 4-5: C-STORE Transfer
    DEV->>ORTH: C-STORE Request (Ophthalmic Tomography / Photo)
    ORTH-->>DEV: C-STORE Response (0x0000 Success)

    Note over ORTH,OHIF: Step 6-7: EHR Reconciliation & Web Review
    BACK->>ORTH: QIDO-RS Study Query (/dicom-web/studies)
    ORTH-->>BACK: DICOM JSON Metadata (Tags 0020,0060; 0010,0020; etc.)
    BACK->>BACK: Reconcile Demographics (DOB + Sex Check)
    BACK->>OHIF: Authenticated Viewer Session Launch
    OHIF->>ORTH: WADO-RS Retrieve Frame
    ORTH-->>OHIF: Render DICOM Ophthalmic Viewport
```

### Step 1: Pre-requisite Discovery & DCS Audit
1. Identify the physical device manufacturer, exact model, software version, and whether it connects directly or via vendor middleware (FORUM, HEYEX 2, IMAGEnet).
2. Obtain the official manufacturer DICOM Conformance Statement.
3. Verify that the device supports the required SOP Class (e.g., Ophthalmic Tomography `1.2.840.10008.5.1.4.1.1.77.1.5.4` or Ophthalmic Photography `1.2.840.10008.5.1.4.1.1.77.1.5.1`) as an **SCU**.
4. Confirm that the required vendor DICOM export software license is installed and active on the device.

### Step 2: Destination Configuration on Device Console
1. Navigate to the device network administration menu (e.g., *Settings > DICOM Configuration > Export Destinations*).
2. Add a new DICOM destination:
   - **Destination Name:** `DocMed Orthanc PACS`
   - **Called AE Title:** `DOCMED`
   - **Host Name / IP Address:** Workstation IP address (e.g., `192.168.1.50`)
   - **Port Number:** `4242`
   - **Calling AE Title:** Enter device AE Title (e.g., `CIRRUS_OCT`, `SPECTRALIS`, `CLARUS_500`)
   - **Timeout:** `30 seconds`
3. Save the destination configuration.

### Step 3: Test DICOM Verification (C-ECHO)
1. On the scanner console, select the newly created destination and click **Test Connection** / **Verify (C-ECHO)**.
2. Confirm the console displays *Echo Succeeded* or *Verification OK*.
3. Inspect Orthanc Docker logs to verify incoming connection:
   ```bash
   docker logs docmed-orthanc --tail 20
   ```
   Expect: `Received Echo Request from SCU`

### Step 4: Transmit Vendor Test Examination
1. On the device console, select a vendor-approved test phantom study or de-identified test patient.
2. Export the study to destination `DocMed Orthanc PACS`.
3. Monitor transmission progress bar until 100% complete.

### Step 5: Verify Orthanc Ingestion & Metadata Integrity
1. Inspect Orthanc logs to confirm C-STORE success:
   ```bash
   docker logs docmed-orthanc --tail 50
   ```
   Expect: `Incoming DICOM instance stored` with status `Success (0x0000)`.
2. Query Orthanc REST API or inspect the DocMed backend console to verify:
   - Modality tag: `OPT`, `OP`, `OPV`, or `DOC`
   - Ophthalmic Laterality tag `(0020,0060)`: `R` (OD), `L` (OS), or `B` (OU)
   - SOP Class UID: Matches the expected ophthalmic storage class
   - Instance and series counts match the scanner console

### Step 6: Server-Side Demographic Reconciliation
1. Open the DocMed EHR interface.
2. Select or search for the test patient.
3. Confirm that the newly received study appears in the study list.
4. Verify that the reconciliation badge indicates **`Verified`**. If an intentional test discrepancy was entered (e.g., mismatched DOB), confirm the study is correctly flagged as **`Demographic Conflict`**.

### Step 7: OHIF Viewer Rendering Verification
1. Click **Launch OHIF Viewer** from the DocMed EHR study list.
2. Verify that the OHIF viewer launches in a new authenticated tab.
3. Confirm that ophthalmic frames render cleanly:
   - Cross-sectional OCT B-scans or volume cubes render with proper window/level.
   - Fundus photography images display correct true-color or red-free palettes.
   - Laterality badges (`OD` / `OS`) are properly displayed in the viewport overlay.
4. Document the completed verification in the clinical integration test log.
