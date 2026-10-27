# DocMed EHR — Non-Technical Installation & Quick Start Manual

> **Who is this guide for?**  
> This guide is written for clinic administrators, medical technicians, IT coordinators, and practice managers who want to install, configure, and operate the DocMed EHR medical imaging system without software engineering background.

---

## 1. What Is DocMed EHR Medical Imaging?

Before running commands, it helps to understand the main pieces in simple terms:

- **DocMed EHR Web Application (`:5173`)**: The web page you open in Google Chrome or Microsoft Edge to look up patients, manage connected imaging devices, and view studies.
- **Orthanc Medical PACS (`:8042` & `:4242`)**: The digital safe where medical scanner images (DICOM files) are stored securely.
- **OHIF Web Viewer (`:3001`)**: The clinical image viewer that lets doctors inspect 2D slices, 3D volumes, fundus photographs, and OCT scans with medical zoom, pan, and windowing tools.
- **DocMed Backend Service (`:3000`)**: The security coordinator that matches incoming scanner studies with EHR patient records, verifies identities, and prevents medical mix-ups.

---

## 2. Plain-Language Glossary of Key Terms

| Term | What It Means in Simple English |
| :--- | :--- |
| **DICOM** | *Digital Imaging and Communications in Medicine.* The universal standard file format and network language used by all ophthalmic scanners, X-rays, and MRIs. |
| **PACS** | *Picture Archiving and Communication System.* A specialized server designed to store and index DICOM images. |
| **AE Title** | *Application Entity Title.* A nickname (up to 16 letters/numbers) that identifies a device on the medical network. Our server nickname is **`DOCMED`**. |
| **IP Address** | The numerical street address of a computer on your clinic's network (e.g., `192.168.1.50`). |
| **Port** | The specific "door number" on that computer where a service listens (e.g., door `4242` for DICOM images). |
| **DICOMweb** | A modern web-based way for browsers to request images from a PACS using standard web addresses (`http://...`). |
| **C-STORE** | The DICOM command a scanner uses to send images to the server. |
| **C-ECHO** | The DICOM "ping" test used to check if a scanner can talk to the server. |

---

## 3. System & Hardware Prerequisites

### Supported Operating Systems
- **Windows 10 64-bit** (Pro, Enterprise, or Education, version 2004 or later)
- **Windows 11 64-bit** (All editions)
- *Note:* macOS 12+ and Ubuntu 20.04+ LTS are also compatible.

### Minimum Hardware
- **Processor (CPU):** 4 cores (Intel Core i5 / AMD Ryzen 5 or better)
- **Memory (RAM):** Minimum 8 GB (16 GB recommended for high-volume clinics)
- **Storage:** 20 GB free space on an SSD (Solid State Drive)

### Required Software (Free & Official)
1. **Docker Desktop for Windows**: Runs the Orthanc PACS and OHIF viewer safely.  
   *Official verified download:* [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)  
   *(Make sure "Use WSL 2 instead of Hyper-V" is checked during installation).*
