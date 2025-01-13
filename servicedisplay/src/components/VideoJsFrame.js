import React, { useState, useEffect } from 'react';
import './VideoFrame.css';
import YouTube from 'react-youtube';

import Overlay from './Overlay';
import slide from '../This_Is_The_Way.png';

const VideoJsFrame = ({ video, start }) => {
    const [player, setPlayer] = useState(null);
    const [play, setPlay] = useState(false);
    const [showOverlay, setShowOverlay] = useState(true);
    const [startSeconds, setStartSeconds] = useState(start);
    const [fadeInDelayInSeconds, setFadeInDelayInSeconds] = useState(1);

    useEffect(() => {
        const handleKeyDown = (event) => {
            console.log(event.code)
            if (event.code === 'Space') {
                if (showOverlay) {
                    setShowOverlay(false);
                    setPlay(true);
                }
                else {
                    setShowOverlay(true);
                    setPlay(false);
                }
            }
            else if (event.code === 'ArrowLeft') {
                player.seekTo(player.getCurrentTime() - 5);
            }
            else if (event.code === 'ArrowRight') {
                player.seekTo(player.getCurrentTime() + 15);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showOverlay]);

    const onPlayerReady = (event) => {
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
    }

    const onStateChage = (event) => {
        console.log('Player State Changed: ' + event.data);
        if (0 === event.data) {
            // Video has reached the end so reset the player
            setShowOverlay(true);
            setPlay(false);
            player.seekTo(start);
        }
    }

    const fadeVolume = (targetVolume, fadeDurationInSeconds = 0, invokeWhenFinished = ()=>{}) => {
        const currentVolume = player.getVolume();
        const volumeDifference = targetVolume - currentVolume;
        const steps = 50; // Number of steps for the fade effect
        const stepDuration = (fadeDurationInSeconds * 1000) / steps;
        let currentStep = 0;

        const fadeInterval = setInterval(() => {
            if (currentStep < steps) {
                const newVolume = currentVolume + (volumeDifference * (currentStep / steps));
                player.setVolume(newVolume);
                currentStep++;
            } else {
                player.setVolume(targetVolume);
                clearInterval(fadeInterval);
                invokeWhenFinished();
            }
        }, stepDuration);
    }

    useEffect(() => {
        console.log("play=" + play);
        console.log(player);
        if (player) {
            if (play) {
                player.unMute();
                player.playVideo();
                fadeVolume(100, 2);
            }
            else {
                fadeVolume(0, 2, () => {player.pauseVideo();});
            }
        }
    }, [play]);

    const opts = {
        minHeight: '100%',
        minWidth: '100%',
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
        <>
            <YouTube className="VideoFrame" iframeClassName="VideoFrame" opts={opts} videoId={video} onReady={onPlayerReady} onStateChange={onStateChage} />
            <Overlay showOverlay={showOverlay} slide={slide} />
        </>
    );
}

export default VideoJsFrame;