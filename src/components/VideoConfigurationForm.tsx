import * as React from 'react';
import { Box, TextField, Typography, Card, CardContent, FormControlLabel, Switch, Divider, useMediaQuery, useTheme } from '@mui/material';

interface VideoConfigurationFormProps {
  video: string;
  setVideo: (value: string) => void;
  startTimeInSeconds: string;
  setStartTimeInSeconds: (value: string) => void;
  playlistUrl: string;
  setPlaylistUrl: (value: string) => void;
  backgroundPlaylistUrl: string;
  setBackgroundPlaylistUrl: (value: string) => void;
  isAutomaticEventsEnabled: boolean;
  onAutomaticEventsToggle: (enabled: boolean) => void;
  isExperimentalFeaturesEnabled?: boolean;
  onExperimentalFeaturesToggle?: (enabled: boolean) => void;
}

const VideoConfigurationForm: React.FC<VideoConfigurationFormProps> = ({
  video,
  setVideo,
  startTimeInSeconds,
  setStartTimeInSeconds,
  playlistUrl,
  setPlaylistUrl,
  backgroundPlaylistUrl,
  setBackgroundPlaylistUrl,
  isAutomaticEventsEnabled,
  onAutomaticEventsToggle,
  isExperimentalFeaturesEnabled = false,
  onExperimentalFeaturesToggle = () => {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Dark theme styles
  const cardStyle = {
    backgroundColor: 'var(--dark-surface, #222222)',
    border: '1px solid var(--dark-border, #333333)',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s ease',
    width: '100%',
    maxWidth: isMobile ? '100%' : '800px',
    margin: '0 auto',
  };

  const cardContentStyle = {
    padding: isMobile ? '16px' : '24px',
  };

  const textFieldStyle = {
    marginBottom: isMobile ? '16px' : '20px',
    '& .MuiInputBase-root': {
      backgroundColor: 'var(--darker-bg, #111111)',
      color: 'var(--dark-text, #ffffff)',
      borderRadius: '6px',
    },
    '& .MuiInputLabel-root': {
      color: 'var(--dark-text-secondary, #c0c0d0)',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--dark-border, #333333)',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--accent-color, #3d84f7)',
    },
    '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--accent-color, #3d84f7) !important',
    },
  };

  const switchLabelStyle = {
    marginBottom: '8px',
    '& .MuiFormControlLabel-label': {
      color: 'var(--dark-text, #ffffff)',
      fontWeight: 500,
    },
    '& .MuiSwitch-switchBase.Mui-checked': {
      color: 'var(--accent-color, #3d84f7)',
    },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
      backgroundColor: 'var(--accent-color, #3d84f7)',
    },
  };

  const captionStyle = {
    color: 'var(--dark-text-secondary, #c0c0d0)',
    marginBottom: '16px',
    fontSize: isMobile ? '0.75rem' : '0.85rem',
  };

  const dividerStyle = {
    backgroundColor: 'var(--dark-border, #333333)',
    margin: '16px 0',
  };

  return (
    <Card sx={cardStyle}>
      <CardContent sx={cardContentStyle}>
        <Typography 
          variant="h5" 
          sx={{ 
            mb: 3, 
            fontWeight: 600, 
            color: 'var(--dark-text, #ffffff)',
            textAlign: isMobile ? 'center' : 'left'
          }}
        >
          Settings
        </Typography>
        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? 1 : 2 
          }}
        >
          <TextField
            label="Video ID"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            fullWidth
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            sx={textFieldStyle}
          />
          <TextField
            label="Start Time (seconds)"
            type="number"
            value={startTimeInSeconds}
            onChange={(e) => setStartTimeInSeconds(e.target.value)}
            fullWidth
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            sx={textFieldStyle}
          />
          <TextField
            label="Videos Playlist URL"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            fullWidth
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            sx={textFieldStyle}
          />
          <TextField
            label="Background Music Playlist URL"
            value={backgroundPlaylistUrl}
            onChange={(e) => setBackgroundPlaylistUrl(e.target.value)}
            fullWidth
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            sx={textFieldStyle}
          />
          
          <Divider sx={dividerStyle} />
          
          <FormControlLabel
            control={
              <Switch
                checked={isAutomaticEventsEnabled}
                onChange={(e) => onAutomaticEventsToggle(e.target.checked)}
                color="primary"
              />
            }
            label="Enable Automatic Events"
            sx={switchLabelStyle}
          />
          <Typography variant="caption" sx={captionStyle}>
            Automatically trigger events at specific times (e.g., PiP mode at 5s, disable at 20s)
          </Typography>
          
          <Divider sx={dividerStyle} />
          
          <FormControlLabel
            control={
              <Switch
                checked={isExperimentalFeaturesEnabled}
                onChange={(e) => onExperimentalFeaturesToggle(e.target.checked)}
                color="primary"
              />
            }
            label="Enable Experimental Features"
            sx={switchLabelStyle}
          />
          <Typography variant="caption" sx={captionStyle}>
            Show experimental components (Keys, Tuner, Video List, Monitor) - requires page refresh
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default VideoConfigurationForm;
