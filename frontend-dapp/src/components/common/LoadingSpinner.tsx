import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: '20px',
    md: '40px',
    lg: '60px',
  };
  
  return (
    <div className={`spinner-container ${className}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div
        className="spinner"
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
        }}
      />
    </div>
  );
};

