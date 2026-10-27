import React, { useEffect, useState } from 'react';
import { Activity, ShieldAlert, Database, ExternalLink, Sliders, Image as ImageIcon } from 'lucide-react';
import { checkHealth } from '../services/imaging.service';
import type { HealthStatus } from '../types/imaging.types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab?: 'imaging' | 'devices';
  onTabChange?: (tab: 'imaging' | 'devices') => void;
}

export function Layout({ children, activeTab = 'imaging', onTabChange }: LayoutProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadHealth() {
      try {
        const res = await checkHealth();
        if (mounted) {
          setHealth(res);
          setChecking(false);
        }
      } catch {
        if (mounted) {
          setHealth(null);
          setChecking(false);
        }
      }
    }

    loadHealth();
    const interval = setInterval(loadHealth, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const isOrthancOnline = health?.orthanc?.ready ?? false;
  const isBackendOnline = health?.backend ?? false;

  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">
            <Activity size={20} />
          </div>
          <div>
            <div className="header-title">DocMed EHR</div>
            <div className="header-subtitle">Enterprise Ophthalmology Imaging & Devices</div>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        {onTabChange && (
          <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
            <button
              onClick={() => onTabChange('imaging')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'imaging' ? '#0284c7' : 'transparent',
                color: activeTab === 'imaging' ? '#ffffff' : '#94a3b8',
                fontWeight: activeTab === 'imaging' ? 600 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <ImageIcon size={15} />
              <span>Clinical Imaging</span>
            </button>

            <button
              onClick={() => onTabChange('devices')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'devices' ? '#0284c7' : 'transparent',
                color: activeTab === 'devices' ? '#ffffff' : '#94a3b8',
                fontWeight: activeTab === 'devices' ? 600 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Sliders size={15} />
              <span>Device Management</span>
            </button>
          </div>
        )}

        <div className="header-status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginRight: '1rem' }}>
            <span
              className={`status-dot ${
                checking ? 'checking' : isBackendOnline ? 'online' : 'offline'
              }`}
            />
            <span style={{ fontSize: '0.78rem' }}>
              API: {checking ? 'Checking' : isBackendOnline ? 'Active' : 'Offline'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginRight: '1rem' }}>
            <span
              className={`status-dot ${
                checking ? 'checking' : isOrthancOnline ? 'online' : 'offline'
              }`}
            />
            <span style={{ fontSize: '0.78rem' }}>
              Orthanc PACS: {checking ? 'Checking' : isOrthancOnline ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            title="Open OHIF Standalone Viewer"
          >
            <Database size={13} />
            OHIF Viewer
            <ExternalLink size={12} />
          </a>
        </div>
      </header>

      <main className="main-content">
        <div className="dev-banner">
          <ShieldAlert />
          <span>
            <strong>Proof of Concept Environment:</strong> For demonstration purposes only. Use exclusively synthetic or properly de-identified medical data. No real protected health information (PHI) should be uploaded.
          </span>
        </div>

        {children}
      </main>
    </div>
  );
}
