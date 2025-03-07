import React, { CSSProperties } from 'react';
import './Overlay.css';

interface OverlayProps {
  showOverlay: boolean;
  slide?: string;
  fadeDurationInSeconds: number;
  style?: CSSProperties;
}

const Overlay: React.FC<OverlayProps> = ({ 
  showOverlay, 
  slide, 
  fadeDurationInSeconds,
  style = {}
}) => {
  const overlayStyle: CSSProperties = {
    ...style,
    opacity: showOverlay ? 1 : 0,
    pointerEvents: showOverlay ? 'auto' : 'none',
  };

  return (
    <div className="overlay" style={overlayStyle}>
      {slide && <img src={slide} alt="Overlay" />}
    </div>
  );
};

export default Overlay;
