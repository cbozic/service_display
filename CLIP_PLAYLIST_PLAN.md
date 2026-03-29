# Video Clip Playlist Feature

## Context

The app currently plays a single YouTube video from start to end. This feature adds the ability to define time ranges (clips) within a video and play them in sequence, with per-clip control over whether playback pauses or auto-continues at each clip boundary. This enables curating specific portions of a long video for worship service playback without manual seeking.

**Key constraint**: When no clips are defined, the app must behave exactly as it does today with zero additional clicks.

**Audio/overlay preservation**: The existing audio fade transitions and overlay behavior are not modified by this feature. Clip-end pauses go through the exact same `handlePlayPause()` path, and auto-continues just call `seekTo()` without any pause/play cycle.

## Design Decisions (from user input)

- **Clip scope**: Single video only (all clips from same YouTube video)
- **Clip UX**: "Set In" / "Set Out" buttons that capture current playback position
- **Transitions**: Simple `seekTo()` between clips (brief buffer acceptable)
- **Pause behavior**: Per-clip setting (pause at end vs auto-continue)
- **Persistence**: JSON file export/import (no localStorage)
- **Timed events**: Continue firing on absolute YouTube video time regardless of clips

---

## New Files to Create

### 1. `src/types/clipPlaylist.ts` -- Type definitions

```typescript
export interface VideoClip {
  id: string;
  startTime: number;    // seconds (absolute YouTube time)
  endTime: number;      // seconds
  label?: string;
  pauseAtEnd: boolean;  // true = pause at clip end; false = auto-continue
}

export interface ClipPlaylist {
  version: number;
  videoId: string;
  clips: VideoClip[];
}
```

### 2. `src/contexts/ClipPlaylistContext.tsx` -- State management

New context following the pattern of `TimeEventsContext.tsx`. Manages:
- `clips: VideoClip[]` -- ordered clip list
- `currentClipIndex: number` -- active clip (-1 when not in clip mode)
- `isClipModeActive: boolean` -- derived from `clips.length > 0`
- `isTransitioningBetweenClips: boolean` -- guards against double-triggers during seek
- `clipInPoint: number | null` -- pending "Set In" value while defining a clip
- CRUD actions: `addClip`, `removeClip`, `updateClip`, `reorderClips`, `clearClips`
- `importClips(json)` / `exportClips()` -- file I/O helpers
- `setCurrentClipIndex`, `setClipInPoint`, `clearClipInPoint`

### 3. `src/components/ClipEditor.tsx` -- Clip definition UI

New tab panel containing:
- **Set In / Set Out buttons**: Capture `currentVideoTime` as in/out point
- **Manual time entry**: Allow typing `MM:SS` values
- **"Add Clip" button**: Creates clip from current in/out points, appends to list
- **Clip list**: Ordered MUI List with each row showing:
  - Start/end time, duration (formatted `MM:SS`)
  - Toggle: "Pause at end" vs "Continue to next"
  - Edit (inline time editing), Delete, Move Up/Down buttons
- **Import/Export buttons**: File picker input for import, programmatic download for export
- **Clear All button**
- Validation: prevent overlapping clips, warn if end < start

### 4. `src/components/ClipBoundaryMonitor.tsx` -- Clip playback engine

Null-rendering component (like `VideoTimeEvents.tsx`) that:
- Activates only when `isClipModeActive && isPlaying`
- Polls `player.getCurrentTime()` every **250ms** (YouTube iframe updates at ~250ms internally; faster polling yields no benefit)
- When `currentTime >= currentClip.endTime`:
  - **If `pauseAtEnd` and next clip exists**: advance `currentClipIndex`, set `pendingSeekOnUnpause` ref to next clip's start, trigger pause via `onPause()` callback
  - **If auto-continue and next clip exists**: advance `currentClipIndex`, `seekTo(nextClip.startTime)` on both main + monitor players
  - **If last clip**: trigger pause, optionally reset index to 0 for replay
- Uses `isTransitioningBetweenClips` flag to prevent double-triggers after `seekTo()`
- Detects backward seeks (time jumped backward) and re-evaluates current clip index instead of triggering boundary

---

## Existing Files to Modify

### 5. `src/App.tsx`

**Provider wrapping**: Add `ClipPlaylistProvider` around app content (nest with existing providers at bottom of file).

**New ref**: `pendingSeekOnUnpauseRef = useRef<number | null>(null)`

**Modify `handlePlayPause()`**: After setting `isPlaying = true`, check `pendingSeekOnUnpauseRef.current`. If set, call `player.seekTo()` and `videoMonitorPlayer.seekTo()` with that value, then clear the ref. This is how clip-end pauses resume at the next clip.

**Modify `handleRestart()`**: When `isClipModeActive`, restart means seek to `clips[0].startTime` and reset `currentClipIndex` to 0 (instead of seeking to 0).

