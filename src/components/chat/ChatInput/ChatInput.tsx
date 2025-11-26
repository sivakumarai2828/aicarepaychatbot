import React, { useState, FormEvent } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import { useVoiceMode } from '../../../contexts/VoiceModeContext';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const { isVoiceMode, isConnecting, isRecording, toggleVoiceMode, toggleRecording, sendTextMessage } = useVoiceMode();

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

  const handleMicClick = async () => {
    if (!isVoiceMode) {
      await toggleVoiceMode();
    } else {
      await toggleRecording();
    }
  };

  const handleDisableVoiceMode = async () => {
    if (isVoiceMode) {
      await toggleVoiceMode();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isVoiceMode ? "Voice mode active - click mic to talk..." : "Type your message..."}
          className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Message input"
        />
        {isVoiceMode && (
          <button
            type="button"
            onClick={handleDisableVoiceMode}
            className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors"
            title="Disable voice mode"
          >
            Disable
          </button>
        )}
        <button
          type="button"
          onClick={handleMicClick}
          disabled={isConnecting}
          className={`
            p-3 rounded-full transition-all duration-200 flex-shrink-0
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
      </div>
      {isVoiceMode && (
        <div className="text-xs text-green-600 mt-1 text-center">
          {isRecording ? 'Recording... Click mic to stop' : 'Voice mode active - Click mic to talk or Disable to exit'}
        </div>
      )}
    </form>
  );
};