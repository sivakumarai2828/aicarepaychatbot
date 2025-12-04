import React from 'react';
import { ChatMessage } from '../ChatMessage/ChatMessage';
import type { Message, Bill, ChatOption, ConversationState } from '../../../types/chat';

import { useVoiceMode } from '../../../contexts/VoiceModeContext';

interface ChatContentProps {
  messages: Message[];
  isTyping: boolean;
  isProcessing: boolean;
  isAccountProcessing: boolean;
  isPlanProcessing: boolean;
  showBills: boolean;
  showCustomAmount: boolean;
  selectedBill: Bill | null;
  showOptions: boolean;
  showPaymentSummary: boolean;
  conversationState: ConversationState;
  currentOptions: ChatOption[];
  bills: Bill[];
  isLoading: boolean;
  onBillSelect: (billId: string) => void;
  onCustomAmount: (amount: number) => void;
  onOptionSelect: (optionId: string) => void;
  onOTPComplete: (otp: string) => void;
  onResendOTP: () => void;
}

export const ChatContent: React.FC<ChatContentProps> = ({
  messages,
  isTyping,
  isProcessing,
  isAccountProcessing,
  isPlanProcessing,
  showOptions,
  currentOptions,
  onOptionSelect
}) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const { toggleVoiceMode, isVoiceMode } = useVoiceMode();

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleOptionClick = async (optionId: string) => {
    if (optionId === 'enable_voice') {
      // Activate voice mode
      if (!isVoiceMode) {
        await toggleVoiceMode();
      }
    } else {
      // Handle other options normally
      onOptionSelect(optionId);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id}
          message={message}
          isLatest={index === messages.length - 1}
        />
      ))}

      {/* Bills are displayed in the main view, not in chat */}

      {showOptions && currentOptions.length > 0 && (
        <div className="space-y-2">
          {currentOptions
            .filter(option => !(option.id === 'enable_voice' && isVoiceMode))
            .map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                className="w-full p-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-left transition-colors"
              >
                <div className="font-medium text-teal-900">{option.label}</div>
                {option.details && (
                  <div className="text-sm text-teal-700 mt-1">{option.details}</div>
                )}
              </button>
            ))}
        </div>
      )}

      {(isTyping || isProcessing || isAccountProcessing || isPlanProcessing) && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

