import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  onClick?: () => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'lg',
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const paddingMap = {
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
  };
  
  return (
    <div 
      className={`card ${className}`}
      style={{
        padding: paddingMap[padding],
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

