import React from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { useVoiceMode } from '../../contexts/VoiceModeContext';

export const VoiceModeToggle: React.FC = () => {
  const { isVoiceMode, isConnecting, isRecording, toggleVoiceMode, startRecording, stopRecording } = useVoiceMode();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggleVoiceMode}
        disabled={isConnecting}
        className={`
          px-4 py-2 rounded-lg font-medium transition-all duration-200
          ${isVoiceMode
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }
          ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isConnecting ? 'Connecting...' : isVoiceMode ? 'Voice Mode On' : 'Voice Mode Off'}
      </button>

      {isVoiceMode && (
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`
            p-4 rounded-full transition-all duration-200
            ${isRecording
              ? 'bg-red-500 scale-110 shadow-lg'
              : 'bg-blue-500 hover:bg-blue-600'
            }
            text-white
          `}
          title="Hold to talk"
        >
          {isRecording ? (
            <FaMicrophone className="text-2xl animate-pulse" />
          ) : (
            <FaMicrophoneSlash className="text-2xl" />
          )}
        </button>
      )}
    </div>
  );
};
