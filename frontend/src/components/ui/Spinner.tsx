import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'lg';
  label?: string;
}

export function Spinner({ size = 'sm', label }: SpinnerProps) {
  return (
    <div className="loading-state">
      <div className={`spinner ${size}`} role="status" aria-label={label || 'Loading'}>
        <span className="sr-only">{label || 'Loading...'}</span>
      </div>
      {label && <p className="state-message">{label}</p>}
    </div>
  );
}

export function InlineSpinner() {
  return <Loader2 className="spinner-icon" size={16} style={{ animation: 'spin 0.8s linear infinite' }} />;
}
