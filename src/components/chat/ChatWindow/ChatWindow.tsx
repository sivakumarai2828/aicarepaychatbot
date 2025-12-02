import React from 'react';
import { ChatContent } from '../ChatContent/ChatContent';
import { ChatInput } from '../ChatInput/ChatInput';
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
  onViewChange?: (view: 'welcome' | 'bills' | 'payment-plans', data?: any) => void;
  voiceMessages?: Message[];
}

export const ChatWindow = React.memo(function ChatWindow({
  onPaymentConfirmed,
  onShowPaymentForm,
  onChatStateChange,
  onBackgroundChange,
  onViewChange,
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
    onViewChange,
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
      {/* Minimized Chat Button */}
      {isMinimized && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 group"
          aria-label="Open chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {/* Right Side Chat Panel */}
      {!isMinimized && (
        <div className="fixed top-0 right-0 h-screen w-full md:w-[400px] lg:w-[450px] bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-lg">CareCredit QuickPayBot</h2>
                <div className="flex items-center gap-1 text-xs text-teal-100">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span>Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMinimize}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Minimize chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
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

            {/* Chat Input */}
            <div className="border-t border-gray-200 bg-gray-50">
              <ChatInput onSendMessage={handlers.handleSendMessage} />
            </div>
          </div>
        </div>
      )}
    </>
  );
});