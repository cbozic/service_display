import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Box, Card, CardMedia, CardContent } from '@mui/material';

interface VideoListProps {
  setVideo: (value: string) => void;
}

interface VideoData {
  title: string;
  videoId: string;
  thumbnailUrl: string;
}

const VideoList: React.FC<VideoListProps> = ({ setVideo }) => {
  const [videos, setVideos] = useState<VideoData[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get('https://www.youtube.com/playlist?list=PLFgcIA8Y9FMBC0J45C3f4izrHSPCiYirL');
        const html = response.data;
        console.log(html);
        const videoIds = Array.from(html.matchAll(/\{".*?videoRenderer":\{"videoId":"(.*?)"/gi) as IterableIterator<RegExpMatchArray>).map((match: RegExpMatchArray) => match[1]);
        const titles = Array.from(html.matchAll(/"title":{"runs":\[{"text":"(.*?)"/g) as IterableIterator<RegExpMatchArray>).map((match: RegExpMatchArray) => match[1]);
        const videoDataMap = new Map<string, { title: string; thumbnailUrl: string }>();
        videoIds.forEach((videoId, index) => {
          if (!videoDataMap.has(videoId)) {
            videoDataMap.set(videoId, {
              title: titles[index],
              thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            });
          }
        });
        const videoData = Array.from(videoDataMap.entries()).map(([videoId, data]) => ({
          videoId,
          title: data.title,
          thumbnailUrl: data.thumbnailUrl
        }));
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
        <Card key={video.videoId} sx={{ width: '100%', maxWidth: 600 }}>
          <CardMedia
            component="img"
            height="200"
            image={video.thumbnailUrl}
            alt={video.title}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              // Fallback to medium quality thumbnail if maxresdefault is not available
              e.currentTarget.src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
            }}
          />
          <CardContent>
            <Button 
              onClick={() => setVideo(video.videoId)} 
              variant="contained" 
              color="primary"
              fullWidth
            >
              {video.title}
            </Button>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default VideoList;
