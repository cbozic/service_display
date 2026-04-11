import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box, Button, IconButton, List, ListItem, Typography, TextField,
  Tooltip, Alert, Snackbar, Menu, MenuItem,
  Autocomplete
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import { useClipPlaylist } from '../contexts/ClipPlaylistContext';
import { VideoClip } from '../types/clipPlaylist';

interface ClipEditorProps {
  currentVideoTime: number;
  videoId: string;
  videoDuration: number;
  onSeekToTime?: (time: number) => void;
  onLoadVideo?: (videoId: string) => void;
}

// Generate a simple unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

// Parse a time string to seconds. Accepts:
//   "MM:SS" -> minutes and seconds
//   "HH:MM:SS" -> hours, minutes, seconds
//   "M:" or "MM:" -> treat as M:00 or MM:00
//   raw number -> treated as seconds
const parseTimeString = (str: string): number | null => {
  const trimmed = str.trim();
  if (!trimmed) return null;

  // Handle colon-separated formats
  if (trimmed.includes(':')) {
    // Filter out empty parts from trailing/leading colons and parse
    const rawParts = trimmed.split(':');
    const parts = rawParts.map(p => p === '' ? 0 : Number(p));
    if (parts.some(isNaN)) return null;

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  }

  // Raw number (no colon) -> treat as seconds
  const raw = parseFloat(trimmed);
  return isNaN(raw) ? null : raw;
};

// Format seconds to MM:SS or HH:MM:SS
const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface VideoOption {
  videoId: string;
  title: string;
}

