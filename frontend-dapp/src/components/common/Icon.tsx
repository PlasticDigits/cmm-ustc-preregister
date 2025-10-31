import React from 'react';
import type { IconType } from 'react-icons/lib';

interface IconProps {
  icon: IconType;
  size?: number | string;
  className?: string;
  color?: string;
  withGlow?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 24,
  className = '',
  color,
  withGlow = false,
  onClick,
  style,
}) => {
  const iconClasses = `icon-wrapper ${withGlow ? 'icon-glow' : ''} ${className}`;
  
  return (
    <IconComponent
      className={iconClasses}
      size={size}
      color={color}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
    />
  );
};

