import { useCallback } from 'react';
import type { MessageHandlersProps } from '../types/chat';

export const useMessageHandlers = (props: MessageHandlersProps) => {
  const {
    conversationState,
    selectedBill,
    setIsProcessing,
    setShowBills,
    addMessages,
    handleAccountLookup,
    handleCardLookup,
    handlePlanSelection,
    handlePaymentMethodSelect,
    onShowPaymentForm
  } = props;

  const handleSendMessage = useCallback(async (text: string) => {
    await addMessages([{
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    }]);

    setIsProcessing(true);

    if (text.toLowerCase().includes('account') || text.toLowerCase().includes('lookup')) {
      await handleAccountLookup(text);
    } else if (text.toLowerCase().includes('card')) {
      await handleCardLookup(text);
    } else {
      await addMessages([{
        id: (Date.now() + 1).toString(),
        text: 'I understand. Let me help you with that.',
        sender: 'bot',
        timestamp: new Date()
      }]);
    }

    setIsProcessing(false);
  }, [addMessages, setIsProcessing, handleAccountLookup, handleCardLookup]);

  const handleOptionSelect = useCallback(async (optionId: string) => {
    if (optionId === 'lookup_account') {
      await handleAccountLookup('');
    } else if (optionId === 'view_bills') {
      setShowBills(true);
      await addMessages([{
        id: Date.now().toString(),
        text: 'I\'ve displayed your bills on the screen. Please select the one you\'d like to pay.',
        sender: 'bot',
        timestamp: new Date()
      }]);
    } else if (optionId === 'pay_full' && selectedBill) {
      await handlePaymentMethodSelect('full');
      if (selectedBill && onShowPaymentForm) {
        const paymentSummary = {
          balance: selectedBill.amount,
          planType: 'full',
          monthlyPayment: selectedBill.amount,
          totalMonths: 1,
          firstPaymentDate: new Date().toISOString().split('T')[0],
          provider: selectedBill.provider
        };
        onShowPaymentForm(paymentSummary);
      }
    } else if (optionId === 'pay_installment' && selectedBill) {
      await handlePlanSelection('installment', selectedBill);
    } else if (optionId === 'finalize_payment') {
      if (conversationState.paymentFlow?.paymentSummary && onShowPaymentForm) {
        onShowPaymentForm(conversationState.paymentFlow.paymentSummary);
      }
    } else if (optionId === 'review_details') {
      await addMessages([{
        id: Date.now().toString(),
        text: 'Take your time to review the details above. When you are ready, you can select "Yes, finalize the payment".',
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  }, [
    handleAccountLookup,
    setShowBills,
    addMessages,
    selectedBill,
    handlePaymentMethodSelect,
    handlePlanSelection,
    onShowPaymentForm,
    conversationState.paymentFlow
  ]);

  return {
    handleSendMessage,
    handleOptionSelect
  };
};
