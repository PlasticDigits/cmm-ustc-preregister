import React from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
import type { IconType } from 'react-icons/lib';

export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: IconType;
  rightIcon?: IconType;
  showMaxButton?: boolean;
  onMaxClick?: () => void;
  maxButtonDisabled?: boolean;
  size?: InputSize;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  showMaxButton = false,
  onMaxClick,
  maxButtonDisabled = false,
  size = 'md',
  containerClassName = '',
  className = '',
  style,
  ...props
}) => {
  const sizeStyles: Record<InputSize, React.CSSProperties> = {
    sm: { padding: '0.5rem 0.75rem', fontSize: '0.875rem' },
    md: { padding: '0.75rem 1rem', fontSize: '1rem' },
    lg: { padding: '1rem 1.25rem', fontSize: '1.125rem' },
  };

  return (
    <div className={`input-container ${containerClassName}`} style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            color: error ? 'var(--error)' : 'var(--text-secondary)',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {LeftIcon && (
          <div
            style={{
              position: 'absolute',
              left: '0.75rem',
              zIndex: 1,
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            <Icon icon={LeftIcon} size={20} />
          </div>
        )}
        <input
          {...props}
          className={`input ${className} ${error ? 'input-error' : ''}`}
          style={{
            ...sizeStyles[size],
            paddingLeft: LeftIcon ? '2.5rem' : undefined,
            paddingRight: showMaxButton || RightIcon ? '7rem' : undefined,
            borderColor: error ? 'var(--error)' : undefined,
            ...style,
          }}
        />
        {(showMaxButton || RightIcon) && (
          <div
            style={{
              position: 'absolute',
              right: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {showMaxButton && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onMaxClick}
                disabled={maxButtonDisabled}
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
              >
                Max
              </Button>
            )}
            {RightIcon && (
              <div style={{ color: 'var(--text-muted)' }}>
                <Icon icon={RightIcon} size={20} />
              </div>
            )}
          </div>
        )}
      </div>
      {(error || helperText) && (
        <div
          style={{
            marginTop: '0.5rem',
            fontSize: '0.875rem',
            color: error ? 'var(--error)' : 'var(--text-muted)',
          }}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
};



