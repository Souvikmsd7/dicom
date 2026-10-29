import { FileImage, ExternalLink, RefreshCw, Eye, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import type { StudyMetadata } from '../types/imaging.types';
import { EmptyState } from './ui/EmptyState';
import { Spinner } from './ui/Spinner';

interface StudyListProps {
  studies: StudyMetadata[];
  selectedStudy: StudyMetadata | null;
  onSelectStudy: (study: StudyMetadata) => void;
  onLaunchViewer: (study: StudyMetadata) => void;
  onRefresh: () => void;
  isLoading: boolean;
  isLaunching: boolean;
  patientName?: string;
  hasMapping: boolean;
  onOpenMappingModal: () => void;
}

export function StudyList({
  studies,
  selectedStudy,
  onSelectStudy,
  onLaunchViewer,
  onRefresh,
  isLoading,
  isLaunching,
  patientName,
  hasMapping,
  onOpenMappingModal,
}: StudyListProps) {
  // Format DICOM date (YYYYMMDD -> YYYY-MM-DD)
  const formatDate = (rawDate: string) => {
    if (!rawDate || rawDate.length !== 8) return rawDate || '—';
    return `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
  };

  const getModalityClass = (modality: string) => {
    const m = (modality || '').toLowerCase();
    if (m.includes('opt') || m.includes('oct')) return 'mr'; // blue/indigo
    if (m.includes('op') || m.includes('fundus')) return 'xr'; // green
    if (m.includes('opv') || m.includes('vf')) return 'us'; // amber
    if (m.includes('ct')) return 'ct'; // purple
    if (m.includes('mr')) return 'mr';
    return '';
  };

  // Convert Laterality tag to Clinical Ophthalmic Abbreviation
  const formatLaterality = (lat?: string) => {
    if (!lat) return null;
    const l = lat.toUpperCase();
    if (l === 'R') return { code: 'OD', label: 'OD (Right Eye)', color: '#06b6d4' };
    if (l === 'L') return { code: 'OS', label: 'OS (Left Eye)', color: '#3b82f6' };
    if (l === 'B') return { code: 'OU', label: 'OU (Both Eyes)', color: '#8b5cf6' };
    return { code: l, label: l, color: '#94a3b8' };
  };

  const renderReconciliationBadge = (study: StudyMetadata) => {
    const status = study.reconciliationStatus || 'VERIFIED';
    if (status === 'VERIFIED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            fontSize: '0.68rem',
            fontWeight: 600,
            background: 'var(--accent-green-bg)',
            color: 'var(--accent-green)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
          title={study.reconciliationReason || 'Identity verified against EHR records'}
        >
          <ShieldCheck size={11} />
          Verified
        </span>
      );
    }

    if (status === 'DEMOGRAPHIC_MISMATCH') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            fontSize: '0.68rem',
            fontWeight: 600,
            background: 'var(--accent-red-bg)',
            color: 'var(--accent-red)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
          title={study.reconciliationReason || 'Demographic conflict between DICOM and EHR patient'}
        >
          <AlertTriangle size={11} />
          Demographic Conflict
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.15rem 0.5rem',
          borderRadius: '999px',
          fontSize: '0.68rem',
          fontWeight: 600,
          background: 'var(--accent-amber-bg)',
          color: 'var(--accent-amber)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
        title={study.reconciliationReason || 'Unmapped PatientID'}
      >
        <HelpCircle size={11} />
        Unmapped
      </span>
    );
  };

  const hasDemographicDiscrepancy = studies.some(
    (s) => s.reconciliationStatus === 'DEMOGRAPHIC_MISMATCH'
  );

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <FileImage size={18} />
          Diagnostic Imaging Studies {patientName ? `— ${patientName}` : ''}
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh QIDO-RS Study Query"
          >
            {isLoading ? <Spinner inline size="xs" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>
      </div>

      <div className="card-body no-padding">
        {hasDemographicDiscrepancy && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.12)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--accent-red)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertTriangle size={16} />
            <strong>Demographic Discrepancy Flagged:</strong> One or more studies received from physical imaging equipment contain demographic discrepancies (DOB or Sex) compared to the active EHR record. Server-side validation has flagged these for clinical review.
          </div>
        )}

        {isLoading ? (
          <Spinner size="lg" label="Querying PACS for patient studies via QIDO-RS..." />
        ) : !hasMapping ? (
          <div style={{ padding: '1.5rem' }}>
            <EmptyState
              title="Identity Mapping Required"
              message="This EHR patient is not currently associated with a DICOM Patient ID. Establish a verified mapping to query PACS studies."
              action={
                <button className="btn btn-primary btn-sm" onClick={onOpenMappingModal}>
                  Map Patient ID
                </button>
              }
            />
          </div>
        ) : studies.length === 0 ? (
          <div style={{ padding: '1.5rem' }}>
            <EmptyState
              title="No Imaging Studies Found"
              message="No diagnostic imaging records exist in PACS for this patient's mapped DICOM identifier."
            />
          </div>
        ) : (
          <div className="study-table-container">
            <table className="study-table">
              <thead>
                <tr>
                  <th>Study Date</th>
                  <th>Modality / Eye</th>
                  <th>Study Description</th>
                  <th>Accession / Device</th>
                  <th>Series / Inst.</th>
                  <th>Reconciliation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studies.map((study) => {
                  const isSelected =
                    selectedStudy?.studyInstanceUID === study.studyInstanceUID;
                  const modality =
                    study.modalitiesInStudy?.join(', ') || study.modality || 'OT';
                  const eye = formatLaterality(study.laterality);

                  return (
                    <tr
                      key={study.studyInstanceUID}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => onSelectStudy(study)}
                    >
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatDate(study.studyDate)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span className={`modality-badge ${getModalityClass(modality)}`}>
                            {modality}
                          </span>
                          {eye && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: eye.color,
                                border: `1px solid ${eye.color}40`,
                              }}
                              title={eye.label}
                            >
                              {eye.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong>{study.studyDescription || 'Untitled Examination'}</strong>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-tertiary)',
                            fontFamily: 'var(--font-mono)',
                            marginTop: '0.15rem',
                          }}
                        >
                          UID: {study.studyInstanceUID.slice(0, 24)}...
                        </div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {study.accessionNumber || '—'}
                        </div>
                        {study.manufacturer && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                            {study.manufacturer} {study.manufacturerModelName || ''}
                          </div>
                        )}
                      </td>
                      <td>
                        {study.numberOfSeries || 1} series • {study.numberOfInstances || 1} inst.
                      </td>
                      <td>{renderReconciliationBadge(study)}</td>
                      <td>
                        <div
                          style={{ display: 'flex', gap: '0.4rem' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onSelectStudy(study)}
                            title="Inspect series and device metadata"
                          >
                            <Eye size={13} />
                            Details
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onLaunchViewer(study)}
                            disabled={isLaunching}
                            title="Launch authorized OHIF Viewer instance"
                          >
                            <ExternalLink size={13} />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
