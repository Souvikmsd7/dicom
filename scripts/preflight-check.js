#!/usr/bin/env node
// =============================================================================
// DocMed EHR — Preflight Validation & Readiness Diagnostic Script
// Checks system requirements, Docker, ports, Node.js, Orthanc, and OHIF.
// Usage: node scripts/preflight-check.js
// =============================================================================

import os from 'os';
import net from 'net';
import http from 'http';
import { execSync } from 'child_process';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.log(`${BOLD}════════════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}   DocMed EHR — Preflight System Readiness Verification   ${RESET}`);
console.log(`${BOLD}════════════════════════════════════════════════════════════${RESET}\n`);

let passedChecks = 0;
let totalChecks = 0;
const issues = [];

function check(title, condition, failureHelp) {
  totalChecks++;
  process.stdout.write(`• Checking ${title.padEnd(42)} `);
  if (condition) {
    passedChecks++;
    console.log(`${GREEN}[PASS]${RESET}`);
    return true;
  } else {
    console.log(`${RED}[FAIL]${RESET}`);
    issues.push({ title, help: failureHelp });
    return false;
  }
}

// 1. Operating System & Platform
const platform = os.platform();
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';
check(
  'Operating System',
  isWindows || isMac || isLinux,
  'Supported operating systems are Windows 10/11 64-bit, macOS 12+, or Ubuntu 20.04+ LTS.'
);

// 2. Hardware Memory (RAM)
const totalMemGb = Math.round(os.totalmem() / (1024 * 1024 * 1024));
check(
  `Available System RAM (Found: ${totalMemGb}GB)`,
  totalMemGb >= 4,
  `Recommended RAM is 8GB (minimum 4GB). Your system reports ${totalMemGb}GB.`
);

// 3. Node.js Version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
check(
  `Node.js Runtime (v${nodeVersion})`,
  majorVersion >= 18,
  `Node.js 18 LTS or higher is required. Please download from https://nodejs.org/`
);

// 4. Docker CLI & Service
let dockerRunning = false;
try {
  const dockerInfo = execSync('docker info', { stdio: 'pipe', timeout: 5000 }).toString();
  dockerRunning = dockerInfo.includes('Server Version') || dockerInfo.includes('Containers:');
} catch (e) {
  dockerRunning = false;
}
check(
  'Docker Desktop Daemon Active',
  dockerRunning,
  'Docker Desktop is not running or not installed. Please launch Docker Desktop and wait until the status displays "Engine running".'
);

// 5. Port Probe Helper
function probePort(port, host = '127.0.0.1', timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.connect(port, host, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

// 6. HTTP Query Helper
function httpGet(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function runAsyncChecks() {
  console.log(`\n${BOLD}--- Service Port & Health Diagnostics ---${RESET}`);

  // Port 4242 (Orthanc DICOM SCP)
  const dicomPortActive = await probePort(4242);
  check(
    'Orthanc DICOM Port :4242 (C-STORE SCP)',
    dicomPortActive,
    'DICOM listener on port 4242 is not accepting connections. Run "docker compose up -d" to start Orthanc.'
  );

  // Port 8042 (Orthanc HTTP & DICOMweb)
  const orthancHttpActive = await probePort(8042);
  check(
    'Orthanc HTTP Port :8042 (DICOMweb)',
    orthancHttpActive,
    'Orthanc HTTP endpoint on port 8042 is not reachable. Run "docker compose up -d".'
  );

  // Port 3001 (OHIF Viewer)
  const ohifActive = await probePort(3001);
  check(
    'OHIF Medical Viewer Web UI :3001',
    ohifActive,
    'OHIF Viewer container is not running on port 3001. Run "docker compose up -d".'
  );

  // Port 3000 (DocMed Backend API)
  const backendActive = await probePort(3000);
  check(
    'DocMed Backend API Proxy :3000',
    backendActive,
    'Backend API is not running. In PowerShell: "cd backend; npm run dev".'
  );

  // Port 5173 (Frontend Vite UI)
  const frontendActive = await probePort(5173);
  check(
    'DocMed Frontend EHR Web UI :5173',
    frontendActive,
    'Frontend Vite server is not running. In PowerShell: "cd frontend; npm run dev".'
  );

  console.log(`\n${BOLD}════════════════════════════════════════════════════════════${RESET}`);
  if (issues.length === 0) {
    console.log(`${GREEN}${BOLD}  RESULT: ALL SYSTEMS OPERATIONAL AND CLINICALLY READY${RESET}`);
    console.log(`  Access the EHR at: ${BLUE}http://localhost:5173${RESET}`);
    console.log(`  Device Manager at: ${BLUE}http://localhost:5173 (Click "Device Management" tab)${RESET}`);
    console.log(`  OHIF Viewer at:    ${BLUE}http://localhost:3001${RESET}`);
    console.log(`${BOLD}════════════════════════════════════════════════════════════${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${YELLOW}${BOLD}  RESULT: ${passedChecks}/${totalChecks} CHECKS PASSED — ${issues.length} ACTION(S) REQUIRED${RESET}`);
    console.log(`${BOLD}════════════════════════════════════════════════════════════${RESET}\n`);
    console.log(`${BOLD}Action Plan & Resolution Steps:${RESET}`);
    issues.forEach((iss, idx) => {
      console.log(`\n${BOLD}${idx + 1}. ${iss.title}:${RESET}`);
      console.log(`   ${iss.help}`);
    });
    console.log('\n');
    process.exit(1);
  }
}

runAsyncChecks();
