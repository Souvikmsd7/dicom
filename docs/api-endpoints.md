# DocMed EHR — DICOM Integration POC: API Endpoint Documentation

## Base URL
- Local Backend Service: `http://localhost:3000/api`
- Orthanc PACS Server: `http://localhost:8042` (Proxied via backend, not called directly by browser)
- OHIF Web Viewer: `http://localhost:3001`

---

## 1. System Health & Infrastructure

### `GET /api/health`
Checks backend readiness and queries Orthanc `/system` to verify PACS status and DICOMweb plugin availability.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "backend": true,
    "orthanc": {
      "ready": true,
      "version": "24.12.1",
      "dicomWebEnabled": true
    },
    "timestamp": "2026-10-26T21:40:00.000Z"
  }
}
```

---

## 2. EHR Patients & Demographics

### `GET /api/patients`
Returns list of all active EHR patients.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "ehrPatientId": "EHR-001",
      "firstName": "Alex",
      "lastName": "Thompson",
      "dateOfBirth": "1985-03-15",
      "sex": "M",
      "mrn": "MRN-100001"
    }
  ]
}
```

### `GET /api/patients/search?q={query}`
Searches EHR patient directory by name, MRN, or EHR ID (case-insensitive).

### `GET /api/patients/:ehrPatientId`
Retrieves a specific EHR patient by identifier. Returns `404 PATIENT_NOT_FOUND` if missing.

---

## 3. Patient ↔ DICOM Identity Mapping

> [!IMPORTANT]
> **Zero Trust Patient Matching:** DICOM standard `PatientID` (Tag 0010,0020) values frequently diverge from internal EHR IDs across different imaging facilities and acquisition devices. These endpoints explicitly manage and verify relationships between EHR records and DICOM records.

### `GET /api/mappings`
Returns all active verified identity mappings.

### `POST /api/mappings`
Registers and verifies an association between an EHR patient record and a DICOM `PatientID`.

**Request Body:**
```json
{
  "ehrPatientId": "EHR-001",
  "dicomPatientId": "BRAINIX_001",
  "patientName": "Thompson^Alex"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "ehrPatientId": "EHR-001",
    "dicomPatientId": "BRAINIX_001",
    "patientName": "Thompson^Alex",
    "verified": true,
    "createdAt": "2026-10-26T21:40:00.000Z"
  }
}
```

---

## 4. DICOM Studies & Series (QIDO-RS Proxy)

### `GET /api/studies`
Queries Orthanc via standard DICOMweb **QIDO-RS** (`/dicom-web/studies`).

**Query Parameters:**
- `patientId`: Optional DICOM PatientID filter
- `studyDate`: Optional date filter (YYYYMMDD)
- `modality`: Optional modality filter (e.g. `MR`, `CT`, `DX`)
- `limit`: Optional pagination limit
- `offset`: Optional pagination offset

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "studyInstanceUID": "1.2.826.0.1.3680043.8.498.1001",
      "studyDate": "20241026",
      "studyTime": "143000",
      "studyDescription": "MRI Brain with Contrast",
      "accessionNumber": "ACC-2024-001",
      "modality": "MR",
      "modalitiesInStudy": ["MR"],
      "patientName": "Brainix^Patient",
      "patientID": "BRAINIX_001",
      "patientBirthDate": "19850315",
      "patientSex": "M",
      "numberOfSeries": 1,
      "numberOfInstances": 28,
      "referringPhysicianName": "Welch^Marcus^Dr"
    }
  ]
}
```

### `GET /api/studies/patient/:ehrPatientId`
Resolves the EHR patient's mapped DICOM identifier and queries PACS studies.
- If no mapping exists: Returns `200 OK` with an empty array `[]`.
- If patient does not exist: Returns `404 PATIENT_NOT_FOUND`.

### `GET /api/studies/:studyInstanceUID/series?ehrPatientId={id}`
Retrieves series inventory for a given study via **QIDO-RS** (`/dicom-web/studies/{uid}/series`).
- Validates access if `ehrPatientId` is supplied: If study's DICOM `PatientID` is not mapped to this EHR patient, returns `403 ACCESS_DENIED`.

---

## 5. Medical Image Viewer (OHIF) Integration

### `POST /api/viewer/launch`
Validates that the requesting EHR patient is authorized to view the requested study, then produces a launch URL for the OHIF Viewer.

**Request Body:**
```json
{
  "ehrPatientId": "EHR-001",
  "studyInstanceUID": "1.2.826.0.1.3680043.8.498.1001"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "viewerUrl": "http://localhost:3001/viewer?StudyInstanceUIDs=1.2.826.0.1.3680043.8.498.1001",
    "studyInstanceUID": "1.2.826.0.1.3680043.8.498.1001"
  }
}
```

---

## 6. DICOM Ingestion (Sample Import)

### `POST /api/import`
Ingests a binary DICOM file into Orthanc. Validates that the payload contains the standard 128-byte preamble and `DICM` magic identifier.

**Headers:**
- `Content-Type: application/dicom` or `application/octet-stream`

**Body:** Raw binary `.dcm` buffer.

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "orthancId": "6c5f7823-1d54e8bc-...",
    "status": "Success"
  }
}
```

---

## 7. Audit Logging

### `GET /api/audit`
Returns an array of recorded access and modification events.
- Captures timestamp, action name, resource path, remote IP, user agent, patient ID, and HTTP status code.

---

## 8. Canonical Ophthalmology Device Data Contract Endpoints

Canonical source of truth: `DocMed_Ophthalmology_Device_Data_Examples_Compatible.json`. Preserves exact 10-category top-level structure, nested clinical data, and instance reference schemas.

### `GET /api/devices/contract/templates`
Returns all 10 canonical device schema templates.

### `GET /api/devices/contract/template/:category`
Returns the canonical schema template for a specific category (e.g., `OCT / OCT Angiography`, `Fundus Camera / Retinal Photography`, `Automated Visual Field Analyzer / Perimetry`).

### `GET /api/devices/study/:studyInstanceUID` (Alias: `GET /api/studies/:studyInstanceUID/device-data`)
Adapts a stored DICOM study into the canonical ophthalmology device data JSON contract:
- Auto-detects device category from Modality, SOP Class UID, and Series Description.
- Populates `integration_id`, `patient`, `encounter`, `device`, `study`, `report`, and `clinical_data`.
- Maps instances into `dicom_instance_reference_schema` with WADO-RS URLs and thumbnails.
- Sets `integration_status` (`metadata_received`, `images_available`, `measurements_parsed`, `patient_match_status`, `missing_fields`, `unsupported_fields`, `validation_status`).
- Preserves valid `0` and boolean `false` without coercion. Missing scalar values remain `null`.

**Query Parameters:**
- `ehrPatientId` (optional): Validates against mapped patient and performs demographic reconciliation.
- `category` (optional): Overrides category adapter.
