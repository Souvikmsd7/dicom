import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title = 'No records found',
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon || <Inbox />}
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
      {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
    </div>
  );
}
