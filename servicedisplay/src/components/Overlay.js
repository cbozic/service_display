import React from 'react';
import './Overlay.css';

function Overlay(props) {  
    return (
        <div className={props.showOverlay?"overlay fadeOut":"overlay fadeIn"}>
        {/* Content inside the overlay can go here */}
        </div>
    );
}

export default Overlay;