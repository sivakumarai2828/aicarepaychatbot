import React from 'react';
import { FaMicrophone } from 'react-icons/fa';
import { useVoiceMode } from '../../contexts/VoiceModeContext';

export const VoiceModeToggle: React.FC = () => {
  const { isVoiceMode, isConnecting, isRecording, toggleVoiceMode, toggleRecording } = useVoiceMode();

  const handleMicClick = async () => {
    if (!isVoiceMode) {
      await toggleVoiceMode();
    } else {
      await toggleRecording();
    }
  };

  return (
    <button
      onClick={handleMicClick}
      disabled={isConnecting}
      className={`
        p-3 rounded-full transition-all duration-200
        ${isRecording
          ? 'bg-red-500 scale-110 shadow-lg'
          : isVoiceMode
          ? 'bg-green-500 hover:bg-green-600'
          : 'bg-teal-600 hover:bg-teal-700'
        }
        ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        text-white
      `}
      title={isRecording ? "Stop recording" : isVoiceMode ? "Start recording" : "Enable voice mode"}
    >
      <FaMicrophone className={`text-lg ${isRecording ? 'animate-pulse' : ''}`} />
    </button>
  );
};