const ClipEditor: React.FC<ClipEditorProps> = ({ currentVideoTime, videoId, videoDuration, onSeekToTime, onLoadVideo }) => {
  const {
    clips, clipInPoint, isClipModeActive, isPlaybackMode, videoTitles, currentClipIndex,
    addClip, removeClip, updateClip, reorderClips, clearClips,
    setCurrentClipIndex, setIsPlaybackMode,
    setClipInPoint, importClips, exportClips,
  } = useClipPlaylist();

  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [outPointInput, setOutPointInput] = useState('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'warning' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reorderMenuAnchor, setReorderMenuAnchor] = useState<{ el: HTMLElement; index: number } | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string>(videoId);

  // Sync selectedVideoId when the player video changes externally
  useEffect(() => {
    setSelectedVideoId(videoId);
  }, [videoId]);

  // Build dropdown options: unique videoIds from clips + all from videoTitles (playlist)
  const videoOptions: VideoOption[] = useMemo(() => {
    const optionMap = new Map<string, string>();

    // Add all known videos from videoTitles (includes playlist videos)
    for (const [id, title] of Object.entries(videoTitles)) {
      optionMap.set(id, title);
    }

    // Add videos from clips that may not have titles yet
    for (const clip of clips) {
      if (!optionMap.has(clip.videoId)) {
        optionMap.set(clip.videoId, clip.videoId);
      }
    }

    return Array.from(optionMap.entries()).map(([vid, title]) => ({
      videoId: vid,
      title,
    }));
  }, [videoTitles, clips]);

  // Find the currently selected option (or create a free-text one)
  const selectedOption: VideoOption = useMemo(() => {
    const found = videoOptions.find(o => o.videoId === selectedVideoId);
    return found || { videoId: selectedVideoId, title: selectedVideoId };
  }, [videoOptions, selectedVideoId]);

  const handleVideoSelect = (_event: any, newValue: VideoOption | string | null) => {
    if (!newValue) return;

    let newVideoId: string;
    if (typeof newValue === 'string') {
      // User typed a raw value. Check if it matches an existing option.
      const existing = videoOptions.find(o => o.videoId === newValue);
      newVideoId = existing ? existing.videoId : newValue;
    } else {
      newVideoId = newValue.videoId;
    }

    setSelectedVideoId(newVideoId);
    setClipInPoint(null);

    // Auto-load in player if different from current video
    if (newVideoId !== videoId && onLoadVideo) {
      onLoadVideo(newVideoId);
    }
  };

  const handleSetIn = () => {
    setClipInPoint(currentVideoTime);
  };

  const handleSetOut = () => {
    const outTime = outPointInput.trim()
      ? parseTimeString(outPointInput)
      : currentVideoTime;

    if (outTime === null) {
      setSnackbar({ message: 'Invalid out point time format', severity: 'error' });
      return;
    }

    const inTime = clipInPoint ?? 0;

    if (outTime <= inTime) {
      setSnackbar({ message: 'Out point must be after in point', severity: 'error' });
      return;
    }

    // Check for overlaps with existing clips for the same video only
    const sameVideoClips = clips.filter(c => c.videoId === selectedVideoId);
    const overlaps = sameVideoClips.some(c =>
      (inTime < c.endTime && outTime > c.startTime)
    );
    if (overlaps) {
      setSnackbar({ message: 'Clip overlaps with an existing clip', severity: 'error' });
      return;
    }

    const newClip: VideoClip = {
      id: generateId(),
      videoId: selectedVideoId,
      startTime: inTime,
      endTime: outTime,
      pauseAtEnd: true,
    };

    addClip(newClip);
    setClipInPoint(null);
    setOutPointInput('');
    setSnackbar({ message: 'Clip added', severity: 'success' });
  };

  const handleStartEdit = (clip: VideoClip) => {
    setEditingClipId(clip.id);
    setEditStartTime(formatTime(clip.startTime));
    setEditEndTime(formatTime(clip.endTime));
  };

  const handleSaveEdit = (clipId: string) => {
    const startTime = parseTimeString(editStartTime);
    const endTime = parseTimeString(editEndTime);

    if (startTime === null || endTime === null) {
      setSnackbar({ message: 'Invalid time format', severity: 'error' });
      return;
    }
    if (endTime <= startTime) {
      setSnackbar({ message: 'End time must be after start time', severity: 'error' });
      return;
    }

    // Check for overlaps (excluding this clip, same video only)
    const editClip = clips.find(c => c.id === clipId);
    const sameVideoClips = clips.filter(c => c.videoId === editClip?.videoId);
    const overlaps = sameVideoClips.some(c =>
      c.id !== clipId && (startTime < c.endTime && endTime > c.startTime)
    );
    if (overlaps) {
      setSnackbar({ message: 'Clip would overlap with another clip', severity: 'error' });
      return;
    }

    updateClip(clipId, { startTime, endTime });
    setEditingClipId(null);
  };

  const handleCancelEdit = () => {
    setEditingClipId(null);
  };

  const handleExport = () => {
    const json = exportClips();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clips-multi.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ message: 'Clips exported', severity: 'success' });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      const result = importClips(json, videoId);
      if (result.success) {
        setSnackbar({
          message: result.warning || 'Clips imported successfully',
          severity: result.warning ? 'warning' : 'success',
        });
      } else {
        setSnackbar({ message: result.warning || 'Import failed', severity: 'error' });
      }
    };
    reader.readAsText(file);

    // Reset file input so the same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTogglePlaybackMode = () => {
    if (!isPlaybackMode && clips.length > 0) {
      // Entering Play Clips mode: if first clip is a different video, load it
      const firstClip = clips[0];
      if (firstClip.videoId !== videoId && onLoadVideo) {
        onLoadVideo(firstClip.videoId);
      }
      if (onSeekToTime) {
        onSeekToTime(firstClip.startTime);
      }
      setCurrentClipIndex(0);
      setIsPlaybackMode(true);
    } else {
      // Entering Find Clips mode: keep current position
      setIsPlaybackMode(false);
    }
  };

  const handleCopyShareLink = () => {
    // Multi-video format: VID:start.end or VID:start.end.0 for continue
    const clipsParam = clips.map(c => {
      const s = Math.round(c.startTime);
      const e = Math.round(c.endTime);
      const timeStr = c.pauseAtEnd ? `${s}.${e}` : `${s}.${e}.0`;
      return `${c.videoId}:${timeStr}`;
    }).join(',');
    const url = new URL(window.location.href.split('?')[0]);
    // Set first clip's video as initial video for backward compat
    if (clips.length > 0) {
      url.searchParams.set('v', clips[0].videoId);
    }
    url.searchParams.set('c', clipsParam);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setSnackbar({ message: 'Share link copied to clipboard', severity: 'success' });
    }).catch(() => {
      // Fallback: show the URL in a prompt
      window.prompt('Copy this link:', url.toString());
    });
  };

  const handleSeekToClip = (clip: VideoClip) => {
    // If the clip is from a different video, load that video first
    if (clip.videoId !== videoId && onLoadVideo) {
      onLoadVideo(clip.videoId);
    }
    if (onSeekToTime) {
      onSeekToTime(clip.startTime);
    }
  };

  // Get a short display label for a video (title or abbreviated ID)
  const getVideoLabel = (vid: string): string => {
    return videoTitles[vid] || vid;
  };

  // Styles for dark background readability
  const lightText = { color: 'rgba(255, 255, 255, 0.9)' };
  const dimText = { color: 'rgba(255, 255, 255, 0.6)' };
  const textFieldSx = {
    '& .MuiInputBase-input': { color: 'white' },
    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
    '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.5)' },
    '& input::placeholder': { color: 'rgba(255, 255, 255, 0.4)', opacity: 1 },
  };
  const iconBtnSx = { color: 'rgba(255, 255, 255, 0.8)' };

  return (
    <Box sx={{ p: 1, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Video picker dropdown */}
      <Autocomplete
        freeSolo
        size="small"
        options={videoOptions}
        value={selectedOption}
        onChange={handleVideoSelect}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return option.title !== option.videoId ? option.title : option.videoId;
        }}
        renderOption={(props, option) => (
          <li {...props} key={option.videoId}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {option.title !== option.videoId ? option.title : option.videoId}
              </Typography>
              {option.title !== option.videoId && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {option.videoId}
                </Typography>
              )}
            </Box>
          </li>
        )}
        isOptionEqualToValue={(option, value) => option.videoId === value.videoId}
        filterOptions={(options, state) => {
          const input = state.inputValue.toLowerCase();
          return options.filter(o =>
            o.videoId.toLowerCase().includes(input) ||
            o.title.toLowerCase().includes(input)
          );
        }}
        onInputChange={(_event, newInputValue, reason) => {
          // When user types and blurs (or presses enter), treat as videoId selection
          if (reason === 'reset' || reason === 'clear') return;
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Video"
            placeholder="Select or enter video ID"
            sx={{
              ...textFieldSx,
              '& .MuiInputBase-root': { color: 'white' },
              '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.5)' },
            }}
          />
        )}
        sx={{
          '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255, 255, 255, 0.5)' },
          '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255, 255, 255, 0.5)' },
        }}
      />

      {/* Set In / Set Out controls */}
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleSetIn}
          sx={{ minWidth: 56, color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)', px: 1 }}
        >
          In
        </Button>
        <Typography variant="body2" sx={{ ...lightText, minWidth: 40, textAlign: 'center' }}>
          {clipInPoint !== null ? formatTime(clipInPoint) : '--:--'}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={handleSetOut}
          disabled={clipInPoint === null}
          sx={{ minWidth: 56, color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)', px: 1, '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)', borderColor: 'rgba(255, 255, 255, 0.15)' } }}
        >
          Out
        </Button>
        <Tooltip title="Optional: type an out time instead of using current position">
          <TextField
            size="small"
            placeholder="MM:SS"
            value={outPointInput}
            onChange={(e) => setOutPointInput(e.target.value)}
            sx={{ width: 70, ...textFieldSx, '& .MuiInputBase-input': { ...textFieldSx['& .MuiInputBase-input'], py: '4px', px: '8px', fontSize: '0.85rem' } }}
          />
        </Tooltip>
        <Typography variant="caption" sx={{ ...dimText, ml: 'auto', whiteSpace: 'nowrap' }}>
          {formatTime(currentVideoTime)} / {formatTime(videoDuration)}
        </Typography>
      </Box>

      {/* Import / Export / Clear */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleImport}
        />
        <Tooltip title="Import clips">
          <IconButton size="small" sx={iconBtnSx} onClick={() => fileInputRef.current?.click()}>
            <FileUploadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export clips">
          <span>
            <IconButton size="small" sx={iconBtnSx} onClick={handleExport} disabled={clips.length === 0}>
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Clear all clips">
          <span>
            <IconButton size="small" sx={iconBtnSx} onClick={clearClips} disabled={clips.length === 0}>
              <DeleteSweepIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Copy shareable link">
          <span>
            <IconButton size="small" sx={iconBtnSx} onClick={handleCopyShareLink} disabled={clips.length === 0}>
              <LinkIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {isClipModeActive && (
          <Typography variant="caption" sx={{ alignSelf: 'center', ml: 1, color: '#90caf9' }}>
            {clips.length} clip{clips.length !== 1 ? 's' : ''} defined
          </Typography>
        )}
      </Box>

      {/* Find Clips / Play Clips toggle */}
      {clips.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, py: 0.5 }}>
          <Button
            variant={isPlaybackMode ? 'outlined' : 'contained'}
            size="small"
            startIcon={<SearchIcon />}
            onClick={() => { if (isPlaybackMode) setIsPlaybackMode(false); }}
            sx={{
              flex: 1,
              color: isPlaybackMode ? 'rgba(255, 255, 255, 0.7)' : 'white',
              backgroundColor: isPlaybackMode ? 'transparent' : 'rgba(25, 118, 210, 0.3)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': { backgroundColor: isPlaybackMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(25, 118, 210, 0.4)' },
            }}
          >
            Find Clips
          </Button>
          <Button
            variant={isPlaybackMode ? 'contained' : 'outlined'}
            size="small"
            startIcon={<PlayCircleOutlineIcon />}
            onClick={handleTogglePlaybackMode}
            sx={{
              flex: 1,
              color: isPlaybackMode ? 'white' : 'rgba(255, 255, 255, 0.7)',
              backgroundColor: isPlaybackMode ? 'rgba(76, 175, 80, 0.3)' : 'transparent',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': { backgroundColor: isPlaybackMode ? 'rgba(76, 175, 80, 0.4)' : 'rgba(255, 255, 255, 0.08)' },
            }}
          >
            Play Clips
          </Button>
        </Box>
      )}

      {/* Clip List */}
      <List dense sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {clips.map((clip, index) => {
          const isCurrent = index === currentClipIndex;
          return (
            <ListItem
              key={clip.id}
              sx={{
                border: '1px solid',
                borderColor: isCurrent ? 'rgba(76, 175, 80, 0.6)' : 'rgba(255, 255, 255, 0.15)',
                borderLeft: isCurrent ? '3px solid rgba(76, 175, 80, 0.8)' : '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 1,
                mb: 0.5,
                flexDirection: 'column',
                alignItems: 'stretch',
                p: 0.75,
                backgroundColor: isCurrent ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
              }}
            >
              {editingClipId === clip.id ? (
                // Edit mode
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="Start"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    sx={{ flex: 1, minWidth: 55, ...textFieldSx }}
                  />
                  <TextField
                    size="small"
                    label="End"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    sx={{ flex: 1, minWidth: 55, ...textFieldSx }}
                  />
                  <IconButton size="small" sx={{ color: '#90caf9' }} onClick={() => handleSaveEdit(clip.id)}>
                    <CheckIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" sx={iconBtnSx} onClick={handleCancelEdit}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                // Display mode — two compact rows
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {/* Row 1: clip info + video title */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        flexShrink: 0,
                        cursor: 'pointer',
                        ...lightText,
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                      onClick={() => handleStartEdit(clip)}
                    >
                      <Typography component="span" sx={{ fontWeight: isCurrent ? 600 : 400, fontSize: 'inherit', color: 'inherit' }}>
                        #{index + 1}
                      </Typography>
                      {' '}{formatTime(clip.startTime)}-{formatTime(clip.endTime)}
                      <Typography component="span" variant="caption" sx={{ ml: 0.5, ...dimText }}>
                        ({formatTime(clip.endTime - clip.startTime)})
                      </Typography>
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textAlign: 'right',
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontSize: '0.7rem',
                      }}
                    >
                      {getVideoLabel(clip.videoId)}
                    </Typography>
                  </Box>

                  {/* Row 2: controls + video chip */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, ml: -0.5 }}>
                    <Tooltip title={clip.pauseAtEnd ? 'Pauses at end (click to continue)' : 'Continues to next (click to pause)'}>
                      <IconButton
                        size="small"
                        onClick={() => updateClip(clip.id, { pauseAtEnd: !clip.pauseAtEnd })}
                        sx={{
                          ...iconBtnSx,
                          fontSize: '0.65rem',
                          width: 28,
                          height: 28,
                          color: clip.pauseAtEnd ? 'rgba(255, 255, 255, 0.5)' : 'rgba(76, 175, 80, 0.8)',
                        }}
                      >
                        {clip.pauseAtEnd ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayArrowIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </Tooltip>

                    <Tooltip title={`Seek to ${formatTime(clip.startTime)}`}>
                      <IconButton size="small" sx={{ ...iconBtnSx, width: 28, height: 28 }} onClick={() => handleSeekToClip(clip)}>
                        <PlayCircleOutlineIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="More options">
                      <IconButton size="small" sx={{ ...iconBtnSx, width: 28, height: 28 }} onClick={(e) => setReorderMenuAnchor({ el: e.currentTarget, index })}>
                        <MoreVertIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete clip">
                      <IconButton size="small" sx={{ ...iconBtnSx, width: 28, height: 28 }} onClick={() => removeClip(clip.id)}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>

                  </Box>
                </Box>
              )}
            </ListItem>
          );
        })}
      </List>

      {clips.length === 0 && (
        <Typography variant="body2" sx={{ textAlign: 'center', py: 2, ...dimText }}>
          No clips defined. Use Set In / Set Out to create clips, or import a clip file.
        </Typography>
      )}

      {/* Reorder menu */}
      <Menu
        anchorEl={reorderMenuAnchor?.el}
        open={reorderMenuAnchor !== null}
        onClose={() => setReorderMenuAnchor(null)}
        PaperProps={{ sx: { bgcolor: '#1e1e1e', color: 'rgba(255,255,255,0.9)' } }}
      >
        <MenuItem
          disabled={reorderMenuAnchor?.index === 0}
          onClick={() => {
            if (reorderMenuAnchor) reorderClips(reorderMenuAnchor.index, reorderMenuAnchor.index - 1);
            setReorderMenuAnchor(null);
          }}
          sx={{ gap: 1, fontSize: '0.875rem' }}
        >
          <ArrowUpwardIcon fontSize="small" /> Move up
        </MenuItem>
        <MenuItem
          disabled={reorderMenuAnchor?.index === clips.length - 1}
          onClick={() => {
            if (reorderMenuAnchor) reorderClips(reorderMenuAnchor.index, reorderMenuAnchor.index + 1);
            setReorderMenuAnchor(null);
          }}
          sx={{ gap: 1, fontSize: '0.875rem' }}
        >
          <ArrowDownwardIcon fontSize="small" /> Move down
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar !== null}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default ClipEditor;
