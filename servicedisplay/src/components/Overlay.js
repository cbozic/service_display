import React from 'react';
import './Overlay.css';

function Overlay(props) {  
    return (
        <div className={props.showOverlay?"overlay fadeOut":"overlay fadeIn"}>
            {props.slide? <img src={props.slide} height="99%" width="99%" alt="Overlay Slide" />: <div/>}
        </div>
    );
}

export default Overlay;