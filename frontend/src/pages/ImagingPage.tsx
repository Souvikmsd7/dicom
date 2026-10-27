import { useEffect, useState, useCallback } from 'react';
import { Upload, AlertCircle, Server } from 'lucide-react';
import type {
  EhrPatient,
  StudyMetadata,
  PatientMapping,
} from '../types/imaging.types';
import {
  getPatients,
  getPatientStudies,
  getMappings,
  launchViewer,
} from '../services/imaging.service';
import { PatientSearch } from '../components/PatientSearch';
import { PatientDemographics } from '../components/PatientDemographics';
import { StudyList } from '../components/StudyList';
import { StudyDetails } from '../components/StudyDetails';
import { ImportStudy } from '../components/ImportStudy';
import { DeviceIntegrationModal } from '../components/DeviceIntegrationModal';
import { ErrorState } from '../components/ui/ErrorState';

export function ImagingPage() {
  const [patients, setPatients] = useState<EhrPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<EhrPatient | null>(null);
  const [mappings, setMappings] = useState<PatientMapping[]>([]);
  const [studies, setStudies] = useState<StudyMetadata[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<StudyMetadata | null>(null);

  // Loading states
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingStudies, setLoadingStudies] = useState(false);
  const [launchingViewer, setLaunchingViewer] = useState(false);

  // Error & UI states
  const [pageError, setPageError] = useState<string | null>(null);
  const [showImportSection, setShowImportSection] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Initial load: patients and mappings
  const loadInitialData = useCallback(async () => {
    setLoadingPatients(true);
    setPageError(null);
    try {
      const [fetchedPatients, fetchedMappings] = await Promise.all([
        getPatients(),
        getMappings(),
      ]);
      setPatients(fetchedPatients);
      setMappings(fetchedMappings);

      if (fetchedPatients.length > 0 && !selectedPatient) {
        setSelectedPatient(fetchedPatients[0]);
      }
    } catch (err) {
      setPageError(
        err instanceof Error
          ? err.message
          : 'Failed to connect to DocMed backend service.'
      );
    } finally {
      setLoadingPatients(false);
    }
  }, [selectedPatient]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load studies whenever selected patient changes
  const loadStudies = useCallback(async (patientId: string) => {
    setLoadingStudies(true);
    setSelectedStudy(null);
    try {
      const results = await getPatientStudies(patientId);
      setStudies(results);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Error querying DICOM studies'
      );
      setStudies([]);
    } finally {
      setLoadingStudies(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadStudies(selectedPatient.ehrPatientId);
    }
  }, [selectedPatient, loadStudies]);

  // Find active mapping for selected patient
  const currentMapping = selectedPatient
    ? mappings.find((m) => m.ehrPatientId === selectedPatient.ehrPatientId)
    : null;

  // Handle OHIF viewer launch
  const handleLaunchViewer = async (study: StudyMetadata) => {
    if (!selectedPatient) return;
    setLaunchingViewer(true);
    try {
      const launchInfo = await launchViewer(
        selectedPatient.ehrPatientId,
        study.studyInstanceUID
      );
      showToast('info', 'Authorized OHIF viewer session initialized.');
      // Open viewer in a new tab
      window.open(launchInfo.viewerUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to generate viewer launch URL'
      );
    } finally {
      setLaunchingViewer(false);
    }
  };

  // Callback after importing or mapping to reload
  const handleDataChanged = async () => {
    try {
      const updatedMappings = await getMappings();
      setMappings(updatedMappings);
      if (selectedPatient) {
        await loadStudies(selectedPatient.ehrPatientId);
      }
    } catch {
      // pass
    }
  };

  if (pageError) {
    return (
      <ErrorState
        title="DocMed Backend Service Offline"
        message={pageError}
        onRetry={loadInitialData}
      />
    );
  }

  return (
    <div>
      {/* Top Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Diagnostic Imaging & PACS Integration
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Direct DICOMweb interface for clinical study retrieval and OHIF web viewing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowDeviceModal(true)}
            id="btn-device-connectivity"
          >
            <Server size={14} />
            Physical Device Connectivity
          </button>
          <button
            className={`btn ${showImportSection ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setShowImportSection((prev) => !prev)}
            id="btn-ingest-dicom"
          >
            <Upload size={14} />
            {showImportSection ? 'Hide Ingestion Tool' : 'Ingest DICOM Data'}
          </button>
        </div>
      </div>

      {/* Physical Device Connectivity Modal */}
      <DeviceIntegrationModal
        isOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
      />

      {/* Ingestion & Mapping drawer */}
      {showImportSection && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ImportStudy
            patients={patients}
            selectedPatient={selectedPatient}
            onImportSuccess={handleDataChanged}
            onClose={() => setShowImportSection(false)}
          />
        </div>
      )}

      {/* Main Grid */}
      <div className="imaging-page">
        {/* Left Column: Patient Directory */}
        <aside className="sidebar-column">
          <PatientSearch
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={(p) => setSelectedPatient(p)}
            isLoading={loadingPatients}
          />
        </aside>

        {/* Right Column: Demographics, Studies, Series breakdown */}
        <div className="main-column">
          <PatientDemographics
            patient={selectedPatient}
            mapping={currentMapping}
            onOpenMappingModal={() => setShowImportSection(true)}
          />

          <StudyList
            studies={studies}
            selectedStudy={selectedStudy}
            onSelectStudy={(s) => setSelectedStudy(s)}
            onLaunchViewer={handleLaunchViewer}
            onRefresh={handleDataChanged}
            isLoading={loadingStudies}
            isLaunching={launchingViewer}
            patientName={
              selectedPatient
                ? `${selectedPatient.lastName}, ${selectedPatient.firstName}`
                : undefined
            }
            hasMapping={Boolean(currentMapping)}
            onOpenMappingModal={() => setShowImportSection(true)}
          />

          {selectedStudy && selectedPatient && (
            <StudyDetails
              study={selectedStudy}
              ehrPatientId={selectedPatient.ehrPatientId}
              onLaunchViewer={handleLaunchViewer}
              isLaunching={launchingViewer}
              onClose={() => setSelectedStudy(null)}
            />
          )}
        </div>
      </div>

      {/* Global Toast */}
      {notification && (
        <div className={`toast ${notification.type}`}>
          <AlertCircle size={16} />
          {notification.message}
        </div>
      )}
    </div>
  );
}
