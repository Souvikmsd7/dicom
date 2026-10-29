import { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Activity,
  Filter,
  Shield,
  RotateCcw,
  Trash2,
  Sliders,
  History,
  Folder,
  Network,
  Radio,
  Eye,
} from 'lucide-react';
import {
  getDevices,
  deleteDevice,
  toggleDevice,
  testDeviceConnection,
  getDeviceHistory,
  getMonitoringSummary,
  getDiscoveredCandidates,
  approveDiscoveredCandidate,
  dismissDiscoveredCandidate,
  triggerDiscoveryScan,
  getIngestionErrors,
  retryIngestionJob,
} from '../services/imaging.service';
import type {
  DeviceRecord,
  DeviceMonitoringSummary,
  DiscoveredCandidate,
  ConnectionHistoryEntry,
  IngestionErrorJob,
} from '../types/imaging.types';
import { DeviceConnectionWizard } from '../components/DeviceConnectionWizard';
import { Spinner } from '../components/ui/Spinner';

export function DeviceManagementPage() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [summary, setSummary] = useState<DeviceMonitoringSummary | null>(null);
  const [candidates, setCandidates] = useState<DiscoveredCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedConnType, setSelectedConnType] = useState<string>('');

  // Modals & Panels
  const [showWizard, setShowWizard] = useState(false);
  const [activeHistoryDevice, setActiveHistoryDevice] = useState<DeviceRecord | null>(null);
  const [historyEntries, setHistoryEntries] = useState<ConnectionHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showErrorJobsModal, setShowErrorJobsModal] = useState(false);
  const [errorJobs, setErrorJobs] = useState<IngestionErrorJob[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [devRes, sumRes, candRes] = await Promise.all([
        getDevices({
          query: searchQuery || undefined,
          status: selectedStatus || undefined,
          device_type: selectedCategory || undefined,
          connection_type: selectedConnType || undefined,
        }),
        getMonitoringSummary().catch(() => null),
        getDiscoveredCandidates().catch(() => []),
      ]);
      setDevices(devRes.items);
      if (sumRes) setSummary(sumRes);
      setCandidates(candRes);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load device registry');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedStatus, selectedCategory, selectedConnType]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle single device live test
  const handleTestConnection = async (deviceId: string) => {
    setTestingDeviceId(deviceId);
    try {
      const { result } = await testDeviceConnection(deviceId);
      if (result.status === 'SUCCESS') {
        showToast('success', `Connection to ${deviceId} verified (${result.latency_ms}ms): ${result.message}`);
      } else {
        showToast('error', `Connection test to ${deviceId} failed: ${result.message}`);
      }
      loadAllData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestingDeviceId(null);
    }
  };

  // Handle toggle enabled/disabled
  const handleToggle = async (deviceId: string, current: boolean) => {
    try {
      await toggleDevice(deviceId, !current);
      showToast('info', `Device ${deviceId} ${!current ? 'enabled' : 'disabled'}`);
      loadAllData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update device status');
    }
  };

  // Handle delete
  const handleDelete = async (deviceId: string) => {
    if (!window.confirm(`Are you sure you want to deregister device ${deviceId}?`)) return;
    try {
      await deleteDevice(deviceId);
      showToast('info', `Device ${deviceId} removed from registry`);
      loadAllData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Handle discovery scan
  const handleRunScan = async () => {
    setScanning(true);
    try {
      const res = await triggerDiscoveryScan('127.0.0.1');
      showToast('success', `Scan complete: ${res.found_count} candidate endpoints detected on subnet.`);
      loadAllData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Discovery scan failed');
    } finally {
      setScanning(false);
    }
  };

  // Handle approve candidate
  const handleApproveCandidate = async (cand: DiscoveredCandidate) => {
    try {
      await approveDiscoveredCandidate(cand.candidate_id, cand.suggested_name);
      showToast('success', `Approved and registered candidate ${cand.suggested_name}`);
      loadAllData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Approval failed');
    }
  };

  // Handle dismiss candidate
  const handleDismissCandidate = async (candidateId: string) => {
    try {
      await dismissDiscoveredCandidate(candidateId);
      showToast('info', 'Candidate dismissed');
      loadAllData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Dismiss failed');
    }
  };

  // Open history modal
  const openHistoryModal = async (device: DeviceRecord) => {
    setActiveHistoryDevice(device);
    setLoadingHistory(true);
    try {
      const history = await getDeviceHistory(device.device_id);
      setHistoryEntries(history);
    } catch {
      setHistoryEntries([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open ingestion error jobs modal
  const openErrorJobsModal = async () => {
    setShowErrorJobsModal(true);
    setLoadingErrors(true);
    try {
      const errs = await getIngestionErrors();
      setErrorJobs(errs);
    } catch {
      setErrorJobs([]);
    } finally {
      setLoadingErrors(false);
    }
  };

  // Handle retry job
  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      await retryIngestionJob(jobId);
      showToast('success', `Job ${jobId} re-queued for processing`);
      const errs = await getIngestionErrors();
      setErrorJobs(errs);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setRetryingJobId(null);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 2000,
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            backgroundColor: toast.type === 'success' ? '#166534' : toast.type === 'error' ? '#991b1b' : '#1e40af',
            color: 'white',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 0.3rem', color: '#f8fafc' }}>
            Ophthalmology Device Management
          </h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
            Multi-device registry, network connectivity diagnostics, and study ingestion monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={openErrorJobsModal}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: summary?.recent_errors_count ? '#ef4444' : '#334155' }}
          >
            <AlertTriangle size={16} color={summary?.recent_errors_count ? '#ef4444' : '#94a3b8'} />
            <span>Failed Jobs ({summary?.recent_errors_count || 0})</span>
          </button>

          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {scanning ? <Spinner inline size="sm" /> : <Radio size={16} />}
            <span>{scanning ? 'Scanning Network...' : 'Discover Devices'}</span>
          </button>

          <button
            onClick={() => setShowWizard(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} />
            <span>Register New Device</span>
          </button>
        </div>
      </div>

      {/* Monitoring Summary KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ backgroundColor: 'rgba(2, 132, 199, 0.15)', padding: '0.6rem', borderRadius: '8px', color: '#38bdf8' }}>
              <Server size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Registered</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>{summary.total_devices}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', padding: '0.6rem', borderRadius: '8px', color: '#4ade80' }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Online Devices</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4ade80' }}>{summary.online_devices}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '0.6rem', borderRadius: '8px', color: '#f87171' }}>
              <XCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Offline / Degraded</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f87171' }}>{summary.offline_devices}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', padding: '0.6rem', borderRadius: '8px', color: '#facc15' }}>
              <Radio size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Discovered Candidates</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#facc15' }}>{candidates.length}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', padding: '0.6rem', borderRadius: '8px', color: '#c084fc' }}>
              <Activity size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Studies Ingested</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c084fc' }}>{summary.total_studies_received}</div>
            </div>
          </div>
        </div>
      )}

      {/* Discovered Candidates Review Section */}
      {candidates.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '1.2rem',
            backgroundColor: 'rgba(234, 179, 8, 0.05)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={18} color="#eab308" />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: '#facc15' }}>
                Discovered Devices Awaiting Administrator Approval ({candidates.length})
              </h3>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Candidate devices remain unverified and cannot commit clinical studies until approved.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.75rem' }}>
            {candidates.map((cand) => (
              <div
                key={cand.candidate_id}
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid #334155',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f8fafc' }}>{cand.suggested_name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {cand.detected_category} • {cand.ip_address}:{cand.port} {cand.ae_title ? `(${cand.ae_title})` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleApproveCandidate(cand)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', backgroundColor: '#16a34a' }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDismissCandidate(cand.candidate_id)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div
        className="card"
        style={{
          padding: '1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, ID, AE Title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                borderRadius: '6px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                color: 'white',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              color: 'white',
              fontSize: '0.85rem',
            }}
          >
            <option value="">All Statuses</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="DISABLED">Disabled</option>
            <option value="UNKNOWN">Unknown</option>
          </select>

          <select
            value={selectedConnType}
            onChange={(e) => setSelectedConnType(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              color: 'white',
              fontSize: '0.85rem',
            }}
          >
            <option value="">All Protocols</option>
            <option value="DICOM">DICOM C-STORE</option>
            <option value="DICOMweb">DICOMweb</option>
            <option value="FOLDER">Shared Folder / USB</option>
          </select>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
        >
          {loading ? <Spinner inline size="xs" /> : <RefreshCw size={14} />}
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Devices Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <Spinner size="lg" label="Loading registered physical devices from DocMed registry..." />
        ) : devices.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <Server size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#e2e8f0' }}>No devices found</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
              Try adjusting your search filters or click "Register New Device" to add one.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Device</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Category & Modality</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Connection Details</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Connection Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Last Study Ingestion</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((dev) => {
                  const isOnline = dev.status === 'ONLINE';
                  const isOffline = dev.status === 'OFFLINE';
                  const isDisabled = !dev.is_enabled || dev.status === 'DISABLED';
                  const isTesting = testingDeviceId === dev.device_id;

                  return (
                    <tr
                      key={dev.device_id}
                      style={{
                        borderBottom: '1px solid #334155',
                        backgroundColor: isDisabled ? 'rgba(15, 23, 42, 0.3)' : 'transparent',
                      }}
                    >
                      {/* Name & ID */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{dev.display_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          ID: <span style={{ fontFamily: 'monospace' }}>{dev.device_id}</span>
                          {dev.manufacturer ? ` • ${dev.manufacturer}` : ''}
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ color: '#e2e8f0' }}>{dev.device_type}</div>
                        <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                          {dev.supported_capabilities.join(' • ') || 'Standard C-STORE'}
                        </div>
                      </td>

                      {/* Protocol Details */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                          {dev.connection_type === 'DICOM' && <Network size={14} color="#38bdf8" />}
                          {dev.connection_type === 'DICOMweb' && <Server size={14} color="#a855f7" />}
                          {dev.connection_type === 'FOLDER' && <Folder size={14} color="#eab308" />}
                          <span>{dev.connection_type}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
                          {dev.connection_type === 'DICOM'
                            ? `AET: ${dev.ae_title || 'N/A'} @ ${dev.ip_address || '127.0.0.1'}:${dev.port || 4242}`
                            : (dev.integration_endpoint || 'Local Dropzone')}
                        </div>
                      </td>

                      {/* Connection Status Pill */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: isOnline ? '#22c55e' : isOffline ? '#ef4444' : '#94a3b8',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: isOnline ? '#4ade80' : isOffline ? '#f87171' : '#94a3b8',
                            }}
                          >
                            {dev.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          {dev.configuration_verified ? 'Verified config' : 'Unverified'}
                        </div>
                      </td>

                      {/* Ingestion Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {dev.last_received_study_id ? (
                          <div>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: dev.last_received_study_status === 'SUCCESS' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: dev.last_received_study_status === 'SUCCESS' ? '#4ade80' : '#f87171',
                                fontWeight: 600,
                              }}
                            >
                              {dev.last_received_study_status || 'INGESTED'}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                              {dev.last_study_received_at ? new Date(dev.last_study_received_at).toLocaleDateString() : 'Recent'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>No studies yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleTestConnection(dev.device_id)}
                            disabled={isTesting}
                            title="Test Live Connection"
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            {isTesting ? <Spinner inline size="xs" /> : <Zap size={14} color="#eab308" />}
                            <span>Test</span>
                          </button>

                          <button
                            onClick={() => openHistoryModal(dev)}
                            title="Connection History"
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            <History size={14} />
                          </button>

                          <button
                            onClick={() => handleToggle(dev.device_id, dev.is_enabled)}
                            title={dev.is_enabled ? 'Disable' : 'Enable'}
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: dev.is_enabled ? '#94a3b8' : '#4ade80' }}
                          >
                            {dev.is_enabled ? 'Disable' : 'Enable'}
                          </button>

                          <button
                            onClick={() => handleDelete(dev.device_id)}
                            title="Deregister Device"
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: '#f87171' }}
                          >
                            <Trash2 size={14} />
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

      {/* Connection Wizard Modal */}
      <DeviceConnectionWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onDeviceCreated={(newDev) => {
          showToast('success', `Device ${newDev.display_name} (${newDev.device_id}) successfully registered!`);
          loadAllData();
        }}
      />

      {/* Connection History Modal */}
      {activeHistoryDevice && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveHistoryDevice(null);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#1e293b',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Connection Check History</h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {activeHistoryDevice.display_name} ({activeHistoryDevice.device_id})
                </span>
              </div>
              <button onClick={() => setActiveHistoryDevice(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
              {loadingHistory ? (
                <Spinner size="md" label="Loading connection test history..." />
              ) : historyEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No connection test entries recorded yet. Click "Test" on the device row to perform a live check.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {historyEntries.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '6px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: h.status === 'SUCCESS' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: h.status === 'SUCCESS' ? '#4ade80' : '#f87171',
                              fontWeight: 600,
                            }}
                          >
                            {h.status} ({h.latency_ms}ms)
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.3rem' }}>
                          {h.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ingestion Errors & Retry Modal */}
      {showErrorJobsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowErrorJobsModal(false);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '750px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#1e293b',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Failed Ingestion Jobs & Review</h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Unresolved study transfers quarantined for patient safety.
                </span>
              </div>
              <button onClick={() => setShowErrorJobsModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
              {loadingErrors ? (
                <Spinner size="md" label="Loading quarantined error jobs..." />
              ) : errorJobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No failed ingestion jobs. All incoming studies processed successfully!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {errorJobs.map((j) => (
                    <div
                      key={j.id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '6px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #ef4444',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 600 }}>
                            {j.error_code}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Source: {j.source} • {new Date(j.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#fca5a5', marginTop: '0.3rem' }}>
                          {j.error_message}
                        </div>
                        {j.studyInstanceUID && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
                            UID: {j.studyInstanceUID}
                          </div>
                        )}
                      </div>

                      {j.retryable && (
                        <button
                          onClick={() => handleRetryJob(j.id)}
                          disabled={retryingJobId === j.id}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          {retryingJobId === j.id ? <Spinner inline size="xs" /> : <RotateCcw size={14} />}
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
