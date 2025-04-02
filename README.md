# Service Display

A browser-based application to facilitate displaying streamed service videos to groups of remote viewers. It provides a flexible layout for controlling video playback, music, presentation slides, and other media elements needed during services.

## Overview

Service Display is designed to help manage and display media content during services or presentations. It features a customizable interface with panels for:
- Main video display with YouTube integration
- Presentation slides and transitions
- Background music controls
- Piano/keyboard integration
- Chromatic tuner
- Video playlist management
- Fullscreen and popout capabilities

The application uses a flexible layout system that allows users to arrange and resize different components according to their needs.

## Technologies

- **Frontend**: React with TypeScript
- **UI Components**: Material-UI (MUI)
- **Layout Engine**: flexlayout-react for the customizable panel system
- **Media Integration**: React YouTube for video playback
- **Music Tools**: Includes piano interface and chromatic tuner
- **Styling**: CSS with theme support including dark mode

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

## Features

- **YouTube Integration**: Play, control, and schedule videos from YouTube
- **Flexible Layout**: Customizable panel system for different display needs
- **Presentation Tools**: Show slides with transition effects
- **Music Support**: Background player and piano interface
- **Audio Tools**: Chromatic tuner and volume controls
- **Fullscreen Mode**: Optimized display for presentation environments
- **Theme Support**: Including dark mode

## To Do

- Fix YouTube video ID settings
- Get the volume controls on background player to behave like main player
- Fullscreen button is sometimes still visible when fullscreen is enabled in popout mode
- Correct the names of the component files to match current state
- Fix popout fullscreen behavior issues
- Possible server component to allow centralized configuration
- In the piano, add startAt setting for each key because not every key starts at the same time
- Audio nudge improvements

## Learn More

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

You can learn more about React in the [React documentation](https://reactjs.org/).
