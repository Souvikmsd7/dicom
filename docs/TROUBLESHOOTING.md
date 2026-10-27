# DocMed EHR — Comprehensive Troubleshooting & Problem Resolution Guide

> **Quick Help:** Run the automatic preflight diagnostic tool first by typing in PowerShell:  
> `cd d:\dicom; node scripts/preflight-check.js`  
> It will pinpoint failing services and tell you exactly what command to run.

---

## Quick Reference: Offline Device vs. Failed Transfer vs. Unprocessed Study

Before troubleshooting, it is important to understand the three distinct operational states:

1. **Offline Device:** The scanner console is powered off, disconnected from WiFi/Ethernet, or blocked by a firewall. *Previously received studies remain 100% accessible in DocMed and OHIF.*
2. **Failed Transfer:** The scanner attempted to send a study, but transmission was interrupted midway due to network loss or association rejection. *Orthanc will reject partial objects, and the scanner console will display a red "Transmission Failed" alert.*
3. **Unprocessed / Quarantined Study:** The study arrived in Orthanc safely, but the PatientID does not match any registered EHR patient or has conflicting demographic information (e.g., date of birth or sex mismatch). *The study is quarantined as `UNMAPPED` or `DEMOGRAPHIC_MISMATCH` until reviewed by an administrator.*

---

## 1. Docker Desktop & Service Startup Issues

### Problem 1.1: Docker Desktop Fails to Start or Shows "WSL 2 Installation Is Incomplete"
- **Symptoms:** Running `docker compose up -d` displays `error during connect: This error may indicate that the docker daemon is not running`.
- **Probable Cause:** Windows Subsystem for Linux (WSL2) is not updated, or virtualization is disabled in the computer BIOS.
- **Safe Corrective Actions:**
  1. Open PowerShell as Administrator and run:
     ```powershell
     wsl --update
     wsl --set-default-version 2
     ```
  2. Restart your computer.
  3. Launch Docker Desktop from the Start Menu and wait until the whale icon in the taskbar becomes steady and displays "Engine running".
- **When to Contact IT:** If Windows displays "Hardware virtualization is disabled", your IT department must enable Intel VT-x or AMD-V in the computer's motherboard BIOS.

---

### Problem 1.2: "Port Already in Use" Conflict (Port 3000, 3001, 8042, 4242, or 5173)
- **Symptoms:** Docker or Node displays `bind: address already in use` or `listen EADDRINUSE: address already in use :::3000`.
- **Probable Cause:** An old instance of DocMed, another PACS server, or a background web server is occupying the port.
- **Safe Corrective Actions:**
  1. Find what process is using the conflicting port in PowerShell (for example, port `3000`):
     ```powershell
     Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object OwningProcess
     ```
  2. If an old Node process is stuck, stop it cleanly or run:
     ```powershell
     Stop-Process -Id <PID> -Force
     ```
  3. If another hospital software requires that port, edit `d:\dicom\.env` and change the conflicting port (e.g., change `BACKEND_PORT=3000` to `3005`).

---

## 2. Orthanc PACS & DICOM Connectivity Issues

### Problem 2.1: Orthanc Is Unavailable or Web Status Shows "Disconnected"
- **Symptoms:** The DocMed top bar shows Orthanc as "Disconnected", or visiting `http://localhost:8042` displays an error.
- **Probable Cause:** The Docker container `docmed-orthanc` stopped or encountered a volume permission error.
- **Safe Corrective Actions:**
  1. In PowerShell, check container status:
     ```powershell
     docker compose ps
     ```
  2. View Orthanc logs for exact error messages:
     ```powershell
     docker compose logs --tail=50 orthanc
     ```
  3. Restart the containers:
     ```powershell
     docker compose restart orthanc
     ```

---

### Problem 2.2: Scanner Console Displays "DICOM Association Rejected" or "Verification (Echo) Failed"
- **Symptoms:** Clicking "Verify" or "Echo" on the Zeiss CIRRUS, Topcon TRC, or Heidelberg console fails.
- **Probable Cause:** AE Title mismatch, incorrect IP address, or firewall blocking inbound traffic.
- **Safe Corrective Actions:**
  1. **Check AE Title Case Sensitivity:** Ensure the Called AE Title on the scanner is typed in all caps: **`DOCMED`**.
  2. **Check Port:** Ensure the scanner is sending to port **`4242`** (the DICOM C-STORE port), NOT port `8042` (which is the web port).
  3. **Check Host IP:** Ensure the scanner is pointing to the DocMed computer's local network IP (e.g. `192.168.1.50`), NOT `127.0.0.1` (unless running on the exact same workstation).
  4. Test connectivity from the DocMed computer in PowerShell:
     ```powershell
     Test-NetConnection -ComputerName 127.0.0.1 -Port 4242
     ```
     *`TcpTestSucceeded : True` confirms the port is open and listening.*

