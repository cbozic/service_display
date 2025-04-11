import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useYouTube } from '../contexts/YouTubeContext';
import { FADE_STEPS } from '../App';
import BackgroundPlayerControls from './BackgroundPlayerControls';
import * as mm from 'music-metadata';

interface BackgroundMusicPlayerProps {
  volume?: number;
  initialPaused?: boolean;
}

interface Track {
  path: string;
  filename: string;
  title?: string;
  artist?: string;
  album?: string;
}

const BackgroundMusicPlayer: React.FC<BackgroundMusicPlayerProps> = ({
  volume: propVolume,
  initialPaused = false
}): JSX.Element | null => {
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayVolume, setDisplayVolume] = useState<number>(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [trackMetadata, setTrackMetadata] = useState<{
    title?: string;
    artist?: string;
    album?: string;
  }>({});
  
  const { mainPlayersReady, isMainPlayerPlaying, backgroundPlayerRef, backgroundVolume, setBackgroundVolume, backgroundMuted, setBackgroundMuted, isManualVolumeChange, setManualVolumeChange } = useYouTube();
  
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialVolumeSetRef = useRef<boolean>(false);
  const previousVolumeRef = useRef<number>(backgroundVolume);
  const [hasInitialized, setHasInitialized] = useState(false);
  const effectiveVolumeRef = useRef<number>(backgroundVolume);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load list of tracks from the instrumental folder
  useEffect(() => {
    const loadTracks = async () => {
      try {
        // These are the paths to the m4a files in the public folder
        const trackPaths = [
          '01-APromiseRevealed-mono.m4a',
          '02-StillSmallVoice-mono.m4a',
          '03-TheMirror-mono.m4a',
          '04-VoiceInTheWilderness-mono.m4a',
          '05-EvenIf-mono.m4a',
          '06-HopeDeferred-mono.m4a',
          '07-APromiseFulfilled-mono.m4a'
        ];
        
        const instrumentalFolder = `${process.env.PUBLIC_URL || ''}/default_content/music/instrumental/`;
        console.log('[BackgroundMusicPlayer] Loading tracks from folder:', instrumentalFolder);
        
        const tracksList = trackPaths.map(filename => ({
          path: `${instrumentalFolder}${filename}`,
          filename: filename
        }));
        
        // Log the full paths to verify they're correct
        console.log('[BackgroundMusicPlayer] Track paths:', tracksList.map(t => t.path));
        
        setTracks(tracksList);
        
        if (tracksList.length > 0) {
          setCurrentTrack(tracksList[0]);
        }
      } catch (error) {
        console.error('[BackgroundMusicPlayer] Error loading tracks:', error);
      }
    };
    
    loadTracks();
  }, []);

  // Custom version of fadeToVolume that updates display volume during transition
  const fadeToVolumeWithDisplay = useCallback((targetVolume: number, durationInSeconds: number, onComplete?: () => void) => {
    if (!audioElement) return () => {};
    
    // Clear any existing fade interval
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    
    try {
      // Get current volume from audio element
      const startVolume = audioElement.volume * 100;
      setDisplayVolume(startVolume);
      
      if (startVolume === targetVolume) {
        if (onComplete) onComplete();
        return () => {};
      }
      
      const steps = FADE_STEPS;
      const stepDuration = (durationInSeconds * 1000) / steps;
      let currentStep = 0;
      
      fadeIntervalRef.current = setInterval(() => {
        if (!audioElement) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          return;
        }
        
        currentStep++;
        const progress = currentStep / steps;
        const newVolume = Math.round(startVolume + (targetVolume - startVolume) * progress);
        
        try {
          audioElement.volume = newVolume / 100;
          setDisplayVolume(newVolume);
          
          if (currentStep >= steps) {
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
            if (onComplete) onComplete();
          }
        } catch (error) {
          console.error('[BackgroundMusicPlayer] Error in fade interval:', error);
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        }
      }, stepDuration);
      
      // Return cleanup function
      return () => {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      };
    } catch (error) {
      console.error('[BackgroundMusicPlayer] Error starting volume fade:', error);
      return () => {};
    }
  }, [audioElement]);

  // Add effect to update volume when initialVolume changes - but only once on initial mount
  useEffect(() => {
    // Only set the initial volume if it hasn't been set before
    if (!initialVolumeSetRef.current && audioElement && isPlayerReady) {
      const initialVolume = propVolume !== undefined ? propVolume : backgroundVolume;
      console.log('[BackgroundMusicPlayer] Setting initial volume:', initialVolume);
      
      try {
        audioElement.volume = initialVolume / 100;
        setDisplayVolume(initialVolume);
        // Only update context if we're using the prop volume
        if (propVolume !== undefined && propVolume !== backgroundVolume) {
          setBackgroundVolume(initialVolume);
        }
        previousVolumeRef.current = initialVolume;
        effectiveVolumeRef.current = initialVolume;
        initialVolumeSetRef.current = true;
      } catch (error) {
        console.error('[BackgroundMusicPlayer] Error setting initial volume:', error);
      }
    }
  }, [audioElement, isPlayerReady, propVolume, backgroundVolume, setBackgroundVolume]);

  // Add effect to handle backgroundVolume changes from context
  useEffect(() => {
    console.log('[BackgroundMusicPlayer] Context volume changed:', backgroundVolume, 'Player ready:', isPlayerReady);
    if (audioElement && isPlayerReady) {
      try {
        console.log('[BackgroundMusicPlayer] Actually setting player volume to:', backgroundVolume);
        
        // Only directly set volume if we're not in a fade transition
        if (!fadeIntervalRef.current) {
          audioElement.volume = backgroundVolume / 100;
          setDisplayVolume(backgroundVolume);
          effectiveVolumeRef.current = backgroundVolume;
        }
      } catch (error) {
        console.error('[BackgroundMusicPlayer] Error setting volume from context:', error);
      }
    }
  }, [backgroundVolume, audioElement, isPlayerReady]);

  // Add effect to handle backgroundMuted changes from context
  useEffect(() => {
    if (audioElement && isPlayerReady) {
      try {
        console.log('[BackgroundMusicPlayer] Context muted state changed:', backgroundMuted);
        audioElement.muted = backgroundMuted;
        if (backgroundMuted) {
          setDisplayVolume(0);
        } else {
          setDisplayVolume(backgroundVolume);
        }
        setIsMuted(backgroundMuted);
      } catch (error) {
        console.error('[BackgroundMusicPlayer] Error setting mute state from context:', error);
      }
    }
  }, [backgroundMuted, audioElement, isPlayerReady, backgroundVolume]);

  // Effect to handle main video playing/paused state changes
  useEffect(() => {
    if (!audioElement || !isPlayerReady || !isPlaying) return;
    
    console.log('[BackgroundMusicPlayer] Main player state changed. Main is playing:', isMainPlayerPlaying);
    
    // Skip fade if this is a manual volume change from the slider
    if (isManualVolumeChange.current) {
      isManualVolumeChange.current = false;
      return;
    }

    try {
      if (isMainPlayerPlaying) {
        // Main video is playing, fade out background music
        console.log('[BackgroundMusicPlayer] Main video is playing, fading out background to 0');
        fadeToVolumeWithDisplay(0, 2);
      } else {
        // Main video is paused, fade in background music
        console.log('[BackgroundMusicPlayer] Main video is paused, fading in background to', backgroundVolume);
        fadeToVolumeWithDisplay(backgroundVolume, 1);
      }
    } catch (error) {
      console.error('[BackgroundMusicPlayer] Error in main player state effect:', error);
    }
  }, [isMainPlayerPlaying, audioElement, isPlayerReady, backgroundVolume, isPlaying, isManualVolumeChange, fadeToVolumeWithDisplay]);

  const handleVolumeChange = useCallback((_event: Event, newValue: number | number[]) => {
    const volumeValue = Array.isArray(newValue) ? newValue[0] : newValue;
    setBackgroundVolume(volumeValue);
    previousVolumeRef.current = volumeValue;
    effectiveVolumeRef.current = volumeValue;
    setDisplayVolume(volumeValue);
    
    // Set flag to indicate this is a manual volume change via the slider
    setManualVolumeChange(true);
    
    if (audioElement) {
      try {
        // If we're adjusting volume from 0, unmute
        if (isMuted && volumeValue > 0) {
          setBackgroundMuted(false);
          audioElement.muted = false;
          audioElement.volume = volumeValue / 100;
        } 
        // If we're setting volume to 0, mute but don't pause
        else if (volumeValue === 0) {
          setBackgroundMuted(true);
          audioElement.muted = true;
        }
        // Normal volume adjustment
        else if (!isMuted) {
          audioElement.volume = volumeValue / 100;
        }
      } catch (error) {
        console.error('[BackgroundMusicPlayer] Error adjusting volume:', error);
      }
    }
  }, [audioElement, isMuted, setBackgroundVolume, setBackgroundMuted, setManualVolumeChange]);

  const handlePlayPauseToggle = useCallback(() => {
    if (audioElement) {
      try {
        if (isPlaying) {
          audioElement.pause();
          setIsPlaying(false);
        } else {
          audioElement.play().catch(error => {
            console.error('[BackgroundMusicPlayer] Error playing audio:', error);
          });
          setIsPlaying(true);
          
          // If main video is playing, keep background volume at 0
          if (isMainPlayerPlaying) {
            audioElement.volume = 0;
            setDisplayVolume(0);
          } else {
            // If main video is paused, set to regular volume
            const volume = effectiveVolumeRef.current;
            audioElement.volume = volume / 100;
            setDisplayVolume(volume);
          }
        }
      } catch (error) {
        console.error('[BackgroundMusicPlayer] Error toggling play/pause:', error);
      }
    }
  }, [audioElement, isPlaying, isMainPlayerPlaying]);

  const handleSkipNext = useCallback(() => {
    if (tracks.length === 0) return;
    
    // Generate random index excluding current track
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * tracks.length);
    } while (randomIndex === currentTrackIndex && tracks.length > 1);
    
    setCurrentTrackIndex(randomIndex);
    setCurrentTrack(tracks[randomIndex]);
  }, [tracks, currentTrackIndex]);

  // Initialize audio element
  useEffect(() => {
    if (!audioElement) {
      console.log('[BackgroundMusicPlayer] Creating new audio element');
      
      // Create new audio element with direct playback approach
      const audio = new Audio();
      
      // Important: Set crossOrigin to anonymous to avoid CORS issues
      audio.crossOrigin = "anonymous";
      
      // Add error logging with detailed information
      audio.addEventListener('error', (e) => {
        console.error('[BackgroundMusicPlayer] Audio error:', e);
        const error = e.target as HTMLAudioElement;
        console.error('[BackgroundMusicPlayer] Error code:', error.error ? error.error.code : 'unknown');
        console.error('[BackgroundMusicPlayer] Error message:', error.error ? error.error.message : 'unknown');
        console.error('[BackgroundMusicPlayer] Current src:', audio.src);
      });
      
      // Set up proper event handling with complete logging
      audio.addEventListener('loadstart', () => console.log('[BackgroundMusicPlayer] Audio loadstart event'));
      audio.addEventListener('loadedmetadata', () => console.log('[BackgroundMusicPlayer] Audio loadedmetadata event'));
      audio.addEventListener('loadeddata', () => console.log('[BackgroundMusicPlayer] Audio loadeddata event'));
      
      audio.addEventListener('canplaythrough', () => {
        console.log('[BackgroundMusicPlayer] Audio canplaythrough - ready to play');
        setIsPlayerReady(true);
      });
      
      audio.addEventListener('playing', () => {
        console.log('[BackgroundMusicPlayer] Audio playing event fired');
      });
      
      audio.addEventListener('ended', () => {
        console.log('[BackgroundMusicPlayer] Track ended');
        handleSkipNext(); // Auto play next track
      });
      
      audio.addEventListener('play', () => {
        console.log('[BackgroundMusicPlayer] Audio play event fired');
        setIsPlaying(true);
      });
      
      audio.addEventListener('pause', () => {
        console.log('[BackgroundMusicPlayer] Audio paused');
        setIsPlaying(false);
      });
      
      // Very important: Set initial volume to something audible
      audio.volume = 0.5; 
      audio.muted = false;
      
      // Store player reference in context for external control
      if (backgroundPlayerRef) {
        backgroundPlayerRef.current = {
          playVideo: () => {
            console.log('[BackgroundMusicPlayer] External play requested');
            return audio.play().catch(error => {
              console.error('[BackgroundMusicPlayer] Error in external play request:', error);
            });
          },
          pauseVideo: () => {
            console.log('[BackgroundMusicPlayer] External pause requested');
            audio.pause();
          },
          mute: () => { 
            console.log('[BackgroundMusicPlayer] External mute requested');
            audio.muted = true; 
          },
          unMute: () => { 
            console.log('[BackgroundMusicPlayer] External unmute requested');
            audio.muted = false; 
          },
          setVolume: (vol: number) => { 
            console.log('[BackgroundMusicPlayer] External volume change requested:', vol);
            audio.volume = vol / 100; 
          },
          getVolume: () => Math.round(audio.volume * 100),
          nextVideo: () => {
            console.log('[BackgroundMusicPlayer] External next track requested');
            handleSkipNext();
          },
          getPlaylist: () => tracks,
          getPlaylistIndex: () => currentTrackIndex,
          playVideoAt: (index: number) => {
            if (index >= 0 && index < tracks.length) {
              console.log('[BackgroundMusicPlayer] External track selection requested:', index);
              setCurrentTrackIndex(index);
              setCurrentTrack(tracks[index]);
            }
          }
        };
      }
      
      setAudioElement(audio);
    }
  }, [handleSkipNext, tracks, currentTrackIndex, backgroundPlayerRef]);

  // Load track when currentTrack changes
  useEffect(() => {
    const loadTrackMetadata = async () => {
      if (!currentTrack || !audioElement) return;
      
      try {
        audioElement.src = currentTrack.path;
        audioElement.load();
        
        // Reset metadata while loading
        setTrackMetadata({
          title: currentTrack.filename.replace(/-mono\.m4a$/, ''),
          artist: 'Loading...',
          album: 'Loading...'
        });
        
        try {
          // Fetch the file and extract metadata
          const response = await fetch(currentTrack.path);
          const buffer = await response.arrayBuffer();
          
          // Parse metadata
          const metadata = await mm.parseBuffer(
            new Uint8Array(buffer),
            { mimeType: 'audio/mp4' }
          );
          
          // Extract metadata fields
          const title = metadata.common.title || currentTrack.filename.replace(/-mono\.m4a$/, '');
          const artist = metadata.common.artist || 'Unknown Artist';
          const album = metadata.common.album || 'Unknown Album';
          
          setTrackMetadata({ title, artist, album });
        } catch (error) {
          console.error('[BackgroundMusicPlayer] Error loading metadata:', error);
          // Use filename as fallback
          setTrackMetadata({
            title: currentTrack.filename.replace(/-mono\.m4a$/, '').replace(/^\d+-/, ''),
            artist: 'Unknown Artist',
            album: 'Unknown Album'
          });
        }
        
        // Auto-play when track changes if we were already playing
        if (isPlaying) {
          audioElement.play().catch(error => {
            console.error('[BackgroundMusicPlayer] Error auto-playing next track:', error);
          });
        }
      } catch (error) {
        console.error('[BackgroundMusicPlayer] Error loading track:', error);
      }
    };
    
    loadTrackMetadata();
  }, [currentTrack, audioElement, isPlaying]);

  // Auto-play first track when component loads (unless initialPaused is true)
  useEffect(() => {
    const autoPlayFirstTrack = async () => {
      if (audioElement && isPlayerReady && tracks.length > 0 && !hasInitialized) {
        try {
          console.log('[BackgroundMusicPlayer] Initializing first track (initialPaused:', initialPaused, ')');
          setHasInitialized(true);
          
          // Initialize with the first track
          const firstTrack = tracks[0];
          setCurrentTrack(firstTrack);
          setCurrentTrackIndex(0);
          
          // Set initial volume based on context
          const volumeToUse = backgroundVolume || 50;  // Use 50 as default if backgroundVolume is 0
          console.log('[BackgroundMusicPlayer] Setting initial volume to:', volumeToUse);
          
          audioElement.volume = volumeToUse / 100;
          effectiveVolumeRef.current = volumeToUse;
          
          // Start unmuted to ensure audio playback
          audioElement.muted = false;
          setIsMuted(false);
          
          // Set display volume
          setDisplayVolume(volumeToUse);
          
          // Start playback only if initialPaused is false
          if (!initialPaused) {
            try {
              await audioElement.play();
              console.log('[BackgroundMusicPlayer] Auto-play successful');
              setIsPlaying(true);
              
              // Apply context mute setting after playback has started
              if (backgroundMuted) {
                audioElement.muted = true;
                setIsMuted(true);
                setDisplayVolume(0);
              }
            } catch (error) {
              console.error('[BackgroundMusicPlayer] Error starting auto-play (user may need to interact first):', error);
            }
          } else {
            console.log('[BackgroundMusicPlayer] Not auto-playing because initialPaused is true');
            setIsPlaying(false);
          }
        } catch (error) {
          console.error('[BackgroundMusicPlayer] Error in autoPlayFirstTrack:', error);
        }
      }
    };
    
    autoPlayFirstTrack();
  }, [audioElement, isPlayerReady, tracks, hasInitialized, backgroundVolume, backgroundMuted, initialPaused]);

  // Define the wave animation for the visualizer with even shorter bars
  const waveAnimation = useCallback((index: number) => {
    const delays = [0, 0.2, 0.4, 0.1, 0.3, 0.5, 0.2, 0.4];
    const delay = delays[index % delays.length];
    
    return {
      display: 'inline-block',
      width: '6px',
      height: '30px', // Further reduced height
      margin: '0 2px',
      backgroundColor: '#8884d8',
      animation: isPlaying 
        ? `waveAnimation 1s ease-in-out infinite ${delay}s` 
        : 'none',
      borderRadius: '2px'
    };
  }, [isPlaying]);

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#282c34',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden' // Prevent scroll bars
    }}>
      <Box sx={{ 
        width: '100%',
        maxWidth: '500px', // Reduced from 600px
        display: 'flex',
        flexDirection: 'column',
        gap: 1, // Reduced gap from 2
        alignItems: 'center',
        padding: { xs: 1, sm: 2 } // Responsive padding
      }}>
        <BackgroundPlayerControls 
          volume={backgroundVolume}
          displayVolume={displayVolume}
          isPlaying={isPlaying}
          onPlayPauseToggle={handlePlayPauseToggle}
          onVolumeChange={handleVolumeChange}
          onSkipNext={handleSkipNext}
        />
        
        <Box sx={{ 
          width: '100%',
          backgroundColor: '#1e1e1e',
          borderRadius: 1,
          padding: 1.5, // Reduced padding from 2
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          '@keyframes waveAnimation': {
            '0%': {
              transform: 'scaleY(0.1)'
            },
            '50%': {
              transform: 'scaleY(0.7)'
            },
            '100%': {
              transform: 'scaleY(0.1)'
            }
          }
        }}>
          {/* Track Information */}
          <Box sx={{
            textAlign: 'center',
            mb: 0.5 // Reduced margin
          }}>
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'bold', marginBottom: 0.5, fontSize: '0.95rem' }}>
              {trackMetadata.title || 'No Track Selected'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#aaa', marginBottom: 0, fontSize: '0.8rem' }}>
              {trackMetadata.artist || 'Unknown Artist'} • {trackMetadata.album || 'Unknown Album'}
            </Typography>
          </Box>
          
          {/* Simple Audio Visualization using CSS Animation */}
          <Box sx={{ 
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '45px', // Reduced from 60px
            marginTop: 0.5 // Reduced margin
          }}>
            {Array.from({ length: 8 }).map((_, index) => ( // Reduced number of bars from 10 to 8
              <Box key={index} sx={waveAnimation(index)} />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default BackgroundMusicPlayer;