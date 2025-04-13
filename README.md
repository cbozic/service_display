# Service Display

A browser-based application to facilitate displaying streamed service videos to groups of remote viewers. It provides a flexible layout for controlling video playback, music, presentation slides, and other media elements needed during services.

## Overview

Service Display is a specialized application designed to enhance worship services and presentations. It combines video playback, slide presentations, and background music into a seamless experience. The application features intuitive controls, keyboard shortcuts, and various display modes to accommodate different presentation needs.

### Key Features

- **Video Player**: Play YouTube videos with precise control, including start times, playback controls, and volume management
- **Slide Display**: Show presentation slides with smooth transitions and support for animated GIFs
- **Background Music**: Independent audio player for background music with volume control and track selection
- **Video Controls**: Comprehensive control panel for managing video playback, volume, and display modes
- **Picture-in-Picture**: Flexible display options for video content
- **Keyboard Shortcuts**: Quick access to common functions
- **Experimental Features**: Additional tools like video monitor, piano keyboard, and chromatic tuner

## Main Components

### Video Player
The main video display area supports YouTube videos with customizable start times and playback controls. You can pause, play, seek, and adjust volume. The player supports Picture-in-Picture mode for flexible display options, and includes features like volume ducking to quickly lower the volume when needed.

### Slide Display
A dedicated area for listing and selecting presentation slides to be shown during the service. The selected slide will be displayed when the main video player is paused and will fade away when the video is playing. You can manually advance slides or enable automatic transitions with customizable timing. Use the upload button to display your own presentations exported as GIF files (supported by PowerPoint and Keynote).

### Background Music
A separate audio player for background music that can be controlled independently of the main video. The background player will start when the main video player is paused and stop when the main video player is playing. Features include volume control, track selection, and random playback. The music player can be muted or adjusted without affecting the main video's audio.

## Settings

### Video Configuration
- **Video ID**: The YouTube video ID to be displayed (found in the URL after 'v=')
- **Start Time**: Set the time in seconds where the video should begin playing
- **Videos Playlist URL**: A YouTube playlist URL containing multiple videos (first video will be selected)
- **Background Music Playlist URL**: A YouTube playlist URL for background music tracks
- **Automatic Events**: Enable automatic triggering of controls like Picture-in-Picture and audio ducking
- **Experimental Features**: Enable access to additional components like video monitor, piano keyboard, and tuner

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/service_display.git
cd service_display

# Install dependencies
npm install
```

## Development

```bash
# Start the development server
npm start
```

This runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser. The page will reload when you make changes, and you may see lint errors in the console.

## Building for Production

```bash
# Standard build
npm run build

# Build for GitHub Pages (puts files in docs/ folder)
npm run build:docs
```

The standard build creates files in the `build` folder, while the GitHub Pages build places them in the `docs` folder.

## Deployment

### GitHub Pages
This project is set up for GitHub Pages hosting. The optimized build is available in the `docs` folder.

The site is automatically deployed to GitHub Pages when:
1. Changes are pushed to the main branch
2. The GitHub Actions workflow runs successfully
3. The built files in the docs folder are updated

For manual deployment:
```bash
npm run build:docs
```

## Testing

```bash
npm test
```

Launches the test runner in interactive watch mode. See the [running tests](https://facebook.github.io/create-react-app/docs/running-tests) section in the Create React App documentation for more information.

## To Do
- Create a skip next minute button Create a skip back 20 seconds button (maybe using a modifier hotkey)
- Create a timeline component with more space given to the first 15 seconds
    - Add markers for the timed events to the time line
    - Add a control to video controls that enables/disables timed events (remove config form toggle)
- Stop earlier timed events from removing themselves (they should be either all on or all off)
- Fix background music player not moving to next track at end of current track
- Fix weird youtube volume transition issues with external audio (AirPlay or HDMI)
- Rename the component files to match current state of codebase
- Fix popout fullscreen behavior issues
- Improved mobile experience
- Use an external URL for slides
- In the piano, add startAt setting for each key because not every key starts at the same time

## Learn More

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

You can learn more about React in the [React documentation](https://reactjs.org/).
