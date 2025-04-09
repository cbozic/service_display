import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useYouTube } from '../contexts/YouTubeContext';
import { FADE_STEPS } from '../App';
import { fadeToVolume } from '../utils/audioUtils';
import BackgroundPlayerControls from './BackgroundPlayerControls';
import useAudioMetadata, { AudioMetadata } from '../utils/useAudioMetadata';

// Define a type for track metadata
interface TrackMetadata {
    title: string;
    artist: string;
    album?: string;
    year?: string;
}

interface BackgroundMusicPlayerProps {
    volume?: number;
}

const BackgroundMusicPlayer: React.FC<BackgroundMusicPlayerProps> = ({
    volume: propVolume
}): JSX.Element | null => {
    const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [displayVolume, setDisplayVolume] = useState<number>(0);
    const [playlist, setPlaylist] = useState<string[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isAudioLoaded, setIsAudioLoaded] = useState(false);
    const [currentTrackMetadata, setCurrentTrackMetadata] = useState<AudioMetadata>({
        title: 'Unknown Title',
        artist: 'Unknown Artist',
    });

    // Use our custom metadata hook
    const { extractMetadata, isLoading: isLoadingMetadata } = useAudioMetadata();

    const {
        mainPlayersReady,
        isMainPlayerPlaying,
        setMainPlayersReady,
        backgroundPlayerRef,
        backgroundVolume,
        setBackgroundVolume,
        backgroundMuted,
        setBackgroundMuted,
        isManualVolumeChange,
        setManualVolumeChange
    } = useYouTube();

    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const fadeTimeoutRef = useRef<number | null>(null);
    const initialVolumeSetRef = useRef<boolean>(false);
    const previousVolumeRef = useRef<number>(backgroundVolume);
    const effectiveVolumeRef = useRef<number>(backgroundVolume);
    const hasInitializedRef = useRef<boolean>(false);

    // Utility function to fade volume that updates display volume in sync
    const fadeToVolumeWithDisplay = useCallback((targetVolume: number, fadeDurationInSeconds: number = 1, callback?: () => void) => {
        if (!audioPlayer) {
            if (callback) callback();
            return () => { };
        }

        effectiveVolumeRef.current = targetVolume;

        // Cancel any existing fade
        if (fadeTimeoutRef.current) {
            window.clearTimeout(fadeTimeoutRef.current);
            fadeTimeoutRef.current = null;
        }

        // For immediate volume changes
        if (fadeDurationInSeconds === 0) {
            if (targetVolume === 0) {
                audioPlayer.volume = 0;
                setDisplayVolume(0);
            } else {
                audioPlayer.volume = targetVolume / 100;
                setDisplayVolume(targetVolume);
            }
            if (callback) callback();
            return () => { };
        }

        // Get current volume
        const currentVolume = isMuted ? 0 : Math.round(audioPlayer.volume * 100);
        const volumeDifference = targetVolume - currentVolume;

        // Apply fade using audioUtils fadeToVolume
        const cleanup = fadeToVolume(
            {
                // Create an adapter object to match YouTube player interface
                getVolume: () => Math.round(audioPlayer.volume * 100),
                setVolume: (vol: number) => {
                    audioPlayer.volume = vol / 100;
                    setDisplayVolume(vol); // Update display volume in sync
                },
                mute: () => { audioPlayer.volume = 0; },
                unMute: () => { audioPlayer.volume = targetVolume / 100; }
            },
            targetVolume,
            fadeDurationInSeconds,
            callback
        );

        return cleanup;
    }, [audioPlayer, isMuted]);

    // Initialize audio player and fetch playlist
    useEffect(() => {
        const fetchPlaylist = async () => {
            try {
                // Define fallback playlist
                const defaultPlaylist = [
                    '/default_content/music/instrumental/01-APromiseRevealed-VBR-MONO.mp3',
                    '/default_content/music/instrumental/02-StillSmallVoice-VBR-MONO.mp3',
                    '/default_content/music/instrumental/03-TheMirror-VBR-MONO.mp3',
                    '/default_content/music/instrumental/04-VoiceInTheWilderness-VBR-MONO.mp3',
                    '/default_content/music/instrumental/05-EvenIf-VBR-MONO.mp3',
                    '/default_content/music/instrumental/06-HopeDeferred-VBR-MONO.mp3',
                    '/default_content/music/instrumental/07-APromiseFulfilled-VBR-MONO.mp3'
                ];

                console.log('[BackgroundMusicPlayer] API not available, using fallback playlist');

                // Simulate scanning the file system by checking if files are accessible
                // This is just for demonstration - in a real app with no API we'd need 
                // to list files some other way or have a hardcoded playlist
                const validFiles = [];

                for (const file of defaultPlaylist) {
                    try {
                        // Try to fetch the file to check if it exists
                        const fileCheck = await fetch(file, { method: 'HEAD' });
                        if (fileCheck.ok) {
                            validFiles.push(file);
                        }
                    } catch (e) {
                        // Ignore file fetch errors
                    }
                }

                if (validFiles.length > 0) {
                    console.log('[BackgroundMusicPlayer] Found valid files:', validFiles);
                    setPlaylist(validFiles);
                } else {
                    console.log('[BackgroundMusicPlayer] No valid files found, using entire fallback playlist');
                    setPlaylist(defaultPlaylist);
                }
            } catch (error) {
                console.error('[BackgroundMusicPlayer] Error in playlist initialization:', error);
                // Final fallback
                setPlaylist([
                    '/default_content/music/instrumental/01-APromiseRevealed-VBR-MONO.mp3',
                    '/default_content/music/instrumental/02-StillSmallVoice-VBR-MONO.mp3',
                    '/default_content/music/instrumental/03-TheMirror-VBR-MONO.mp3',
                    '/default_content/music/instrumental/04-VoiceInTheWilderness-VBR-MONO.mp3',
                    '/default_content/music/instrumental/05-EvenIf-VBR-MONO.mp3',
                    '/default_content/music/instrumental/06-HopeDeferred-VBR-MONO.mp3',
                    '/default_content/music/instrumental/07-APromiseFulfilled-VBR-MONO.mp3'
                ]);
            }
        };

        // Create audio element
        const audio = new Audio();
        audioElementRef.current = audio;
        setAudioPlayer(audio);

        // Set up event listeners
        audio.addEventListener('canplaythrough', () => {
            console.log('[BackgroundMusicPlayer] Audio can play through');
            setIsAudioLoaded(true);
            setIsPlayerReady(true);
        });

        audio.addEventListener('ended', () => {
            console.log('[BackgroundMusicPlayer] Track ended');
            handleSkipToNext();
        });

        audio.addEventListener('error', (e) => {
            console.error('[BackgroundMusicPlayer] Audio error:', e);
            // Try to play the next track if there's an error
            handleSkipToNext();
        });

        // Fetch the playlist
        fetchPlaylist();

        // Create a custom player interface and store it in the ref
        if (backgroundPlayerRef) {
            backgroundPlayerRef.current = {
                playVideo: () => {
                    if (audio) audio.play().catch(e => console.error('Error playing audio:', e));
                },
                pauseVideo: () => {
                    if (audio) audio.pause();
                },
                mute: () => {
                    if (audio) audio.volume = 0;
                },
                unMute: () => {
                    if (audio) audio.volume = effectiveVolumeRef.current / 100;
                },
                getVolume: () => (audio ? Math.round(audio.volume * 100) : 0),
                setVolume: (vol: number) => {
                    if (audio) audio.volume = vol / 100;
                },
                getPlayerState: () => (audio && !audio.paused ? 1 : 2), // 1 = playing, 2 = paused in YouTube API
                seekTo: (time: number) => {
                    if (audio) audio.currentTime = time;
                },
                getPlaylist: () => playlist,
                getPlaylistIndex: () => currentTrackIndex,
                nextVideo: () => handleSkipToNext(),
                playVideoAt: (index: number) => {
                    handlePlayAtIndex(index);
                }
            };
        }

        // Cleanup function
        return () => {
            if (audio) {
                audio.pause();
                audio.src = '';
                audio.removeEventListener('canplaythrough', () => { });
                audio.removeEventListener('ended', () => { });
                audio.removeEventListener('error', () => { });
            }
        };
    }, []);

    // Initialize with the first track when playlist is loaded
    useEffect(() => {
        if (playlist.length > 0 && audioPlayer && !hasInitializedRef.current) {
            console.log('[BackgroundMusicPlayer] Initializing with first track');

            // Choose a random track to start
            const randomIndex = Math.floor(Math.random() * playlist.length);
            setCurrentTrackIndex(randomIndex);
            
            try {
                // Test if file exists with a fetch request first
                fetch(playlist[randomIndex], { method: 'HEAD' })
                    .then(response => {
                        if (response.ok) {
                            console.log(`[BackgroundMusicPlayer] File exists: ${playlist[randomIndex]}`);
                            // Load the track
                            audioPlayer.src = playlist[randomIndex];
                            audioPlayer.load();
                            
                            // Set the initial volume
                            const initialVolume = propVolume !== undefined ? propVolume : backgroundVolume;
                            audioPlayer.volume = initialVolume / 100;
                            
                            // Set player as ready
                            setIsPlayerReady(true);
                            hasInitializedRef.current = true;
                            
                            // Start muted by default
                            audioPlayer.volume = 0;
                            setDisplayVolume(0);
                            
                            // Signal that the player is ready
                            setMainPlayersReady(true);
                        } else {
                            console.error(`[BackgroundMusicPlayer] File not found: ${playlist[randomIndex]}`);
                            // Try another track or show error message
                            setIsPlayerReady(true); // Still set ready to avoid indefinite loading
                            hasInitializedRef.current = true;
                            setMainPlayersReady(true);
                        }
                    })
                    .catch(error => {
                        console.error('[BackgroundMusicPlayer] Error checking file:', error);
                        setIsPlayerReady(true); // Still set ready to avoid indefinite loading
                        hasInitializedRef.current = true;
                        setMainPlayersReady(true);
                    });
            } catch (error) {
                console.error('[BackgroundMusicPlayer] Error initializing audio:', error);
                setIsPlayerReady(true);
                hasInitializedRef.current = true;
                setMainPlayersReady(true);
            }
        }
    }, [playlist, audioPlayer, backgroundVolume, propVolume, setMainPlayersReady]);

    // Add effect to update volume when initialVolume changes
    useEffect(() => {
        if (!initialVolumeSetRef.current && audioPlayer && isPlayerReady) {
            const initialVolume = propVolume !== undefined ? propVolume : backgroundVolume;
            console.log('[BackgroundMusicPlayer] Setting initial volume:', initialVolume);

            try {
                audioPlayer.volume = initialVolume / 100;
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
    }, [audioPlayer, isPlayerReady, propVolume, backgroundVolume, setBackgroundVolume]);

    // Add effect to sync volume with context
    useEffect(() => {
        if (audioPlayer && isPlayerReady && initialVolumeSetRef.current) {
            console.log('[BackgroundMusicPlayer] Syncing volume with context:', backgroundVolume);

            try {
                if (!isMuted) {
                    audioPlayer.volume = backgroundVolume / 100;
                    setDisplayVolume(backgroundVolume);
                }

                previousVolumeRef.current = backgroundVolume;
                effectiveVolumeRef.current = backgroundVolume;
            } catch (error) {
                console.error('[BackgroundMusicPlayer] Error syncing volume with context:', error);
            }
        }
    }, [backgroundVolume, audioPlayer, isPlayerReady, isMuted]);

    // Add effect to handle backgroundMuted changes from context
    useEffect(() => {
        if (audioPlayer && isPlayerReady) {
            try {
                console.log('[BackgroundMusicPlayer] Context muted state changed:', backgroundMuted);

                if (backgroundMuted) {
                    audioPlayer.volume = 0;
                    setDisplayVolume(0);
                } else {
                    const volumeToUse = effectiveVolumeRef.current;
                    audioPlayer.volume = volumeToUse / 100;
                    setDisplayVolume(volumeToUse);
                }

                setIsMuted(backgroundMuted);
            } catch (error) {
                console.error('[BackgroundMusicPlayer] Error setting mute state from context:', error);
            }
        }
    }, [backgroundMuted, audioPlayer, isPlayerReady]);

    // Effect to handle main video playing/paused state changes
    useEffect(() => {
        if (!audioPlayer || !isPlayerReady || !isPlaying) return;

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
    }, [isMainPlayerPlaying, audioPlayer, isPlayerReady, backgroundVolume, isPlaying, fadeToVolumeWithDisplay]);

    // Modify the handlePlayAtIndex function to use our new hook
    const handlePlayAtIndex = useCallback((index: number) => {
        if (!audioPlayer || !playlist.length) {
            console.warn('[BackgroundMusicPlayer] Cannot play track: player not ready or playlist empty');
            return;
        }
        
        // Validate index
        const validIndex = Math.max(0, Math.min(index, playlist.length - 1));
        setCurrentTrackIndex(validIndex);
        
        // Remember if the player was playing
        const wasPlaying = !audioPlayer.paused;
        console.log(`[BackgroundMusicPlayer] Loading track at index ${validIndex}: ${playlist[validIndex]}`);
        
        // Extract and set metadata for this track
        extractMetadata(playlist[validIndex])
            .then(metadata => {
                console.log('[BackgroundMusicPlayer] Extracted metadata:', metadata);
                setCurrentTrackMetadata(metadata);
                
                // Now proceed with loading and playing the file
                return fetch(playlist[validIndex], { method: 'HEAD' });
            })
            .then(response => {
                if (response.ok) {
                    // File exists, load it
                    audioPlayer.src = playlist[validIndex];
                    audioPlayer.load();
                    
                    // Update document title with track info
                    document.title = `${currentTrackMetadata.title} - ${currentTrackMetadata.artist}`;
                    
                    // Set up media session if supported
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.metadata = new MediaMetadata({
                            title: currentTrackMetadata.title,
                            artist: currentTrackMetadata.artist,
                            album: currentTrackMetadata.album || 'Background Music'
                        });
                    }
                    
                    // Handle play when loaded
                    audioPlayer.oncanplaythrough = () => {
                        if (wasPlaying) {
                            console.log('[BackgroundMusicPlayer] Track loaded, resuming playback');
                            audioPlayer.play()
                                .then(() => {
                                    console.log('[BackgroundMusicPlayer] Playback of new track started');
                                    setIsPlaying(true);
                                })
                                .catch(e => {
                                    console.error('[BackgroundMusicPlayer] Error playing new track:', e);
                                    // Keep UI state consistent with user intent
                                    setIsPlaying(true);
                                });
                        }
                    };
                } else {
                    console.error(`[BackgroundMusicPlayer] File not found: ${playlist[validIndex]}`);
                    // We're already in handleSkipToNext so we shouldn't recursively call it
                    // Just log the error
                }
            })
            .catch(error => {
                console.error('[BackgroundMusicPlayer] Error checking file:', error);
                // We're already in handleSkipToNext so we shouldn't recursively call it
            });
    }, [audioPlayer, playlist, extractMetadata]);

    // Skip to next track
    const handleSkipToNext = useCallback(() => {
        if (!playlist.length) {
            console.warn('[BackgroundMusicPlayer] Cannot skip: playlist is empty');
            return;
        }
        
        const nextIndex = (currentTrackIndex + 1) % playlist.length;
        console.log(`[BackgroundMusicPlayer] Skipping to next track at index ${nextIndex}`);
        
        // Directly call handlePlayAtIndex to avoid circular dependency
        if (!audioPlayer || !playlist.length) {
            console.warn('[BackgroundMusicPlayer] Cannot play track: player not ready or playlist empty');
            return;
        }
        
        // Validate index
        const validIndex = Math.max(0, Math.min(nextIndex, playlist.length - 1));
        setCurrentTrackIndex(validIndex);
        
        // Remember if the player was playing
        const wasPlaying = !audioPlayer.paused;
        console.log(`[BackgroundMusicPlayer] Loading track at index ${validIndex}: ${playlist[validIndex]}`);
        
        // Extract and set metadata for this track
        extractMetadata(playlist[validIndex])
            .then(metadata => {
                console.log('[BackgroundMusicPlayer] Extracted metadata:', metadata);
                setCurrentTrackMetadata(metadata);
                
                // Now proceed with loading and playing the file
                return fetch(playlist[validIndex], { method: 'HEAD' });
            })
            .then(response => {
                if (response.ok) {
                    // File exists, load it
                    audioPlayer.src = playlist[validIndex];
                    audioPlayer.load();
                    
                    // Update document title with track info
                    document.title = `${currentTrackMetadata.title} - ${currentTrackMetadata.artist}`;
                    
                    // Set up media session if supported
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.metadata = new MediaMetadata({
                            title: currentTrackMetadata.title,
                            artist: currentTrackMetadata.artist,
                            album: currentTrackMetadata.album || 'Background Music'
                        });
                    }
                    
                    // Handle play when loaded
                    audioPlayer.oncanplaythrough = () => {
                        if (wasPlaying) {
                            console.log('[BackgroundMusicPlayer] Track loaded, resuming playback');
                            audioPlayer.play()
                                .then(() => {
                                    console.log('[BackgroundMusicPlayer] Playback of new track started');
                                    setIsPlaying(true);
                                })
                                .catch(e => {
                                    console.error('[BackgroundMusicPlayer] Error playing new track:', e);
                                    // Keep UI state consistent with user intent
                                    setIsPlaying(true);
                                });
                        }
                    };
                } else {
                    console.error(`[BackgroundMusicPlayer] File not found: ${playlist[validIndex]}`);
                    // We're already in handleSkipToNext so we shouldn't recursively call it
                    // Just log the error
                }
            })
            .catch(error => {
                console.error('[BackgroundMusicPlayer] Error checking file:', error);
                // We're already in handleSkipToNext so we shouldn't recursively call it
            });
    }, [currentTrackIndex, playlist.length, audioPlayer, extractMetadata]);

    // Skip to random track
    const handleSkipToRandom = useCallback(() => {
        if (!playlist.length) {
            console.warn('[BackgroundMusicPlayer] Cannot play random track: playlist is empty');
            return;
        }
        
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * playlist.length);
        } while (randomIndex === currentTrackIndex && playlist.length > 1);
        
        console.log(`[BackgroundMusicPlayer] Playing random track at index ${randomIndex}`);
        handlePlayAtIndex(randomIndex);
    }, [currentTrackIndex, playlist.length, handlePlayAtIndex]);

    // Handle mute toggle
    const handleMuteToggle = useCallback(() => {
        if (audioPlayer) {
            if (!isMuted) {
                audioPlayer.volume = 0;
                setDisplayVolume(0);
            } else {
                const volume = backgroundVolume;
                audioPlayer.volume = volume / 100;
                setDisplayVolume(volume);
            }
        }
        setBackgroundMuted(!isMuted);
    }, [audioPlayer, isMuted, backgroundVolume, setBackgroundMuted]);

    // Handle play/pause toggle
    const handlePlayPauseToggle = useCallback(() => {
        if (audioPlayer && isPlayerReady) {
            try {
                if (isPlaying) {
                    // If currently playing, pause
                    audioPlayer.pause();
                    setIsPlaying(false);
                } else {
                    // If currently paused, try to play
                    // Check if we have a track loaded
                    if (!audioPlayer.src || audioPlayer.src === '') {
                        console.log('[BackgroundMusicPlayer] No track loaded, loading first track');
                        // Load a track if none is loaded
                        if (playlist.length > 0) {
                            const index = currentTrackIndex >= 0 && currentTrackIndex < playlist.length ? 
                                currentTrackIndex : 0;
                            audioPlayer.src = playlist[index];
                            audioPlayer.load();
                        } else {
                            console.error('[BackgroundMusicPlayer] No tracks in playlist');
                            return;
                        }
                    }
                    
                    // Try to play with explicit error handling
                    audioPlayer.play()
                        .then(() => {
                            console.log('[BackgroundMusicPlayer] Playback started successfully');
                            setIsPlaying(true);
                            
                            // Set appropriate volume based on main player state
                            if (isMainPlayerPlaying) {
                                audioPlayer.volume = 0;
                                setDisplayVolume(0);
                            } else {
                                // If main video is paused, set to regular volume
                                const volume = effectiveVolumeRef.current;
                                audioPlayer.volume = volume / 100;
                                setDisplayVolume(volume);
                            }
                        })
                        .catch(e => {
                            console.error('[BackgroundMusicPlayer] Error playing audio (likely autoplay policy):', e);
                            
                            // Despite error, update UI state to match user intent
                            setIsPlaying(true);
                            
                            // Show a message to the user about autoplay restrictions
                            alert('Browser autoplay policy prevented automatic playback. Please interact with the page and try again.');
                        });
                }
            } catch (error) {
                console.error('[BackgroundMusicPlayer] Error toggling play/pause:', error);
            }
        } else {
            console.warn('[BackgroundMusicPlayer] Player not ready or not available');
        }
    }, [audioPlayer, isPlayerReady, isPlaying, isMainPlayerPlaying, playlist, currentTrackIndex]);

    // Handle volume change
    const handleVolumeChange = useCallback((event: Event, newValue: number | number[]) => {
        // Mark this as a manual volume change
        setManualVolumeChange(true);

        const volumeValue = Array.isArray(newValue) ? newValue[0] : newValue;

        // Update context
        setBackgroundVolume(volumeValue);

        // Update player directly
        if (audioPlayer) {
            audioPlayer.volume = volumeValue / 100;
            setDisplayVolume(volumeValue);

            // Update refs
            previousVolumeRef.current = volumeValue;
            effectiveVolumeRef.current = volumeValue;

            // If volume is 0, mark as muted in context
            if (volumeValue === 0) {
                setBackgroundMuted(true);
            }
            // If we're adjusting from 0, unmute
            else if (isMuted) {
                setBackgroundMuted(false);
            }
        }
    }, [audioPlayer, setBackgroundVolume, setBackgroundMuted, isMuted, setManualVolumeChange]);

    if (!isPlayerReady) {
        return (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <p>Loading background music player...</p>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                bgcolor: '#282c34',
                color: '#fff',
                p: { xs: 1, sm: 2 },
                overflow: 'hidden', // Prevent scrollbars
                boxSizing: 'border-box', // Include padding in width/height calculations
            }}
        >
            {/* Play controls - now at the top */}
            <Box sx={{ 
                mb: { xs: 1, sm: 2, md: 3 },
                width: '100%',
                maxWidth: '100%'
            }}>
                <BackgroundPlayerControls
                    displayVolume={displayVolume}
                    volume={backgroundVolume}
                    isPlaying={isPlaying}
                    onPlayPauseToggle={handlePlayPauseToggle}
                    onVolumeChange={handleVolumeChange}
                    onSkipNext={handleSkipToRandom}
                    size="small" // Use small size for controls to save space
                />
            </Box>

            {/* Track info and visualizer */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: '100%',
                    overflow: 'hidden', // Prevent internal scrollbars
                    px: 1, // Add some horizontal padding
                }}
            >
                <Typography 
                    variant="h5"
                    sx={{ 
                        fontWeight: 'bold', 
                        mb: 0.5,
                        textAlign: 'center',
                        color: isLoadingMetadata ? 'rgba(255, 255, 255, 0.7)' : '#fff',
                        fontSize: { xs: '1rem', sm: '1.2rem', md: '1.4rem' }, // Smaller font size
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '90%', // Prevent text from touching edges
                    }}
                >
                    {isLoadingMetadata ? 'Loading...' : currentTrackMetadata.title}
                </Typography>
                
                <Typography 
                    variant="subtitle1"
                    sx={{ 
                        mb: 1,
                        textAlign: 'center',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontStyle: 'italic',
                        fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' }, // Responsive font size
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '90%', // Prevent text from touching edges
                    }}
                >
                    {isLoadingMetadata ? '' : currentTrackMetadata.artist}
                </Typography>

                {currentTrackMetadata.album && (
                    <Typography 
                        variant="caption"
                        sx={{ 
                            mb: { xs: 1, sm: 2 },
                            textAlign: 'center',
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: { xs: '0.7rem', sm: '0.8rem' }, // Responsive font size
                            width: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '90%', // Prevent text from touching edges
                        }}
                    >
                        {currentTrackMetadata.album}
                    </Typography>
                )}

                {/* Audio element (hidden) */}
                <audio ref={audioElementRef} style={{ display: 'none' }} />

                {/* Visualizer placeholder - make it responsive */}
                <Box sx={{
                    width: '100%',
                    maxWidth: '100%',
                    height: { xs: '60px', sm: '80px', md: '100px' }, // Responsive height
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden', // Prevent visualizer bars from causing scrollbars
                    mt: 'auto', // Push to bottom of flex container
                    mb: 'auto', // Keep centered if space available
                    maxHeight: '30%', // Limit maximum height relative to container
                }}>
                    {isPlaying ? (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: { xs: '3px', sm: '4px', md: '5px' }, // Responsive gap
                            height: '100%',
                            justifyContent: 'center', // Center the bars
                            width: '100%',
                            px: 2, // Add padding to avoid bars touching container edges
                        }}>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        width: { xs: '3px', sm: '4px' }, // Responsive width
                                        height: `${20 + Math.random() * 30}px`,
                                        backgroundColor: 'var(--accent-color, #4caf50)',
                                        animation: `audioVisualizerBar ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate`,
                                        opacity: isMuted ? 0.3 : 0.8,
                                        flexGrow: 0,
                                        flexShrink: 0,
                                    }}
                                />
                            ))}
                        </Box>
                    ) : (
                        <Typography sx={{ 
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' }
                        }}>
                            Paused
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Add some CSS for the audio visualizer */}
            <style>
                {`
                @keyframes audioVisualizerBar {
                    0% {
                        height: 10%;
                    }
                    100% {
                        height: 70%;
                    }
                }
                `}
            </style>
        </Box>
    );
};

export default BackgroundMusicPlayer; 