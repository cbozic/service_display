import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useHotkeys } from '../contexts/HotkeyContext';

interface HotkeyGuideProps {
  open: boolean;
  onClose: () => void;
}

const HotkeyGuide: React.FC<HotkeyGuideProps> = ({ open, onClose }) => {
  const { getHotkeyDescription } = useHotkeys();

  const hotkeyGroups = {
    'Controls': [
      { key: 'Space', description: 'Play/Pause video' },
      { key: 'KeyF', description: 'Toggle fullscreen' },
      { key: 'KeyD', description: 'Toggle ducking' },
      { key: 'KeyP', description: 'Toggle Picture-in-Picture' },
      { key: 'KeyM', description: 'Toggle mute' },
      { key: 'KeyT', description: 'Toggle slide transitions' },
      { key: 'ArrowLeft', description: 'Rewind video by 5 seconds' },
      { key: 'ArrowRight', description: 'Fast forward video by 15 seconds' },
      { key: 'BracketLeft', description: 'Decrease volume by 5%' },
      { key: 'BracketRight', description: 'Increase volume by 5%' },
    ],
    'Slides': [
      { key: 'ArrowUp', description: 'Previous slide' },
      { key: 'ArrowDown', description: 'Next slide' },
    ],
    'Background Music': [
      { key: 'Comma', description: 'Decrease background music volume by 5%' },
      { key: 'Period', description: 'Increase background music volume by 5%' },
      { key: 'KeyN', description: 'Skip to next track' },
      { key: 'Slash', description: 'Skip to random track' },
    ]
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'var(--dark-surface)',
          color: 'var(--dark-text)',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--dark-border)'
      }}>
        <Typography variant="h6" sx={{ color: 'var(--accent-color)' }}>
          Keyboard Shortcuts
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {Object.entries(hotkeyGroups).map(([group, hotkeys]) => (
          <Box key={group} sx={{ mb: 4 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'var(--accent-color)',
                mb: 2,
                pb: 1,
                borderBottom: '1px solid var(--dark-border)'
              }}
            >
              {group}
            </Typography>
            <Box sx={{ display: 'grid', gap: 1 }}>
              {hotkeys.map(({ key, description }) => (
                <Box 
                  key={key}
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 1
                    }
                  }}
                >
                  <Typography variant="body1" sx={{ color: 'var(--dark-text-secondary)' }}>
                    {description}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontFamily: 'monospace'
                    }}
                  >
                    {key}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default HotkeyGuide; 