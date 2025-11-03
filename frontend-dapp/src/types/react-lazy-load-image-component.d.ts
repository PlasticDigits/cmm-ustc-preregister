declare module 'react-lazy-load-image-component' {
  import { ComponentType, ImgHTMLAttributes } from 'react';

  export interface LazyLoadImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    effect?: string;
    placeholderSrc?: string;
    threshold?: number;
    visibleByDefault?: boolean;
    wrapperClassName?: string;
    wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
    delayMethod?: string;
    delayTime?: number;
    onLoad?: () => void;
    onError?: () => void;
    onVisible?: () => void;
    scrollPosition?: { x: number; y: number };
    useIntersectionObserver?: boolean;
  }

  export const LazyLoadImage: ComponentType<LazyLoadImageProps>;
}

