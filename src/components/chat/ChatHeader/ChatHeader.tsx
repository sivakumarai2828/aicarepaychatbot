import React from 'react';
import { IoClose, IoRemove } from 'react-icons/io5';
import { BotAvatar } from '../../BotAvatar';
import { SpeechToggle } from '../../SpeechToggle/SpeechToggle';

interface ChatHeaderProps {
  onClose: () => void;
  onMinimize: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  onClose, 
  onMinimize
}) => {
  return (
    <div className="bg-teal-600 text-white p-2 flex justify-between items-center rounded-t-lg">
      <div className="flex items-center gap-2">
        <BotAvatar />
        <div className="flex flex-col">
          <h2 className="text-base leading-tight">
            <span className="font-bold text-lg">CareCredit</span>
            {' '}
            <span className="font-bold text-lg">QuickPayBot</span>
          </h2>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <SpeechToggle />
        <button
          onClick={onMinimize}
          className="hover:text-gray-300 transition-colors p-1"
          aria-label="Minimize chat"
        >
          <IoRemove size={16} />
        </button>
        <button
          onClick={onClose}
          className="hover:text-gray-300 transition-colors p-1"
          aria-label="Close chat"
        >
          <IoClose size={16} />
        </button>
      </div>
    </div>
  );
};