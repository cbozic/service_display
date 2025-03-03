import React, { useState, useEffect, useCallback } from 'react';
import './VideoFadeFrame.css';
import YouTube from 'react-youtube';

import Overlay from './Overlay';

const VideoFadeFrame = (
    {
        video,
        startSeconds,
        useOverlay = true,
        overlaySlide = undefined,
        fadeDurationInSeconds = 2,
        minHeight = '100%',
        minWidth = '100%',
    }) => {
    const [player, setPlayer] = useState(null);
    const [startPlaying, setStartPlaying] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showOverlay, setShowOverlay] = useState(true);
    const docElement = document.documentElement;

    const handleClick = () => {
        //do something here if you want
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            console.log(event.code)
            if (event.code === 'Space') {
                if (showOverlay) {
                    setShowOverlay(false);
                    setStartPlaying(true);
                }
                else {
                    setShowOverlay(true);
                    setStartPlaying(false);
                }
            }
            else if (event.code === 'ArrowLeft') {
                player.seekTo(player.getCurrentTime() - 5);
            }
            else if (event.code === 'ArrowRight') {
                player.seekTo(player.getCurrentTime() + 15);
            }
            else if (event.code === 'KeyF') {
                setFullscreen(!fullscreen);
            }
            else {
                console.log('Unhandled key: ' + event.code);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showOverlay, player, fullscreen]);

    const onPlayerReady = useCallback((event) => {
        event.target.seekTo(startSeconds);
        if (showOverlay) {
            event.target.setVolume(0);
            event.target.pauseVideo();
        }
        else {
            event.target.setVolume(100);
            event.target.playVideo();
        }
        setPlayer(event.target);
    }, [startSeconds, showOverlay]);

    const onStateChage = useCallback((event) => {
        console.log('Player State Changed: ' + event.data);
        if (0 === event.data) {
            // Video has reached the end so reset the player
            setShowOverlay(true);
            setStartPlaying(false);
            player.seekTo(startSeconds);
        }
    }, [player, startSeconds]);

    const fadeToVolume = useCallback((targetVolume, fadeDurationInSeconds = 0, invokeWhenFinished = () => { }) => {
        const currentVolume = player.getVolume();
        const volumeDifference = targetVolume - currentVolume;
        const steps = 25; // Number of steps for the fade effect
        const stepDuration = (fadeDurationInSeconds * 1000) / steps;
        let currentStep = 0;

        const fadeStep = () => {
            if (currentStep < steps) {
                const newVolume = currentVolume + (volumeDifference * (currentStep / steps));
                player.setVolume(newVolume);
                currentStep++;
                setTimeout(fadeStep, stepDuration);
            } else {
                player.setVolume(targetVolume);
                invokeWhenFinished();
            }
        };

        fadeStep();
    }, [player]);

    const isPlayerStopped = useCallback( () => {
        return player.getPlayerState() === 2 || player.getPlayerState() === 5 || player.getPlayerState() === 0 || player.getPlayerState() === -1;
    }, [player]);

    useEffect(() => {
        if (player ) {
            console.log("playing: '" + startPlaying + "' and the player state is: '" + player.getPlayerState() + "'");
            if (startPlaying && (isPlayerStopped())) {
                player.unMute();
                player.playVideo();
                fadeToVolume(100, fadeDurationInSeconds);
            }
            else {
                if (isPlayerStopped() === false) {
                    fadeToVolume(0, fadeDurationInSeconds, () => { player.pauseVideo(); });
                }
            }
        }
    }, [startPlaying, player, fadeToVolume, isPlayerStopped, fadeDurationInSeconds]);

    const openFullscreen = useCallback(() => {
        if (docElement) {
            if (docElement.requestFullscreen) {
                docElement.requestFullscreen();
            } else if (docElement.webkitRequestFullscreen) { /* Safari */
                docElement.webkitRequestFullscreen();
            } else if (docElement.msRequestFullscreen) { /* IE11 */
                docElement.msRequestFullscreen();
            }
        }
    }, [docElement]);

    const closeFullscreen = useCallback(() => {
        if (docElement) {
            if (docElement.exitFullscreen) {
                docElement.exitFullscreen();
            } else if (docElement.webkitExitFullscreen) { /* Safari */
                docElement.webkitExitFullscreen();
            } else if (docElement.msExitFullscreen) { /* IE11 */
                docElement.msExitFullscreen();
            }
        }
    }, [docElement]);

    useEffect(() => {
        if (docElement) {
            if (fullscreen) {
                openFullscreen();
            } else {
                closeFullscreen();
            }
        }

    }, [fullscreen, docElement, openFullscreen, closeFullscreen]);

    const opts = {
        minHeight: minHeight,
        minWidth: minWidth,
        playerVars: {
            // https://developers.google.com/youtube/player_parameters
            playsinline: 0,
            controls: 0,
            disablekb: 1,
            iv_load_policy: 3,
            fs: 0,
        },
    };

    return (
        <div onClick={handleClick}>
            <YouTube className="VideoFrame" iframeClassName="VideoFrame" opts={opts} videoId={video} onReady={onPlayerReady} onStateChange={onStateChage} />
            {useOverlay && (
                <Overlay showOverlay={showOverlay} slide={overlaySlide} fadeDurationInSeconds={fadeDurationInSeconds} />
            )}
        </div>
    );
}

export default VideoFadeFrame;