---

### Problem 2.3: Windows Defender Firewall Blocks Inbound Connections
- **Symptoms:** Testing from the local computer works, but physical scanners across the clinic cannot connect.
- **Probable Cause:** Windows Firewall blocks incoming connections from other computers on the clinic LAN.
- **Safe Corrective Actions:**
  1. Open PowerShell as Administrator.
  2. Run the official command to open the DICOM port:
     ```powershell
     New-NetFirewallRule -DisplayName "DocMed DICOM C-STORE" -Direction Inbound -LocalPort 4242 -Protocol TCP -Action Allow
     New-NetFirewallRule -DisplayName "DocMed Orthanc Web" -Direction Inbound -LocalPort 8042 -Protocol TCP -Action Allow
     ```
- **When to Contact IT:** If your clinic network is managed by a domain policy (Active Directory GPO) that prevents local firewall rule creation, request your network administrator to whitelist inbound TCP ports 4242 and 8042.

---

## 3. Study Transfer, Device Identification & Data Integrity

### Problem 3.1: Scanner Displays "Transfer Succeeded", but No Study Appears in DocMed
- **Symptoms:** The scanner sent the exam, but the patient's study list in DocMed is empty.
- **Probable Cause:** The study reached Orthanc, but has not yet been linked to the EHR patient record because the scanner `PatientID` differs from the EHR patient ID.
- **Safe Corrective Actions:**
  1. Open `http://localhost:8042` (Orthanc Explorer) and log in with username `orthanc` and password `orthanc-dev-2024`.
  2. Check if the study appears in Orthanc. Note the incoming `PatientID` (e.g., `SCAN_9821`).
  3. In DocMed, go to **Clinical Imaging**, find your patient (e.g., Alex Thompson, `EHR-001`), and open the mapping dialog.
  4. Enter `SCAN_9821` and click **Confirm Mapping**. The study will immediately link to the patient.

---

### Problem 3.2: Study Shows "DEMOGRAPHIC_MISMATCH" Conflict
- **Symptoms:** The study appears in the table with a yellow or red warning badge saying `DEMOGRAPHIC_MISMATCH`.
- **Probable Cause:** The Date of Birth or Sex recorded in the DICOM scanner header conflicts with the EHR patient chart.
- **Safe Corrective Actions:**
  1. Click on the study row to inspect the Demographic Cross-Check details.
  2. Compare the scanner header DOB/Sex against the EHR record:
     - If the scanner operator accidentally mistyped the patient's birth year on the console, correct the EHR mapping or update the chart.
     - If the study belongs to a different patient with a similar name, **DO NOT commit the study**. Quarantining prevents clinical misattribution.

---

### Problem 3.3: Images Display Properly, but Retinal Thickness Measurements Are Blank
- **Symptoms:** In the study details, B-scan images are visible, but central subfield thickness or cup-to-disc ratio displays as `null` or `Not Available`.
- **Probable Cause:** The scanner exported standard Ophthalmic Tomography images, but did not export the DICOM Structured Report (SR) or Encapsulated PDF measurement summary.
- **Safe Corrective Actions:**
  - This is expected behavior under the DocMed canonical contract: DocMed preserves genuine values and **never fabricates measurements**.
  - In your scanner console export settings, ensure **"Export Analysis Reports & Structured Measurements"** is enabled alongside raw image slices.

---

## 4. OHIF Medical Viewer Issues

### Problem 4.1: Clicking "View in OHIF" Displays a Spinning Wheel or Black Screen
- **Symptoms:** The browser opens `http://localhost:3001/viewer?...`, but the study never loads.
- **Probable Cause:** The OHIF viewer container cannot reach the Orthanc DICOMweb endpoint through Docker's internal bridge network.
- **Safe Corrective Actions:**
  1. Verify the OHIF container is running: `docker compose ps`.
  2. Inspect OHIF logs: `docker compose logs --tail=50 ohif`.
  3. Refresh the browser page using **`Ctrl + F5`** (hard refresh) to clear cached JavaScript.
  4. Ensure your browser is Google Chrome or Microsoft Edge with WebGL hardware acceleration enabled.

---

## 5. Summary of Emergency Contacts & Diagnostic Logs

If you need to escalate an issue to your technical support team, gather these diagnostics:

1. Run the preflight check and copy the output:
   ```powershell
   node scripts/preflight-check.js
   ```
2. Export the recent audit log (contains zero patient images):
   Visit `http://localhost:3000/api/audit` in your browser and save the JSON.
3. Check container logs:
   ```powershell
   docker compose logs --tail=100 > d:\dicom\docker-diagnostic.log
   ```
