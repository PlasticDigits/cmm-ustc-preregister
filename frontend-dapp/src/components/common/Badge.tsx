import React from 'react';

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  style,
}) => {
  const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    success: {
      background: 'rgba(16, 185, 129, 0.2)',
      color: 'var(--success)',
      border: '1px solid var(--success)',
    },
    error: {
      background: 'rgba(239, 68, 68, 0.2)',
      color: 'var(--error)',
      border: '1px solid var(--error)',
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.2)',
      color: 'var(--warning)',
      border: '1px solid var(--warning)',
    },
    info: {
      background: 'rgba(0, 212, 255, 0.2)',
      color: 'var(--cyan-primary)',
      border: '1px solid var(--cyan-primary)',
    },
    primary: {
      background: 'rgba(255, 215, 0, 0.2)',
      color: 'var(--gold-primary)',
      border: '1px solid var(--gold-primary)',
    },
    secondary: {
      background: 'var(--bg-card)',
      color: 'var(--text-secondary)',
      border: '1px solid rgba(255, 215, 0, 0.3)',
    },
  };

  const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
    sm: {
      padding: '0.25rem 0.5rem',
      fontSize: '0.75rem',
    },
    md: {
      padding: '0.375rem 0.75rem',
      fontSize: '0.875rem',
    },
    lg: {
      padding: '0.5rem 1rem',
      fontSize: '1rem',
    },
  };

  return (
    <span
      className={`badge badge-${variant} badge-${size} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 'var(--radius-md)',
        fontWeight: 600,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {children}
    </span>
  );
};



