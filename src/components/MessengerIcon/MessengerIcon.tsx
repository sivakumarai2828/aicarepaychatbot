import React from 'react';
import { FaComments } from 'react-icons/fa';

interface MessengerIconProps {
  onClick: () => void;
  isMinimized: boolean;
}

export const MessengerIcon: React.FC<MessengerIconProps> = ({ onClick, isMinimized }) => {
  if (!isMinimized) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-16 h-16 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg flex items-center justify-center z-chat transition-all duration-300 hover:scale-110"
      aria-label="Open chat"
    >
      <FaComments size={24} />
    </button>
  );
};

