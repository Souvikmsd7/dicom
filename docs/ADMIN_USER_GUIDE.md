# DocMed EHR — Clinic Administrator & Operator Daily Maintenance Manual

This manual describes daily administrative procedures, operational monitoring, failed study retries, audit logging, and backup/disaster recovery protocols for the DocMed EHR medical imaging system.

---

## 1. Daily Morning Startup & Readiness Protocol

Every morning before clinic hours:

1. **Verify Services Are Running:**
   Open PowerShell and run the preflight verification command:
   ```powershell
   cd d:\dicom
   node scripts/preflight-check.js
   ```
   *Confirm all 9 checks return `[PASS]`.*

2. **Open DocMed in Browser:**
   Navigate to **`http://localhost:5173`**.
   - Check the top header: Verify that both **API** and **Orthanc PACS** display a green status dot with "Active" and "Connected".

3. **Check Device Health in the Device Management Tab:**
   Click **"Device Management"** in the top navigation.
   - Look at the top KPI summary bar:
     - **Online Devices:** Confirms your clinic scanners are reachable.
     - **Offline / Degraded:** Identifies any scanner with communication problems before patients arrive.
     - **Failed Jobs:** Shows whether any overnight study transfer failed.

4. **Run a Quick Connectivity Test:**
   Click the **"Test"** button on critical modalities (e.g., Main OCT, Fundus Camera). A green badge confirms latency and socket health.

---

## 2. Managing Failed Study Transfers & Ingestion Retries

When a study transfer fails due to a network glitch or an unmapped patient identity, DocMed quarantines the job safely:

1. In the **Device Management** header, click **"Failed Jobs"**.
2. A modal will display all quarantined study transfers with:
   - **Error Code:** e.g., `UNMAPPED_PATIENT_IDENTITY` or `DEMOGRAPHIC_MISMATCH`.
   - **Source Device:** e.g., `CIRRUS_OCT`.
   - **Study Instance UID & Incoming Patient ID.**
3. If the error is due to an unmapped patient:
   - Go to **Clinical Imaging**, link the patient to the incoming DICOM ID.
   - Return to **Failed Jobs** and click **"Retry"**.
4. DocMed re-queues the job and processes the study immediately without requiring the patient to be rescanned.

---

## 3. Reviewing & Approving Discovered Devices

DocMed includes an automated discovery service that detects candidate DICOM and DICOMweb nodes on authorized clinic subnets:

1. In **Device Management**, look for the yellow banner: **"Discovered Devices Awaiting Administrator Approval"**.
2. Review the candidate's IP address, suggested name, and detected category.
3. If the device belongs to your clinic:
   - Click **"Approve"**. DocMed automatically registers the device, assigns a unique ID, and makes it available for clinical imaging.
4. If the device is unauthorized or unknown:
   - Click **"Dismiss"** to reject the candidate and keep your network secure.

---

## 4. Viewing System Audit Logs Safely (HIPAA & Privacy Compliance)

To inspect system activity without exposing patient images or protected health information:

1. In your browser, open **`http://localhost:3000/api/audit`**.
2. The audit log records:
   - **Timestamp:** Exact date and time of the event.
   - **Action:** e.g., `QUERY_STUDIES`, `REGISTER_DEVICE`, `TEST_DEVICE_CONNECTION`, `VIEWER_LAUNCH`.
   - **User Agent & IP:** Originating workstation.
   - **HTTP Status Code:** e.g., `200`, `201`, `403`.
3. The audit log **never displays raw image pixel data, private keys, or passwords**.

---

## 5. Backup & Disaster Recovery Procedures

DocMed stores all medical imaging data in two safe locations:
- **Orthanc DICOM Binary Store:** Preserved in the Docker volume `orthanc-storage`.
- **Clinic Device Registry:** Preserved in `d:\dicom\backend\data\devices-registry.json`.

### How to Perform a Daily Backup:
Run these commands in PowerShell as Administrator:
```powershell
# 1. Create a timestamped backup folder
$backupDate = Get-Date -Format "yyyy-MM-dd"
$backupDir = "D:\DocMed-Backups\$backupDate"
New-Item -ItemType Directory -Force -Path $backupDir

# 2. Back up device configuration and jobs
Copy-Item -Recurse "d:\dicom\backend\data" "$backupDir\data"

# 3. Export Orthanc PACS database from Docker volume
docker run --rm -v docmed-dicom-poc_orthanc-storage:/volume -v ${backupDir}:/backup alpine tar -czf /backup/orthanc-db-backup.tar.gz -C /volume .

Write-Host "Daily DocMed backup complete at: $backupDir" -ForegroundColor Green
```

### How to Restore from a Backup:
```powershell
# Restore device registry
Copy-Item -Recurse "D:\DocMed-Backups\2026-10-27\data\*" "d:\dicom\backend\data\"

# Restore Orthanc PACS storage
docker run --rm -v docmed-dicom-poc_orthanc-storage:/volume -v D:\DocMed-Backups\2026-10-27:/backup alpine sh -c "rm -rf /volume/* && tar -xzf /backup/orthanc-db-backup.tar.gz -C /volume"

# Restart containers
docker compose restart
```

---

## 6. End-of-Day Shutdown Procedure

At the end of clinic hours:
1. In PowerShell running the frontend and backend, press **`Ctrl + C`** to stop Node servers.
2. If shutting down the host computer, stop Docker containers safely:
   ```powershell
   cd d:\dicom
   docker compose stop
   ```
3. Windows can now be safely shut down.
