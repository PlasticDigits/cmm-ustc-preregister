import React from 'react';
import { LazyLoadImage, LazyLoadImageProps } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

interface ImageProps extends Omit<LazyLoadImageProps, 'effect'> {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  withOverlay?: boolean;
  effect?: 'blur' | 'opacity' | 'black-and-white';
}

export const Image: React.FC<ImageProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  withOverlay = false,
  effect = 'blur',
  ...props
}) => {
  return (
    <div className={`img-container ${containerClassName}`}>
      <LazyLoadImage
        src={src}
        alt={alt}
        className={className}
        effect={effect}
        placeholderSrc={src}
        {...props}
      />
      {withOverlay && <div className="img-overlay" />}
    </div>
  );
};

