import { useState, useCallback } from 'react';
import type { Message, Bill, PaymentSummary, CareAccount, ConversationState, ChatOption } from '../types/chat';

interface UseChatHooksProps {
  addMessages: (messages: Message | Message[]) => Promise<void>;
  setCurrentOptions: (options: ChatOption[]) => void;
  setConversationState: (state: (prev: ConversationState) => ConversationState) => void;
  setCareAccounts: (accounts: CareAccount[]) => void;
  setShowOptions: (value: boolean) => void;
  setShowPaymentSummary: (value: boolean) => void;
  setIsProcessing: (value: boolean) => void;
  setShowBills: (value: boolean) => void;
  setShowCustomAmount: (value: boolean) => void;
  setSelectedBill: (bill: Bill | null) => void;
  bills: Bill[];
  onPaymentConfirmed?: (data: { confirmationNumber: string; paymentSummary: PaymentSummary; email?: string }) => void;
  onShowPaymentForm?: (paymentSummary: PaymentSummary) => void;
  onBackgroundChange?: (showMain: boolean) => void;
}

export const useChatHooks = ({
  addMessages,
  setCurrentOptions,
  setConversationState,
  setCareAccounts,
  setIsProcessing,
  setShowBills,
  setSelectedBill,
  bills,
  onPaymentConfirmed,
  onShowPaymentForm
}: UseChatHooksProps) => {
  const [isAccountProcessing, setIsAccountProcessing] = useState(false);
  const [isPlanProcessing, setIsPlanProcessing] = useState(false);

  const handleAccountLookup = useCallback(async (_text: string) => {
    setIsAccountProcessing(true);
    await addMessages({
      id: Date.now().toString(),
      text: 'Looking up your account...',
      sender: 'bot',
      timestamp: new Date()
    });

    setTimeout(() => {
      const mockAccounts: CareAccount[] = [
        { id: 'acc_1', lastFour: '5678', type: 'primary' },
        { id: 'acc_2', lastFour: '9876', type: 'secondary' }
      ];
      setCareAccounts(mockAccounts);
      setIsAccountProcessing(false);
      addMessages({
        id: (Date.now() + 1).toString(),
        text: 'I found your account. I\'ve displayed your bills on the screen.',
        sender: 'bot',
        timestamp: new Date()
      });
      setShowBills(true);
    }, 1500);
  }, [addMessages, setCareAccounts, setShowBills]);

  const handleCardLookup = useCallback(async (_text: string) => {
    setIsAccountProcessing(true);
    setTimeout(() => {
      setIsAccountProcessing(false);
      addMessages({
        id: Date.now().toString(),
        text: 'Card found. Please select a bill to pay.',
        sender: 'bot',
        timestamp: new Date()
      });
      setShowBills(true);
    }, 1500);
  }, [addMessages, setShowBills]);

  const handleBillSelect = useCallback(async (billId: string) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    setSelectedBill(bill);
    setShowBills(false);
    await addMessages({
      id: Date.now().toString(),
      text: `You selected ${bill.provider} - $${bill.amount.toFixed(2)}. How would you like to pay?`,
      sender: 'bot',
      timestamp: new Date()
    });
    setCurrentOptions([
      { id: 'pay_full', label: 'Pay in Full', action: 'pay_full' },
      { id: 'pay_installment', label: 'Installment Plan', action: 'pay_installment' }
    ]);
  }, [bills, setSelectedBill, setShowBills, addMessages, setCurrentOptions]);

  const handleCustomAmount = useCallback(async (amount: number) => {
    await addMessages({
      id: Date.now().toString(),
      text: `Processing payment of $${amount.toFixed(2)}...`,
      sender: 'bot',
      timestamp: new Date()
    });
  }, [addMessages]);

  const handlePaymentMethodSelect = useCallback(async (method: string) => {
    setIsProcessing(true);
    await addMessages({
      id: Date.now().toString(),
      text: `Processing ${method} payment...`,
      sender: 'bot',
      timestamp: new Date()
    });
    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
  }, [addMessages, setIsProcessing]);

  const handleAccountSelection = useCallback(async (_accountId: string, _accounts: CareAccount[], bill: Bill) => {
    setIsAccountProcessing(true);
    setTimeout(() => {
      setIsAccountProcessing(false);
      const paymentSummary: PaymentSummary = {
        balance: bill.amount,
        planType: 'standard',
        monthlyPayment: bill.amount / 12,
        totalMonths: 12,
        firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        provider: bill.provider
      };
      setConversationState(prev => ({
        ...prev,
        paymentFlow: { ...prev.paymentFlow, paymentSummary, selectedBill: bill }
      }));
      if (onShowPaymentForm) {
        onShowPaymentForm(paymentSummary);
      }
    }, 1500);
  }, [setIsAccountProcessing, setConversationState, onShowPaymentForm]);

  const handlePlanSelection = useCallback(async (planId: string, bill: Bill) => {
    // If the user selected "Installment Plan" generally, show the list of options
    if (planId === 'installment') {
      await addMessages({
        id: Date.now().toString(),
        text: 'Great! Please select a payment plan for your full payment:',
        sender: 'bot',
        timestamp: new Date(),
        metadata: {
          type: 'plan_selection',
          plans: bill.paymentPlans || []
        }
      });
      return;
    }

    // If a specific plan was selected (e.g., 'plan_6mo')
    setIsPlanProcessing(true);
    setTimeout(async () => {
      setIsPlanProcessing(false);

      // Find the selected plan details
      const selectedPlan = bill.paymentPlans?.find(p => p.id === planId);
      const planLabel = selectedPlan ? selectedPlan.label : 'Standard Plan';
      const monthlyPayment = selectedPlan ? selectedPlan.monthlyPayment : bill.amount / 12;
      const months = selectedPlan ? selectedPlan.months : 12;

      const paymentSummary: PaymentSummary = {
        balance: bill.amount,
        planType: planLabel,
        monthlyPayment: monthlyPayment,
        totalMonths: months,
        firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        provider: bill.provider
      };

      setConversationState(prev => ({
        ...prev,
        context: 'payment_summary_review',
        paymentFlow: { ...prev.paymentFlow, paymentSummary, selectedBill: bill }
      }));

      // Show payment form in background view (not in chat)
      // if (onShowPaymentForm) {
      //   console.log('📋 Showing payment form in background view');
      //   onShowPaymentForm(paymentSummary);
      // }

      // Only show a brief acknowledgment in chat - details are in the background view
      await addMessages({
        id: Date.now().toString(),
        text: `I've set up your ${planLabel} for ${bill.provider}. The payment details are now displayed on screen.`,
        sender: 'bot',
        timestamp: new Date()
      });

      // Don't show options here - let the payment form handle the next steps
      // Dispatch event to show payment options view
      // REMOVED to prevent infinite loop: The event is already dispatched by VoiceModeContext or handled by App logic
      /* 
      if (typeof window !== 'undefined') {
        // ...
      }
      */
    }, 1500);
  }, [setIsPlanProcessing, setConversationState, onShowPaymentForm, addMessages, setCurrentOptions]);

  const handleConfirmation = useCallback(async (confirmationNumber: string) => {
    const paymentSummary = {
      balance: 1250.00,
      planType: 'standard',
      monthlyPayment: 104.17,
      totalMonths: 12,
      firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      provider: 'Medical Center'
    };
    if (onPaymentConfirmed) {
      onPaymentConfirmed({ confirmationNumber, paymentSummary });
    }
  }, [onPaymentConfirmed]);

  const handleFollowUp = useCallback(async (wantsMoreHelp: boolean) => {
    if (wantsMoreHelp) {
      await addMessages({
        id: Date.now().toString(),
        text: 'How else can I help you today?',
        sender: 'bot',
        timestamp: new Date()
      });
    }
  }, [addMessages]);

  const handleOTPVerification = useCallback(async (_otp: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      addMessages({
        id: Date.now().toString(),
        text: 'OTP verified successfully!',
        sender: 'bot',
        timestamp: new Date()
      });
    }, 1000);
  }, [addMessages, setIsProcessing]);

  const handleResendOTP = useCallback(async () => {
    await addMessages({
      id: Date.now().toString(),
      text: 'OTP resent to your registered phone number.',
      sender: 'bot',
      timestamp: new Date()
    });
  }, [addMessages]);

  return {
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
  };
};

