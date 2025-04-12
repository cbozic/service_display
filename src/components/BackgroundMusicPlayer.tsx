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
  const [isUserPaused, setIsUserPaused] = useState(initialPaused); // Track if user manually paused playback
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
        console.log('[BackgroundMusicPlayer] Creating playlist with', tracksList.length, 'tracks');
        
        // Shuffle the tracks to create a varied playlist experience
        const shuffledTracks = [...tracksList].sort(() => Math.random() - 0.5);
        setTracks(shuffledTracks);
        
        if (shuffledTracks.length > 0) {
          // Select first track from shuffled list
          setCurrentTrack(shuffledTracks[0]);
          setCurrentTrackIndex(0);
          console.log('[BackgroundMusicPlayer] Initial track set to:', shuffledTracks[0].filename);
          
          // Also update track info in backgroundPlayerRef right away for immediate access
          if (backgroundPlayerRef && backgroundPlayerRef.current) {
            backgroundPlayerRef.current._internalTracks = shuffledTracks;
            console.log('[BackgroundMusicPlayer] Updated internal tracks reference in player');
          }
        }
      } catch (error) {
        console.error('[BackgroundMusicPlayer] Error loading tracks:', error);
      }
    };
    
    loadTracks();
  }, [backgroundPlayerRef]);

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
      
      // Ensure target volume is at least 0.1
      const minVolume = 0.1;
      const safeTargetVolume = Math.max(targetVolume, minVolume);
      
      if (startVolume === safeTargetVolume) {
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
        const newVolume = Math.round(startVolume + (safeTargetVolume - startVolume) * progress);
        
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

  // Track if a song is auto-transitioning from one to the next
  const autoTransitionRef = useRef<boolean>(false);
  // Ref to track if audio is currently in a continuous playback state
  const continuousPlaybackRef = useRef<boolean>(false);
  // Ref to store timeout for next track switch
  const trackSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track if pause was manually triggered by user vs system
  const isManualPauseRef = useRef<boolean>(false);
  // Track monitoring interval
  const trackMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to handle main video playing/paused state changes
  useEffect(() => {
    if (!audioElement || !isPlayerReady) return;
    
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
        console.log('[BackgroundMusicPlayer] Main video is paused, checking audio player state');
        
        // Check if the background player should be playing (according to React state)
        // but isn't actually playing (the audio element is paused)
        if (isPlaying) {
          try {
            // Check if the audio is actually playing
            const isActuallyPlaying = !audioElement.paused;
            
            if (!isActuallyPlaying) {
              console.log('[BackgroundMusicPlayer] State mismatch detected - React state shows playing but audio element is paused');
              console.log('[BackgroundMusicPlayer] Ensuring background music is playing before fade in');
              
              // Start playing the audio before fading in
              const playPromise = audioElement.play();
              
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    console.log('[BackgroundMusicPlayer] Successfully resumed audio playback');
                    
                    // Short delay to allow audio to start before beginning fade
                    setTimeout(() => {
                      console.log('[BackgroundMusicPlayer] Now fading in background to', backgroundVolume);
                      fadeToVolumeWithDisplay(backgroundVolume, 1);
                    }, 100);
                  })
                  .catch(error => {
                    console.error('[BackgroundMusicPlayer] Error resuming audio playback:', error);
                    // Still attempt to fade in even if play failed
                    fadeToVolumeWithDisplay(backgroundVolume, 1);
                  });
                return; // Exit early since we're handling the fade in the promise
              }
            }
          } catch (stateError) {
            console.error('[BackgroundMusicPlayer] Error checking audio element state:', stateError);
          }
        }
        
        // If no state mismatch or we couldn't check, proceed with normal fade in
        console.log('[BackgroundMusicPlayer] Fading in background to', backgroundVolume);
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
          // User manually paused - set the flag
          isManualPauseRef.current = true;
          setIsUserPaused(true);
          audioElement.pause();
          setIsPlaying(false);
        } else {
          // User manually played - clear the flag
          isManualPauseRef.current = false;
          setIsUserPaused(false);
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

  const handleSkipNext = useCallback((useSequential = false) => {
    if (tracks.length === 0) {
      console.log('[BackgroundMusicPlayer] No tracks available to skip to');
      return;
    }
    
    // Determine the next track index based on playback mode
    let nextIndex;
    if (useSequential) {
      // Sequential playback - go to next track in order
      nextIndex = (currentTrackIndex + 1) % tracks.length;
      console.log('[BackgroundMusicPlayer] Sequential playback - going to next track in order');
    } else {
      // Random playback - pick a random track excluding the current one
      do {
        nextIndex = Math.floor(Math.random() * tracks.length);
      } while (nextIndex === currentTrackIndex && tracks.length > 1);
      console.log('[BackgroundMusicPlayer] Random playback - selecting random track');
    }
    
    console.log('[BackgroundMusicPlayer] Skipping to new track - current:', currentTrackIndex, 'new:', nextIndex, 'track:', tracks[nextIndex]?.filename);
    
    // Get the next track
    const nextTrack = tracks[nextIndex];
    
    // Update the state
    setCurrentTrackIndex(nextIndex);
    setCurrentTrack(nextTrack);
    
    // Store the index in backgroundPlayerRef for persistence across component re-renders
    if (backgroundPlayerRef && backgroundPlayerRef.current) {
      backgroundPlayerRef.current._currentTrackIndex = nextIndex;
    }
    
    // Directly update the audio element for immediate effect
    if (audioElement && nextTrack) {
      try {
        // Save the current playing state
        const wasPlaying = !audioElement.paused;
        
        // Set the new source
        audioElement.src = nextTrack.path;
        console.log('[BackgroundMusicPlayer] Set new audio source:', nextTrack.path);
        
        // Load the new track
        audioElement.load();
        console.log('[BackgroundMusicPlayer] Loading new track');
        
        // Reset metadata while loading
        setTrackMetadata({
          title: nextTrack.filename.replace(/-mono\.m4a$/, ''),
          artist: 'Loading...',
          album: 'Loading...'
        });
        
        // If we were playing before, play the new track
        if (wasPlaying) {
          console.log('[BackgroundMusicPlayer] Auto-playing new track');
          
          // Use a promise to handle playback
          const playPromise = audioElement.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('[BackgroundMusicPlayer] New track playback started successfully');
                setIsPlaying(true);
                
                // Apply volume settings based on main player state
                if (isMainPlayerPlaying) {
                  audioElement.volume = 0;
                  setDisplayVolume(0);
                } else {
                  const volume = effectiveVolumeRef.current;
                  audioElement.volume = volume / 100;
                  setDisplayVolume(volume);
                }
                
                // Apply mute setting
                audioElement.muted = backgroundMuted;
              })
              .catch(error => {
                console.error('[BackgroundMusicPlayer] Error playing new track:', error);
              });
          }
        }
      } catch (error) {
        console.error('[BackgroundMusicPlayer] Error in direct track change:', error);
      }
    }
  }, [
    tracks, 
    currentTrackIndex, 
    audioElement, 
    isMainPlayerPlaying, 
    effectiveVolumeRef, 
    backgroundMuted
  ]);

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
        
        // Check if the audio should automatically play (either from auto-transition or not user-paused)
        if (!isUserPaused || autoTransitionRef.current) {
          console.log('[BackgroundMusicPlayer] Auto-play condition met: isUserPaused=', isUserPaused, 'autoTransition=', autoTransitionRef.current);
          
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('[BackgroundMusicPlayer] Auto-play successful in canplaythrough handler');
                setIsPlaying(true);
                autoTransitionRef.current = false; // Reset the auto-transition flag
              })
              .catch(error => {
                console.error('[BackgroundMusicPlayer] Auto-play failed in canplaythrough handler:', error);
                
                // Try once more with a short delay
                setTimeout(() => {
                  console.log('[BackgroundMusicPlayer] Retry auto-play with delay');
                  audio.play()
                    .then(() => {
                      console.log('[BackgroundMusicPlayer] Delayed auto-play successful');
                      setIsPlaying(true);
                    })
                    .catch(retryError => {
                      console.error('[BackgroundMusicPlayer] Retry auto-play failed:', retryError);
                      autoTransitionRef.current = false; // Reset flag even if playback fails
                    });
                }, 200);
              });
          }
        } else {
          console.log('[BackgroundMusicPlayer] Not auto-playing: user has manually paused playback');
        }
      });
      
      audio.addEventListener('playing', () => {
        console.log('[BackgroundMusicPlayer] Audio playing event fired');
      });
      
      audio.addEventListener('ended', () => {
        console.log('[BackgroundMusicPlayer] Track ended, implementing continuous playback');
        
        // Set our transition flag
        autoTransitionRef.current = true;
        
        // Cancel any existing timeout to avoid multiple calls
        if (trackSwitchTimeoutRef.current) {
          clearTimeout(trackSwitchTimeoutRef.current);
          trackSwitchTimeoutRef.current = null;
        }

        // Loop the current track once more to maintain audio context
        audio.currentTime = 0;
        
        // Ensure we're playing to keep audio context active
        if (audio.paused) {
          const playPromise = audio.play().catch(err => {
            console.error('[BackgroundMusicPlayer] Error continuing playback:', err);
          });
        }
        
        // Then switch to the next track after a short delay
        // This keeps the audio context active while changing tracks
        trackSwitchTimeoutRef.current = setTimeout(() => {
          console.log('[BackgroundMusicPlayer] Switching to next track after delay');
          handleSkipNext();
          trackSwitchTimeoutRef.current = null;
        }, 500);
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
          // Store a default track list to use if tracks state is empty
          _internalTracks: [],
          
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
            
            // Store and use a persistent track index
            let persistentCurrentIndex = 0;
            try {
              // Try to get the persisted index from backgroundPlayerRef
              if (backgroundPlayerRef?.current?._currentTrackIndex !== undefined) {
                persistentCurrentIndex = backgroundPlayerRef.current._currentTrackIndex;
              } else if (currentTrackIndex >= 0) {
                persistentCurrentIndex = currentTrackIndex;
              }
              console.log('[BackgroundMusicPlayer] Retrieved persistent track index:', persistentCurrentIndex);
            } catch (error) {
              console.error('[BackgroundMusicPlayer] Error retrieving persistent index:', error);
            }
            
            // Check if we have tracks available
            if (tracks.length === 0) {
              console.log('[BackgroundMusicPlayer] No tracks in state, checking internal backup tracks');
              
              // Check if we have internal tracks
              const internalTracks = backgroundPlayerRef.current._internalTracks;
              if (internalTracks && internalTracks.length > 0) {
                console.log('[BackgroundMusicPlayer] Using internal tracks list with', internalTracks.length, 'tracks');
                
                // Set tracks from internal backup if they're missing
                setTracks(internalTracks);
                
                // Determine next track index - FIXED: using modulo to properly cycle through tracks
                // Get the current index and make sure it's valid
                const validCurrentIndex = (persistentCurrentIndex >= 0 && persistentCurrentIndex < internalTracks.length) 
                  ? persistentCurrentIndex 
                  : 0;
                  
                // Always move to the next track in sequence, with wraparound using modulo
                const nextIndex = (validCurrentIndex + 1) % internalTracks.length;
                
                console.log(`[BackgroundMusicPlayer] Current track index: ${validCurrentIndex}, Next track index: ${nextIndex}, Total tracks: ${internalTracks.length}`);
                
                // Store the next index in a persistent place
                backgroundPlayerRef.current._currentTrackIndex = nextIndex;
                
                // Load the new track
                const nextTrack = internalTracks[nextIndex];
                console.log('[BackgroundMusicPlayer] Skipping to track:', nextTrack.filename);
                
                // Update state
                setCurrentTrackIndex(nextIndex);
                setCurrentTrack(nextTrack);
                
                // Directly update the audio element for immediate effect
                if (audio && nextTrack) {
                  try {
                    // Remember if we were playing before
                    const wasPlaying = !audio.paused;
                    console.log('[BackgroundMusicPlayer] Audio was playing before skip:', wasPlaying);
                    
                    // Track if we're within a user gesture context
                    // We need to determine if this call is happening in response to a user interaction
                    const isUserGesture = (function() {
                      try {
                        // Check for user gesture using alternative methods
                        // @ts-ignore - Feature detection, not all browsers have this property
                        const hasViewTransition = 'startViewTransition' in document;
                        
                        // Additional check - in most browsers, MediaElement.play() will only work in response to user gestures
                        const now = Date.now();
                        // @ts-ignore - This is a custom property we may add to track user interaction
                        const lastInteractionTime = window.lastUserInteractionTime || 0;
                        const timeSinceInteraction = now - lastInteractionTime;
                        
                        // If we've had user interaction in the last 3 seconds, consider it a user gesture context
                        return hasViewTransition || timeSinceInteraction < 3000;
                      } catch (_) {
                        // Fallback detection - most skip operations will happen from UI events
                        return true;
                      }
                    })();
                    
                    console.log('[BackgroundMusicPlayer] Are we within user gesture context:', isUserGesture);
                    
                    // Set the new source
                    audio.src = nextTrack.path;
                    console.log('[BackgroundMusicPlayer] Set new audio source:', nextTrack.path);
                    
                    // Load the new track
                    audio.load();
                    console.log('[BackgroundMusicPlayer] Loading new track');
                    
                    // Reset metadata while loading
                    setTrackMetadata({
                      title: nextTrack.filename.replace(/-mono\.m4a$/, ''),
                      artist: 'Loading...',
                      album: 'Loading...'
                    });
                    
                    // Critical fix: Only try to play the track if it was already playing
                    // and we're in a user gesture context to avoid autoplay restrictions
                    if (wasPlaying || isUserGesture) {
                      // Special handling for Safari which is stricter about autoplay
                      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                      
                      if (isSafari) {
                        // For Safari, we need to be more careful
                        console.log('[BackgroundMusicPlayer] Safari detected, using special playback handling');
                        
                        // Set volume to 0 initially to prevent audible glitches
                        const originalVolume = audio.volume;
                        audio.volume = 0;
                        
                        // Unmute first if needed
                        const wasMuted = audio.muted;
                        if (wasMuted) {
                          audio.muted = false;
                        }
                        
                        // First try immediate play
                        audio.play()
                          .then(() => {
                            console.log('[BackgroundMusicPlayer] Safari: Play succeeded immediately');
                            // Restore volume gradually
                            setTimeout(() => {
                              audio.volume = originalVolume;
                              if (wasMuted) {
                                audio.muted = true;
                              }
                              setIsPlaying(true);
                            }, 50);
                          })
                          .catch(error => {
                            console.warn('[BackgroundMusicPlayer] Safari: Play failed, trying with user event:', error);
                            
                            // Create and dispatch a synthetic click event to help with autoplay restrictions
                            try {
                              const simulatedEvent = new MouseEvent('click', {
                                view: window,
                                bubbles: true,
                                cancelable: true
                              });
                              document.body.dispatchEvent(simulatedEvent);
                              
                              // Try playing again after the synthetic event
                              setTimeout(() => {
                                audio.play()
                                  .then(() => {
                                    console.log('[BackgroundMusicPlayer] Safari: Play succeeded after synthetic event');
                                    // Restore volume gradually
                                    setTimeout(() => {
                                      audio.volume = originalVolume;
                                      if (wasMuted) {
                                        audio.muted = true;
                                      }
                                      setIsPlaying(true);
                                    }, 50);
                                  })
                                  .catch(innerError => {
                                    console.error('[BackgroundMusicPlayer] Safari: Final play attempt failed:', innerError);
                                    // Handle the case where we simply cannot autoplay
                                    setIsPlaying(false);
                                  });
                              }, 50);
                            } catch (eventError) {
                              console.error('[BackgroundMusicPlayer] Error creating synthetic event:', eventError);
                            }
                          });
                      } else {
                        // For other browsers, use a more straightforward approach
                        console.log('[BackgroundMusicPlayer] Attempting to play new track');
                        
                        // Keep track of whether we're in play context to avoid multiple attempts
                        let playAttempted = false;
                        
                        // First try a simple play
                        const playPromise = audio.play();
                        playAttempted = true;
                        
                        if (playPromise !== undefined) {
                          playPromise
                            .then(() => {
                              console.log('[BackgroundMusicPlayer] New track playback started successfully');
                              setIsPlaying(true);
                              
                              // Apply volume settings 
                              if (isMainPlayerPlaying) {
                                audio.volume = 0;
                                setDisplayVolume(0);
                              } else {
                                const volume = effectiveVolumeRef.current / 100;
                                audio.volume = volume;
                                setDisplayVolume(effectiveVolumeRef.current);
                              }
                              
                              // Apply mute setting if needed
                              audio.muted = backgroundMuted;
                            })
                            .catch(error => {
                              console.error('[BackgroundMusicPlayer] Error playing new track:', error);
                              
                              // If autoplay was blocked, try one more time with a synthetic event
                              if (!playAttempted && error.name === 'NotAllowedError') {
                                playAttempted = true;
                                
                                try {
                                  // Create and dispatch a synthetic click event
                                  const simulatedEvent = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true
                                  });
                                  document.body.dispatchEvent(simulatedEvent);
                                  
                                  // Try playing again after synthetic event
                                  setTimeout(() => {
                                    audio.play()
                                      .then(() => {
                                        console.log('[BackgroundMusicPlayer] New track playback started after synthetic event');
                                        setIsPlaying(true);
                                      })
                                      .catch(finalError => {
                                        console.error('[BackgroundMusicPlayer] Final play attempt failed:', finalError);
                                        setIsPlaying(false);
                                      });
                                  }, 50);
                                } catch (eventError) {
                                  console.error('[BackgroundMusicPlayer] Error creating synthetic event:', eventError);
                                }
                              }
                            });
                        }
                      }
                    } else {
                      console.log('[BackgroundMusicPlayer] Not attempting to play because audio was paused or not in user gesture context');
                      // Update isPlaying state to match current state
                      setIsPlaying(false);
                    }
                  } catch (error) {
                    console.error('[BackgroundMusicPlayer] Error in direct track change:', error);
                  }
                }
                return;
              } else {
                // No tracks anywhere, show error
                console.error('[BackgroundMusicPlayer] No tracks available in state or internal reference');
              }
            }
            
            // Use normal handler if we have tracks
            if (tracks.length > 0) {
              const validCurrentIndex = (persistentCurrentIndex >= 0 && persistentCurrentIndex < tracks.length) 
                ? persistentCurrentIndex 
                : 0;
                
              // Calculate next index
              const nextIndex = (validCurrentIndex + 1) % tracks.length;
              console.log(`[BackgroundMusicPlayer] Using normal handler - Current index: ${validCurrentIndex}, Next index: ${nextIndex}, Total tracks: ${tracks.length}`);
              
              // Remember the next index
              backgroundPlayerRef.current._currentTrackIndex = nextIndex;
              
              // Use sequential playback
              handleSkipNext(true);
            } else {
              console.error('[BackgroundMusicPlayer] No tracks available in state or internal tracks');
              handleSkipNext(true);
            }
          },
          getPlaylist: () => {
            // First try to return tracks from state
            if (tracks.length > 0) {
              return tracks;
            }
            
            // Fall back to internal tracks if state is empty
            if (backgroundPlayerRef.current._internalTracks?.length > 0) {
              return backgroundPlayerRef.current._internalTracks;
            }
            
            // Last resort: create default tracks
            const defaultTracks = [
              '01-APromiseRevealed-mono.m4a',
              '02-StillSmallVoice-mono.m4a',
              '03-TheMirror-mono.m4a',
              '04-VoiceInTheWilderness-mono.m4a',
              '05-EvenIf-mono.m4a',
              '06-HopeDeferred-mono.m4a',
              '07-APromiseFulfilled-mono.m4a'
            ].map(filename => ({
              path: `${process.env.PUBLIC_URL || ''}/default_content/music/instrumental/${filename}`,
              filename
            }));
            
            // Save these for future use
            backgroundPlayerRef.current._internalTracks = defaultTracks;
            
            return defaultTracks;
          },
          getPlaylistIndex: () => currentTrackIndex,
          playVideoAt: (index: number) => {
            // Get the playlist - this handles the case when tracks might be empty
            const playlist = backgroundPlayerRef.current.getPlaylist();
            
            if (playlist && index >= 0 && index < playlist.length) {
              console.log('[BackgroundMusicPlayer] External track selection requested:', index);
              const trackToPlay = playlist[index];
              
              // Update state
              setCurrentTrackIndex(index);
              setCurrentTrack(trackToPlay);
              
              // If the tracks state is empty, make sure to update it
              if (tracks.length === 0) {
                setTracks(playlist);
              }
              
              // Load the track
              if (audio && trackToPlay) {
                audio.src = trackToPlay.path;
                audio.load();
                
                // Try to play if audio was already playing
                if (!audio.paused) {
                  audio.play().catch(err => {
                    console.error('[BackgroundMusicPlayer] Error playing selected track:', err);
                  });
                }
              }
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

  // Effect to set up track monitoring for continuous playback
  useEffect(() => {
    // Clear any existing interval
    if (trackMonitorIntervalRef.current) {
      clearInterval(trackMonitorIntervalRef.current);
      trackMonitorIntervalRef.current = null;
    }
    
    if (audioElement && isPlaying) {
      console.log('[BackgroundMusicPlayer] Setting up track monitoring for continuous playback');
      
      // Set up an interval to monitor track progress
      trackMonitorIntervalRef.current = setInterval(() => {
        try {
          // Check if the audio element exists and has valid duration
          if (audioElement && !isNaN(audioElement.duration)) {
            const timeRemaining = audioElement.duration - audioElement.currentTime;
            
            // If near the end of the track (within 0.5 seconds), prepare for next track
            if (timeRemaining < 0.5 && timeRemaining > 0) {
              console.log(`[BackgroundMusicPlayer] Track nearly complete (${timeRemaining.toFixed(2)}s remaining), preparing next track`);
              
              // Set flag to indicate this is an automatic transition
              isManualPauseRef.current = false;
              autoTransitionRef.current = true;
            }
          }
        } catch (error) {
          console.error('[BackgroundMusicPlayer] Error in track monitoring:', error);
        }
      }, 250); // Check every 250ms
      
      // Clean up interval on unmount
      return () => {
        if (trackMonitorIntervalRef.current) {
          clearInterval(trackMonitorIntervalRef.current);
          trackMonitorIntervalRef.current = null;
        }
      };
    }
  }, [audioElement, isPlaying]);

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