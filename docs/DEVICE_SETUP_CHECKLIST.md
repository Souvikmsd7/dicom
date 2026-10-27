# DocMed EHR — Device Onboarding & Go-Live Readiness Checklist

> [!IMPORTANT]
> **Clinical Acceptance Rule:** A medical imaging device must **never** be marked clinically ready merely because a network ping or C-ECHO succeeded. Full clinical readiness requires passing every section below, including test study receipt, metadata contract validation, and patient identity reconciliation.

---

## Section 1: Prerequisites & Infrastructure Readiness

- [ ] **1.1 Supported Operating System:** Windows 10/11 64-bit (or Linux/macOS) verified.
- [ ] **1.2 Memory & Disk:** Minimum 8GB RAM and at least 20GB free SSD disk space confirmed.
- [ ] **1.3 Docker Desktop Active:** Docker Desktop is running with WSL2 backend enabled; status displays green "Engine running".
- [ ] **1.4 Node.js Installed:** Node.js v18 or v20 LTS verified (`node -v`).
- [ ] **1.5 Firewall Exceptions Configured:** Windows Defender Firewall allows inbound TCP traffic on:
  - Port `4242` (DICOM C-STORE / C-ECHO SCP)
  - Port `8042` (Orthanc HTTP / DICOMweb)
- [ ] **1.6 Static IP Address Assigned:** DocMed host computer has a static or DHCP-reserved IP address on the clinic LAN.

---

## Section 2: DocMed Application Services Readiness

- [ ] **2.1 Preflight Diagnostic Passed:** Executed `node scripts/preflight-check.js` and all 9 checks reported `[PASS]`.
- [ ] **2.2 Orthanc PACS Healthy:** `http://localhost:8042/system` returns HTTP 200 OK with `DOCMED` AE Title.
- [ ] **2.3 OHIF Web Viewer Accessible:** `http://localhost:3001` opens the viewer homepage without errors.
- [ ] **2.4 DocMed Backend API Online:** `http://localhost:3000/api/health` returns `{"success": true, "data": {"backend": true, "orthanc": {"ready": true}}}`.
- [ ] **2.5 DocMed EHR Web UI Live:** `http://localhost:5173` renders with both API and Orthanc status indicators showing green "Connected".

---

## Section 3: Device Registration & Configuration

- [ ] **3.1 Manufacturer DCS Reviewed:** DICOM Conformance Statement (DCS) for the device model and software version has been inspected for supported SOP classes.
- [ ] **3.2 Vendor Export License Active:** Confirmed with vendor that DICOM C-STORE export licensing is activated on the console.
- [ ] **3.3 Unique Device ID Created:** Assigned a unique clinic device ID (e.g., `OCT-001`, `FUNDUS-001`) that does not collide with existing devices.
- [ ] **3.4 Registered in DocMed:** Device is registered in the Device Management module with correct canonical category, manufacturer, model, and serial number.
- [ ] **3.5 Scanner Console Configured:** Destination entered into scanner with:
  - Called AE Title: `DOCMED`
  - DICOM Port: `4242`
  - Host IP: `<Server_IP>`

---

## Section 4: Network & Live Protocol Verification

- [ ] **4.1 In-App Connectivity Test Passed:** Clicked "Test" in DocMed Device Management; received green `Connection Verified` status with measured latency under 200ms.
- [ ] **4.2 Scanner C-ECHO Verification Passed:** Scanner console "Echo Test" / "Verify" button displays "Succeeded" or green checkmark.
- [ ] **4.3 Network Stability Verified:** Continuous connectivity confirmed without intermittent socket drops or firewall timeouts.

---

## Section 5: Test Study Transfer & Data Contract Verification

- [ ] **5.1 Test Study Transferred:** Transferred a calibration phantom, eye model, or synthetic test examination from the scanner to `DOCMED`.
- [ ] **5.2 Orthanc Storage Confirmed:** Study appears in Orthanc database volume with correct SOP Instance UIDs.
- [ ] **5.3 Source Device Recognized:** Incoming study is attributed to the registered device record in the Device Management recent studies list.
- [ ] **5.4 Canonical 1.0.1 Contract Validated:** Executed `npm run validate:samples` in backend; all 10 device categories passed schema validation.
- [ ] **5.5 Metadata Integrity Confirmed:** Study Date, Time, Modality, Laterality (OD/OS), and Series Description match scanner examination parameters.
- [ ] **5.6 No Fabricated Clinical Data:** Measurements reflect only genuine scanned values or remain safely `null` without fabricated numbers.

---

## Section 6: Patient Matching & Safety Reconciliation

- [ ] **6.1 Zero-Trust Mapping Verified:** Test study is mapped explicitly to an EHR patient record via the verified mapping service (`/api/mappings`).
- [ ] **6.2 Demographic Cross-Checks Passed:** Date of birth, sex, and patient ID match across both systems.
- [ ] **6.3 Mismatch Safeguards Tested:** Confirmed that intentional demographic conflicts (mismatched DOB or Sex) flag `DEMOGRAPHIC_MISMATCH` and prevent committing unverified clinical data.
- [ ] **6.4 Unmapped Studies Quarantined:** Studies received without a verified mapping appear as `UNMAPPED` and require administrator review.

---

## Section 7: Clinical Image Review & Go-Live Approval

- [ ] **7.1 OHIF Study Viewer Launch Verified:** Study opens in the OHIF Web Viewer from the DocMed EHR study list with working pan, zoom, and windowing.
- [ ] **7.2 Image Slices & Color Fidelity Verified:** B-scans or color fundus images render with proper aspect ratio and photometric interpretation.
- [ ] **7.3 Backup Procedure Tested:** Verified that the Orthanc volume and `backend/data/devices-registry.json` are included in daily clinic backup jobs.
- [ ] **7.4 Operator Training Completed:** Clinic technicians instructed on how to check device status, review failed transfers, and contact IT.
- [ ] **7.5 Device Marked Clinically Active:** Administrator has toggled device integration to **Enabled** in DocMed.

---

### Sign-Off & Authorization

| Role | Name | Signature | Date |
| :--- | :--- | :--- | :--- |
| **Clinic Administrator** | ____________________ | ____________________ | ____________ |
| **Lead Ophthalmologist / Clinical Director** | ____________________ | ____________________ | ____________ |
| **Clinical Engineering / IT Lead** | ____________________ | ____________________ | ____________ |
