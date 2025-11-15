# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Service Display is a React-based application for managing worship services and presentations. It combines YouTube video playback, slide presentations, and background music into a synchronized experience. The app runs both as a web application and as an Electron desktop app.

## Development Commands

### Web Development
```bash
npm start                # Start development server at http://localhost:3000
npm test                 # Run tests in watch mode
npm run build            # Production build to build/
npm run build:docs       # Build for GitHub Pages (outputs to docs/)
```

### Electron Development
```bash
npm run electron:start   # Start Electron app with hot-reload
npm run electron:build   # Build for current platform
npm run electron:build:win
npm run electron:build:mac
npm run electron:build:linux
```

## Architecture

### State Management & Context

The app uses React Context API for global state management:

- **YouTubeContext** (`src/contexts/YouTubeContext.tsx`): Manages YouTube player state coordination between main video player and background players. Shared refs for `backgroundPlayerRef` prevent re-renders. Controls volume, mute state, and playing state.

- **TimeEventsContext** (`src/contexts/TimeEventsContext.tsx`): Manages time-based events that trigger at specific video timestamps (fullscreen, PiP, audio ducking, etc.). Events track whether they've been triggered to prevent duplicate execution.

### Component Architecture

**Main App Component** (`src/App.tsx`):
- Root component managing global state and layout using flexlayout-react
- Handles keyboard shortcuts for all controls (Space, F, T, D, P, M, etc.)
- Coordinates fullscreen, PiP mode, audio ducking, and timed events
- Uses `useCallback` extensively to prevent unnecessary re-renders
- The `factory` function renders components based on flexlayout tab types

**Key Components**:
- `MainVideoFrame`: YouTube video player wrapper with overlay support
- `MainVideoOverlay`: Slide overlay that fades in/out based on video playback state
- `VideoControls`: Control panel with play/pause, volume, timeline, ducking controls
- `VideoTimeEvents`: Manages time-based event registration and triggering
- `SlideOverlayControl`: Handles GIF frame extraction and slide selection
- `BackgroundMusicPlayer`: Audio player using HTML5 audio elements
- `BackgroundVideoPlayer`: Secondary YouTube player for background video
- `MainVideoSelectionList`: YouTube playlist fetcher and video selector

### Layout System

Uses **flexlayout-react** for dockable, resizable panels. Layout configuration is generated dynamically based on experimental features flag. The layout model is stored in memory and regenerated on feature toggles.

Key layout nodes:
- Display tab (component: "video") - supports popout to separate window
- Controls tab - video playback controls
- Slides tab - slide management
- Videos tab - playlist/video selection
- Settings tab - app configuration
- Background Music/Video tab - toggleable between audio and video player
- Experimental tabs (Keys, Tuner) - conditional based on settings

### Video Synchronization

The app supports multiple synchronized video players:
- Main display player (can be in fullscreen or PiP)
- Monitor player (shows video without overlay)
- Both players are kept in sync via shared state and manual `seekTo()` calls

### Time-Based Events System

Automatic events registered in `resetTimeEvents()` callback:
- Fullscreen activation at 1 second
- PiP enable at 5 seconds (conditional on day/time and video duration)
- PiP disable at 6.5 minutes
- Background player pause at 15 minutes
- Background player resume at 65 minutes (with retry logic)

Events only trigger if `isAutomaticEventsEnabled` is true. Events are cleared and re-registered when video restarts.

### Volume & Audio Management

**Audio Ducking**: Instantly reduces main video volume to a percentage (default 50%), then fades back over 3 seconds when disabled. Used for speaking over video audio.

**Volume Fading**: Utility function `fadeToVolume()` in `src/utils/audioUtils.ts` provides smooth volume transitions over configurable steps (default 30 steps).

**Background Player Logic**: Background music/video automatically starts when main video pauses and stops when main video plays. This coordination happens via YouTubeContext state.

### YouTube API Integration

**Playlist Fetching** (`src/utils/youtubeAPI.ts`):
- Fetches playlist items using YouTube Data API v3
- No API key required (uses public access)
- Falls back gracefully if playlist is unavailable

**Player State Tracking**:
- State 1 = playing
- State 2 = paused
- State 5 = video cued
- State changes update app-wide `isPlaying` state

### Slide Management

