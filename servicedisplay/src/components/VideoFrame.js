import './VideoFrame.css';

function VideoFrame() {
  return (
      <iframe className="VideoFrame"
          src="https://www.youtube.com/embed/7GtdOFQsYyU?si=HWFMAn2cmtZ8QoPn" 
          title="YouTube video player" 
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          aoutoplay
          referrerPolicy="strict-origin-when-cross-origin" 
          allowFullScreen />
  );
}

export default VideoFrame;
