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
  onViewChange?: (view: 'welcome' | 'bills' | 'payment-plans', data?: any) => void;
  voiceMessages?: Message[];
}

export const useChatWindow = ({
  onPaymentConfirmed,
  onShowPaymentForm,
  onBackgroundChange,
  onViewChange,
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
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const processedMessageKeysRef = useRef<Set<string>>(new Set());

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
  } = useChatHooks({
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
  });

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

    const handlePlanSelected = (event: CustomEvent) => {
      const { planId, billId } = event.detail;
      console.log('📅 Plan selected:', planId, 'Bill ID:', billId, 'Current bill:', selectedBill);

      let targetBill = selectedBill;
      if (billId) {
        targetBill = bills.find(b => b.id === billId) || selectedBill;
      }

      if (targetBill) {
        handlePlanSelection(planId, targetBill);
      } else {
        console.warn('⚠️ No selected bill found when plan was selected');
      }
    };

    const handleBillsRequested = () => {
      console.log('📋 Bills requested event received');
      setShowBills(true);
    };

    const handleBillSelected = (event: CustomEvent) => {
      const { billId } = event.detail;
      console.log('💳 Bill selected for payment plans:', billId);
      const bill = bills.find(b => b.id === billId);
      if (bill) {
        setSelectedBill(bill);
        setShowBills(false); // Hide bills list, show payment plans
      }
    };

    window.addEventListener('planSelected', handlePlanSelected as EventListener);
    window.addEventListener('billsRequested', handleBillsRequested);
    window.addEventListener('billSelected', handleBillSelected as EventListener);

    return () => {
      console.log('🧹 ChatWindow: Cleaning up global handlers');
      delete window.chatWindowHandleOptionSelect;
      window.removeEventListener('planSelected', handlePlanSelected as EventListener);
      window.removeEventListener('billsRequested', handleBillsRequested);
      window.removeEventListener('billSelected', handleBillSelected as EventListener);
    };
  }, [handleOptionSelect, handlePlanSelection, selectedBill, bills, setSelectedBill, setShowBills]);

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

  // Trigger view changes based on chat state
  useEffect(() => {
    if (onViewChange) {
      if (showBills) {
        console.log('📋 Triggering bills view');
        onViewChange('bills');
      } else if (selectedBill) {
        console.log('📅 Triggering payment plans view for bill:', selectedBill.id);
        onViewChange('payment-plans', { bill: selectedBill });
      }
    }
  }, [showBills, selectedBill, onViewChange]);

  useEffect(() => {
    console.log('🔄 Voice messages sync check:', {
      voiceMessagesLength: voiceMessages.length,
      lastCount: lastVoiceMessageCountRef.current,
      currentMessagesCount: messages.length
    });

    if (voiceMessages.length > lastVoiceMessageCountRef.current) {
      const newMessages = voiceMessages.slice(lastVoiceMessageCountRef.current);
      console.log('✅ Syncing new voice messages to chat:', newMessages);

      // Filter out messages that already exist in the chat to prevent duplicates
      // Check both by ID and by text content + sender to catch duplicates with different IDs
      const existingMessageIds = new Set(messages.map(m => m.id));
      const existingMessageKeys = new Set(
        messages.map(m => `${m.sender}:${m.text.substring(0, 100)}`)
      );

      const messagesToAdd = newMessages.filter(msg => {
        // Use longer text comparison (100 chars) for better duplicate detection
        const messageKey = `${msg.sender}:${msg.text.substring(0, 100)}`;

        // Check if we've already processed this message ID or content
        const alreadyProcessedById = processedMessageIdsRef.current.has(msg.id);
        const alreadyProcessedByKey = processedMessageKeysRef.current.has(messageKey);

        // Check if message exists in current messages
        const existsInMessages = existingMessageIds.has(msg.id) || existingMessageKeys.has(messageKey);

        const isDuplicate = alreadyProcessedById || alreadyProcessedByKey || existsInMessages;

        if (isDuplicate) {
          console.log('⏭️ ChatWindow: Skipping duplicate message:', msg.text.substring(0, 50), 'ID:', msg.id, 'ProcessedById:', alreadyProcessedById, 'ProcessedByKey:', alreadyProcessedByKey, 'InMessages:', existsInMessages);
        } else {
          // Mark this message as processed
          processedMessageIdsRef.current.add(msg.id);
          processedMessageKeysRef.current.add(messageKey);
        }

        return !isDuplicate;
      });

      if (messagesToAdd.length > 0) {
        console.log('➡️ Adding', messagesToAdd.length, 'new voice messages (filtered', newMessages.length - messagesToAdd.length, 'duplicates)');
        messagesToAdd.forEach(msg => {
          console.log('➡️ Adding voice message:', msg.text.substring(0, 50), 'from:', msg.sender);
        });
        addMessages(messagesToAdd);
      } else {
        console.log('⏭️ Skipping all voice messages - all are duplicates');
      }

      lastVoiceMessageCountRef.current = voiceMessages.length;
    }
  }, [voiceMessages, messages, addMessages]);

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