# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Service Display is a React-based application for managing worship services and presentations. It combines YouTube video playback, slide presentations, and background music into a synchronized experience. The app runs as a web application.

`npm run build:docs` builds for GitHub Pages into `docs/` (committed; a GitHub Actions workflow deploys on push to main). Asset paths adapt via `getBasePath()`.

## Architecture Notes

- **YouTubeContext** (`src/contexts/YouTubeContext.tsx`) coordinates main and background players. `backgroundPlayerRef` is a shared ref to avoid re-renders.
- **TimeEventsContext** (`src/contexts/TimeEventsContext.tsx`) holds timed events; events track whether they've triggered so they don't run twice.
- Layout uses flexlayout-react; the model is stored in memory and regenerated on experimental-feature toggles. The Display tab supports popout to a separate window.
- Two synchronized players: the main display (fullscreen or PiP) and a monitor player without overlay. They are kept in sync via shared state and manual `seekTo()` calls.
- Background music/video starts when the main video pauses and stops when it plays, via YouTubeContext state.
- Playlist fetching (`src/utils/youtubeAPI.ts`) uses YouTube Data API v3 with no API key and falls back gracefully if the playlist is unavailable.
- Player state codes: 1 = playing, 2 = paused, 5 = cued.

### Time-Based Events System

Registered in `resetTimeEvents()`, only trigger if `isAutomaticEventsEnabled` is true, and are cleared and re-registered when the video restarts:
- Fullscreen activation at 1 second
- PiP enable at 5 seconds (conditional, see below)
- PiP disable at 6.5 minutes
- Background player pause at 15 minutes
- Background player resume at 65 minutes (with retry logic)

### Volume & Audio Management

- **Audio ducking**: instantly drops main volume to a percentage (default 50%), then fades back over 3 seconds when disabled.
- **`fadeToVolume()`** (`src/utils/audioUtils.ts`) does stepped transitions (default 30 steps). It is for play/pause fades only. The volume slider sets volume directly in `MainVideoFrame` and cancels any in-flight fade; do not make the play/pause effect depend on `volume`, or every slider tick restarts a fade and fights the slider.

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

## Known Issues & TODOs

See the "To Do" section in README.md for current open issues, including:
- Live stream start time handling
- YouTube background player restart behavior
- Timed event persistence issues
- Background music track advancement
- External audio (AirPlay/HDMI) volume transition issues
