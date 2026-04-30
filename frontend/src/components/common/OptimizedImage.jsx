import { useEffect, useRef, useState } from 'react';
import { imageOptimizer } from '@/lib/cacheStrategies';

export const OptimizedImage = ({ src,
  alt,
  className = '',
  width,
  height,
  lazy = true,
  priority = false,
  onLoad,
  onError,
 }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (priority) {
      // High priority images load immediately
      img.src = src;
      return;
    }

    if (lazy) {
      // Enable lazy loading
      imageOptimizer.enableLazyLoading(img);
    } else {
      // Load immediately
      img.src = src;
    }
  }, [src, lazy, priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={priority ? src : undefined}
        data-src={!priority ? src : undefined}
        alt={alt}
        width={width}
        height={height}
        className={`
          transition-opacity duration-300 ease-in-out
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
          ${hasError ? 'bg-gray-200' : ''}
          w-full h-auto
        `}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy && !priority ? 'lazy' : 'eager'}
      />
      
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
      )}
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
          <span>Falha ao carregar imagem</span>
        </div>
      )}
    </div>
  );
};