import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface DisplayWindowPlaceholderProps {
  onCloseDisplayWindow?: () => void;
}

const DisplayWindowPlaceholder: React.FC<DisplayWindowPlaceholderProps> = ({ onCloseDisplayWindow }) => {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        color: '#fff',
        gap: 3
      }}
    >
      <OpenInNewIcon sx={{ fontSize: 64, opacity: 0.5 }} />
      <Typography variant="h5" sx={{ opacity: 0.8 }}>
        Display is shown in pop-out window
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.6, textAlign: 'center', maxWidth: 400 }}>
        The video display is currently shown in a separate window. 
        All controls in this window will continue to work with the pop-out display.
      </Typography>
      {onCloseDisplayWindow && (
        <Button 
          variant="outlined" 
          onClick={onCloseDisplayWindow}
          sx={{ 
            color: '#fff', 
            borderColor: '#fff',
            '&:hover': {
              borderColor: '#ccc',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          Close Pop-out Window
        </Button>
      )}
    </Box>
  );
};

export default DisplayWindowPlaceholder; 