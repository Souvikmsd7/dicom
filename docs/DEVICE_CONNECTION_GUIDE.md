# DocMed EHR — Ophthalmology Device Connection & Configuration Guide

This guide provides practical, step-by-step instructions for connecting physical ophthalmic diagnostic instruments and vendor workstations to the DocMed EHR imaging platform.

---

## 1. What Information to Provide to Your Scanner or Vendor

When configuring a diagnostic instrument (OCT, Fundus Camera, Perimetry Analyzer) to export images to DocMed, the manufacturer's technician or scanner console will ask for the **Storage Destination (DICOM C-STORE SCP)** parameters:

| Configuration Field | Value to Enter into Scanner | Notes / Requirements |
| :--- | :--- | :--- |
| **Application Entity Title (AE Title)** | `DOCMED` | Must be entered **exactly in uppercase**. Case-sensitive on most scanners. |
| **DICOM Port** | `4242` | Native DICOM C-STORE SCP port. (Do not confuse with web port `8042`). |
| **Host IP Address** | `<DocMed_Server_IP>` | For testing on the same computer: `127.0.0.1`. On a clinic LAN: the static IP of the DocMed server (e.g., `192.168.1.50`). |
| **C-ECHO Verification** | Supported (`Always Allow`) | The scanner can "Ping" the server before sending studies. |
| **C-STORE Storage** | Supported (`Always Allow`) | Allows automatic image archiving upon exam completion. |
| **DICOMweb Endpoint** | `http://<DocMed_Server_IP>:8042/dicom-web` | Required for DICOMweb or REST-enabled workstations. |

---

## 2. Using the In-App 7-Step Device Connection Wizard

DocMed includes an interactive, guided device onboarding wizard in the web application:

