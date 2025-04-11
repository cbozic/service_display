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
  isAutomaticEventsEnabled: boolean;
  onAutomaticEventsToggle: (enabled: boolean) => void;
  isExperimentalFeaturesEnabled?: boolean;
  onExperimentalFeaturesToggle?: (enabled: boolean) => void;
  useBackgroundVideo?: boolean;
  onBackgroundTypeToggle?: (useVideo: boolean) => void;
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
  onExperimentalFeaturesToggle = () => {},
  useBackgroundVideo = false,
  onBackgroundTypeToggle = () => {}
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

  return (
    <Card>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Video ID"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            fullWidth
          />
          <TextField
            label="Start Time (seconds)"
            type="number"
            value={startTimeInSeconds}
            onChange={(e) => setStartTimeInSeconds(e.target.value)}
            fullWidth
          />
          <TextField
            label="Videos Playlist URL"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            fullWidth
          />
          
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Background Player Type
            </Typography>
            <ToggleButtonGroup
              value={useBackgroundVideo ? 'video' : 'music'}
              exclusive
              onChange={handleBackgroundTypeChange}
              aria-label="background player type"
              fullWidth
              color="primary"
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
            label={useBackgroundVideo ? "Background Video Playlist URL" : "Background Music Playlist URL"}
            value={backgroundPlaylistUrl}
            onChange={(e) => setBackgroundPlaylistUrl(e.target.value)}
            fullWidth
          />
          
          <Divider sx={{ my: 1 }} />
          
          <FormControlLabel
            control={
              <Switch
                checked={isAutomaticEventsEnabled}
                onChange={(e) => onAutomaticEventsToggle(e.target.checked)}
                color="primary"
              />
            }
            label="Enable Automatic Events"
          />
          <Typography variant="caption" color="text.secondary">
            Automatically trigger events at specific times (e.g., PiP mode at 5s, disable at 20s)
          </Typography>
          
          <Divider sx={{ my: 1 }} />
          
          <FormControlLabel
            control={
              <Switch
                checked={isExperimentalFeaturesEnabled}
                onChange={(e) => onExperimentalFeaturesToggle(e.target.checked)}
                color="primary"
              />
            }
            label="Enable Experimental Features"
          />
          <Typography variant="caption" color="text.secondary">
            Show experimental components (Keys, Tuner, Video List, Monitor) - requires page refresh
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default VideoConfigurationForm;
