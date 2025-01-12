import { useEffect, useState } from 'react';
import './VideoFrame.css';
import YouTube from 'react-youtube';

import Overlay from './Overlay';
import slide from '../This_Is_The_Way.png';

function VideoJsFrame({ start, video }) {
    const [showOverlay, setShowOverlay] = useState(true);
    const [play, setPlay] = useState(false);
    const [player, setPlayer] = useState(null);

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
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showOverlay]);


    const onPlayerReady = (event) => {
        event.target.seekTo(start);
        setPlayer(event.target);
    }

    const onStateChage = (event) => {
        console.log('Player State Changed: ' + event.data);
    }

    useEffect(() => {
        console.log("play=" + play);
        console.log(player);
        if (player) {
            if (play) {
                console.log("play!!");
                player.playVideo();
                // player.unMute();
                // player.setVolume(100);
            }
            else {
                console.log("play!!");
                player.pauseVideo();
                // player.setVolume(0);
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
        },
    };

    return (
        <>
            <YouTube className="VideoFrame" opts={opts} videoId={video} onReady={onPlayerReady} onStateChange={onStateChage} />
            <Overlay showOverlay={showOverlay} slide={slide} />
        </>
    );
}

export default VideoJsFrame;