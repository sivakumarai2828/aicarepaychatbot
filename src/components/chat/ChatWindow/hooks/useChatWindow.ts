import { useState, useEffect, useRef } from 'react';
import { Bill, PaymentSummary, Message } from '../../../../types/interfaces';
import { useChat } from '../../../../hooks/useChat';
import { useChatHooks } from '../../../../hooks/useChatHooks';
import { useMessageHandlers } from '../../../../hooks/useMessageHandlers';
import { bills } from '../../../../constants/bills';

interface UseChatWindowProps {
  onPaymentConfirmed?: (data: {
    confirmationNumber: string;
    paymentSummary: PaymentSummary;
    email?: string;
  }) => void;
  onShowPaymentForm?: (paymentSummary: PaymentSummary) => void;
  onBackgroundChange?: (showMain: boolean) => void;
  voiceMessages?: Message[];
}

export const useChatWindow = ({
  onPaymentConfirmed,
  onShowPaymentForm,
  onBackgroundChange,
  voiceMessages = []
}: UseChatWindowProps) => {
  const [isMinimized, setIsMinimized] = useState(true);
  const [showBills, setShowBills] = useState(false);
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const [showPaymentSummary, setShowPaymentSummary] = useState(true);
  const isInitializedRef = useRef(false);
  const lastVoiceMessageCountRef = useRef(0);

  const {
    messages,
    isTyping,
    currentOptions,
    conversationState,
    careAccounts,
    setCurrentOptions,
    setConversationState,
    setCareAccounts,
    addMessages,
    initializeChat
  } = useChat();

  const {
    isAccountProcessing,
    isPlanProcessing,
    handleAccountLookup,
    handleCardLookup,
    handleConfirmation,
    handleFollowUp,
    handleBillSelect,
    handleCustomAmount,
    handlePaymentMethodSelect,
    handleAccountSelection,
    handlePlanSelection,
    handleOTPVerification,
    handleResendOTP
  } = useChatHooks(
    addMessages,
    setCurrentOptions,
    setConversationState,
    setCareAccounts,
    setShowOptions,
    setShowPaymentSummary,
    setIsProcessing,
    setShowBills,
    setShowCustomAmount,
    setSelectedBill,
    bills,
    onPaymentConfirmed,
    onShowPaymentForm,
    onBackgroundChange
  );

  // Create message handlers
  const { handleSendMessage, handleOptionSelect } = useMessageHandlers({
    conversationState,
    selectedBill,
    careAccounts,
    setIsProcessing,
    setCurrentOptions,
    setShowBills,
    setShowCustomAmount,
    setShowPaymentSummary,
    addMessages,
    handleAccountLookup,
    handleCardLookup,
    handleAccountSelection,
    handlePlanSelection,
    handleConfirmation,
    handleFollowUp,
    handlePaymentMethodSelect,
    handleOTPVerification,
    handleResendOTP,
    setConversationState,
    onBackgroundChange,
    onShowPaymentForm
  });

  // Set up global option handler for automatic payment completion
  useEffect(() => {
    console.log('🔧 ChatWindow: Setting up global option handler');
    window.chatWindowHandleOptionSelect = handleOptionSelect;
    console.log('✅ ChatWindow: Global option handler set up successfully');
    
    return () => {
      console.log('🧹 ChatWindow: Cleaning up global option handler');
      delete window.chatWindowHandleOptionSelect;
    };
  }, [handleOptionSelect]);

  useEffect(() => {
    if (!isMinimized && !isInitializedRef.current) {
      isInitializedRef.current = true;
      initializeChat();
    }
  }, [isMinimized, initializeChat]);

  // Enhanced cleanup global callback when component unmounts
  useEffect(() => {
    return () => {
      if (window.paymentFormCompletionCallback) {
        console.log('🧹 ChatWindow: Cleaning up AUTOMATIC global completion callback');
        delete window.paymentFormCompletionCallback;
      }
      if (window.chatWindowHandleOptionSelect) {
        console.log('🧹 ChatWindow: Cleaning up global option handler');
        delete window.chatWindowHandleOptionSelect;
      }
    };
  }, []);

  // Force payment summary to show for account lookup flow
  useEffect(() => {
    if (conversationState.context === 'payment_summary_review' &&
        conversationState.paymentFlow?.paymentSummary) {
      console.log('🔧 ChatWindow: Forcing payment summary display for account lookup');
      setShowPaymentSummary(true);
    }
  }, [conversationState.context, conversationState.paymentFlow?.paymentSummary]);

  useEffect(() => {
    console.log('🔄 Voice messages sync check:', {
      voiceMessagesLength: voiceMessages.length,
      lastCount: lastVoiceMessageCountRef.current
    });

    if (voiceMessages.length > lastVoiceMessageCountRef.current) {
      const newMessages = voiceMessages.slice(lastVoiceMessageCountRef.current);
      console.log('✅ Syncing new voice messages to chat:', newMessages);
      newMessages.forEach(msg => {
        console.log('➡️ Adding voice message:', msg.text, 'from:', msg.sender);
        addMessages(msg);
      });
      lastVoiceMessageCountRef.current = voiceMessages.length;
    }
  }, [voiceMessages, addMessages]);

  return {
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
    isLoading: false,
    handlers: {
      handleBillSelect,
      handleCustomAmount,
      handleOptionSelect,
      handleSendMessage,
      handleOTPVerification,
      handleResendOTP
    },
    setIsMinimized
  };
};