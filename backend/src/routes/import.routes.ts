// =============================================================================
// DocMed DICOM POC — Import Routes
// =============================================================================
import { Router } from 'express';
import { importDicomInstance } from '../services/dicomweb.service.js';
import { successResponse, errorResponse } from '../types/api.types.js';
import { auditAction } from '../middleware/audit.js';

const router = Router();

/**
 * POST /api/import — Import a DICOM instance into Orthanc.
 *
 * This uses Orthanc's native REST API (/instances) rather than STOW-RS
 * because it is simpler for single-file uploads. See dicomweb.service.ts
 * for documentation on this design choice.
 *
 * Accepts: application/dicom or application/octet-stream
 */
router.post(
  '/',
  auditAction('IMPORT_DICOM'),
  async (req, res) => {
    try {
      // Collect the raw body as a Buffer
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
      }
      const dicomBuffer = Buffer.concat(chunks);

      if (dicomBuffer.length === 0) {
        res.status(400).json(
          errorResponse('EMPTY_BODY', 'No DICOM data received')
        );
        return;
      }

      // Basic validation: DICOM files start with a 128-byte preamble
      // followed by "DICM" magic bytes at offset 128
      if (dicomBuffer.length > 132) {
        const magic = dicomBuffer.slice(128, 132).toString('ascii');
        if (magic !== 'DICM') {
          console.warn('[Import] File does not have DICM magic bytes — proceeding anyway');
        }
      }

      const result = await importDicomInstance(dicomBuffer);

      console.log(
        `[Import] Successfully imported instance: ${result.orthancId} (${result.status})`
      );

      res.status(201).json(successResponse(result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      console.error('[Import] Error:', message);
      res.status(502).json(errorResponse('IMPORT_ERROR', message));
    }
  }
);

export default router;
