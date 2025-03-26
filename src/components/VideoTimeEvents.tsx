import * as React from 'react';
import { useEffect, useRef } from 'react';

interface TimeEvent {
  time: number;
  callback: () => void;
  triggered: boolean;
}

interface VideoTimeEventsProps {
  player: any;
  isPlaying: boolean;
}

const VideoTimeEvents = React.forwardRef<any, VideoTimeEventsProps>(({ player, isPlaying }, ref) => {
  const eventsRef = useRef<TimeEvent[]>([]);
  const intervalRef = useRef<number | null>(null);
  const lastCheckTimeRef = useRef<number>(0);

  // Function to register a new time event
  const registerEvent = (time: number, callback: () => void) => {
    console.log(`[VideoTimeEvents] Registering new event for time ${time}`);
    eventsRef.current.push({
      time,
      callback,
      triggered: false
    });
  };

  // Function to clear all events
  const clearEvents = () => {
    console.log('[VideoTimeEvents] Clearing all events');
    eventsRef.current = [];
  };

  // Function to check and trigger events
  const checkEvents = () => {
    if (!player) {
      console.log('[VideoTimeEvents] No player available, skipping check');
      return;
    }

    try {
      const currentTime = player.getCurrentTime();
      console.log(`[VideoTimeEvents] Current time: ${currentTime.toFixed(2)}s`);
      
      // If we've moved backwards in time, re-enable events that should trigger
      if (currentTime < lastCheckTimeRef.current) {
        console.log(`[VideoTimeEvents] Time moved backwards from ${lastCheckTimeRef.current.toFixed(2)}s to ${currentTime.toFixed(2)}s`);
        eventsRef.current.forEach(event => {
          if (event.triggered && currentTime < event.time) {
            console.log(`[VideoTimeEvents] Re-enabling event for time ${event.time}s`);
            event.triggered = false;
          }
        });
      }
      
      // Sort events by time to ensure they trigger in order
      const sortedEvents = [...eventsRef.current].sort((a, b) => a.time - b.time);
      
      // Check each event in order
      sortedEvents.forEach(event => {
        if (!event.triggered && currentTime >= event.time) {
          console.log(`[VideoTimeEvents] Triggering event for time ${event.time}s at current time ${currentTime.toFixed(2)}s`);
          event.callback();
          event.triggered = true;
        }
      });

      lastCheckTimeRef.current = currentTime;
    } catch (error) {
      console.error('[VideoTimeEvents] Error checking time events:', error);
    }
  };

  // Set up interval to check events
  useEffect(() => {
    if (isPlaying) {
      console.log('[VideoTimeEvents] Starting event checking interval');
      // Clear any existing interval
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }

      // Set up new interval to check every 100ms
      intervalRef.current = window.setInterval(checkEvents, 500);
    } else {
      console.log('[VideoTimeEvents] Stopping event checking interval');
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, checkEvents, player]);

  // Expose methods through ref
  React.useImperativeHandle(ref, () => ({
    registerEvent,
    clearEvents
  }));

  return null;
});

export default VideoTimeEvents; 