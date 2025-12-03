import { ChatWindow } from './components/chat';
import { VoiceModeProvider } from './contexts/VoiceModeContext';
import { PaymentConfirmation } from './components/PaymentConfirmation/PaymentConfirmation';
import { SecurePaymentForm } from './components/SecurePaymentForm/SecurePaymentForm';
import { WelcomeView, BillsView, PaymentPlansView } from './components/views';
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
    // This would trigger the payment form
    // For now, we'll keep using the existing flow
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
      setCurrentView('confirmation');
    } else {
      setConfirmationData(null);
      setShowConfirmation(false);
      setShowPaymentForm(false);
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

      case 'welcome':
      default:
        return <WelcomeView />;
    }
  };

  return (
    <VoiceModeProvider onMessage={handleVoiceMessage}>
      <div className="relative min-h-screen flex">
        {/* Main Content Area - Left Side (70%) */}
        <div className="flex-1 overflow-auto">
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
  );
}

export default App;