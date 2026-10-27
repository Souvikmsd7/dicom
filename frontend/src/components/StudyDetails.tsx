import { useEffect, useState, useMemo } from 'react';
import {
  Layers,
  ExternalLink,
  Info,
  Image as ImageIcon,
  FileCode,
  Activity,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type {
  StudyMetadata,
  SeriesMetadata,
  CanonicalDeviceRecord,
  CanonicalContractDocument,
} from '../types/imaging.types';
import { getStudySeries, getStudyDeviceData } from '../services/imaging.service';
import { Spinner } from './ui/Spinner';
import { ErrorState } from './ui/ErrorState';

interface StudyDetailsProps {
  study: StudyMetadata;
  ehrPatientId: string;
  onLaunchViewer: (study: StudyMetadata) => void;
  isLaunching: boolean;
  onClose: () => void;
}

export function StudyDetails({
  study,
  ehrPatientId,
  onLaunchViewer,
  isLaunching,
  onClose,
}: StudyDetailsProps) {
  const [activeTab, setActiveTab] = useState<'series' | 'device' | 'json'>('series');
  const [seriesList, setSeriesList] = useState<SeriesMetadata[]>([]);
  const [contractDoc, setContractDoc] = useState<CanonicalContractDocument | null>(null);
  const [selectedJsonView, setSelectedJsonView] = useState<string>('full_document');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [series, devContract] = await Promise.all([
          getStudySeries(study.studyInstanceUID, ehrPatientId),
          getStudyDeviceData(study.studyInstanceUID, ehrPatientId).catch(() => null),
        ]);
        if (mounted) {
          setSeriesList(series);
          setContractDoc(devContract);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to retrieve study details');
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      mounted = false;
    };
  }, [study.studyInstanceUID, ehrPatientId]);

  // Extract the active study device record for clinical measurements & status view
  const deviceData = useMemo<CanonicalDeviceRecord | null>(() => {
    if (!contractDoc || !contractDoc.devices || contractDoc.devices.length === 0) return null;
    const match = contractDoc.devices.find(
      (d) => d.study?.study_instance_uid === study.studyInstanceUID
    );
    return match || contractDoc.devices[0];
  }, [contractDoc, study.studyInstanceUID]);

  const getDisplayJson = (): string => {
    if (!contractDoc) return 'Loading canonical contract...';
    if (selectedJsonView === 'full_document') {
      return JSON.stringify(contractDoc, null, 2);
    }
    if (selectedJsonView === 'active_record') {
      return JSON.stringify(deviceData, null, 2);
    }
    if (selectedJsonView.startsWith('device_')) {
      const idx = parseInt(selectedJsonView.replace('device_', ''), 10);
      const dev = contractDoc.devices[idx];
      return dev ? JSON.stringify(dev, null, 2) : JSON.stringify(contractDoc, null, 2);
    }
    return JSON.stringify(contractDoc, null, 2);
  };

  const handleCopyJson = () => {
    const text = getDisplayJson();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  /** Safely format a scalar or measurement: never display literal string "null" */
  const renderValue = (val: unknown, unit = '') => {
    if (val === null || val === undefined || val === '') {
      return (
        <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '0.8rem' }}>
          Not provided
        </span>
      );
    }
    if (typeof val === 'boolean') {
      return val ? 'Yes' : 'No';
    }
    return `${val}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <Layers size={18} />
          Study Breakdown & Canonical Device Contract
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onLaunchViewer(study)}
            disabled={isLaunching}
          >
            <ExternalLink size={13} />
            Launch OHIF Viewer
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.5rem 1.25rem',
          background: 'var(--bg-input)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <button
          className={`btn btn-sm ${activeTab === 'series' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('series')}
        >
          <ImageIcon size={14} />
          Series & Instances ({seriesList.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'device' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('device')}
        >
          <Activity size={14} />
          Ophthalmic Device Data
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'json' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('json')}
        >
          <FileCode size={14} />
          Canonical JSON Contract
        </button>
      </div>

      <div className="card-body">
        {/* Study Metadata Summary Strip */}
        <div
          style={{
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.8rem',
          }}
        >
          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Study Description
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {study.studyDescription || 'Not specified'}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Study Instance UID
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-cyan)',
                fontSize: '0.75rem',
                wordBreak: 'break-all',
              }}
            >
              {study.studyInstanceUID}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Referring Physician
            </div>
            <div>{study.referringPhysicianName || 'None listed'}</div>
          </div>

          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              DICOM Patient ID
            </div>
            <div style={{ fontFamily: 'var(--font-mono)' }}>{study.patientID}</div>
          </div>

          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Device / Manufacturer
            </div>
            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
              {study.manufacturer
                ? `${study.manufacturer} ${study.manufacturerModelName || ''}`
                : 'Generic / Sample Archive'}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Ophthalmic Laterality
            </div>
            <div style={{ fontWeight: 600 }}>
              {study.laterality === 'R'
                ? 'Right Eye (OD)'
                : study.laterality === 'L'
                ? 'Left Eye (OS)'
                : study.laterality === 'B'
                ? 'Bilateral / Both (OU)'
                : 'Not specified'}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Identity Reconciliation Status
            </div>
            <div>
              <span
                className={`badge badge-${
                  study.reconciliationStatus === 'VERIFIED'
                    ? 'success'
                    : study.reconciliationStatus === 'DEMOGRAPHIC_MISMATCH'
                    ? 'danger'
                    : study.reconciliationStatus === 'QUARANTINED'
                    ? 'danger'
                    : 'warning'
                }`}
              >
                {study.reconciliationStatus || 'UNMAPPED'}
              </span>
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Canonical Device Type
            </div>
            <div style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>
              {deviceData?.device_type || 'OCT / OCT Angiography'}
            </div>
          </div>
        </div>

        {/* Tab 1: Series & Instances */}
        {activeTab === 'series' && (
          <div>
            <h3
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <ImageIcon size={15} />
              Discovered Series ({seriesList.length})
            </h3>

            {loading ? (
              <Spinner size="sm" label="Fetching series breakdown from PACS via QIDO-RS..." />
            ) : error ? (
              <ErrorState title="Failed to Load Series" message={error} />
            ) : seriesList.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: '1rem' }}>
                <Info size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
                No distinct series records returned for this study.
              </div>
            ) : (
              <div className="series-grid">
                {seriesList.map((series, idx) => (
                  <div key={series.seriesInstanceUID || idx} className="series-card">
                    <h4>
                      {series.seriesNumber ? `Series ${series.seriesNumber}: ` : ''}
                      {series.seriesDescription || 'Diagnostic Series'}
                    </h4>
                    <div className="series-meta">
                      <div>
                        <strong>Modality:</strong> {series.modality || study.modality || 'OT'}
                      </div>
                      <div>
                        <strong>Instances:</strong> {series.numberOfInstances || 1} frame(s)
                      </div>
                      {series.bodyPartExamined && (
                        <div>
                          <strong>Body Part:</strong> {series.bodyPartExamined}
                        </div>
                      )}
                      {series.laterality && (
                        <div>
                          <strong>Laterality:</strong>{' '}
                          {series.laterality === 'R'
                            ? 'Right Eye (OD)'
                            : series.laterality === 'L'
                            ? 'Left Eye (OS)'
                            : series.laterality === 'B'
                            ? 'Bilateral (OU)'
                            : series.laterality}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-tertiary)',
                          marginTop: '0.25rem',
                          wordBreak: 'break-all',
                        }}
                      >
                        UID: {series.seriesInstanceUID}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Ophthalmic Device Data & Integration Status */}
        {activeTab === 'device' && (
          <div>
            {deviceData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Integration Status Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Metadata Received
                    </div>
                    <div style={{ fontWeight: 600, color: deviceData.integration_status.metadata_received ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {deviceData.integration_status.metadata_received ? 'YES (Valid)' : 'NO'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Images Available
                    </div>
                    <div style={{ fontWeight: 600, color: deviceData.integration_status.images_available ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
                      {deviceData.integration_status.images_available ? `YES (${deviceData.study.instances.length} objects)` : 'NO IMAGES'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Measurements Parsed
                    </div>
                    <div style={{ fontWeight: 600, color: deviceData.integration_status.measurements_parsed ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                      {deviceData.integration_status.measurements_parsed ? 'PARSED' : 'NOT EXTRACTED'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Patient Match Status
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      <span className={`badge badge-${deviceData.integration_status.patient_match_status === 'VERIFIED' ? 'success' : 'warning'}`}>
                        {deviceData.integration_status.patient_match_status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Missing & Unsupported Fields Audit */}
                {(deviceData.integration_status.missing_fields.length > 0 ||
                  deviceData.integration_status.unsupported_fields.length > 0) && (
                  <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-yellow)', marginBottom: '0.4rem' }}>
                      Schema Field Audit (Preserved Predefined Contract)
                    </div>
                    {deviceData.integration_status.missing_fields.length > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                        <strong>Unavailable Expected Fields:</strong> {deviceData.integration_status.missing_fields.join(', ')}
                      </div>
                    )}
                    {deviceData.integration_status.unsupported_fields.length > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        <strong>Unsupported Modality Fields:</strong> {deviceData.integration_status.unsupported_fields.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Clinical Measurements Section */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Device Clinical Measurements ({deviceData.device_type})
                  </h4>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '0.75rem',
                      background: 'var(--bg-card)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>Central Subfield Thickness</div>
                      <div style={{ fontWeight: 600 }}>
                        {renderValue(deviceData.clinical_data?.retinal_measurements?.central_subfield_thickness_um, 'µm')}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>Average Retinal Thickness</div>
                      <div style={{ fontWeight: 600 }}>
                        {renderValue(deviceData.clinical_data?.retinal_measurements?.average_retinal_thickness_um, 'µm')}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>Macular Volume</div>
                      <div style={{ fontWeight: 600 }}>
                        {renderValue(deviceData.clinical_data?.retinal_measurements?.macular_volume_mm3, 'mm³')}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>RNFL Global Thickness</div>
                      <div style={{ fontWeight: 600 }}>
                        {renderValue(deviceData.clinical_data?.retinal_measurements?.rnfl_global_um, 'µm')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Safety & Clinical Guardrail Notice */}
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid var(--accent-blue)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Info size={14} style={{ color: 'var(--accent-blue)', display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
                  <strong>Clinical Separation Notice:</strong> Device data is companion telemetry and remains strictly separate from clinician-entered findings, diagnoses, and signed prescriptions. No automated clinical diagnoses are generated.
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-tertiary)', padding: '1rem' }}>
                No canonical device contract available for this study.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Canonical JSON Contract Inspector */}
        {activeTab === 'json' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  DocMed_Ophthalmology_Device_Data_Examples_Compatible.json
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Source contract preserved: 5 top-level keys • 10 device categories • Schema v1.0.1
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={selectedJsonView}
                  onChange={(e) => setSelectedJsonView(e.target.value)}
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    padding: '0.35rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="full_document">
                    Full Document (5 Top-Level Keys • All 10 Categories)
                  </option>
                  <option value="active_record">
                    Active Study Device Record ({deviceData?.device_type || 'Detected'})
                  </option>
                  <optgroup label="Individual Category Schemas">
                    {contractDoc?.devices.map((dev, idx) => (
                      <option key={idx} value={`device_${idx}`}>
                        Category {idx + 1}: {dev.device_type}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <button className="btn btn-secondary btn-sm" onClick={handleCopyJson}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied JSON!' : 'Copy Canonical JSON'}
                </button>
              </div>
            </div>

            <pre
              style={{
                background: '#0d1117',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: '#58a6ff',
                maxHeight: '440px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                lineHeight: 1.45,
              }}
            >
              {getDisplayJson()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
