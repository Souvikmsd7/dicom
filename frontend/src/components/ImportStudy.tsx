import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { importDicomFile, createMapping } from '../services/imaging.service';
import { InlineSpinner } from './ui/Spinner';
import type { EhrPatient } from '../types/imaging.types';

interface ImportStudyProps {
  patients: EhrPatient[];
  selectedPatient: EhrPatient | null;
  onImportSuccess: () => void;
  onClose: () => void;
}

export function ImportStudy({
  patients,
  selectedPatient,
  onImportSuccess,
  onClose,
}: ImportStudyProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Identity Mapping state
  const [targetPatientId, setTargetPatientId] = useState<string>(
    selectedPatient?.ehrPatientId || (patients[0]?.ehrPatientId ?? '')
  );
  const [dicomPatientId, setDicomPatientId] = useState<string>('');
  const [mappingSuccess, setMappingSuccess] = useState<boolean>(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setError(null);
    setSuccessMsg(null);
    setUploading(true);

    try {
      const result = await importDicomFile(file);
      setSuccessMsg(
        `DICOM study successfully imported into Orthanc! Orthanc Resource ID: ${result.orthancId}`
      );
      onImportSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DICOM upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPatientId || !dicomPatientId.trim()) return;

    setMappingError(null);
    setMappingSuccess(false);

    const targetPatient = patients.find((p) => p.ehrPatientId === targetPatientId);
    const pName = targetPatient ? `${targetPatient.lastName}, ${targetPatient.firstName}` : '';

    try {
      await createMapping(targetPatientId, dicomPatientId.trim(), pName);
      setMappingSuccess(true);
      onImportSuccess();
    } catch (err) {
      setMappingError(err instanceof Error ? err.message : 'Failed to create patient identity mapping');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <UploadCloud size={18} />
          DICOM Ingestion & Identity Mapping Tool (Dev Only)
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Done
        </button>
      </div>

      <div className="card-body">
        {/* Upload Dropzone */}
        <div
          className={`import-dropzone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".dcm,application/dicom"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <UploadCloud />
          {uploading ? (
            <p>
              <InlineSpinner /> Ingesting DICOM file into Orthanc PACS...
            </p>
          ) : (
            <>
              <p>
                Drag & drop a <span className="highlight">.dcm file</span> here, or click to browse.
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                Synthetic or de-identified DICOM files only. Direct ingestion to Orthanc REST backend.
              </p>
            </>
          )}
        </div>

        {/* Upload feedback */}
        {error && (
          <div
            className="toast error"
            style={{ position: 'static', margin: '1rem 0 0 0', width: '100%' }}
          >
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {successMsg && (
          <div
            className="toast success"
            style={{ position: 'static', margin: '1rem 0 0 0', width: '100%' }}
          >
            <CheckCircle2 size={16} />
            {successMsg}
          </div>
        )}

        <hr style={{ margin: '1.75rem 0', borderColor: 'var(--border-subtle)' }} />

        {/* Identity Association Form */}
        <div>
          <h3
            style={{
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '0.5rem',
            }}
          >
            <LinkIcon size={15} color="var(--accent-cyan)" />
            Explicit EHR ↔ DICOM Patient Identifier Mapping
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            In compliance with healthcare data governance, DICOM PatientIDs are never automatically
            assumed to equal EHR internal IDs. Register verified relationships here.
          </p>

          <form onSubmit={handleCreateMapping} className="mapping-form">
            <div className="form-group">
              <label>EHR Patient Record</label>
              <select
                value={targetPatientId}
                onChange={(e) => setTargetPatientId(e.target.value)}
              >
                {patients.map((p) => (
                  <option key={p.ehrPatientId} value={p.ehrPatientId}>
                    {p.ehrPatientId} — {p.lastName}, {p.firstName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>DICOM PatientID (from DCM Tag 0010,0020)</label>
              <input
                type="text"
                placeholder="e.g. BRAINIX, 0001, ANONYMOUS"
                value={dicomPatientId}
                onChange={(e) => setDicomPatientId(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ height: '38px' }}>
              Confirm Mapping
            </button>
          </form>

          {mappingSuccess && (
            <div
              className="toast success"
              style={{ position: 'static', margin: '1rem 0 0 0', width: '100%' }}
            >
              <CheckCircle2 size={16} />
              Verified association established! Patient study queries will now include this DICOM identifier.
            </div>
          )}

          {mappingError && (
            <div
              className="toast error"
              style={{ position: 'static', margin: '1rem 0 0 0', width: '100%' }}
            >
              <AlertTriangle size={16} />
              {mappingError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
