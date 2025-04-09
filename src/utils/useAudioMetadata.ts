import { useState, useCallback, useEffect } from 'react';

export interface AudioMetadata {
    title: string;
    artist: string;
    album?: string;
    year?: string;
    coverArt?: string; // Base64 encoded image
}

interface ID3Tag {
    version: string;
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
    comment?: string;
    genre?: number;
    image?: string;
}

/**
 * Custom hook to extract metadata from audio files
 */
export const useAudioMetadata = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [cachedMetadata, setCachedMetadata] = useState<Record<string, AudioMetadata>>({});

    /**
     * Extract metadata from a filename (fallback method)
     */
    const extractFromFilename = useCallback((filePath: string): AudioMetadata => {
        // Check cache first
        if (cachedMetadata[filePath]) {
            return cachedMetadata[filePath];
        }

        const filename = filePath.split('/').pop() || '';
        // Remove file extension and any leading numbers
        const cleanName = filename.replace('.mp3', '').replace(/^\d+-/, '');
        
        // Try to split artist and title if there's a hyphen
        let title = cleanName;
        let artist = 'Unknown Artist';
        
        if (cleanName.includes('-')) {
            const parts = cleanName.split('-');
            artist = parts[0].trim();
            title = parts.slice(1).join('-').trim();
        }
        
        const metadata = {
            title,
            artist,
            album: 'Unknown Album'
        };
        
        // Cache the result
        setCachedMetadata(prev => ({ ...prev, [filePath]: metadata }));
        return metadata;
    }, [cachedMetadata]);

    /**
     * Extract ID3 tag data from an array buffer
     */
    const parseID3 = useCallback((arrayBuffer: ArrayBuffer): ID3Tag | null => {
        try {
            const dataView = new DataView(arrayBuffer);
            const decoder = new TextDecoder('utf-8');
            
            // Check for ID3v2 header (ID3)
            if (decoder.decode(new Uint8Array(arrayBuffer, 0, 3)) === 'ID3') {
                const version = `2.${dataView.getUint8(3)}.${dataView.getUint8(4)}`;
                const headerSize = 10;
                let offset = headerSize;
                
                // Calculate the total ID3 tag size
                const size = ((dataView.getUint8(6) & 0x7f) << 21) |
                             ((dataView.getUint8(7) & 0x7f) << 14) |
                             ((dataView.getUint8(8) & 0x7f) << 7) |
                             (dataView.getUint8(9) & 0x7f);
                
                const id3Tag: ID3Tag = { version };
                
                // Parse frames
                while (offset < size) {
                    // Check if we have enough data left to read a frame
                    if (offset + 10 > arrayBuffer.byteLength) break;
                    
                    // Frame ID is the first 4 bytes
                    const frameID = decoder.decode(new Uint8Array(arrayBuffer, offset, 4));
                    
                    // Frame size is the next 4 bytes
                    const frameSize = dataView.getUint32(offset + 4, false);
                    
                    // Skip flags (2 bytes)
                    offset += 10;
                    
                    // Handle common frame types
                    switch (frameID) {
                        case 'TIT2': // Title
                            id3Tag.title = decoder.decode(new Uint8Array(arrayBuffer, offset + 1, frameSize - 1));
                            break;
                        case 'TPE1': // Artist
                            id3Tag.artist = decoder.decode(new Uint8Array(arrayBuffer, offset + 1, frameSize - 1));
                            break;
                        case 'TALB': // Album
                            id3Tag.album = decoder.decode(new Uint8Array(arrayBuffer, offset + 1, frameSize - 1));
                            break;
                        case 'TYER': // Year
                        case 'TDRC': // Recording time
                            id3Tag.year = decoder.decode(new Uint8Array(arrayBuffer, offset + 1, frameSize - 1));
                            break;
                        case 'COMM': // Comments
                            // Skip language (3 bytes) and description
                            let commentOffset = offset + 4;
                            // Find the end of the description (null byte)
                            while (dataView.getUint8(commentOffset) !== 0 && commentOffset < offset + frameSize) {
                                commentOffset++;
                            }
                            commentOffset++; // Skip the null byte
                            id3Tag.comment = decoder.decode(new Uint8Array(arrayBuffer, commentOffset, 
                                            offset + frameSize - commentOffset));
                            break;
                        case 'APIC': // Attached picture
                            // TODO: Extract image if needed
                            break;
                    }
                    
                    // Move to the next frame
                    offset += frameSize;
                }
                
                return id3Tag;
            }
            
            return null;
        } catch (err) {
            console.error('Error parsing ID3 tag:', err);
            return null;
        }
    }, []);

    /**
     * Attempt to load ID3 tags directly using fetch
     */
    const loadID3Tags = async (audioFile: string): Promise<ID3Tag | null> => {
        try {
            // Fetch only the first 64KB of the file to extract ID3 header
            const response = await fetch(audioFile, {
                headers: {
                    Range: 'bytes=0-65536' // First 64KB should contain ID3 data
                }
            });
            
            if (!response.ok) return null;
            
            const arrayBuffer = await response.arrayBuffer();
            return parseID3(arrayBuffer);
        } catch (err) {
            console.error('Error loading ID3 tags:', err);
            return null;
        }
    };

    /**
     * Extract metadata from an audio file
     */
    const extractMetadata = useCallback(async (audioFile: string): Promise<AudioMetadata> => {
        // Check cache first
        if (cachedMetadata[audioFile]) {
            return cachedMetadata[audioFile];
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            // First try to get ID3 tags directly from the file
            const id3tags = await loadID3Tags(audioFile);
            
            if (id3tags && (id3tags.title || id3tags.artist)) {
                const metadata: AudioMetadata = {
                    title: id3tags.title || extractFromFilename(audioFile).title,
                    artist: id3tags.artist || extractFromFilename(audioFile).artist,
                    album: id3tags.album,
                    year: id3tags.year
                };
                
                setIsLoading(false);
                setCachedMetadata(prev => ({ ...prev, [audioFile]: metadata }));
                return metadata;
            }
            
            // If ID3 tags don't work, try HTML5 Audio API
            return new Promise((resolve) => {
                const tempAudio = new Audio();
                
                // Set a timeout to avoid hanging
                const timeoutId = setTimeout(() => {
                    console.log('[useAudioMetadata] Metadata load timeout for:', audioFile);
                    const fallbackMetadata = extractFromFilename(audioFile);
                    setIsLoading(false);
                    setCachedMetadata(prev => ({ ...prev, [audioFile]: fallbackMetadata }));
                    resolve(fallbackMetadata);
                }, 3000);
                
                // Listen for metadata loaded event
                tempAudio.addEventListener('loadedmetadata', () => {
                    clearTimeout(timeoutId);
                    
                    // Try to extract metadata via the Media Session API
                    if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
                        const mediaMetadata = navigator.mediaSession.metadata;
                        const metadata = {
                            title: mediaMetadata.title || extractFromFilename(audioFile).title,
                            artist: mediaMetadata.artist || extractFromFilename(audioFile).artist,
                            album: mediaMetadata.album
                        };
                        setIsLoading(false);
                        setCachedMetadata(prev => ({ ...prev, [audioFile]: metadata }));
                        resolve(metadata);
                    } else {
                        // Fall back to filename-based metadata
                        const metadata = extractFromFilename(audioFile);
                        setIsLoading(false);
                        setCachedMetadata(prev => ({ ...prev, [audioFile]: metadata }));
                        resolve(metadata);
                    }
                });
                
                // Handle errors
                tempAudio.addEventListener('error', () => {
                    clearTimeout(timeoutId);
                    console.error('[useAudioMetadata] Error loading audio file for metadata:', audioFile);
                    setError(new Error('Failed to load audio file for metadata extraction'));
                    const fallbackMetadata = extractFromFilename(audioFile);
                    setIsLoading(false);
                    setCachedMetadata(prev => ({ ...prev, [audioFile]: fallbackMetadata }));
                    resolve(fallbackMetadata);
                });
                
                // Set the source and load
                tempAudio.src = audioFile;
                tempAudio.load();
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error extracting metadata');
            console.error('[useAudioMetadata] Error:', error);
            setError(error);
            setIsLoading(false);
            const fallbackMetadata = extractFromFilename(audioFile);
            setCachedMetadata(prev => ({ ...prev, [audioFile]: fallbackMetadata }));
            return fallbackMetadata;
        }
    }, [extractFromFilename, parseID3, cachedMetadata]);

    // Clear cache when component unmounts
    useEffect(() => {
        return () => {
            setCachedMetadata({});
        };
    }, []);

    return {
        extractMetadata,
        extractFromFilename,
        isLoading,
        error,
        cachedMetadata
    };
};

export default useAudioMetadata; 