1. Open **[http://localhost:5173](http://localhost:5173)**.
2. Click the **"Device Management"** tab in the top header.
3. Click the blue **"+ Register New Device"** button in the upper right.
4. Follow the 7 interactive steps:
   - **Step 1 (Category):** Select the device modality (e.g., `OCT / OCT Angiography`, `Fundus Camera`, `Visual Field Analyzer`).
   - **Step 2 (Device Details):** Enter the Device ID (e.g., `OCT-ROOM1`), Friendly Display Name, Manufacturer, Model, and Serial Number.
   - **Step 3 (Protocol):** Choose **DICOM**, **DICOMweb**, or **Shared Folder / USB Dropzone**. The wizard automatically presents conditional input fields matching that protocol.
   - **Step 4 (Connectivity Test):** Click **"Test Connection"** to run a live network reachability and socket probe. Look for the green **"Connection Verified"** badge with latency in milliseconds.
   - **Step 5 (Test Study Transfer):** Review test study guidelines and verify the sample DICOM binary.
   - **Step 6 (Patient Safety Safeguards):** Review multi-criteria demographic cross-checks (EHR ID, PatientID, DOB, Sex).
   - **Step 7 (Review & Activate):** Click **"Save & Activate Device"** to persist the device into the clinic registry and enable live ingestion.

---

## 3. Specific Connection Instructions by Manufacturer & Model

### 3.1 ZEISS CIRRUS HD-OCT (4000 / 5000 / 6000)
- **Modality Category:** `OCT / OCT Angiography` (Modality: `OPT`)
- **Connection Method:** DICOM C-STORE over LAN or ZEISS FORUM PACS.
- **Required Zeiss License:** "DICOM Connectivity License" (check under *System > Configuration > Licensing*).
- **Scanner Setup Steps:**
  1. On the CIRRUS console, log in as administrator and open **Tools > Configuration > DICOM Settings**.
  2. Under **Storage Destinations**, click **Add Destination**.
  3. Enter Name: `DocMed PACS`, AE Title: `DOCMED`, IP Address: `<Server_IP>`, Port: `4242`.
  4. Click **Test (Echo)**. The console should display *"Verification succeeded"*.
  5. Check **"Auto-export completed examinations"**.
- **Supported Outputs:** Macular Cube, HD 5-Line Raster, Optic Disc RNFL Cube (Ophthalmic Tomography SOP Class `1.2.840.10008.5.1.4.1.1.77.1.5.4`).

---

### 3.2 Topcon TRC-NW400 Non-Mydriatic Retinal Camera
- **Modality Category:** `Fundus Camera / Retinal Photography` (Modality: `OP`)
- **Connection Method:** DICOM C-STORE over LAN or Topcon IMAGEnet 6.
- **Scanner Setup Steps:**
  1. On the TRC-NW400 touch panel, tap **Menu > Network Setting > DICOM Setting**.
  2. Under **Storage Server (SCP)**, enter:
     - IP Address: `<DocMed_Server_IP>`
     - Port: `4242`
     - Calling AE Title: `TRC_NW400`
     - Called AE Title: `DOCMED`
  3. Tap **Echo Test**. A green checkmark confirms communication.
  4. Under **Auto Transfer**, toggle **ON**.
- **Supported Outputs:** 8-Bit True-Color Fundus Photography (`1.2.840.10008.5.1.4.1.1.77.1.5.1`), JPEG Baseline.

---

### 3.3 Heidelberg Engineering SPECTRALIS (OCT & HRA+OCT)
- **Modality Category:** `OCT / OCT Angiography` (Modality: `OPT`)
- **Connection Method:** Heidelberg HEYEX 2 PACS DICOM C-STORE or DICOMweb.
- **Required Heidelberg License:** HEYEX DICOM Import/Export License.
- **Workstation Setup Steps:**
  1. On the HEYEX 2 acquisition PC, open **HEYEX Control Center > General Settings > DICOM**.
  2. Select **PACS Archive Destinations** and click **New**.
  3. Enter Description: `DocMed`, AE Title: `DOCMED`, Host: `<Server_IP>`, Port: `4242`.
  4. Click **Verify Connection**.
  5. Under Export Rules, enable **"Send Ophthalmic Tomography slices and Thickness Maps"**.

---

### 3.4 ZEISS CLARUS (500 / 700) Ultra-Widefield Retinal Camera
- **Modality Category:** `Fundus Camera / Retinal Photography` (Modality: `OP`)
- **Scanner Setup Steps:**
  1. In the CLARUS software, open **Settings > Connectivity > DICOM Storage**.
  2. Add destination with AE Title `DOCMED`, Port `4242`.
  3. Select **Export Format**: Ophthalmic Photography 8-Bit (`1.2.840.10008.5.1.4.1.1.77.1.5.1`) or 16-Bit Lossless (`1.2.840.10008.5.1.4.1.1.77.1.5.2`).
  4. Perform test transfer of a calibration phantom.

---

### 3.5 ZEISS Humphrey Field Analyzer (HFA 3 / HFA II-i)
- **Modality Category:** `Automated Visual Field Analyzer / Perimetry` (Modality: `OPV` / `DOC`)
- **Scanner Setup Steps:**
  1. On the HFA 3 console, navigate to **Main Menu > Settings > Network & DICOM**.
  2. Under **DICOM Export Destinations**, add destination `DOCMED` on port `4242`.
  3. Under **Report Format**, select **Encapsulated PDF (`1.2.840.10008.5.1.4.1.1.104.1`)** and **Raw XML/Data (`1.2.840.10008.5.1.4.1.1.66`)**.
  4. Run **Verification Ping**.

---

### 3.6 Haag-Streit BX 900 Slit Lamp / Anterior Segment
- **Modality Category:** `Slit Lamp / Anterior Segment Imaging` (Modality: `XC` / `OP`)
- **Connection Method:** Shared Folder Dropzone or Eyesuite DICOM module.
- **Setup Steps:**
  1. In EyeSuite software, configure the export directory to point to `d:/dicom/sample-data` (or your shared folder network path).
  2. Set export format to DICOM Secondary Capture or JPEG + XML metadata.
  3. In DocMed Device Management, configure the connection type as **FOLDER** and enter the folder path.
  4. DocMed automatically polls the dropzone folder for incoming scans.

---

## 4. What to Do Before Calling the Device Vendor

Before opening a service ticket with Zeiss, Topcon, Heidelberg, or Optos, verify the following:

1. **Ask for the DICOM Conformance Statement (DCS):** Every manufacturer publishes a document listing the exact SOP classes, transfer syntaxes, and network roles supported by your software version.
2. **Verify That DICOM Export Is Licensed:** Many ophthalmic consoles require a paid software license or USB dongle to enable DICOM transmission. Ask your vendor representative: *"Is DICOM C-STORE export enabled on our device serial number?"*
3. **Verify Windows Firewall Settings:** Ensure inbound TCP port `4242` is open on the DocMed server computer:
   ```powershell
   New-NetFirewallRule -DisplayName "DocMed DICOM C-STORE" -Direction Inbound -LocalPort 4242 -Protocol TCP -Action Allow
   ```
4. **Obtain the Scanner IP & AE Title:** Write down the device's exact IP address, subnet mask, and console AE Title before running the connection wizard.
