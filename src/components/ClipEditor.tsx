import React, { useState, useRef } from 'react';
import {
  Box, Button, IconButton, List, ListItem, Typography, TextField,
  Tooltip, Switch, FormControlLabel, Alert, Snackbar, Menu, MenuItem
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
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import { useClipPlaylist } from '../contexts/ClipPlaylistContext';
import { VideoClip } from '../types/clipPlaylist';

interface ClipEditorProps {
  currentVideoTime: number;
  videoId: string;
  videoDuration: number;
  onSeekToTime?: (time: number) => void;
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

const ClipEditor: React.FC<ClipEditorProps> = ({ currentVideoTime, videoId, videoDuration, onSeekToTime }) => {
  const {
    clips, clipInPoint, isClipModeActive, isPlaybackMode,
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

    // Check for overlaps with existing clips
    const overlaps = clips.some(c =>
      (inTime < c.endTime && outTime > c.startTime)
    );
    if (overlaps) {
      setSnackbar({ message: 'Clip overlaps with an existing clip', severity: 'error' });
      return;
    }

    const newClip: VideoClip = {
      id: generateId(),
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

    // Check for overlaps (excluding this clip)
    const overlaps = clips.some(c =>
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
    const json = exportClips(videoId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clips-${videoId}.json`;
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
      // Entering Play Clips mode: seek to first clip start
      if (onSeekToTime) {
        onSeekToTime(clips[0].startTime);
      }
      setCurrentClipIndex(0);
      setIsPlaybackMode(true);
    } else {
      // Entering Find Clips mode: keep current position
      setIsPlaybackMode(false);
    }
  };

  const handleCopyShareLink = () => {
    // Compact format: start.end (pause default) or start.end.0 (continue)
    const clipsParam = clips.map(c => {
      const s = Math.round(c.startTime);
      const e = Math.round(c.endTime);
      return c.pauseAtEnd ? `${s}.${e}` : `${s}.${e}.0`;
    }).join(',');
    const url = new URL(window.location.href.split('?')[0]);
    url.searchParams.set('v', videoId);
    url.searchParams.set('c', clipsParam);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setSnackbar({ message: 'Share link copied to clipboard', severity: 'success' });
    }).catch(() => {
      // Fallback: show the URL in a prompt
      window.prompt('Copy this link:', url.toString());
    });
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
      <List dense sx={{ flex: 1, overflow: 'auto' }}>
        {clips.map((clip, index) => (
          <ListItem
            key={clip.id}
            sx={{
              border: '1px solid',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 1,
              mb: 0.5,
              flexDirection: 'column',
              alignItems: 'stretch',
              p: 1,
            }}
          >
            {editingClipId === clip.id ? (
              // Edit mode
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="Start"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    sx={{ flex: 1, minWidth: 70, ...textFieldSx }}
                  />
                  <TextField
                    size="small"
                    label="End"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    sx={{ flex: 1, minWidth: 70, ...textFieldSx }}
                  />
                  <Tooltip title="Save">
                    <IconButton size="small" sx={{ color: '#90caf9' }} onClick={() => handleSaveEdit(clip.id)}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancel">
                    <IconButton size="small" sx={iconBtnSx} onClick={handleCancelEdit}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ) : (
              // Display mode
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{ flex: 1, cursor: 'pointer', ...lightText, '&:hover': { textDecoration: 'underline' } }}
                  onClick={() => handleStartEdit(clip)}
                >
                  #{index + 1}: {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                  <Typography component="span" variant="caption" sx={{ ml: 1, ...dimText }}>
                    ({formatTime(clip.endTime - clip.startTime)})
                  </Typography>
                </Typography>

                <Tooltip title={clip.pauseAtEnd ? 'Pauses at end' : 'Continues to next'}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={!clip.pauseAtEnd}
                        onChange={(e) => updateClip(clip.id, { pauseAtEnd: !e.target.checked })}
                      />
                    }
                    label={
                      <Typography variant="caption" sx={lightText}>
                        {clip.pauseAtEnd ? 'Pause' : 'Continue'}
                      </Typography>
                    }
                    sx={{ mr: 0 }}
                  />
                </Tooltip>

                {onSeekToTime && (
                  <Tooltip title={`Seek to ${formatTime(clip.startTime)}`}>
                    <IconButton
                      size="small"
                      sx={iconBtnSx}
                      onClick={() => onSeekToTime(clip.startTime)}
                    >
                      <PlayCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                <Tooltip title="More options">
                  <IconButton
                    size="small"
                    sx={iconBtnSx}
                    onClick={(e) => setReorderMenuAnchor({ el: e.currentTarget, index })}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete clip">
                  <IconButton size="small" sx={iconBtnSx} onClick={() => removeClip(clip.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </ListItem>
        ))}
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
