import React, { useState, useEffect } from 'react';
import Soundfont, { InstrumentName, Player } from 'soundfont-player';

interface SoundfontProviderProps {
  instrumentName: InstrumentName;
  hostname: string;
  format?: 'mp3' | 'ogg';
  soundfont?: 'MusyngKite' | 'FluidR3_GM';
  audioContext: AudioContext;
  render: (props: { playNote: (midiNumber: number) => void; stopNote: (midiNumber: number) => void }) => JSX.Element;
}

const SoundfontProvider: React.FC<SoundfontProviderProps> = ({
  instrumentName,
  hostname,
  format = 'mp3',
  soundfont = 'MusyngKite',
  audioContext,
  render,
}) => {
  const [instrument, setInstrument] = useState<Player | null>(null);
  const [activeAudioNodes, setActiveAudioNodes] = useState<{ [key: number]: any }>({});

  useEffect(() => {
    loadInstrument();
    return () => {
      // Cleanup audio nodes when component unmounts
      Object.values(activeAudioNodes).forEach((node: any) => {
        if (node) {
          node.stop();
        }
      });
    };
  }, [instrumentName]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInstrument = () => {
    Soundfont.instrument(audioContext, instrumentName, {
      format,
      soundfont,
      nameToUrl: (name: string, soundfont: string, format: string) => {
        return `${hostname}/${soundfont}/${name}-${format}.js`;
      },
    }).then((instrument) => {
      setInstrument(instrument);
    });
  };

  const playNote = (midiNumber: number) => {
    if (instrument) {
      const audioNode = instrument.play(midiNumber.toString());
      setActiveAudioNodes((prev) => ({
        ...prev,
        [midiNumber]: audioNode,
      }));
    }
  };

  const stopNote = (midiNumber: number) => {
    if (activeAudioNodes[midiNumber]) {
      activeAudioNodes[midiNumber].stop();
      setActiveAudioNodes((prev) => {
        const newNodes = { ...prev };
        delete newNodes[midiNumber];
        return newNodes;
      });
    }
  };

  return render({
    playNote,
    stopNote,
  });
};

export default SoundfontProvider; 