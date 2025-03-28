import * as React from 'react';
import { Box, TextField, Typography, Card, CardContent, FormControlLabel, Switch, Divider } from '@mui/material';

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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
          <TextField
            label="Background Music Playlist URL"
            value={backgroundPlaylistUrl}
            onChange={(e) => setBackgroundPlaylistUrl(e.target.value)}
            fullWidth
          />
          
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
