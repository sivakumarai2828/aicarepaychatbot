import React, { useState, FormEvent } from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { useVoiceMode } from '../../../contexts/VoiceModeContext';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const { isVoiceMode, isConnecting, isRecording, toggleVoiceMode, startRecording, stopRecording, sendTextMessage } = useVoiceMode();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      if (isVoiceMode) {
        sendTextMessage(message.trim());
      } else {
        onSendMessage(message.trim());
      }
      setMessage('');
    }
  };

  return (
    <div className="border-t">
      <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-center gap-3">
        <button
          onClick={toggleVoiceMode}
          disabled={isConnecting}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
            ${isVoiceMode
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
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
              p-2 rounded-full transition-all duration-200
              ${isRecording
                ? 'bg-red-500 scale-110 shadow-lg'
                : 'bg-blue-500 hover:bg-blue-600'
              }
              text-white
            `}
            title="Hold to talk"
          >
            {isRecording ? (
              <FaMicrophone className="text-lg animate-pulse" />
            ) : (
              <FaMicrophoneSlash className="text-lg" />
            )}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isVoiceMode ? "Voice mode active - or type here..." : "Type your message..."}
          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Message input"
        />
      </form>
    </div>
  );
};