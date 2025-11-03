/**
 * Gradient utility functions for creating gradient strings
 * Can be used with inline styles or CSS variables
 */

export type GradientDirection = 'to-right' | 'to-bottom' | 'to-left' | 'to-top' | 
  'to-top-right' | 'to-bottom-right' | 'to-bottom-left' | 'to-top-left' |
  number; // degrees

const directionToAngle = (direction: GradientDirection): string => {
  if (typeof direction === 'number') {
    return `${direction}deg`;
  }
  
  const map: Record<string, string> = {
    'to-right': '90deg',
    'to-bottom': '180deg',
    'to-left': '270deg',
    'to-top': '0deg',
    'to-top-right': '45deg',
    'to-bottom-right': '135deg',
    'to-bottom-left': '225deg',
    'to-top-left': '315deg',
  };
  
  return map[direction] || '135deg';
};

/**
 * Creates a linear gradient string
 */
export const createGradient = (
  colors: string[],
  direction: GradientDirection = 'to-bottom-right'
): string => {
  const angle = directionToAngle(direction);
  return `linear-gradient(${angle}, ${colors.join(', ')})`;
};

/**
 * Predefined gradient presets matching your theme
 */
export const gradients = {
  gold: createGradient([
    '#FFD700',
    '#FFC107',
    '#FFB300'
  ], 'to-bottom-right'),
  
  cyan: createGradient([
    '#00D4FF',
    '#0EA5E9'
  ], 'to-bottom-right'),
  
  multi: createGradient([
    'rgba(255, 215, 0, 0.1)',
    'rgba(255, 193, 7, 0.15)',
    'rgba(0, 212, 255, 0.1)'
  ], 'to-bottom-right'),
  
  goldToCyan: createGradient([
    '#FFD700',
    '#FFC107',
    '#00D4FF',
    '#0EA5E9'
  ], 'to-bottom-right'),
};

/**
 * Get gradient as inline style
 */
export const getGradientStyle = (
  colors: string[],
  direction?: GradientDirection
): React.CSSProperties => {
  return {
    background: createGradient(colors, direction),
  };
};



