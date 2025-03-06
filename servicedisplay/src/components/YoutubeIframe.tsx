import React from 'react';

const YoutubeIframe: React.FC = () => {
  return (
    <iframe
      src="https://www.youtube.com"
      style={{ width: '100%', height: '100%', border: 'none' }}
      title="YouTube"
    />
  );
};

export default YoutubeIframe;
