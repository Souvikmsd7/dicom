import React from 'react';
import { Loader2 } from 'lucide-react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface SpinnerProps {
  /**
   * Predefined size:
   * - 'xs': 12px (subtle inline badges or chips)
   * - 'sm': 16px (standard button icon size)
   * - 'md': 22px (medium icons / dialog sub-headers)
   * - 'lg': 32px (card bodies, sections)
   * - 'xl': 44px (full page loaders)
   * Or specify a custom numeric pixel size.
   */
  size?: SpinnerSize | number;
  /** Optional loading message/label */
  label?: string;
  /**
   * If true, renders only the spinning icon inline (no surrounding padding/card block).
   * Automatically defaults to true when no label is provided and size is small ('xs' | 'sm' | <= 18px).
   */
  inline?: boolean;
  /** Custom spinner icon color (defaults to 'currentColor' for inline, or 'var(--accent-blue)' for block) */
  color?: string;
  /** Optional custom CSS class name */
  className?: string;
  /** Custom CSS style properties */
  style?: React.CSSProperties;
}

const SIZE_NUMBERS: Record<SpinnerSize, number> = {
  xs: 12,
  sm: 16,
  md: 22,
  lg: 32,
  xl: 44,
};

function getNumericSize(size?: SpinnerSize | number): number {
  if (typeof size === 'number') return size;
  if (size && size in SIZE_NUMBERS) return SIZE_NUMBERS[size];
  return SIZE_NUMBERS.sm;
}

/**
 * Unified Common Loader Component for DocMed EHR & PACS.
 * Supports inline mode for buttons/tags and block mode for full cards/sections.
 */
export function Spinner({
  size = 'sm',
  label,
  inline,
  color,
  className = '',
  style,
}: SpinnerProps) {
  const pixelSize = getNumericSize(size);

  // Auto-detect inline mode if not explicitly supplied:
  // If there's no label and size is 'xs' or 'sm' (or <= 18), it's being used as an icon replacement (e.g. inside a button).
  const isInline =
    inline !== undefined
      ? inline
      : !label && (size === 'xs' || size === 'sm' || (typeof size === 'number' && size <= 18));

  if (isInline) {
    return (
      <Loader2
        className={`spinner-icon ${className}`.trim()}
        size={pixelSize}
        style={{
          animation: 'spin 0.8s linear infinite',
          color: color || 'currentColor',
          flexShrink: 0,
          display: 'inline-block',
          verticalAlign: 'middle',
          ...style,
        }}
        role="status"
        aria-label={label || 'Loading...'}
      />
    );
  }

  return (
    <div
      className={`loading-state ${className}`.trim()}
      role="status"
      aria-label={label || 'Loading'}
      style={style}
    >
      <Loader2
        className="spinner-icon"
        size={pixelSize}
        style={{
          animation: 'spin 0.8s linear infinite',
          color: color || 'var(--accent-blue, #0284c7)',
          flexShrink: 0,
        }}
      />
      <span className="sr-only">{label || 'Loading...'}</span>
      {label && <p className="state-message" style={{ margin: 0 }}>{label}</p>}
    </div>
  );
}

/**
 * Convenience inline spinner helper for buttons and text lines.
 */
export function InlineSpinner(props: Omit<SpinnerProps, 'inline'>) {
  return <Spinner inline={true} {...props} />;
}

// Aliases for unified import flexibility
export { Spinner as Loader, Spinner as CommonLoader };
export default Spinner;
