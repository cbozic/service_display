import React, { useState, useEffect } from 'react';

interface CountdownOverlayProps {
  isVisible: boolean;
  intervalDuration: number;
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ isVisible, intervalDuration }) => {
  const [timeLeft, setTimeLeft] = useState(intervalDuration / 1000);

  useEffect(() => {
    if (!isVisible) {
      setTimeLeft(intervalDuration / 1000);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return intervalDuration / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, intervalDuration]);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 'bold',
      zIndex: 1000,
      transition: 'opacity 0.3s ease',
      opacity: isVisible ? 1 : 0,
      pointerEvents: 'none',
    }}>
      Next slide in {Math.ceil(timeLeft)}s
    </div>
  );
};

export default CountdownOverlay; 