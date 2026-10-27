import { UserCheck, Link as LinkIcon, ShieldCheck, AlertCircle } from 'lucide-react';
import type { EhrPatient, PatientMapping } from '../types/imaging.types';

interface PatientDemographicsProps {
  patient: EhrPatient | null;
  mapping?: PatientMapping | null;
  onOpenMappingModal?: () => void;
}

export function PatientDemographics({
  patient,
  mapping,
  onOpenMappingModal,
}: PatientDemographicsProps) {
  if (!patient) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
          Please select a patient from the directory to review demographics and imaging studies.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <UserCheck size={18} />
          Patient Demographics & Identity Verification
        </h2>
        <div>
          {mapping ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                color: 'var(--accent-green)',
                background: 'var(--accent-green-bg)',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={13} />
              DICOM Identity Mapped
            </span>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenMappingModal}
              title="Map EHR Patient to DICOM Patient ID"
            >
              <LinkIcon size={13} />
              Map to DICOM ID
            </button>
          )}
        </div>
      </div>

      <div className="card-body">
        <div className="demographics">
          <div className="demo-field">
            <span className="demo-label">Full Name</span>
            <span className="demo-value">
              {patient.lastName}, {patient.firstName}
            </span>
          </div>

          <div className="demo-field">
            <span className="demo-label">EHR Patient ID</span>
            <span className="demo-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {patient.ehrPatientId}
            </span>
          </div>

          <div className="demo-field">
            <span className="demo-label">Medical Record Number</span>
            <span className="demo-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {patient.mrn}
            </span>
          </div>

          <div className="demo-field">
            <span className="demo-label">Date of Birth</span>
            <span className="demo-value">{patient.dateOfBirth}</span>
          </div>

          <div className="demo-field">
            <span className="demo-label">Sex</span>
            <span className="demo-value">
              {patient.sex === 'M' ? 'Male' : patient.sex === 'F' ? 'Female' : 'Other'}
            </span>
          </div>

          <div className="demo-field">
            <span className="demo-label">Associated DICOM ID</span>
            <span className="demo-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {mapping ? (
                mapping.dicomPatientId
              ) : (
                <span style={{ color: 'var(--accent-amber)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={13} />
                  Unmapped
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
