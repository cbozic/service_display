import React from 'react';
import './Overlay.css';

function Overlay(props) {
    return (
        <div style={{
            animation: props.showOverlay ? "fadeOut " + props.fadeDurationInSeconds + "s" : "fadeIn " + props.fadeDurationInSeconds + "s",
            opacity: props.showOverlay ? "1" : "0",
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0)", /* black */
            pointerEvents: "all",
        }}>
            {props.slide ?
                <img src={props.slide} height="99%" width="99%" alt="Overlay Slide" />
                : 
                <div />
            }
        </div>
    );
}

export default Overlay;