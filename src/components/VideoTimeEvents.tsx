import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useTimeEvents, TimeEvent } from '../contexts/TimeEventsContext';

interface TimeEventWithCallback extends Omit<TimeEvent, 'triggered'> {
  callback: () => void;
  triggered: boolean;
}

interface VideoTimeEventsProps {
  player: any;
  isPlaying: boolean;
}

interface VideoTimeEventsRef {
  registerEvent: (time: number, callback: () => void, eventInfo?: Omit<TimeEvent, 'triggered' | 'time'>) => void;
  clearEvents: () => void;
}

const VideoTimeEvents = React.forwardRef<VideoTimeEventsRef, VideoTimeEventsProps>(({ player, isPlaying }, ref) => {
  const eventsRef = useRef<TimeEventWithCallback[]>([]);
  const intervalRef = useRef<number | null>(null);
  const lastCheckTimeRef = useRef<number>(0);
  const { events, addEvent, clearEvents: clearContextEvents, updateTriggered } = useTimeEvents();

  // Function to register a new time event
  const registerEvent = (time: number, callback: () => void, eventInfo?: Omit<TimeEvent, 'time' | 'triggered'>) => {
    console.log(`[VideoTimeEvents] Registering new event for time ${time}`);
    
    // Determine event type and action type from callback function string representation
    const callbackStr = callback.toString().toLowerCase();
    
    // Default values
    let eventType: TimeEvent['eventType'] = 'other';
    let actionType: TimeEvent['actionType'] = 'one-time';
    
    // Try to determine event type
    if (callbackStr.includes('fullscreen')) {
      eventType = 'fullscreen';
    } else if (callbackStr.includes('pip')) {
      eventType = 'pip';
    } else if (callbackStr.includes('duck')) {
      eventType = 'ducking';
    } else if (callbackStr.includes('paus')) {
      eventType = 'pause';
    } else if (callbackStr.includes('unpaus')) {
      eventType = 'unpause';
    }
    
    // Try to determine action type
    if (callbackStr.includes('enable') || callbackStr.includes('auto-enabling')) {
      actionType = 'enable';
    } else if (callbackStr.includes('disable') || callbackStr.includes('auto-disabling')) {
      actionType = 'disable';
    }
    
    // Override with provided values if any
    if (eventInfo) {
      if (eventInfo.eventType) eventType = eventInfo.eventType;
      if (eventInfo.actionType) actionType = eventInfo.actionType;
    }

    // Add to internal event registry
    eventsRef.current.push({
      time,
      callback,
      eventType,
      actionType,
      triggered: false
    });
    
    // Add to context for sharing with other components
    addEvent({
      time,
      eventType,
      actionType
    });
  };

  // Function to clear all events
  const clearEvents = () => {
    console.log('[VideoTimeEvents] Clearing all events');
    eventsRef.current = [];
    clearContextEvents();
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
            updateTriggered(event.time, false);
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
          updateTriggered(event.time, true);
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