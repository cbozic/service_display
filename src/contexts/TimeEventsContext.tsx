import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the structure of a time event
export interface TimeEvent {
  time: number;
  actionType: 'enable' | 'disable' | 'one-time';
  eventType: 'fullscreen' | 'pip' | 'ducking' | 'pause' | 'unpause' | 'other';
  triggered: boolean;
}

interface TimeEventsContextType {
  events: TimeEvent[];
  addEvent: (event: Omit<TimeEvent, 'triggered'>) => void;
  clearEvents: () => void;
  updateTriggered: (time: number, triggered: boolean) => void;
}

const TimeEventsContext = createContext<TimeEventsContextType | undefined>(undefined);

export const useTimeEvents = () => {
  const context = useContext(TimeEventsContext);
  if (!context) {
    throw new Error('useTimeEvents must be used within a TimeEventsProvider');
  }
  return context;
};

interface TimeEventsProviderProps {
  children: ReactNode;
}

export const TimeEventsProvider: React.FC<TimeEventsProviderProps> = ({ children }) => {
  const [events, setEvents] = useState<TimeEvent[]>([]);

  const addEvent = (event: Omit<TimeEvent, 'triggered'>) => {
    setEvents(prevEvents => {
      // Check if event at this time already exists
      const exists = prevEvents.some(e => e.time === event.time && e.eventType === event.eventType);
      if (exists) return prevEvents;
      
      return [...prevEvents, { ...event, triggered: false }];
    });
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const updateTriggered = (time: number, triggered: boolean) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.time === time ? { ...event, triggered } : event
      )
    );
  };

  return (
    <TimeEventsContext.Provider value={{ events, addEvent, clearEvents, updateTriggered }}>
      {children}
    </TimeEventsContext.Provider>
  );
}; 