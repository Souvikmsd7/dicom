// =============================================================================
// DocMed EHR DICOM Integration POC — Backend Entry Point
// =============================================================================
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { seedDemoData } from './services/patient-mapping.service.js';
import { checkOrthancHealth } from './services/dicomweb.service.js';
import { getAuditLog } from './middleware/audit.js';
import studiesRoutes from './routes/studies.routes.js';
import importRoutes from './routes/import.routes.js';
import viewerRoutes from './routes/viewer.routes.js';
import devicesRoutes from './routes/devices.routes.js';

const app = express();

// ---------------------------------------------------------------------------
// Global Middleware
// ---------------------------------------------------------------------------

// CORS — restricted to the frontend origin
app.use(
  cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Demo-Auth'],
    credentials: true,
  })
);

// JSON body parsing (not for /api/import which reads raw buffers)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/import')) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Auth middleware (demo mode in development)
app.use('/api', authMiddleware);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api', studiesRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/import', importRoutes);
app.use('/api/viewer', viewerRoutes);

// Audit log endpoint (development only)
app.get('/api/audit', (_req, res) => {
  res.json({ success: true, data: getAuditLog(), timestamp: new Date().toISOString() });
});

// Health endpoint
app.get('/api/health', async (_req, res) => {
  const orthanc = await checkOrthancHealth();
  res.json({
    success: true,
    data: {
      backend: true,
      orthanc,
      timestamp: new Date().toISOString(),
    },
  });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  // Seed demo patient data
  seedDemoData();

  // Check Orthanc connectivity at startup
  const orthancHealth = await checkOrthancHealth();
  if (orthancHealth.ready) {
    console.log(
      `✓ Orthanc is ready (v${orthancHealth.version}, DICOMweb: ${orthancHealth.dicomWebEnabled})`
    );
  } else {
    console.warn(
      '⚠ Orthanc is not reachable. Start Docker containers: docker compose up -d'
    );
  }

  app.listen(config.port, () => {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  DocMed DICOM POC — Backend`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`  API:      http://localhost:${config.port}/api`);
    console.log(`  Health:   http://localhost:${config.port}/api/health`);
    console.log(`  Orthanc:  ${config.orthanc.baseUrl}`);
    console.log(`  OHIF:     ${config.ohif.baseUrl}`);
    console.log(`  CORS:     ${config.cors.origin}`);
    console.log(`${'═'.repeat(60)}\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
