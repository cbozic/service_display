import React, { useState, useEffect, useCallback } from 'react';
import './VideoFrame.css';
import YouTube, { YouTubeEvent, YouTubeProps, YouTubePlayer } from 'react-youtube';

import Overlay from './Overlay';
// import slide from '../This_Is_The_Way.png';

interface VideoJsFrameProps {
    video: string;
    start: number;
    slidePath: string;
}

interface YouTubePlayerEvent {
    target: YouTubePlayer;
    data: number;
}

const VideoJsFrame: React.FC<VideoJsFrameProps> = ({ video, start, slidePath}) => {
    const [player, setPlayer] = useState<YouTubePlayer>();
    const [play, setPlay] = useState(false);
    const [showOverlay, setShowOverlay] = useState(true);
    const [startSeconds, setStartSeconds] = useState(start);
    const [fadeInDelayInSeconds, setFadeInDelayInSeconds] = useState(1);
    const [slide, setSlide] = useState(slidePath);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
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
    }, [showOverlay, player]);

    const onPlayerReady = useCallback((event: YouTubePlayerEvent) => {
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

    const onStateChage = useCallback((event: YouTubePlayerEvent) => {
        console.log('Player State Changed: ' + event.data);
        if (0 === event.data) {
            // Video has reached the end so reset the player
            setShowOverlay(true);
            setPlay(false);
            player.seekTo(start);
        }
    }, [player, start]);

    const fadeVolume = useCallback((targetVolume: number, fadeDurationInSeconds = 0, invokeWhenFinished = ()=>{}) => {
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
    }, [player]);

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