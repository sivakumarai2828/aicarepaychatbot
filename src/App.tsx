import { ChatWindow } from './components/chat';
import { VoiceModeProvider } from './contexts/VoiceModeContext';
import { PaymentConfirmation } from './components/PaymentConfirmation/PaymentConfirmation';
import { SecurePaymentForm } from './components/SecurePaymentForm/SecurePaymentForm';
import { WelcomeView, BillsView, PaymentPlansView, PaymentOptionsView, AccountLookupView } from './components/views';
import { PasswordGate } from './components/PasswordGate/PasswordGate';
import { useState, useCallback, useEffect } from 'react';
import { PaymentSummary } from './types/interfaces';
import type { Message } from './types/chat';
import type { ViewState } from './types/viewState';
import type { Bill, PaymentPlan } from './types/chat';
import { bills } from './constants/bills';

function App() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    confirmationNumber: string;
    paymentSummary: PaymentSummary;
    email?: string;
  } | null>(null);
  const [paymentFormData, setPaymentFormData] = useState<{
    paymentSummary: PaymentSummary;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  // New view state management
  const [currentView, setCurrentView] = useState<ViewState>('welcome');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);



  const handleVoiceMessage = useCallback((message: Message) => {
    console.log('📨 App received voice message:', message);
    setChatMessages(prev => {
      // Check for duplicates before adding
      const existingIds = new Set(prev.map(m => m.id));
      const existingKeys = new Set(
        prev.map(m => `${m.sender}:${m.text.substring(0, 100)}`)
      );
      const messageKey = `${message.sender}:${message.text.substring(0, 100)}`;

      const isDuplicate = existingIds.has(message.id) || existingKeys.has(messageKey);
      if (isDuplicate) {
        console.log('⏭️ App: Skipping duplicate voice message:', message.text.substring(0, 50));
        return prev;
      }

      console.log('📝 Current messages:', prev.length, 'Adding message from:', message.sender);
      return [...prev, message];
    });

    // Update view based on message content
    const text = message.text.toLowerCase();
    if (text.includes('bill') && message.sender === 'user') {
      setCurrentView('bills');
    }
  }, []);

  const handleBillSelect = useCallback((bill: Bill) => {
    console.log('📋 Bill selected:', bill);
    setSelectedBill(bill);
    setCurrentView('payment-plans');
  }, []);

  const handlePlanSelect = useCallback((plan: PaymentPlan) => {
    console.log('📅 Plan selected:', plan);
    setSelectedPlan(plan);
    setShowPaymentForm(false); // Ensure form is hidden so options view can show
    setPaymentFormData(null);
    setCurrentView('payment-options');
  }, []);

  const handlePaymentConfirmed = useCallback((data: {
    confirmationNumber: string;
    paymentSummary: PaymentSummary;
    email?: string;
  }) => {
    if (data.confirmationNumber && data.paymentSummary.balance > 0) {
      setConfirmationData(data);
      setShowConfirmation(true);
      setShowPaymentForm(false);
      setPaymentFormData(null); // Clear payment form data
      setCurrentView('confirmation');
    } else {
      setConfirmationData(null);
      setShowConfirmation(false);
      setShowPaymentForm(false);
      setPaymentFormData(null); // Clear payment form data
      setCurrentView('welcome');
    }
  }, []);

  const handleShowPaymentForm = useCallback((paymentSummary: PaymentSummary) => {
    console.log('🔐 App: Showing payment form with summary:', paymentSummary);
    setPaymentFormData({ paymentSummary });
    setShowPaymentForm(true);
    setShowConfirmation(false);
    setCurrentView('payment-form');
  }, []);

  const handlePaymentOptionSelect = useCallback((option: string) => {
    console.log('💳 Payment option selected:', option, 'Current plan:', selectedPlan);

    // Allow account lookup even if selectedPlan is missing (for debugging)
    if (option === 'account-lookup') {
      console.log('👀 Switching to account-lookup view');
      setCurrentView('account-lookup');
      return;
    }

    if (selectedPlan) {

      if (option === 'apply-new') {
        const urlMessage: Message = {
          id: Date.now().toString(),
          text: 'To apply for a new card, Click the following URL: https://www.myhealthsystem.com/apply',
          sender: 'bot',
          timestamp: new Date()
        };

        const followUpMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Is there anything else I can help you with today?',
          sender: 'bot',
          timestamp: new Date(Date.now() + 100)
        };

        setChatMessages(prev => [...prev, urlMessage, followUpMessage]);
        return;
      }

      // Explicitly handle carecredit-card to ensure form opens
      if (option === 'carecredit-card' || option === 'payment' || option === 'pay') {
        const summary: PaymentSummary = {
          balance: selectedPlan.monthlyPayment || (selectedPlan as any).amount || 0,
          planType: `${selectedPlan.months} Months Plan`,
          monthlyPayment: selectedPlan.monthlyPayment || (selectedPlan as any).amount || 0,
          totalMonths: selectedPlan.months,
          firstPaymentDate: new Date().toISOString(),
          provider: selectedBill?.provider || 'CareCredit'
        };
        handleShowPaymentForm(summary);
        return;
      }

      const summary: PaymentSummary = {
        balance: selectedPlan.monthlyPayment || (selectedPlan as any).amount || 0,
        planType: `${selectedPlan.months} Months Plan`,
        monthlyPayment: selectedPlan.monthlyPayment || (selectedPlan as any).amount || 0,
        totalMonths: selectedPlan.months,
        firstPaymentDate: new Date().toISOString(),
        provider: selectedBill?.provider || 'CareCredit'
      };
      handleShowPaymentForm(summary);
    }
  }, [selectedPlan, selectedBill, handleShowPaymentForm]);

  const handleAccountSelect = useCallback((account: any) => {
    console.log('👤 Account selected:', account);
    console.log('Current selectedPlan state:', selectedPlan);

    if (selectedPlan) {
      // Ensure we have valid numbers, providing fallbacks
      const monthlyPayment = selectedPlan.monthlyPayment || (selectedPlan as any).amount || 0;
      const totalMonths = selectedPlan.months || 12;
      const planLabel = selectedPlan.label || (selectedPlan.months ? `${selectedPlan.months} Months Plan` : 'Standard Plan');

      const summary: PaymentSummary = {
        balance: monthlyPayment, // Using monthly payment as the balance for the form display if that's the intent
        planType: planLabel,
        monthlyPayment: monthlyPayment,
        totalMonths: totalMonths,
        firstPaymentDate: new Date().toISOString(),
        provider: `CareCredit (...${account.last4})`
      };

      console.log('💰 Constructed Payment Summary for Form:', summary);

      // Just showing the form with the pre-filled account details
      // User must still click "Pay Now" or say "Confirm Payment"
      handleShowPaymentForm(summary);
    }
  }, [selectedPlan, handlePaymentConfirmed]);

  const handlePaymentFormClose = useCallback(() => {
    console.log('🔒 App: Closing payment form');
    setShowPaymentForm(false);
    setPaymentFormData(null);
    setCurrentView('welcome');
  }, []);

  const handlePaymentComplete = useCallback(() => {
    console.log('🎯 App: Payment completed');

    // Always handle the payment completion logic here
    // We don't need to check for the callback because this function IS the handler

    // Create a mock confirmation if one doesn't exist yet
    const summary = paymentFormData?.paymentSummary || {
      balance: 0,
      planType: 'unknown',
      monthlyPayment: 0,
      totalMonths: 0,
      firstPaymentDate: new Date().toISOString(),
      provider: 'Unknown'
    };

    const confirmation = {
      confirmationNumber: `CN-${Date.now().toString().slice(-6)}`,
      paymentSummary: summary,
      email: 'sivakumar.kk@gmail.com'
    };

    setConfirmationData(confirmation);
    setShowPaymentForm(false);
    setPaymentFormData(null);
    setShowConfirmation(true);
    setCurrentView('confirmation');

    // Notify the AI about the payment completion
    if (typeof window !== 'undefined') {
      console.log('📢 Dispatching paymentCompletedByUser event');
      window.dispatchEvent(new CustomEvent('paymentCompletedByUser', {
        detail: {
          confirmationNumber: confirmation.confirmationNumber,
          amount: summary.balance,
          provider: summary.provider
        }
      }));
    }
  }, [paymentFormData]);

  const handleClose = useCallback(() => {
    setShowConfirmation(false);
    setConfirmationData(null);
    setCurrentView('welcome');
  }, []);

  const handleViewChange = useCallback((view: 'welcome' | 'bills' | 'payment-plans', data?: any) => {
    console.log('🎨 View change requested:', view, data);

    // Clear confirmation state when view changes
    setShowConfirmation(false);
    setConfirmationData(null);
    setShowPaymentForm(false);
    setPaymentFormData(null);

    setCurrentView(view);
    if (view === 'payment-plans' && data?.bill) {
      setSelectedBill(data.bill);
    }
  }, []);

  // Listen for payment processed events from VoiceModeContext
  useEffect(() => {
    const handlePaymentProcessed = (event: CustomEvent) => {
      console.log('💳 App: Payment processed event received', event.detail);
      handlePaymentComplete();
    };

    window.addEventListener('paymentProcessed', handlePaymentProcessed as EventListener);

    return () => {
      window.removeEventListener('paymentProcessed', handlePaymentProcessed as EventListener);
    };
  }, [handlePaymentComplete]);

  // Listen for bills requested events from VoiceModeContext
  useEffect(() => {
    const handleBillsRequested = () => {
      console.log('📋 App: Bills requested event received');

      // Reset confirmation state if active
      setShowConfirmation(false);
      setConfirmationData(null);
      setShowPaymentForm(false);
      setPaymentFormData(null);

      setCurrentView('bills');
    };

    window.addEventListener('billsRequested', handleBillsRequested as EventListener);

    return () => {
      window.removeEventListener('billsRequested', handleBillsRequested as EventListener);
    };
  }, []);

  // Listen for voice-triggered events
  useEffect(() => {
    const handleApplyForCard = () => {
      handlePaymentOptionSelect('apply-new');
    };

    const handlePlanSelected = (event: CustomEvent) => {
      console.log('📢 App received planSelected event:', event.detail);
      handlePlanSelect(event.detail);
    };

    const handlePaymentOptionSelected = (event: CustomEvent) => {
      console.log('📢 App received paymentOptionSelected event:', event.detail);
      handlePaymentOptionSelect(event.detail.option);
    };

    window.addEventListener('applyForCard', handleApplyForCard);
    window.addEventListener('planSelected', handlePlanSelected as EventListener);
    window.addEventListener('paymentOptionSelected', handlePaymentOptionSelected as EventListener);

    const handleAccountSelectedVoice = (event: CustomEvent) => {
      console.log('📢 App received accountSelected event:', event.detail);
      handleAccountSelect(event.detail);
    };
    window.addEventListener('accountSelected', handleAccountSelectedVoice as EventListener);

    return () => {
      window.removeEventListener('applyForCard', handleApplyForCard);
      window.removeEventListener('planSelected', handlePlanSelected as EventListener);
      window.removeEventListener('paymentOptionSelected', handlePaymentOptionSelected as EventListener);
      window.removeEventListener('accountSelected', handleAccountSelectedVoice as EventListener);
    };
  }, [handlePaymentOptionSelect, handlePlanSelect, handleAccountSelect]);


  // Render the appropriate view based on current state
  const renderMainContent = () => {
    if (showPaymentForm && paymentFormData) {
      return (
        <SecurePaymentForm
          paymentSummary={paymentFormData.paymentSummary}
          onClose={handlePaymentFormClose}
          onPaymentComplete={handlePaymentComplete}
        />
      );
    }

    if (showConfirmation && confirmationData) {
      return (
        <div className="h-screen overflow-auto">
          <PaymentConfirmation
            confirmationNumber={confirmationData.confirmationNumber}
            paymentSummary={confirmationData.paymentSummary}
            email={confirmationData.email}
            onClose={handleClose}
          />
        </div>
      );
    }

    // Render views based on currentView state
    switch (currentView) {
      case 'bills':
        return <BillsView bills={bills} onBillSelect={handleBillSelect} />;

      case 'payment-plans':
        return selectedBill ? (
          <PaymentPlansView bill={selectedBill} onPlanSelect={handlePlanSelect} />
        ) : (
          <WelcomeView />
        );

      case 'payment-options':
        return (
          <PaymentOptionsView
            onOptionSelect={handlePaymentOptionSelect}
            selectedPlan={selectedPlan}
          />
        );

      case 'account-lookup':
        return (
          <AccountLookupView
            onAccountSelect={handleAccountSelect}
          />
        );

      case 'welcome':
      default:
        return <WelcomeView />;
    }
  };

  console.log('🎨 App rendering, isAuthorized will be checked by PasswordGate');
  return (
    <PasswordGate>
      <VoiceModeProvider
        onMessage={handleVoiceMessage}
        onPaymentOptionSelect={handlePaymentOptionSelect} // Pass this directly!
      >
        <div className="relative min-h-screen flex bg-white overflow-hidden">
          {/* Main Content Area - Left Side (70%) */}
          <div className="flex-1 overflow-auto relative z-10">


            {renderMainContent()}
          </div>

          {/* Chat Panel - Right Side (30%) */}
          <ChatWindow
            onPaymentConfirmed={handlePaymentConfirmed}
            onShowPaymentForm={handleShowPaymentForm}
            onViewChange={handleViewChange}
            onChatStateChange={(isOpen) => {
              // Handle chat state changes if needed
              console.log('Chat is', isOpen ? 'open' : 'closed');
            }}
            onBackgroundChange={(showMain) => {
              // Handle background changes if needed
              console.log('Background change:', showMain);
            }}
            voiceMessages={chatMessages}
          />
        </div>
      </VoiceModeProvider>
    </PasswordGate>
  );
}

export default App;