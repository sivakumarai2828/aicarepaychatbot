import React from 'react';
import { ChatHeader } from '../ChatHeader';
import { ChatContent } from '../ChatContent';
import { ChatInput } from '../ChatInput';
import { MessengerIcon } from '../MessengerIcon';
import { useChatWindow } from './hooks/useChatWindow';
import { bills } from '../../../constants/bills';
import { PaymentSummary } from '../../../types/interfaces';
import type { Message } from '../../../types/chat';

interface ChatWindowProps {
  onPaymentConfirmed?: (data: {
    confirmationNumber: string;
    paymentSummary: PaymentSummary;
    email?: string;
  }) => void;
  onShowPaymentForm?: (paymentSummary: PaymentSummary) => void;
  onChatStateChange?: (isOpen: boolean) => void;
  onBackgroundChange?: (showMain: boolean) => void;
  voiceMessages?: Message[];
}

export const ChatWindow = React.memo(function ChatWindow({
  onPaymentConfirmed,
  onShowPaymentForm,
  onChatStateChange,
  onBackgroundChange,
  voiceMessages = []
}: ChatWindowProps) {
  const {
    isMinimized,
    showBills,
    showCustomAmount,
    selectedBill,
    isProcessing,
    showOptions,
    showPaymentSummary,
    messages,
    isTyping,
    currentOptions,
    conversationState,
    isAccountProcessing,
    isPlanProcessing,
    isLoading,
    handlers,
    setIsMinimized
  } = useChatWindow({
    onPaymentConfirmed,
    onShowPaymentForm,
    onBackgroundChange,
    voiceMessages
  });

  const handleMinimize = React.useCallback(() => {
    setIsMinimized(true);
  }, [setIsMinimized]);

  const handleOpen = React.useCallback(() => {
    setIsMinimized(false);
  }, [setIsMinimized]);

  React.useEffect(() => {
    if (onChatStateChange) {
      onChatStateChange(!isMinimized);
    }
  }, [isMinimized, onChatStateChange]);

  return (
    <>
      <MessengerIcon onClick={handleOpen} isMinimized={isMinimized} />
      {!isMinimized && (
        <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl z-chat">
          <ChatHeader 
            onClose={handleMinimize}
            onMinimize={handleMinimize}
          />
          <div className="h-[600px] flex flex-col">
            <ChatContent
              messages={messages}
              isTyping={isTyping}
              isProcessing={isProcessing}
              isAccountProcessing={isAccountProcessing}
              isPlanProcessing={isPlanProcessing}
              showBills={showBills}
              showCustomAmount={showCustomAmount}
              selectedBill={selectedBill}
              showOptions={showOptions}
              showPaymentSummary={showPaymentSummary}
              conversationState={conversationState}
              currentOptions={currentOptions}
              bills={bills}
              isLoading={isLoading}
              onBillSelect={handlers.handleBillSelect}
              onCustomAmount={handlers.handleCustomAmount}
              onOptionSelect={handlers.handleOptionSelect}
              onOTPComplete={handlers.handleOTPVerification}
              onResendOTP={handlers.handleResendOTP}
            />
            <ChatInput onSendMessage={handlers.handleSendMessage} />
          </div>
        </div>
      )}
    </>
  );
});