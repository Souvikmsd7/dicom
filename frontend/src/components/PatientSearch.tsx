import { useState, useMemo } from 'react';
import { Search, User } from 'lucide-react';
import type { EhrPatient } from '../types/imaging.types';

interface PatientSearchProps {
  patients: EhrPatient[];
  selectedPatient: EhrPatient | null;
  onSelectPatient: (patient: EhrPatient) => void;
  isLoading: boolean;
}

export function PatientSearch({
  patients,
  selectedPatient,
  onSelectPatient,
  isLoading,
}: PatientSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const q = searchTerm.toLowerCase();
    return patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.ehrPatientId.toLowerCase().includes(q)
    );
  }, [patients, searchTerm]);

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <User size={18} />
          EHR Patient Directory
        </h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
          {filteredPatients.length} registered
        </span>
      </div>

      <div className="card-body">
        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, MRN, or EHR ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)' }}>
            Loading patients...
          </div>
        ) : filteredPatients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)' }}>
            No patients match "{searchTerm}"
          </div>
        ) : (
          <div className="patient-list">
            {filteredPatients.map((patient) => {
              const isSelected = selectedPatient?.ehrPatientId === patient.ehrPatientId;
              const initials = `${patient.firstName[0] || ''}${patient.lastName[0] || ''}`;

              return (
                <div
                  key={patient.ehrPatientId}
                  className={`patient-item ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectPatient(patient)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectPatient(patient);
                  }}
                >
                  <div className="patient-avatar">{initials}</div>
                  <div className="patient-info">
                    <h3>
                      {patient.lastName}, {patient.firstName}
                    </h3>
                    <p>
                      {patient.ehrPatientId} • {patient.mrn} • DOB: {patient.dateOfBirth}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
