declare module 'react-piano' {
  import { ComponentType } from 'react';

  export interface NoteRange {
    first: number;
    last: number;
  }

  export interface PianoProps {
    noteRange: NoteRange;
    playNote: (midiNumber: number) => void;
    stopNote: (midiNumber: number) => void;
    width?: number;
    keyboardShortcuts?: KeyboardShortcut[];
    className?: string;
    disabled?: boolean;
    renderNoteLabel?: (midiNumber: number) => JSX.Element;
  }

  export interface KeyboardShortcut {
    key: string;
    midiNumber: number;
  }

  export const Piano: ComponentType<PianoProps>;

  export const KeyboardShortcuts: {
    create: (config: {
      firstNote: number;
      lastNote: number;
      keyboardConfig: string[];
    }) => KeyboardShortcut[];
    HOME_ROW: string[];
    BOTTOM_ROW: string[];
    TOP_ROW: string[];
  };

  export const MidiNumbers: {
    fromNote: (note: string) => number;
    getAttributes: (midiNumber: number) => {
      note: string;
      pitchName: string;
      octave: number;
      midiNumber: number;
      isAccidental: boolean;
    };
  };
} 