# DocMed EHR — Sample & Demonstration Imaging Data

## Clinical Safety & De-Identification Safeguards

> [!CAUTION]
> **Synthetic Data Only:** All data included in this repository and sample directory are **synthetic test examinations and mathematical models**. Never import or store real Protected Health Information (PHI) or unverified clinical patient images in development environments.

---

## 1. Available Sample Artifacts

| File | Format | Scope / Description | Schema Version |
| :--- | :--- | :--- | :--- |
| `synthetic-study-001.dcm` | Binary DICOM | Minimal Secondary Capture DICOM image (`BRAINIX_001`, `1.2.826.0.1.3680043.8.498.1001`) with standard 128-byte preamble + `DICM` magic header. | DICOM 3.0 PS 3.10 |
| `canonical-ophthalmology-samples.json` | JSON Contract | Complete canonical dataset covering all **10 ophthalmology device categories**, matching `DocMed_Ophthalmology_Device_Data_Examples_Compatible.json`. | `1.0.1` |

---

## 2. Canonical 10 Ophthalmology Device Categories

The sample JSON contract (`canonical-ophthalmology-samples.json`) defines strict schemas and payloads for the following 10 device modalities:

1. **OCT / OCT Angiography** (Macular Cube, RNFL, OCTA vessel density)
2. **Fundus Camera / Retinal Photography** (Color fundus, disc photos)
3. **Autorefractor / Keratometer** (Refraction, keratometry readings)
4. **Automated Visual Field Analyzer / Perimetry** (Mean deviation, pattern deviation, visual field index)
5. **Corneal Topographer / Tomographer** (Simulated keratometry, pachymetry)
6. **Optical Biometer** (Axial length, anterior chamber depth, lens thickness)
7. **Slit Lamp / Anterior Segment Imaging** (Slit lamp photographs, corneal exams)
8. **Lensometer / Lensmeter** (Sphere, cylinder, axis, prism, addition)
9. **Ophthalmic Ultrasound / A-Scan / B-Scan** (Ultrasonic biometry and vitreal/retinal B-scan images)
10. **Contact Lens Fitting** (Base curve, diameter, power, fit evaluation)

Each category strictly preserves:
- `document_metadata` with explicit synthetic notes.
- Typed `integration_status` block (`metadata_received`, `images_available`, `measurements_parsed`, `report_available`, `patient_match_status`, `validation_errors`, `missing_fields`, `unsupported_fields`, `validation_status`).
- Typed nulls, arrays, numbers, and booleans without coercion or fabrication.
- Traceability between DICOM instances and normalized EHR models.

---

## 3. How to Ingest Sample DICOM Data into Orthanc

### Method A: Web UI Ingest (Easiest)
1. Open the DocMed EHR application: `http://localhost:5173`.
2. Click **"Ingest DICOM Data"** in the top-right corner.
3. Drag and drop `sample-data/synthetic-study-001.dcm`.
4. Confirm patient mapping to `EHR-001 — Thompson, Alex`.

### Method B: Backend REST API
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/import" `
  -Method Post `
  -Headers @{ "Content-Type" = "application/dicom" } `
  -InFile "d:\dicom\sample-data\synthetic-study-001.dcm"
```

### Method C: Regenerating Fresh Synthetic Studies
To generate a brand new synthetic study with unique UIDs:
```powershell
cd d:\dicom\backend
npx tsx scripts/generate-synthetic-dicom.ts
```