**GIF Frame Extraction** (`SlideOverlayControl` component):
- Uses `gifuct-js` library to parse animated GIFs
- Extracts individual frames as data URLs
- Supports auto-advance mode (10 second intervals)
- Manual navigation via arrow keys or click selection

**Slide Transitions**:
- Slides fade in when video pauses
- Slides fade out when video plays
- Transition timing controlled by CSS fade duration (default 2 seconds)

### Electron Integration

**Main Process** (`electron/main.js`):
- Creates BrowserWindow with security settings (no nodeIntegration, contextIsolation)
- Loads from dev server (ELECTRON_START_URL) or built files
- Opens external links in system browser
- Custom application menu with standard roles

**Build Process**:
- `electron:prepare` script copies electron/ files to build/ before packaging
- electron-builder handles platform-specific packaging
- Icons located in public/logo512.png

### Keyboard Shortcuts

- **Space**: Play/pause
- **F**: Toggle fullscreen
- **T**: Toggle slide transitions
- **D**: Toggle audio ducking (if not muted)
- **P**: Toggle PiP mode
- **M**: Toggle mute
- **N**: Next track (background player)
- **/**: Random track (background player)
- **[** / **]**: Decrease/increase main volume by 5%
- **,** / **.**: Decrease/increase background volume by 5%
- **Alt+R**: Restart video from beginning
- **↑** / **↓**: Previous/next slide
- **?**: Toggle help dialog
- **E**: Toggle automatic timed events
- **1-4**: Video sync recovery options (quality toggle, seek resync, pause/play, reload)

### State Persistence

Uses localStorage for:
- `experimentalFeaturesEnabled`: Shows/hides experimental tabs
- `useBackgroundVideo`: Toggles between audio and video background player

## Important Implementation Details

### Preventing Auto-Fullscreen After Manual Exit

The app tracks `userExitedFullscreen` state. When user manually exits fullscreen (Escape key), automatic fullscreen events are suppressed until video restart. The flag resets on `handleRestart()` or manual fullscreen toggle.

### PiP Conditional Logic

PiP events only register if:
1. Current day is Saturday after 2pm OR Sunday before 11:45pm
2. Video duration exceeds 65 minutes (3900 seconds)

This prevents PiP from activating for shorter videos or outside service times.

### Background Player Resume Retry Logic

At 65 minutes, background players resume with retry mechanisms (up to 3 attempts) because:
1. Autoplay policies may block playback
2. Player state may be uninitialized
3. A synthetic click event is dispatched to satisfy user interaction requirements

### Volume Management During Mute

When muting, previous volume is stored in `previousVolumeRef` to restore later. During ducking, pre-duck volume stored in `preDuckVolume` ref. These refs prevent state coupling issues.

### Flexlayout Model Updates

When toggling background player type, the model updates in-place using `Actions.updateModelAttributes()` rather than replacing the model. A window resize event is dispatched to force re-render.

## Common Patterns

### Callback Stability
Extensive use of `useCallback` with proper dependency arrays to prevent unnecessary re-renders, especially for event handlers passed to child components.

### Ref Usage
Refs used for:
- Storing values that shouldn't trigger re-renders (timers, previous volumes)
- Accessing player instances across components (backgroundPlayerRef)
- Preventing double-initialization (slidesInitializedRef)

### Custom Events
The app uses custom DOM events for cross-component communication:
- `openControlsOnly`: Triggered by EasyStartPopup
- `userExitedFullscreen`: Signals manual fullscreen exit

## TypeScript Patterns

Type declarations in `src/types/`:
- `react-piano.d.ts`: Type definitions for react-piano library
- `youtube.d.ts`: Extended YouTube player types

Component props interfaces defined inline at top of each component file.

## Testing

Testing setup uses:
- @testing-library/react
- @testing-library/jest-dom
- Jest (via react-scripts)

Test files use `.test.tsx` extension (e.g., `App.test.tsx`).

## Deployment

**GitHub Pages**: Built files placed in `docs/` folder. GitHub Actions workflow deploys on push to main.

**GitHub Pages Base Path Handling**: App detects GitHub Pages environment and adjusts asset paths accordingly using `getBasePath()` function.

## Known Issues & TODOs

See the "To Do" section in README.md for current open issues, including:
- Live stream start time handling
- YouTube background player restart behavior
- Timed event persistence issues
- Background music track advancement
- External audio (AirPlay/HDMI) volume transition issues
