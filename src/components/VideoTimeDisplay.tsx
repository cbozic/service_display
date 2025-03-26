import React from 'react';
import { Box } from '@mui/material';

interface VideoTimeDisplayProps {
  currentTimeInSeconds: number;
  position?: 'bottom-left' | 'center' | 'left';
  size?: 'small' | 'medium' | 'large';
  backgroundColor?: string;
}

export const formatVideoTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const VideoTimeDisplay: React.FC<VideoTimeDisplayProps> = ({
  currentTimeInSeconds,
  position = 'bottom-left',
  size = 'medium',
  backgroundColor = 'rgba(0, 0, 0, 0.7)'
}) => {
  // Format the time
  const formattedTime = formatVideoTime(currentTimeInSeconds);
  
  // Define position styles
  const positionStyles = {
    'bottom-left': {
      position: 'absolute',
      bottom: '10px',
      left: '10px',
    },
    'center': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    'left': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginRight: '12px',
    }
  };
  
  // Define size styles
  const sizeStyles = {
    'small': {
      fontSize: '14px',
      padding: '3px 6px',
    },
    'medium': {
      fontSize: '16px',
      padding: '4px 8px',
    },
    'large': {
      fontSize: '18px',
      padding: '5px 10px',
    }
  };

  return (
    <Box
      sx={{
        ...positionStyles[position],
        backgroundColor,
        color: 'white',
        borderRadius: '4px',
        fontFamily: 'monospace',
        pointerEvents: 'none',
        zIndex: 10,
        ...sizeStyles[size],
      }}
    >
      {formattedTime}
    </Box>
  );
};

export default VideoTimeDisplay; 