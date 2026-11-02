import React, { useState, useRef, useEffect, useCallback } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { Box, Typography } from '@mui/material';
import { useYouTube } from '../contexts/YouTubeContext';
import { loadYouTubeAPI } from '../utils/youtubeAPI';
import { FADE_STEPS } from '../App';
import { fadeToVolume } from '../utils/audioUtils';
import { enableStorageAccess } from '../utils/youtubeUtils';
import BackgroundPlayerControls from './BackgroundPlayerControls';

interface BackgroundPlayerProps {
  playlistUrl?: string;
  volume?: number;
  initialPaused?: boolean;
}

const BackgroundVideoPlayer: React.FC<BackgroundPlayerProps> = ({
  playlistUrl = '',
  volume: propVolume,
  initialPaused = false
}): JSX.Element | null => {
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { mainPlayersReady, isMainPlayerPlaying, backgroundPlayerRef, setBackgroundPlayerReady, backgroundVolume, setBackgroundVolume, backgroundMuted, setBackgroundMuted } = useYouTube();
  const fadeTimeoutRef = useRef<number | null>(null);
  const initialVolumeSetRef = useRef<boolean>(false);
  const previousVolumeRef = useRef<number>(backgroundVolume);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentState, setCurrentState] = useState<number | null>(null);
  const effectiveVolumeRef = useRef<number>(backgroundVolume);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const backgroundVolumeRef = useRef<number>(backgroundVolume);
  const isMainPlayerPlayingRef = useRef<boolean>(isMainPlayerPlaying);
  const backgroundMutedRef = useRef<boolean>(backgroundMuted);
  const previousMainPlayingRef = useRef<boolean>(isMainPlayerPlaying);
  backgroundVolumeRef.current = backgroundVolume;
  isMainPlayerPlayingRef.current = isMainPlayerPlaying;
  backgroundMutedRef.current = backgroundMuted;

  const cancelFade = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  // Custom version of fadeToVolume that can be canceled when the volume is changed manually
  const fadeBackgroundVolume = useCallback((targetVolume: number, durationInSeconds: number, onComplete?: () => void) => {
    if (!player) return () => {};
    
    // Clear any existing fade interval
    cancelFade();

    try {
      // Get current volume from player
      const startVolume = player.getVolume();
      
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
        if (!player) {
          cancelFade();
          return;
        }
        
        currentStep++;
        const progress = currentStep / steps;
        const newVolume = Math.round(startVolume + (safeTargetVolume - startVolume) * progress);
        
        try {
          player.setVolume(newVolume);
          
          if (currentStep >= steps) {
            cancelFade();
            if (onComplete) onComplete();
          }
        } catch (error) {
          console.error('Error in fade interval:', error);
          cancelFade();
        }
      }, stepDuration);
      
      // Return cleanup function
      return cancelFade;
    } catch (error) {
      console.error('Error starting volume fade:', error);
      return () => {};
    }
  }, [player, cancelFade]);

  // Add effect to update volume when initialVolume changes - but only once on initial mount
  useEffect(() => {
    // Only set the initial volume if it hasn't been set before
    if (!initialVolumeSetRef.current && player && isPlayerReady) {
      const initialVolume = propVolume !== undefined ? propVolume : backgroundVolume;
      console.log('[BackgroundVideoPlayer] Setting initial volume:', initialVolume);
      
      try {
        player.setVolume(initialVolume);
        // Only update context if we're using the prop volume
        if (propVolume !== undefined && propVolume !== backgroundVolume) {
          setBackgroundVolume(initialVolume);
        }
        previousVolumeRef.current = initialVolume;
        effectiveVolumeRef.current = initialVolume;
        initialVolumeSetRef.current = true;
      } catch (error) {
        console.error('[BackgroundVideoPlayer] Error setting initial volume:', error);
      }
    }
  }, [player, isPlayerReady, propVolume, backgroundVolume, setBackgroundVolume]);

  // Apply backgroundVolume changes directly, canceling any fade so the new value wins.
  // While the main video plays, the background stays faded out and this value is only
  // the level it fades back in to.
  useEffect(() => {
    console.log('[BackgroundVideoPlayer] Context volume changed:', backgroundVolume, 'Player ready:', isPlayerReady, 'Player exists:', !!player);
    effectiveVolumeRef.current = backgroundVolume;
    if (player && isPlayerReady && typeof player.setVolume === 'function' && !isMainPlayerPlayingRef.current) {
      try {
        cancelFade();
        player.setVolume(backgroundVolume);
      } catch (error) {
        console.error('[BackgroundVideoPlayer] Error setting volume from context:', error);
      }
    }
  }, [backgroundVolume, player, isPlayerReady, cancelFade]);

  // Add effect to handle backgroundMuted changes from context
  useEffect(() => {
    if (player && isPlayerReady) {
      try {
        console.log('[BackgroundVideoPlayer] Context muted state changed:', backgroundMuted);
        if (backgroundMuted) {
          player.mute();
        } else {
          player.unMute();
          // Unmuting at a low volume raises it to 5, so put it back: faded out under the
          // main video or until a running fade in takes over, otherwise the set level
          const staysQuiet = isMainPlayerPlayingRef.current || fadeIntervalRef.current;
          player.setVolume(staysQuiet ? 0 : backgroundVolumeRef.current);
        }
        setIsMuted(backgroundMuted);
      } catch (error) {
        console.error('[BackgroundVideoPlayer] Error setting mute state from context:', error);
      }
    }
  }, [backgroundMuted, player, isPlayerReady]);

  // Initialize YouTube API
  useEffect(() => {
    console.log('[BackgroundVideoPlayer] Checking YouTube API readiness');
    console.log('[BackgroundVideoPlayer] Current window.YT state:', {
      hasYT: !!window.YT,
      hasPlayer: !!(window.YT && window.YT.Player),
      YTType: typeof window.YT
    });

    // Don't initialize if already ready
    if (window.YT && window.YT.Player) {
      console.log('[BackgroundVideoPlayer] YouTube API already ready');
      setIsApiReady(true);
      return;
    }

    // Load the YouTube API
    console.log('[BackgroundVideoPlayer] Loading YouTube API...');
    loadYouTubeAPI()
      .then(() => {
        console.log('[BackgroundVideoPlayer] YouTube API loaded successfully');
        setIsApiReady(true);
      })
      .catch(error => {
        console.error('[BackgroundVideoPlayer] Error loading YouTube API:', error);
      });
  }, []);

  // Log when player state changes
  useEffect(() => {
    console.log('[BackgroundVideoPlayer] Player state updated:', {
      hasPlayer: !!player,
      isPlayerReady,
      isApiReady,
      isMuted,
      backgroundVolume,
      isMainPlayerPlaying,
      mainPlayersReady,
      playerState: player?.getPlayerState?.()
    });
  }, [player, isPlayerReady, isApiReady, isMuted, backgroundVolume, isMainPlayerPlaying, mainPlayersReady]);

  // Effect to handle main video playing/paused state changes 
  // This controls background volume fading but not play state
  useEffect(() => {
    const mainJustStarted = isMainPlayerPlaying && !previousMainPlayingRef.current;
    const mainJustPaused = !isMainPlayerPlaying && previousMainPlayingRef.current;
    previousMainPlayingRef.current = isMainPlayerPlaying;

    if (!player || !isPlayerReady) return;

    console.log('[BackgroundVideoPlayer] Main player state changed. Main is playing:', isMainPlayerPlaying);

    try {
      if (mainJustStarted) {
        // Main video just started, fade out background music
        console.log('[BackgroundVideoPlayer] Main video is playing, fading out background to 0');
        fadeBackgroundVolume(0, 2);
      } else if (isMainPlayerPlaying) {
        // Main video was already playing, so anything that started the background
        // (such as a track skip) must stay silent. Let a fade out that's still
        // running finish.
        if (!fadeIntervalRef.current) {
          player.setVolume(0);
        }
      } else {
        // Main video is paused, fade in background music
        console.log('[BackgroundVideoPlayer] Main video is paused, checking background player state');

        // The background can already be playing silently from startup, so the
        // main video's pause is what makes it audible
        if (mainJustPaused && backgroundMutedRef.current) {
          setBackgroundMuted(false);
        }

        // Volume 0 doesn't mute a YouTube player, so this only catches a player
        // left muted while the operator's setting is unmuted
        if (!backgroundMutedRef.current && player.isMuted()) {
          player.unMute();
        }

        // Only the main video's pause fades in. Anything else that re-runs this, such
        // as the play button, holds the set level, since the player's reported volume
        // can still be the 5 that unMute() raised it to.
        const fadeIn = () => {
          if (mainJustPaused) {
            fadeBackgroundVolume(backgroundVolumeRef.current, 1);
          } else if (!fadeIntervalRef.current) {
            player.setVolume(backgroundVolumeRef.current);
          }
        };

        // Check if the background player should be playing (according to React state)
        // but isn't actually playing (according to YouTube player state)
        if (isPlaying) {
          try {
            const actualPlayerState = player.getPlayerState();
            // YouTube API: 1 = playing, 2 = paused, other values = not actively playing
            const isActuallyPlaying = actualPlayerState === 1;
            
            if (!isActuallyPlaying) {
              console.log('[BackgroundVideoPlayer] State mismatch detected - React state shows playing but actual player is not playing');
              console.log('[BackgroundVideoPlayer] Current player state:', actualPlayerState);
              console.log('[BackgroundVideoPlayer] Ensuring background music is playing before fade in');
              
              // Start playing the video before fading in
              player.playVideo();
              
              // Short delay to allow player to start before beginning fade
              setTimeout(() => {
                if (isMainPlayerPlayingRef.current) return;
                console.log('[BackgroundVideoPlayer] Now fading in background to', backgroundVolumeRef.current);
                fadeIn();
              }, 100);
              return; // Exit early since we're handling the fade in the timeout
            }
          } catch (stateError) {
            console.error('[BackgroundVideoPlayer] Error checking player state:', stateError);
          }
        }
        
        // If no state mismatch or we couldn't check, proceed with normal fade in
        console.log('[BackgroundVideoPlayer] Fading in background to', backgroundVolumeRef.current);
        fadeIn();
      }
    } catch (error) {
      console.error('[BackgroundVideoPlayer] Error in main player state effect:', error);
    }
  }, [isMainPlayerPlaying, player, isPlayerReady, isPlaying, fadeBackgroundVolume, setBackgroundMuted]);

  const handleVolumeChange = useCallback((_event: Event, newValue: number | number[]) => {
    const volumeValue = Array.isArray(newValue) ? newValue[0] : newValue;
    // The backgroundVolume effect applies the new value to the player
    setBackgroundVolume(volumeValue);
    previousVolumeRef.current = volumeValue;
    effectiveVolumeRef.current = volumeValue;

    if (player && isMuted) {
      try {
        setBackgroundMuted(false);
        player.unMute();
      } catch (error) {
        console.error('Error adjusting volume:', error);
      }
    }
  }, [player, isMuted, setBackgroundVolume, setBackgroundMuted]);

  const handlePlayPauseToggle = useCallback(() => {
    if (player && isPlayerReady) {
      try {
        if (isPlaying) {
          player.pauseVideo();
          setIsPlaying(false);
        } else {
          // Unmute when the operator explicitly starts the background
          if (backgroundMuted) {
            player.unMute();
            setBackgroundMuted(false);
          }

          player.playVideo();
          setIsPlaying(true);

          // If main video is playing, keep background volume at 0
          if (isMainPlayerPlaying) {
            player.setVolume(0);
          } else {
            // If main video is paused, set to regular volume
            const volume = effectiveVolumeRef.current;
            player.setVolume(volume);
          }
        }
      } catch (error) {
        console.error('Error toggling play/pause:', error);
      }
    }
  }, [player, isPlayerReady, isPlaying, isMainPlayerPlaying, backgroundMuted, setBackgroundMuted]);

  const handleSkipToRandom = useCallback(() => {
    if (!player || !isPlayerReady) {
      console.log('Player not ready for random skip');
      return;
    }

    try {
      // Get total number of videos in playlist
      const playlist = player.getPlaylist();
      if (!playlist) {
        console.log('Playlist not available yet');
        return;
      }

      const playlistLength = playlist.length;
      if (playlistLength <= 0) {
        console.log('Playlist is empty');
        return;
      }

      // Generate random index excluding current video
      const currentIndex = player.getPlaylistIndex();
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * playlistLength);
      } while (randomIndex === currentIndex && playlistLength > 1);
      
      console.log(`Skipping to random index ${randomIndex} out of ${playlistLength}`);
      player.playVideoAt(randomIndex);
    } catch (error) {
      console.error('Error in handleSkipToRandom:', error);
    }
  }, [player, isPlayerReady]);

  const handleSkipNext = useCallback(() => {
    if (player && isPlayerReady) {
      try {
        // Skipping starts playback, so it unmutes like the play button
        if (backgroundMuted) {
          setBackgroundMuted(false);
        }
        // Instead of going to the next track, pick a random one
        handleSkipToRandom();
      } catch (error) {
        console.error('Error skipping to next track:', error);
      }
    }
  }, [player, isPlayerReady, handleSkipToRandom, backgroundMuted, setBackgroundMuted]);

  const onPlayerReady = useCallback((event: YouTubeEvent) => {
    try {
      console.log('[BackgroundVideoPlayer] Player ready event triggered');
      const playerInstance = event.target;
      
      // Basic player setup
      console.log('[BackgroundVideoPlayer] Setting up player instance (initialPaused:', initialPaused, ')');
      playerInstance.mute(); // Start muted by default
      // Use the volume from context
      const volumeToUse = previousVolumeRef.current || backgroundVolume;
      playerInstance.setVolume(volumeToUse);
      effectiveVolumeRef.current = volumeToUse;
      setBackgroundVolume(volumeToUse); // Update the state to match
      playerInstance.setPlaybackQuality('small');
      setPlayer(playerInstance);
      setIsPlayerReady(true);
      enableStorageAccess(playerInstance);
      setIsMuted(true); // Set local muted state to true
      
      // Store player reference in context
      if (backgroundPlayerRef) {
        console.log('[BackgroundVideoPlayer] Storing player reference in context');
        backgroundPlayerRef.current = playerInstance;
        setBackgroundPlayerReady(true);
      }
      
      // Initial playback
      const startPlayback = () => {
        try {
          if (!playerInstance) {
            console.log('[BackgroundVideoPlayer] No player instance available');
            return;
          }
          
          console.log('[BackgroundVideoPlayer] Starting initial playback');
          
          // Check if playlist is loaded
          const checkPlaylist = () => {
            try {
              const playlist = playerInstance.getPlaylist();
              console.log('[BackgroundVideoPlayer] Checking playlist:', playlist);
              
              if (playlist && playlist.length > 0) {
                console.log('[BackgroundVideoPlayer] Playlist loaded, length:', playlist.length);
                if (!hasInitialized) {
                  setHasInitialized(true);
                  // Wait a bit before attempting random skip
                  setTimeout(() => {
                    try {
                      console.log('[BackgroundVideoPlayer] Attempting random skip');
                      // Don't unmute automatically
                      if (!backgroundMuted) {
                        playerInstance.unMute();
                      } else {
                        playerInstance.mute();
                      }
                      // Use the synced volume
                      playerInstance.setVolume(volumeToUse);
                      handleSkipToRandom();
                      
                      // Handle initial playback state based on initialPaused prop
                      if (initialPaused) {
                        console.log('[BackgroundVideoPlayer] Pausing after skip due to initialPaused=true');
                        playerInstance.pauseVideo();
                        setIsPlaying(false);
                      } else {
                        console.log('[BackgroundVideoPlayer] Playing after skip');
                        playerInstance.playVideo();
                        setIsPlaying(true);
                      }
                    } catch (e) {
                      console.error('[BackgroundVideoPlayer] Error during delayed skip:', e);
                    }
                  }, 2000);
                }
              } else {
                console.log('[BackgroundVideoPlayer] Playlist not ready, retrying...');
                setTimeout(checkPlaylist, 1000);
              }
            } catch (e) {
              console.error('[BackgroundVideoPlayer] Error in checkPlaylist:', e);
              setTimeout(checkPlaylist, 1000);
            }
          };
          
          // Start checking for playlist
          checkPlaylist();
        } catch (e) {
          console.error('[BackgroundVideoPlayer] Error in startPlayback:', e);
        }
      };

      // Start the playback process
      startPlayback();
    } catch (error) {
      console.error('[BackgroundVideoPlayer] Error in onPlayerReady:', error);
    }
  }, [backgroundVolume, hasInitialized, handleSkipToRandom, backgroundPlayerRef, setBackgroundPlayerReady, previousVolumeRef, backgroundMuted, initialPaused]);

  const onStateChange = useCallback((event: YouTubeEvent) => {
    try {
      const state = event.data;
      console.log('Player state changed:', state);
      
      // Update playing state based on player state
      // 1: playing, 2: paused
      if (state === 1) {
        setIsPlaying(true);
        setIsVideoLoaded(true);
      } else if (state === 2) {
        setIsPlaying(false);
      } else if (state === 5) { // Video cued
        setIsVideoLoaded(true);
      }
      
      // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued
      if (state === 0 && player) { // Video ended
        console.log('Video ended, playing a random track from playlist');
        // Instead of restarting the playlist, go to a random track
        handleSkipToRandom();
      }
      setCurrentState(state);
    } catch (error) {
      console.error('Error in onStateChange:', error);
    }
  }, [player, handleSkipToRandom]);

  const getPlaylistId = useCallback((url: string) => {
    const regex = /[&?]list=([^&]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  }, []);

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      list: getPlaylistId(playlistUrl),
      listType: 'playlist',
      loop: 1,
      playsinline: 1,
      origin: window.location.origin,
      enablejsapi: 1,
      mute: 0,
      vq: 'small'
    },
  };

  // Add function to update our playlist state with the YouTube player's playlist
  useEffect(() => {
    if (player && isPlayerReady) {
      try {
        const ytPlaylist = player.getPlaylist();
        if (ytPlaylist && ytPlaylist.length > 0) {
          // Convert to our expected format
          const formattedPlaylist = ytPlaylist.map((videoId: string, index: number) => ({
            videoId,
            title: `Track ${index + 1}` // We don't have titles from the API
          }));
          setPlaylist(formattedPlaylist);
        }
      } catch (error) {
        console.error('Error getting playlist:', error);
      }
    }
  }, [player, isPlayerReady]);

  if (!isApiReady || !playlistUrl) {
    return null;
  }

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#282c34',
      alignItems: 'center',
      overflow: 'hidden'
    }}>
      <Box sx={{
        width: '80%',
        maxWidth: '600px',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
        alignItems: 'center'
      }}>
        <Box sx={{ width: '100%', flexShrink: 0 }}>
          <BackgroundPlayerControls
            volume={backgroundMuted ? 0 : backgroundVolume}
            isPlaying={isPlaying}
            onPlayPauseToggle={handlePlayPauseToggle}
            onVolumeChange={handleVolumeChange}
            onSkipNext={handleSkipNext}
          />
        </Box>
        {/* Takes 16:9 when there's room and gives up height first, so the controls never get pushed out */}
        <Box sx={{
          width: '100%',
          aspectRatio: '16/9',
          minHeight: 0,
          flexShrink: 1,
          containerType: 'size',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: 'none'
        }}>
          <Box sx={{
            position: 'relative',
            width: 'min(100cqw, calc(100cqh * 16 / 9))',
            aspectRatio: '16/9',
            '& > div:first-of-type, & iframe': { display: 'block', width: '100%', height: '100%' },
            '& iframe': { pointerEvents: 'none' }
          }}>
            <YouTube
              opts={opts}
              onReady={onPlayerReady}
              onStateChange={onStateChange}
            />
            {/* YouTube draws its own play controls when stopped, and the iframe can't be clicked */}
            {currentState !== 1 && currentState !== 3 && (
              <Box sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1e1e1e',
                borderRadius: 1,
                color: '#aaa'
              }}>
                {currentState === 2 && <Typography variant="body2">Paused</Typography>}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default BackgroundVideoPlayer;