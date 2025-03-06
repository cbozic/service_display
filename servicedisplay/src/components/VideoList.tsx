import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Box } from '@mui/material';

interface VideoListProps {
  setVideo: (value: string) => void;
}

const VideoList: React.FC<VideoListProps> = ({ setVideo }) => {
  const [videos, setVideos] = useState<{ title: string, videoId: string }[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get('https://www.youtube.com/@gatewaychurchtv/videos');
        const html = response.data;
        console.log(html);
        const videoIds = Array.from(html.matchAll(/"richItemRenderer":\{"content":\{"videoRenderer":\{"videoId":"(.*?)"/g) as IterableIterator<RegExpMatchArray>).map((match: RegExpMatchArray) => match[1]);
        const titles = Array.from(html.matchAll(/"title":{"runs":\[{"text":"(.*?)"/g) as IterableIterator<RegExpMatchArray>).map((match: RegExpMatchArray) => match[1]);
        const videoDataMap = new Map<string, string>();
        videoIds.forEach((videoId, index) => {
          if (!videoDataMap.has(videoId)) {
            videoDataMap.set(videoId, titles[index]);
          }
        });
        const videoData = Array.from(videoDataMap.entries()).map(([videoId, title]) => ({ videoId, title }));
        setVideos(videoData);
      } catch (error) {
        console.error('Error fetching videos:', error);
      }
    };

    fetchVideos();
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 2 }}>
      <h1>Video List</h1>
      {videos.map(video => (
        <Button key={video.videoId} onClick={() => setVideo(video.videoId)} variant="contained" color="primary">
          {video.title}
        </Button>
      ))}
    </Box>
  );
};

export default VideoList;
