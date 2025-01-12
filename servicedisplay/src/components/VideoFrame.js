import './VideoFrame.css';

function VideoFrame(props) {
  return (
      <iframe className="VideoFrame"
          src={"https://www.youtube.com/embed/" + props.video + "?start=" + (props.start? props.start : '0') + "&autoplay=" + (props.play? '1': '0')+ "&mute=0&controls=0&loop=0"}
          title="YouTube video player" 
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          referrerPolicy="strict-origin-when-cross-origin" 
          allowFullScreen />
  );
}

export default VideoFrame;