2. **Node.js 18 or 20 LTS**: Runs the DocMed application services.  
   *Official verified download:* [https://nodejs.org/](https://nodejs.org/)  
   *(Choose the "LTS" version with the `.msi` Windows installer).*
3. **Windows PowerShell**: Already built into Windows 10 and 11.

---

## 4. Step-by-Step Installation Procedure

### Step 1: Open PowerShell as Administrator
1. Press the **Windows Key** on your keyboard.
2. Type `PowerShell`.
3. Right-click on **Windows PowerShell** and choose **"Run as Administrator"**.

### Step 2: Navigate to the DocMed Directory
Type the following command and press **Enter**:
```powershell
cd d:\dicom
```
*What success looks like:* The prompt changes to `PS D:\dicom>`.  
*If it fails:* Ensure your project folder is on drive `D:`, or replace `d:\dicom` with the actual path where DocMed was saved.

### Step 3: Configure Environment Variables
Run this command to create your local settings file:
```powershell
Copy-Item .env.example .env
```
*What success looks like:* The command completes silently without error.

### Step 4: Start the Docker Medical Server (Orthanc & OHIF)
Ensure Docker Desktop is open and shows "Engine running" in green at the bottom left, then run:
```powershell
docker compose up -d
```
*What success looks like:*
```
[+] Running 3/3
 ✔ Network docmed-dicom-poc_docmed-net  Created
 ✔ Container docmed-orthanc             Started
 ✔ Container docmed-ohif                Started
```
*If it fails:* Open Docker Desktop, wait 30 seconds for it to finish starting, and run `docker compose up -d` again.

### Step 5: Start the Backend Service
In PowerShell, run:
```powershell
cd d:\dicom\backend
npm install
npm run dev
```
*What success looks like:*
```
════════════════════════════════════════════════════════════
  DocMed DICOM POC — Backend
════════════════════════════════════════════════════════════
  API:      http://localhost:3000/api
  Health:   http://localhost:3000/api/health
  Orthanc:  http://127.0.0.1:8042
  OHIF:     http://localhost:3001
  CORS:     http://localhost:5173
════════════════════════════════════════════════════════════
```

### Step 6: Start the Frontend User Interface
Open a second PowerShell window and run:
```powershell
cd d:\dicom\frontend
npm install
npm run dev
```
*What success looks like:*
```
  VITE v8.3.5 ready in 1500 ms

  ➜  Local:   http://localhost:5173/
```

### Step 7: Run the Preflight System Diagnostic Check
Open a third PowerShell window (or run in root):
```powershell
cd d:\dicom
node scripts/preflight-check.js
```
*What success looks like:*
```
════════════════════════════════════════════════════════════
   DocMed EHR — Preflight System Readiness Verification   
════════════════════════════════════════════════════════════
• Checking Operating System                           [PASS]
• Checking Available System RAM (Found: 8GB)          [PASS]
• Checking Node.js Runtime                            [PASS]
• Checking Docker Desktop Daemon Active               [PASS]
• Checking Orthanc DICOM Port :4242 (C-STORE SCP)     [PASS]
• Checking Orthanc HTTP Port :8042 (DICOMweb)         [PASS]
• Checking OHIF Medical Viewer Web UI :3001           [PASS]
• Checking DocMed Backend API Proxy :3000             [PASS]
• Checking DocMed Frontend EHR Web UI :5173           [PASS]
════════════════════════════════════════════════════════════
  RESULT: ALL SYSTEMS OPERATIONAL AND CLINICALLY READY
════════════════════════════════════════════════════════════
```

---

## 5. First-Time Application Walkthrough

1. Open your browser (Google Chrome or Microsoft Edge) and go to **[http://localhost:5173](http://localhost:5173)**.
2. In the top header, verify that:
   - **API:** Shows a green dot and says **"Active"**.
   - **Orthanc PACS:** Shows a green dot and says **"Connected"**.
3. Click on the **"Device Management"** tab in the center navigation bar.
4. You will see pre-registered clinic devices (ZEISS CIRRUS OCT, Topcon Fundus Camera, Heidelberg SPECTRALIS, Humphrey Visual Field Analyzer).
5. Click **"Test"** on any device row to perform an instant live connectivity check.
6. Click **"Register New Device"** to test the 7-step guided device setup wizard.
7. Switch back to **"Clinical Imaging"** to view patient studies or click **"Ingest DICOM Data"** to upload `sample-data/synthetic-study-001.dcm`.
8. Click **"View in OHIF"** on any study to launch the medical image viewer.

---

## 6. How to Safely Stop and Restart the System

### To Stop the Application:
1. In the PowerShell windows running `npm run dev`, press **`Ctrl + C`** and type `Y`.
2. In PowerShell, stop the Docker containers:
   ```powershell
   cd d:\dicom
   docker compose down
   ```
   *(Your stored patient studies and device settings are safely preserved in the database volume and registry file).*

### To Restart the Application Tomorrow:
1. Start Docker containers:
   ```powershell
   cd d:\dicom
   docker compose up -d
   ```
2. Start the Backend:
   ```powershell
   cd d:\dicom\backend
   npm run dev
   ```
3. Start the Frontend:
   ```powershell
   cd d:\dicom\frontend
   npm run dev
   ```
4. Open **`http://localhost:5173`** in your browser.
