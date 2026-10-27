import { useEffect, useState } from 'react';
import {
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy,
  Info,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  X,
} from 'lucide-react';
import { getDeviceModalities, getCanonicalContractTemplates } from '../services/imaging.service';
import type { DeviceConfiguration, CanonicalDeviceRecord } from '../types/imaging.types';
import { Spinner } from './ui/Spinner';

interface DeviceIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeviceIntegrationModal({ isOpen, onClose }: DeviceIntegrationModalProps) {
  const [config, setConfig] = useState<DeviceConfiguration | null>(null);
  const [canonicalTemplates, setCanonicalTemplates] = useState<CanonicalDeviceRecord[]>([]);
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'destination' | 'devices' | 'contract' | 'workflow' | 'mwl'>('status');

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);
    Promise.all([
      getDeviceModalities().catch(() => null),
      getCanonicalContractTemplates().catch(() => []),
    ])
      .then(([modConfig, templates]) => {
        if (mounted) {
          if (modConfig) setConfig(modConfig);
          if (templates) setCanonicalTemplates(templates);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load device modalities/contract:', err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const copyDestinationConfig = () => {
    const text = `AE Title: DOCMED\nDICOM Port: 4242\nHost IP: 127.0.0.1 (or LAN IP)\nDICOMweb: http://127.0.0.1:8042/dicom-web\nC-ECHO: Enabled\nC-STORE: Enabled`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div className="card-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Server size={20} style={{ color: 'var(--accent-blue)' }} />
            <div>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Physical Medical Imaging Device Integration</h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Ophthalmology Modalities, DICOM Conformance Analysis & Receiving Destination Specification
              </p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close modal"
            style={{ padding: '0.4rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.5rem 1.5rem',
            background: 'var(--bg-input)',
            borderBottom: '1px solid var(--border-color)',
            overflowX: 'auto',
          }}
        >
          <button
            className={`btn btn-sm ${activeTab === 'status' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('status')}
          >
            Acceptance Status
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'destination' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('destination')}
          >
            Receiving Destination (DOCMED:4242)
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'devices' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('devices')}
          >
            Candidate Devices Matrix
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'contract' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('contract')}
          >
            Canonical JSON Contract (10 Devices)
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'workflow' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('workflow')}
          >
            Onboarding SOP & Safety
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'mwl' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('mwl')}
          >
            Modality Worklist (MWL)
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, fontSize: '0.85rem' }}>
          {loading ? (
            <Spinner size="lg" label="Loading device specifications..." />
          ) : (
            <>
              {/* TAB 1: ACCEPTANCE STATUS */}
              {activeTab === 'status' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid var(--accent-red)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <ShieldAlert size={22} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--accent-red)', fontSize: '0.9rem' }}>
                        Acceptance Criteria Delineation & Clinical Safeguards
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
                        Per clinical engineering governance: These are candidate devices, not guaranteed compatible integrations.
                        Do not claim support for a specific model until its exact software version and official DICOM Conformance Statement (DCS)
                        have been reviewed. Never modify production scanner settings or transmit real patient studies without hospital authorization.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Section A */}
                    <div
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>A. Sample-File Integration</span>
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={12} /> VERIFIED & PASSED
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0, lineHeight: 1.4 }}>
                        Synthetic and de-identified DICOM studies (Brainix CT, Ophthalmic Tomography sample frames) have been successfully imported into Orthanc, mapped to EHR patients, indexed via DICOMweb (QIDO/WADO), and fully rendered inside OHIF Viewer.
                      </p>
                    </div>

                    {/* Section B */}
                    <div
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>B. Physical Device Integration</span>
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={12} /> BLOCKED / NOT TESTED
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0, lineHeight: 1.4 }}>
                        <strong>No physical ophthalmic equipment or vendor workstation is attached to this development environment.</strong> Physical C-STORE over LAN is verified ONLY when actual hardware transmits a study. Port 4242 C-STORE SCP is active and ready on Orthanc, awaiting physical device connectivity on-site.
                      </p>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Info size={15} style={{ color: 'var(--accent-blue)' }} /> Current POC Readiness Checklist
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <li>✅ Orthanc C-STORE SCP active on TCP Port 4242 with AE Title <code>DOCMED</code>.</li>
                      <li>✅ C-ECHO SCP verified and accepting connections unconditionally.</li>
                      <li>✅ Ophthalmic SOP Classes (OCT, Fundus Photography 8/16-bit, Visual Field PDF/Raw) registered.</li>
                      <li>✅ Server-side patient identity reconciliation enforcing DOB and Sex validation (never links by name alone).</li>
                      <li>✅ Demographic mismatch quarantine protection enabled for inconsistent patient tags.</li>
                      <li>⏸️ Physical scanner hardware link (ZEISS, Heidelberg, Topcon, Optos): <strong>Pending clinical deployment.</strong></li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 2: RECEIVING DESTINATION */}
              {activeTab === 'destination' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Orthanc DICOM C-STORE Receiving Node</h3>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Provide these exact networking parameters to clinical engineering or the scanner vendor technician.
                      </p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={copyDestinationConfig}>
                      <Copy size={13} />
                      {copied ? 'Copied to Clipboard!' : 'Copy Config'}
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '0.75rem',
                      background: 'var(--bg-input)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Receiving AE Title (AET)
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-cyan)' }}>
                        DOCMED
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        DICOM Port (C-STORE / C-ECHO)
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-green)' }}>
                        4242
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Host / IP Address
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        127.0.0.1 <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>(Host / LAN IP)</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        DICOMweb REST Endpoint
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-blue)' }}>
                        http://&lt;host&gt;:8042/dicom-web
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Network Verification Commands (DCMTK)</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Test connection from the scanner workstation using standard DICOM tools:
                    </p>
                    <pre
                      style={{
                        background: '#0d1117',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: '#58a6ff',
                        overflowX: 'auto',
                        margin: 0,
                      }}
                    >
                      {`# 1. Test DICOM Ping (C-ECHO)\nechoscu -v -aec DOCMED 127.0.0.1 4242\n\n# 2. Test DICOM Store (C-STORE)\nstorescu -v -aec DOCMED 127.0.0.1 4242 ophthalmic_test_image.dcm`}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: CANDIDATE DEVICES MATRIX */}
              {activeTab === 'devices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    Evaluation of supported ophthalmology device categories, required SOP Classes, vendor workstations, and licensing requirements:
                  </p>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)' }}>
                          <th style={{ padding: '0.5rem' }}>Device Category & Model</th>
                          <th style={{ padding: '0.5rem' }}>Vendor</th>
                          <th style={{ padding: '0.5rem' }}>SOP Classes & Syntaxes</th>
                          <th style={{ padding: '0.5rem' }}>Workstation / Middleware</th>
                          <th style={{ padding: '0.5rem' }}>Licensing Prerequisite</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                            CIRRUS HD-OCT (4000/5000/6000)
                          </td>
                          <td style={{ padding: '0.5rem' }}>Carl Zeiss Meditec</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                            Ophthalmic Tomography<br />
                            (1.2.840.10008.5.1.4.1.1.77.1.5.4)
                          </td>
                          <td style={{ padding: '0.5rem' }}>ZEISS FORUM / Workplace</td>
                          <td style={{ padding: '0.5rem', color: 'var(--accent-yellow)' }}>
                            ZEISS DICOM Connectivity license for direct C-STORE export
                          </td>
                        </tr>

                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                            SPECTRALIS (OCT / HRA+OCT)
                          </td>
                          <td style={{ padding: '0.5rem' }}>Heidelberg Engineering</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                            Ophthalmic Tomography & SC<br />
                            (1.2.840.10008.5.1.4.1.1.77.1.5.4)
                          </td>
                          <td style={{ padding: '0.5rem' }}>HEYEX / HEYEX 2 PACS</td>
                          <td style={{ padding: '0.5rem', color: 'var(--accent-yellow)' }}>
                            HEYEX DICOM Import/Export Software Option
                          </td>
                        </tr>

                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                            CLARUS 500 / 700 & VISUCAM
                          </td>
                          <td style={{ padding: '0.5rem' }}>Carl Zeiss Meditec</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                            Ophthalmic Photography 8/16-Bit<br />
                            (1.2.840.10008.5.1.4.1.1.77.1.5.1 / .2)
                          </td>
                          <td style={{ padding: '0.5rem' }}>ZEISS FORUM</td>
                          <td style={{ padding: '0.5rem', color: 'var(--accent-yellow)' }}>
                            DICOM Export License
                          </td>
                        </tr>

                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                            TRC-NW400 Non-Mydriatic Fundus
                          </td>
                          <td style={{ padding: '0.5rem' }}>Topcon Healthcare</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                            Ophthalmic Photography 8-Bit<br />
                            (1.2.840.10008.5.1.4.1.1.77.1.5.1)
                          </td>
                          <td style={{ padding: '0.5rem' }}>Direct / IMAGEnet 6</td>
                          <td style={{ padding: '0.5rem', color: 'var(--accent-green)' }}>
                            Standard DICOM capability built-in (or IMAGEnet license)
                          </td>
                        </tr>

                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                            California & Daytona (UWF Retinal)
                          </td>
                          <td style={{ padding: '0.5rem' }}>Optos plc</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                            Ophthalmic Photography 8/16-Bit<br />
                            (1.2.840.10008.5.1.4.1.1.77.1.5.1 / .2)
                          </td>
                          <td style={{ padding: '0.5rem' }}>OptosAdvance VNA</td>
                          <td style={{ padding: '0.5rem', color: 'var(--accent-yellow)' }}>
                            Optos DICOM Export License
                          </td>
                        </tr>

                        <tr>
                          <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                            Humphrey Field Analyzer (HFA 3 / II-i)
                          </td>
                          <td style={{ padding: '0.5rem' }}>Carl Zeiss Meditec</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                            Encapsulated PDF & Raw Data<br />
                            (1.2.840.10008.5.1.4.1.1.104.1 & .66)
                          </td>
                          <td style={{ padding: '0.5rem' }}>ZEISS FORUM</td>
                          <td style={{ padding: '0.5rem', color: 'var(--accent-yellow)' }}>
                            HFA-NET Pro Software option on HFA II-i
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: CANONICAL JSON CONTRACT (10 CATEGORIES) */}
              {activeTab === 'contract' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Canonical Ophthalmology Device Contracts</h3>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Source of Truth: <code>DocMed_Ophthalmology_Device_Data_Examples_Compatible.json</code>
                      </p>
                    </div>
                    {canonicalTemplates[selectedCategoryIdx] && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            JSON.stringify(canonicalTemplates[selectedCategoryIdx], null, 2)
                          );
                          setCopiedJson(true);
                          setTimeout(() => setCopiedJson(false), 2500);
                        }}
                      >
                        <Copy size={13} />
                        {copiedJson ? 'Copied Template!' : 'Copy Template JSON'}
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {canonicalTemplates.map((t, idx) => (
                      <button
                        key={t.device_type}
                        className={`btn btn-sm ${selectedCategoryIdx === idx ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => setSelectedCategoryIdx(idx)}
                      >
                        {idx + 1}. {t.device_type.split('/')[0].trim()}
                      </button>
                    ))}
                  </div>

                  {/* Selected Template Details */}
                  {canonicalTemplates[selectedCategoryIdx] && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div
                        style={{
                          background: 'var(--bg-input)',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                            Selected Canonical Category
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                            {canonicalTemplates[selectedCategoryIdx].device_type}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                            Clinical Data Sections
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {Object.keys(canonicalTemplates[selectedCategoryIdx].clinical_data || {}).join(' • ')}
                          </div>
                        </div>
                      </div>

                      <pre
                        style={{
                          background: '#0d1117',
                          padding: '1rem',
                          borderRadius: 'var(--radius-md)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          color: '#58a6ff',
                          maxHeight: '360px',
                          overflowY: 'auto',
                          margin: 0,
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {JSON.stringify(canonicalTemplates[selectedCategoryIdx], null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ONBOARDING SOP & SAFETY */}
              {activeTab === 'workflow' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Step-by-Step Clinical Engineering SOP</h3>

                  <ol style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Device Discovery & DCS Review:</strong> Review manufacturer DICOM Conformance Statement. Confirm supported SOP Classes, Transfer Syntaxes (e.g. Explicit VR Little Endian, JPEG 2000), and verify SCU role.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Configure Destination on Device:</strong> Enter AE Title <code>DOCMED</code>, Port <code>4242</code>, and target host IP. Configure timeout settings (default 30s).
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Test C-ECHO Ping:</strong> Trigger DICOM verification on device console. Confirm Orthanc logs report <code>Received Echo Request from SCU</code>.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Transmit Vendor Test Exam:</strong> Send a synthetic phantom or de-identified test exam. Monitor transfer progress.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Verify Orthanc Ingestion:</strong> Confirm C-STORE success, instance counts, and metadata tags (Laterality <code>0020,0060</code>, PatientID <code>0010,0020</code>).
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Identity Validation:</strong> Confirm DocMed backend validates patient demographic match (DOB + Sex) before clinical linking.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>OHIF Web Rendering:</strong> Launch OHIF Viewer via authenticated session to verify viewport display, pan/zoom, and window/level for ophthalmic images.
                    </li>
                  </ol>

                  <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent-yellow)', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                      ⚠️ EHR Patient Safety Rules
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <li>Never associate studies with a patient based on Patient Name alone.</li>
                      <li>Never assume DICOM PatientID matches the internal EHR ID.</li>
                      <li>If DICOM PatientID is mapped to an EHR patient but DOB or Sex conflicts, the study status is flagged as <code>DEMOGRAPHIC_MISMATCH</code>.</li>
                      <li>Frontend code must never store or expose Orthanc admin credentials.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 5: MODALITY WORKLIST */}
              {activeTab === 'mwl' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Modality Worklist (MWL) Architecture</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                    Modality Worklist eliminates manual typist entry on imaging consoles, preventing misspellings of patient identifiers that lead to orphaned studies.
                  </p>

                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent-blue)' }}>
                      Authoritative Worklist Provider Architecture
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.6 }}>
                      In production healthcare environments, <strong>the Hospital Information System (EHR/RIS) is the authoritative worklist provider</strong>, not the PACS archive.
                      Orthanc acts primarily as a C-STORE SCP / DICOMweb archive. While Orthanc supports a Worklist plugin reading static <code>.dump</code>/<code>.wl</code> files or bridging to Python scripts, claiming MWL support requires an active integration with the hospital's appointment scheduling system.
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem' }}>When to Deploy MWL:</div>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <li>Device supports Modality Worklist C-FIND SCU.</li>
                        <li>High volume outpatient ophthalmology clinics.</li>
                        <li>Elimination of accession number typos.</li>
                      </ul>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem' }}>POC Scope & Recommendation:</div>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <li>Sample data and initial C-STORE verified.</li>
                        <li>MWL evaluated but designated as Phase 2 for on-premise RIS integration.</li>
                        <li>Server-side demographic reconciliation handles manual entries safely.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="card-footer"
          style={{
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Orthanc Node: <code style={{ color: 'var(--accent-cyan)' }}>DOCMED@127.0.0.1:4242</code> | Status: Ready for SCU C-STORE
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
