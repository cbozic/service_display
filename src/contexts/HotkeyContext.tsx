import React, { createContext, useContext, useEffect, useCallback } from 'react';

export interface HotkeyHandler {
  key: string;
  description: string;
  handler: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

interface HotkeyContextType {
  registerHotkey: (handler: HotkeyHandler) => void;
  unregisterHotkey: (key: string) => void;
  getHotkeyDescription: (key: string) => string | undefined;
}

const HotkeyContext = createContext<HotkeyContextType | null>(null);

export const useHotkeys = () => {
  const context = useContext(HotkeyContext);
  if (!context) {
    throw new Error('useHotkeys must be used within a HotkeyProvider');
  }
  return context;
};

export const HotkeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hotkeyHandlers = React.useRef<Map<string, HotkeyHandler>>(new Map());

  const registerHotkey = useCallback((handler: HotkeyHandler) => {
    hotkeyHandlers.current.set(handler.key, handler);
  }, []);

  const unregisterHotkey = useCallback((key: string) => {
    hotkeyHandlers.current.delete(key);
  }, []);

  const getHotkeyDescription = useCallback((key: string) => {
    return hotkeyHandlers.current.get(key)?.description;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const handler = hotkeyHandlers.current.get(event.code);
      
      if (handler && handler.enabled !== false) {
        if (handler.preventDefault !== false) {
          event.preventDefault();
        }
        handler.handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <HotkeyContext.Provider value={{ registerHotkey, unregisterHotkey, getHotkeyDescription }}>
      {children}
    </HotkeyContext.Provider>
  );
}; 