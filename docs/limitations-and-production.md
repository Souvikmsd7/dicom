# DocMed EHR — DICOM Integration: Security, Limitations & Production Readiness

## Regulatory Notice & HIPAA Disclaimer

> [!CAUTION]
> **This software is a Proof of Concept (POC) demonstration.**
> Under no circumstances does deploying or running this POC confer compliance with HIPAA Security/Privacy Rules, HITECH, GDPR, FDA 510(k), or regional health authority regulations. Production deployment requires independent security audits, Business Associate Agreements (BAAs), clinical verification, and institutional governance.

---

## 1. Security Architecture in this POC

The POC implements several foundational security best practices:

1. **Backend Isolation & Zero Frontend PACS Credentials:**
   - The React frontend does **not** possess Orthanc admin passwords or API keys.
   - All DICOMweb queries (QIDO-RS), metadata retrievals, and uploads pass through the backend proxy.

2. **Explicit Patient Identity Resolution (Zero-Trust Matching):**
   - The application **never assumes** that a DICOM `PatientID` (tag `0010,0020`) equals an EHR patient identifier.
   - Every study retrieval verifies access against an explicit mapping registry. Unmatched or mismatched requests are rejected (`403 ACCESS_DENIED`).

3. **Restricted CORS Policy:**
   - Orthanc and the backend only accept cross-origin requests from the designated local dev origin (`http://localhost:5173`).

4. **Audit Logging Middleware:**
   - Every read (`QUERY_STUDIES`, `QUERY_SERIES`), write (`IMPORT_DICOM`), and launch (`VIEWER_LAUNCH`) action records an immutable audit record with timestamp, client IP, user agent, target patient, and HTTP status code.

5. **Exclusion of Secrets from Version Control:**
   - `.gitignore` prevents `.env`, database volumes (`orthanc-data/`), and DICOM binaries (`*.dcm`, `*.zip`) from being committed.
   - `.env.example` provides placeholders only.

---

## 2. Current POC Limitations

| Area | POC State | Production Requirement |
|---|---|---|
| **Data Storage** | SQLite in Docker local volume | PostgreSQL cluster with managed backups, encryption-at-rest (AES-256) |
| **Authentication** | Dev-mode pass-through (`demo-user`) | OIDC / OAuth 2.0 with EHR Single Sign-On (e.g., SMART-on-FHIR, Keycloak) |
| **Viewer Access** | Direct Study UID URL parameter | Signed, short-lived JWT tokens validated by an OHIF auth proxy |
| **Patient Mapping** | In-memory Map seeded with demo records | Relational database (e.g. PostgreSQL) with audit versioning & MPI (Master Patient Index) |
| **Transport Security** | HTTP on `localhost` | Strict TLS 1.3 with mutual TLS (mTLS) between EHR and PACS |
| **DICOM Ingestion** | Single-file POST via REST | DICOM C-STORE SCP listener with TLS, DICOMweb STOW-RS multipart endpoints, and DICOM Modality Worklist (MWL) integration |
| **Audit Storage** | In-memory array (`/api/audit`) | Write-once append-only SIEM integration (e.g. Datadog, Splunk, AWS CloudWatch) compliant with ATNA (IHE profile) |
| **Image De-identification** | Synthetic data generated locally | Automated de-identification pipeline (PS 3.15 Annex E compliant) before ingestion |

---

## 3. Production Readiness Checklist

Before moving this DICOM integration to staging or production environments, complete each milestone:

### Identity & Access Management (IAM)
- [ ] Connect EHR OpenID Connect (OIDC) identity provider.
- [ ] Implement Role-Based Access Control (RBAC): Radiologist, Attending Physician, Nurse, Medical Records Admin.
- [ ] Enforce SMART on FHIR authorization scopes (e.g., `patient/ImagingStudy.read`).
- [ ] Ensure OHIF Viewer validates bearer tokens before serving DICOMweb tiles.

### Infrastructure & Network Security
- [ ] Configure TLS certificates for all HTTP/DICOMweb endpoints.
- [ ] Place Orthanc behind an internal VPC subnet with no public internet ingress.
- [ ] Enable DICOM TLS for external modality connections (C-STORE / C-MOVE).
- [ ] Implement rate limiting and WAF rules on API gateways.

### PACS Scalability & Storage
- [ ] Replace Orthanc SQLite index with PostgreSQL using the official Orthanc PostgreSQL plugin.
- [ ] Configure cloud object storage plugin (AWS S3, Azure Blob, or Google Cloud Storage) for PACS bulk image payload storage.
- [ ] Set up automated backup and disaster recovery (RPO < 15 min, RTO < 1 hr).

### Clinical Workflow & Standards
- [ ] Implement FHIR `ImagingStudy` resource mapping matching HL7 FHIR R4 specifications.
- [ ] Support DICOM Modality Worklist (MWL) to eliminate manual identifier entry at modality workstations.
- [ ] Support accession number reconciliation across EHR order entry and PACS.
- [ ] Implement hanging protocols and diagnostic viewport layouts in OHIF.

### Compliance & Governance
- [ ] Execute Business Associate Agreements (BAAs) with all cloud and infrastructure providers.
- [ ] Implement IHE ATNA (Audit Trail and Node Authentication) profile.
- [ ] Establish standard operating procedures (SOPs) for PHI breach notification and data retention.
- [ ] Conduct third-party application penetration testing.
