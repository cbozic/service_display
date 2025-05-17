import React, { CSSProperties, useRef, useEffect, useState } from 'react';
import './MainVideoOverlay.css';

interface MainVideoOverlayProps {
  showOverlay: boolean;
  slide?: string;
  fadeDurationInSeconds: number;
  style?: CSSProperties;
}

const MainVideoOverlay: React.FC<MainVideoOverlayProps> = ({ 
  showOverlay, 
  slide, 
  fadeDurationInSeconds,
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageStyle, setImageStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const updateImageSize = () => {
      if (!containerRef.current || !imageRef.current) return;

      const container = containerRef.current;
      const image = imageRef.current;

      // Get container dimensions (accounting for padding)
      const containerWidth = container.clientWidth - 32; // 16px padding on each side
      const containerHeight = container.clientHeight - 32;

      // Get natural image dimensions
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;

      if (naturalWidth === 0 || naturalHeight === 0) return;

      // Calculate aspect ratios
      const containerRatio = containerWidth / containerHeight;
      const imageRatio = naturalWidth / naturalHeight;

      let newStyle: CSSProperties = {};

      if (imageRatio > containerRatio) {
        // Image is wider relative to container - fit to width
        newStyle = {
          width: '100%',
          height: 'auto',
        };
      } else {
        // Image is taller relative to container - fit to height
        newStyle = {
          width: 'auto',
          height: '100%',
        };
      }

      setImageStyle(newStyle);
    };

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(updateImageSize);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Update size when image loads
    if (imageRef.current) {
      imageRef.current.onload = updateImageSize;
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [slide]); // Re-run when slide changes

  const overlayStyle: CSSProperties = {
    ...style,
    opacity: showOverlay ? 1 : 0,
    pointerEvents: showOverlay ? 'auto' : 'none',
  };

  return (
    <div className="overlay" style={overlayStyle} ref={containerRef}>
      <div className="overlay-image-container">
        {slide && (
          <img 
            ref={imageRef}
            src={slide} 
            alt="Overlay"
            style={imageStyle}
          />
        )}
      </div>
    </div>
  );
};

export default MainVideoOverlay;
