import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  style,
}) => {
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const disabledClass = disabled || loading ? 'disabled' : '';
  
  const sizeStyles: Record<typeof size, React.CSSProperties> = {
    xs: { padding: '0.375rem 0.75rem', fontSize: '0.75rem' },
    sm: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
    md: { padding: 'var(--spacing-md) var(--spacing-lg)', fontSize: '1rem' },
    lg: { padding: 'var(--spacing-lg) var(--spacing-xl)', fontSize: '1.125rem' },
    xl: { padding: 'var(--spacing-xl) 2.5rem', fontSize: '1.25rem' },
  };
  
  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${disabledClass} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ ...sizeStyles[size], ...style }}
    >
      {loading ? (
        <>
          <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};

