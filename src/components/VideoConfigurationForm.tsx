import * as React from 'react';
import { Box, TextField, Typography, Card, CardContent, FormControlLabel, Switch, Divider, ToggleButtonGroup, ToggleButton } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VideocamIcon from '@mui/icons-material/Videocam';
import { useYouTube } from '../contexts/YouTubeContext';

interface VideoConfigurationFormProps {
  video: string;
  setVideo: (value: string) => void;
  startTimeInSeconds: string;
  setStartTimeInSeconds: (value: string) => void;
  playlistUrl: string;
  setPlaylistUrl: (value: string) => void;
  backgroundPlaylistUrl: string;
  setBackgroundPlaylistUrl: (value: string) => void;
  isExperimentalFeaturesEnabled?: boolean;
  onExperimentalFeaturesToggle?: (enabled: boolean) => void;
  useBackgroundVideo?: boolean;
  onBackgroundTypeToggle?: (useVideo: boolean) => void;
  audioDuckingPercentage?: number;
  setAudioDuckingPercentage?: (value: number) => void;
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
  isExperimentalFeaturesEnabled = false,
  onExperimentalFeaturesToggle = () => {},
  useBackgroundVideo = false,
  onBackgroundTypeToggle = () => {},
  audioDuckingPercentage = 66,
  setAudioDuckingPercentage = () => {}
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Access the YouTube context to control the background player
  const { backgroundPlayerRef } = useYouTube();

  const handleBackgroundTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: string | null,
  ) => {
    // Only toggle if a value is selected (prevent deselecting both)
    if (newValue !== null) {
      // Pause the currently active player before switching
      if (backgroundPlayerRef && backgroundPlayerRef.current) {
        try {
          console.log('[VideoConfigurationForm] Pausing current background player before switching');
          backgroundPlayerRef.current.pauseVideo();
        } catch (error) {
          console.error('[VideoConfigurationForm] Error pausing background player:', error);
        }
      }
      
      // After pausing, toggle to the new player type
      onBackgroundTypeToggle(newValue === 'video');
    }
  };

  // Card and form styles with dark theme
  const cardStyles = {
    backgroundColor: 'var(--dark-surface)',
    borderRadius: 2,
    border: '1px solid var(--dark-border)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
    color: 'var(--dark-text)',
  };
  
  const textFieldStyles = {
    mb: 2,
    '& .MuiInputBase-root': {
      color: 'var(--dark-text)',
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: 'var(--dark-border)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.3)',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'var(--accent-color)',
      }
    },
    '& .MuiInputLabel-root': {
      color: 'var(--dark-text-secondary)',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: 'var(--accent-color)',
    },
    '& .MuiFormHelperText-root': {
      color: '#d0d0e0', // Ensure helper text is always visible
    }
  };

  const toggleButtonStyles = {
    '&.MuiToggleButtonGroup-root': {
      '& .MuiToggleButton-root': {
        color: 'var(--dark-text-secondary)',
        borderColor: 'var(--dark-border)',
        '&.Mui-selected': {
          backgroundColor: 'rgba(61, 132, 247, 0.2)',
          color: 'var(--accent-color)',
          borderColor: 'var(--accent-color)',
        },
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
      },
    }
  };

  const dividerStyle = {
    borderColor: 'var(--dark-border)',
    my: 2,
  };

  const labelStyle = {
    '& .MuiFormControlLabel-label': {
      color: 'var(--dark-text)',
    }
  };

  return (
    <Card sx={cardStyles}>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Video ID"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            fullWidth
            sx={textFieldStyles}
          />
          <TextField
            label="Start Time (seconds)"
            type="number"
            value={startTimeInSeconds}
            onChange={(e) => setStartTimeInSeconds(e.target.value)}
            fullWidth
            sx={textFieldStyles}
          />
          <TextField
            label="Videos Playlist URL"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            fullWidth
            sx={textFieldStyles}
          />
          
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: 'var(--dark-text)' }}>
              Background Player Type
            </Typography>
            <ToggleButtonGroup
              value={useBackgroundVideo ? 'video' : 'music'}
              exclusive
              onChange={handleBackgroundTypeChange}
              aria-label="background player type"
              fullWidth
              color="primary"
              sx={toggleButtonStyles}
            >
              <ToggleButton value="music" aria-label="background music">
                <MusicNoteIcon sx={{ mr: 1 }} />
                Music
              </ToggleButton>
              <ToggleButton value="video" aria-label="background video">
                <VideocamIcon sx={{ mr: 1 }} />
                Video
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          
          <TextField
            label={"Background Video Playlist URL"}
            value={backgroundPlaylistUrl}
            onChange={(e) => setBackgroundPlaylistUrl(e.target.value)}
            fullWidth
            sx={textFieldStyles}
          />
          
          <TextField
            label="Audio Ducking Percentage"
            type="number"
            value={audioDuckingPercentage}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 0 && value <= 100) {
                setAudioDuckingPercentage(value);
              }
            }}
            helperText="Percentage of volume to use when audio ducking is enabled (0-100)"
            FormHelperTextProps={{
              sx: { color: 'var(--dark-text-secondary)' }
            }}
            fullWidth
            sx={textFieldStyles}
            inputProps={{ min: 0, max: 100 }}
          />
        
          <FormControlLabel
            control={
              <Switch
                checked={isExperimentalFeaturesEnabled}
                onChange={(e) => onExperimentalFeaturesToggle(e.target.checked)}
                color="primary"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: 'var(--accent-color)',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: 'var(--accent-color)',
                  },
                }}
              />
            }
            label="Experimental Features"
            sx={labelStyle}
          />
          <Typography variant="caption" sx={{ color: 'var(--dark-text-secondary)', mt: -1 }}>
            Show experimental components (Keys, Tuner, Video List, Monitor) - requires page refresh
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default VideoConfigurationForm;