**Modify `handleTimeChange()`**: When user manually seeks via timeline while in clip mode, determine which clip (if any) contains the new time and update `currentClipIndex`. If outside all clips, allow free seeking (don't snap).

**Flexlayout**: Add "Clips" tab to the left column's first tabset (alongside Slides, Videos, Settings) in `createLayoutJson()`.

**Factory function**: Add `case "clips"` to render `<ClipEditor>` with `currentVideoTime` prop.

**Render `ClipBoundaryMonitor`**: Add alongside `VideoTimeEvents` in the video display area, passing player refs, `onPause` callback, and `pendingSeekOnUnpauseRef`.

**Not modified**: `handlePlayPause`'s existing play/pause flow (volume fading, overlay toggling) remains completely unchanged.

### 6. `src/components/VideoTimeline.tsx`

**New props**: `clips?: VideoClip[]`, `currentClipIndex?: number`, `isClipModeActive?: boolean` (optional to maintain backward compat).

**Clip range visualization**: Add a new styled `ClipRegion` component (absolutely-positioned colored rectangles) rendered inside the existing `<Box sx={{ position: 'relative' }}>` wrapper. For each clip:
- Calculate `left` = `valueTransform(clip.startTime) / valueTransform(duration) * 100` percent
- Calculate `width` = `(valueTransform(clip.endTime) - valueTransform(clip.startTime)) / valueTransform(duration) * 100` percent
- Current clip: semi-transparent blue highlight; other clips: dimmer blue
- Render behind the slider thumb (low z-index) but above the rail

### 7. `src/components/VideoControls.tsx`

**Pass-through props**: Accept and forward `clips`, `currentClipIndex`, `isClipModeActive` to `VideoTimeline`.

### 8. `src/components/MainVideoFrame.tsx`

**Guard video-ended handler**: In `onStateChangeHandler`, when YouTube state = 0 (ended) and `isClipModeActive`, skip the existing reset-to-start logic. Let `ClipBoundaryMonitor` handle end-of-playlist behavior instead. Add `isClipModeActive` as a prop (or consume from context).

**Not modified**: The play/pause effect with `fadeToVolume()`, overlay show/hide, and all transition logic remain completely unchanged.

---

## State Flow: Clip Playback

```
No clips defined:
  Everything works exactly as today. Zero changes to existing flow.

Clips defined (clip mode active):
  1. User presses Play
     -> handlePlayPause() sets isPlaying = true
     -> If pendingSeekOnUnpauseRef is set: seekTo(that time), clear ref
     -> Else if first play in clip mode: seekTo(clips[0].startTime)
     -> Normal play flow: volume fade up, overlay fade out

  2. During playback: ClipBoundaryMonitor polls every 250ms
     -> currentTime >= clip.endTime detected

  3a. Auto-continue (pauseAtEnd = false, next clip exists):
     -> currentClipIndex++
     -> player.seekTo(nextClip.startTime)
     -> videoMonitorPlayer.seekTo(nextClip.startTime)
     -> Playback continues uninterrupted

  3b. Pause at end (pauseAtEnd = true, next clip exists):
     -> currentClipIndex++
     -> pendingSeekOnUnpauseRef = nextClip.startTime
     -> Trigger pause (same flow as manual pause: volume fade, overlay, slides)
     -> User sees slides/overlay as normal

  4. User unpauses after clip-end pause:
     -> handlePlayPause() sees pendingSeekOnUnpauseRef is set
     -> seekTo(next clip start) on both players
     -> Clear ref, resume playing

  5. User pauses mid-clip (manual pause):
     -> Normal pause flow (pendingSeekOnUnpauseRef stays null)
     -> On unpause: resumes at same position within same clip

  6. Last clip ends:
     -> Pause. Reset currentClipIndex = 0.
     -> pendingSeekOnUnpauseRef = clips[0].startTime (ready for replay)
```

---

## Edge Cases

- **Overlapping clips**: ClipEditor validates and prevents overlapping ranges
- **Very short clips (<1s)**: 250ms polling handles these (max ~250ms overshoot, imperceptible)
- **User seeks outside all clips**: Allow it; set currentClipIndex to nearest clip or -1
- **Video-ended state (YouTube state 0)**: Guarded in MainVideoFrame when clip mode active
- **Backward seek during clip mode**: ClipBoundaryMonitor re-evaluates which clip contains current time
- **Transition guard**: `isTransitioningBetweenClips` flag prevents double-trigger after seekTo; cleared after 500ms or when poll detects time is in expected range
- **Monitor player sync**: Both players seekTo together on all clip transitions (same pattern as existing `handleTimeChange`)
- **Import validation**: Warn if imported `videoId` doesn't match current video, but allow import

---

## Implementation Order

1. **Types** -- `src/types/clipPlaylist.ts`
2. **Context** -- `src/contexts/ClipPlaylistContext.tsx`
3. **ClipEditor UI** -- `src/components/ClipEditor.tsx` + add tab to App.tsx layout/factory
4. **Timeline visualization** -- Modify `VideoTimeline.tsx` to render clip ranges
5. **Pass-through props** -- Modify `VideoControls.tsx`
6. **ClipBoundaryMonitor** -- `src/components/ClipBoundaryMonitor.tsx`
7. **App.tsx integration** -- `pendingSeekOnUnpause` logic, `handlePlayPause`/`handleRestart`/`handleTimeChange` modifications, provider wrapping
8. **MainVideoFrame guard** -- Guard state-0 handler for clip mode
9. **Keyboard shortcuts** -- `Shift+Left`/`Shift+Right` for prev/next clip (optional)

## Verification

- **Full video mode**: With no clips defined, verify all existing behavior is unchanged (play, pause, seek, fullscreen, PiP, timed events, slides, background player)
- **Clip definition**: Set in/out points, add multiple clips, verify they appear in list and on timeline
- **Auto-continue**: Define 2+ clips with "Continue to next", verify seamless seeking between them
- **Pause at end**: Define clips with "Pause at end", verify pause behavior matches manual pause (overlay, slides, volume fade), verify unpause starts next clip
- **Mid-clip pause**: Pause during a clip, verify resume stays at same position
- **Last clip**: Verify playback pauses at end of last clip
- **Import/Export**: Export clips to JSON, reload page, import same file, verify clips restored
- **Monitor sync**: Verify monitor player seeks in sync during all clip transitions
- **Timed events**: Verify automatic events still fire at their absolute video times during clip playback
