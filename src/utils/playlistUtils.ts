import axios from 'axios';

export interface VideoData {
  videoId: string;
  title: string;
  thumbnailUrl: string;
}

export const fetchPlaylistVideos = async (playlistUrl: string): Promise<VideoData[]> => {
  try {
    if (!playlistUrl) {
      throw new Error('No playlist URL provided');
    }

    const response = await axios.get(playlistUrl);
    const html = response.data as string;
    const videoMatches = Array.from(html.matchAll(/\{".*?videoRenderer":\{"videoId":"(.*?)"/gi));
    const titleMatches = Array.from(html.matchAll(/"title":{"runs":\[{"text":"(.*?)"/g));
    
    const videoIds = videoMatches.map(match => match[1]);
    const titles = titleMatches.map(match => match[1]);
    
    if (!videoIds.length || !titles.length) {
      throw new Error('No videos found in playlist');
    }

    const videoDataMap = new Map<string, { title: string; thumbnailUrl: string }>();
    videoIds.forEach((videoId, index) => {
      if (index < titles.length && !videoDataMap.has(videoId)) {
        videoDataMap.set(videoId, {
          title: titles[index],
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        });
      }
    });
    
    return Array.from(videoDataMap.entries()).map(([videoId, data]) => ({
      videoId,
      title: data.title,
      thumbnailUrl: data.thumbnailUrl
    }));
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw error;
  }
}; 