import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Box, IconButton, Link, List, ListItem, ListItemText, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface OnlineHelpProps {
  open: boolean;
  onClose: () => void;
}

const OnlineHelp: React.FC<OnlineHelpProps> = ({ open, onClose }) => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const hotkeyGroups = {
    'Controls': [
      { key: 'Space', description: 'Play/Pause video' },
      { key: 'KeyF', description: 'Toggle fullscreen' },
      { key: 'KeyD', description: 'Toggle ducking' },
      { key: 'KeyP', description: 'Toggle Picture-in-Picture' },
      { key: 'KeyM', description: 'Toggle mute' },
      { key: 'KeyT', description: 'Toggle slide transitions' },
      { key: 'KeyE', description: 'Toggle timed events' },
      { key: 'ArrowLeft', description: 'Rewind video by 5 seconds' },
      { key: 'ArrowRight', description: 'Fast forward video by 15 seconds' },
      { key: 'BracketLeft', description: 'Decrease volume by 5%' },
      { key: 'BracketRight', description: 'Increase volume by 5%' },
      { key: 'Alt + KeyR', description: 'Restart video' },
      { key: 'Shift + /', description: 'Open help dialog (?)' }
    ],
    'Slides': [
      { key: 'ArrowUp', description: 'Previous slide' },
      { key: 'ArrowDown', description: 'Next slide' }
    ],
    'Background Music': [
      { key: 'Comma', description: 'Decrease background music volume by 5%' },
      { key: 'Period', description: 'Increase background music volume by 5%' },
      { key: 'KeyN', description: 'Skip to next track' },
      { key: 'Slash', description: 'Skip to random track' }
    ]
  };

  const sectionTitleStyle = {
    color: 'var(--accent-color)',
    mb: 2,
    pb: 1,
    borderBottom: '1px solid var(--dark-border)',
    fontSize: '1.5rem',
    fontWeight: 600
  };

  const sectionSubtitleStyle = {
    color: 'var(--accent-color)',
    mb: 1,
    fontSize: '1.2rem',
    fontWeight: 500
  };

  const textStyle = {
    fontSize: '1.1rem',
    lineHeight: 1.6,
    mb: 2
  };

  const secondaryTextStyle = {
    fontSize: '1rem',
    lineHeight: 1.5,
    color: 'var(--dark-text-secondary)'
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
        <Typography variant="h5" sx={{ color: 'var(--accent-color)', fontWeight: 600 }}>
          Service Display Help Guide
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {/* Table of Contents */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'var(--accent-color)', mb: 2, fontSize: '1.3rem' }}>
            Table of Contents
          </Typography>
          <List>
            <ListItem>
              <Link
                component="button"
                onClick={() => scrollToSection('overview')}
                sx={{ color: 'var(--accent-color)', fontSize: '1.1rem' }}
              >
                Overview
              </Link>
            </ListItem>
            <ListItem>
              <Link
                component="button"
                onClick={() => scrollToSection('main-components')}
                sx={{ color: 'var(--accent-color)', fontSize: '1.1rem' }}
              >
                Main Components
              </Link>
            </ListItem>
            <ListItem>
              <Link
                component="button"
                onClick={() => scrollToSection('settings')}
                sx={{ color: 'var(--accent-color)', fontSize: '1.1rem' }}
              >
                Settings
              </Link>
            </ListItem>
            <ListItem>
              <Link
                component="button"
                onClick={() => scrollToSection('keyboard-shortcuts')}
                sx={{ color: 'var(--accent-color)', fontSize: '1.1rem' }}
              >
                Keyboard Shortcuts
              </Link>
            </ListItem>
            <ListItem>
              <Link
                component="button"
                onClick={() => scrollToSection('experimental')}
                sx={{ color: 'var(--accent-color)', fontSize: '1.1rem' }}
              >
                Experimental Features
              </Link>
            </ListItem>
          </List>
        </Box>

        {/* Overview Section */}
        <Box id="overview" sx={{ mb: 4 }}>
          <Typography variant="h6" sx={sectionTitleStyle}>
            Overview
          </Typography>
          <Typography sx={textStyle}>
            Service Display is a specialized application designed to enhance worship services and presentations. It combines video playback, slide presentations, and background music into a seamless experience. The application features intuitive controls, keyboard shortcuts, and various display modes to accommodate different presentation needs.
          </Typography>
          <Typography sx={textStyle}>
            This tool is particularly useful for worship services, presentations, and other events where you need to coordinate multiple media elements. It allows you to:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Play YouTube videos with precise control"
                secondary="Start videos at specific times, control playback, and manage volume levels independently."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Display presentation slides"
                secondary="Show slides with smooth transitions and support for animated GIFs."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Manage background music"
                secondary="Play and control background music independently of the main video, with features for volume control and track selection."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
          </List>
        </Box>

        {/* Main Components Section */}
        <Box id="main-components" sx={{ mb: 4 }}>
          <Typography variant="h6" sx={sectionTitleStyle}>
            Main Components
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Video Player"
                secondary="The main video display area supports YouTube videos with customizable start times and playback controls. You can pause, play, seek, and adjust volume. The player supports Picture-in-Picture mode for flexible display options, and includes features like volume ducking to quickly lower the volume when needed."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Slide Display"
                secondary="A dedicated area for listing and slecting presentation slides to be shown during the service.  The seleced slide will be displayed when the main video player is paused.  The slide will be invisible when the main video player is playing.  You can manually advance slides or enable automatic transitions with customizable timing.  You can use the upload button to display your own presentations exported as GIF files.  Exporting presentations as GIF files is a feature supported by PowerPoint and Keynote."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Video Controls"
                secondary="A comprehensive control panel for managing video playback, volume, and display modes. Features include play/pause, seeking, volume, and various display toggles. The panel includes a video timeline with interactive markers that show where timed events will occur during playback. The timed events toggle (timer icon) enables or disables automatic control changes at pre-programmed times. All controls have corresponding keyboard shortcuts. When the video player is paused, the slide display will fade in until visible. Conversely, when playing, the slide display will fade away. Similar behaviors occur with the background player."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Background Music"
                secondary="A separate player for background content that can be controlled independently of the main video. This player will start when the main video player is paused and stop when the main video player is playing. Features include volume control, track selection, and random playback. You can switch between Music and Video modes using the Background Player Type toggle in Settings. The background player can be muted or adjusted without affecting the main video's audio. When the player starts, there may be some YouTube commercials initially, so set up before your service starts. It's recommended to set your system volume for the service's main content and adjust the background slider to be soft enough to avoid creating a distraction during prayer or fellowship."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Video List"
                secondary="A component that displays and allows selection from a list of available videos in the current playlist. This provides a visual interface for browsing and selecting videos, which can be more convenient than using keyboard shortcuts or playlist navigation. The list shows thumbnails and titles of available videos."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
          </List>
        </Box>

        {/* Settings Section */}
        <Box id="settings" sx={{ mb: 4 }}>
          <Typography variant="h6" sx={sectionTitleStyle}>
            Settings
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Video ID"
                secondary="The YouTube video ID to be displayed. This can be found in the YouTube URL after 'v='. For example, in 'youtube.com/watch?v=abc123xyz', the video ID is 'abc123xyz'. This setting determines which video will be played in the main display area."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Start Time"
                secondary="The time in seconds where the video should begin playing. This is useful when you want to start a video at a specific point, such as skipping an introduction or starting at a particular scene. Enter the number of seconds (e.g., 30 for 30 seconds into the video)."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Videos Playlist URL"
                secondary="A YouTube playlist URL containing multiple videos that can be played in sequence. The first video from this list will be selected to be played in the main display. Even though this is a playlist, it's not intended to play more than one video from this list. Using a playlist that is regularly updated by its channel owner will allow you to always display the most recent video content in your main display."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Background Player Type"
                secondary="Toggle between Music and Video modes for the background player. In Music mode, only the audio from the background playlist will play with the video hidden. In Video mode, both audio and video will be visible, which can be used for ambient visuals rather than content requiring attention. This setting affects how the background content is displayed and interacted with."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Background Playlist URL"
                secondary="A YouTube playlist URL for background content. This playlist will play in the background component based on the selected Background Player Type (music or video). You can control the volume independently of the main video and skip tracks as needed. The component supports random track selection and volume adjustment using keyboard shortcuts."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Automatic Events"
                secondary="The 'easy button' feature that works with the Timed Events toggle in the Controls panel. When timed events are enabled, this setting automatically triggers controls like Picture-in-Picture and audio ducking at pre-programmed times during video playback. The video timeline shows markers where these events will occur. When disabled, the video will play regularly without automatically triggering these controls. Users can still manually activate any control at any time regardless of this setting."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Experimental Features"
                secondary="Enables access to experimental components like the video monitor, piano keyboard, and tuner. These features are still in development but can provide additional functionality for specific use cases. Note that enabling this option requires a page refresh to take effect."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
          </List>
        </Box>

        {/* Keyboard Shortcuts Section */}
        <Box id="keyboard-shortcuts" sx={{ mb: 4 }}>
          <Typography variant="h6" sx={sectionTitleStyle}>
            Keyboard Shortcuts
          </Typography>
          <Typography sx={textStyle}>
            Keyboard shortcuts provide quick access to common functions. You can view this guide at any time by pressing the '?' key or 'H' key. Here are all available shortcuts:
          </Typography>
          {Object.entries(hotkeyGroups).map(([group, hotkeys]) => (
            <Box key={group} sx={{ mb: 3 }}>
              <Typography sx={sectionSubtitleStyle}>
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
                    <Typography sx={{ color: 'var(--dark-text-secondary)', fontSize: '1.1rem' }}>
                      {description}
                    </Typography>
                    <Typography
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '1.1rem'
                      }}
                    >
                      {key}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Experimental Features Section */}
        <Box id="experimental" sx={{ mb: 4 }}>
          <Typography variant="h6" sx={sectionTitleStyle}>
            Experimental Features
          </Typography>
          <Typography sx={{ ...textStyle, fontStyle: 'italic' }}>
            This group of components are functional but still in development. These components may eventually be included in the main application or they may be discarded. They are provided for testing and feedback purposes.
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Monitor"
                secondary="A tool that displays the current state of the main video even when it's not hidden behind your slides. This is useful for fast-forwarding or rewinding the video while slides are shownin the main display. It also shows the current time of the video."
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Keys (Piano Keyboard)"
                secondary="A virtual piano keyboard that plays different pad sounds for each note. Each key on the keyboard triggers a different youtube video, allowing for creative musical presentations or interactive experiences. The keyboard supports a full octave of notes and includes volume control. Maybe it's useful?"
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Tuner"
                secondary="A chromatic tuner that uses your device's microphone to detect and display musical notes. This tool can be helpful for musicians to ensure they're in tune. It can also be used to listen to the audio of the main video and give you a clue about what key the music may be in.  You can use this knowledge with the piano keyboard if you're feeling brave!"
                primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }}
                secondaryTypographyProps={{ sx: secondaryTextStyle }}
              />
            </ListItem>
          </List>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default OnlineHelp; 