import React from 'react';
import './Overlay.css';

function Overlay({ showOverlay, fadeDurationInSeconds, slide }) {
    return (
        <div style={{
            animation: showOverlay ? "fadeOut " + fadeDurationInSeconds + "s" : "fadeIn " + fadeDurationInSeconds + "s",
            opacity: showOverlay ? "1" : "0",
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0)", /* black */
            pointerEvents: "all",
        }}>
            {slide ?
                <img src={slide} height="99%" width="99%" alt="Overlay Slide" />
                : 
                <div />
            }
        </div>
    );
}

export default Overlay;