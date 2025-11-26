import { ChatWindow } from './components/chat';
import { SpeechProvider } from './contexts/SpeechContext';
import { VoiceModeProvider } from './contexts/VoiceModeContext';
import { PaymentConfirmation } from './components/PaymentConfirmation';
import { SecurePaymentForm } from './components/SecurePaymentForm';
import { useState, useCallback } from 'react';
import { PaymentSummary } from './types/interfaces';
import type { Message } from './types/chat';

function App() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showMainContent, setShowMainContent] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    confirmationNumber: string;
    paymentSummary: PaymentSummary;
    email?: string;
  } | null>(null);
  const [paymentFormData, setPaymentFormData] = useState<{
    paymentSummary: PaymentSummary;
  } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  const handleVoiceMessage = useCallback((message: Message) => {
    console.log('📨 App received voice message:', message);
    setChatMessages(prev => {
      console.log('📝 Current messages:', prev.length, 'Adding message from:', message.sender);
      return [...prev, message];
    });
  }, []);

  const handlePaymentConfirmed = useCallback((data: {
    confirmationNumber: string;
    paymentSummary: PaymentSummary;
    email?: string;
  }) => {
    if (data.confirmationNumber && data.paymentSummary.balance > 0) {
      setConfirmationData(data);
      setShowConfirmation(true);
      setShowMainContent(false);
      setShowPaymentForm(false);
    } else {
      setConfirmationData(null);
      setShowConfirmation(false);
      setShowMainContent(true);
      setShowPaymentForm(false);
    }
  }, []);

  const handleShowPaymentForm = useCallback((paymentSummary: PaymentSummary) => {
    console.log('🔐 App: Showing payment form with summary:', paymentSummary);
    setPaymentFormData({ paymentSummary });
    setShowPaymentForm(true);
    setShowMainContent(false);
    setShowConfirmation(false);
  }, []);

  const handlePaymentFormClose = useCallback(() => {
    console.log('🔒 App: Closing payment form');
    setShowPaymentForm(false);
    setPaymentFormData(null);
    setShowMainContent(true);
  }, []);

  const handlePaymentComplete = useCallback(() => {
    console.log('🎯 App: Payment completed - checking for chatbot callback');
    
    // The chatbot should handle this through the global callback
    // This is just a fallback in case the global callback isn't set
    if (!window.paymentFormCompletionCallback) {
      console.log('⚠️ App: No global completion callback found - using fallback');
      // Fallback behavior - just close the form
      setShowPaymentForm(false);
      setPaymentFormData(null);
      setShowMainContent(true);
    }
  }, []);

  const handleClose = useCallback(() => {
    setShowConfirmation(false);
    setConfirmationData(null);
    setShowMainContent(true);
  }, []);

  return (
    <SpeechProvider>
      <VoiceModeProvider onMessage={handleVoiceMessage}>
        <div className="relative min-h-screen">
        {showPaymentForm && paymentFormData ? (
          <SecurePaymentForm
            paymentSummary={paymentFormData.paymentSummary}
            onClose={handlePaymentFormClose}
            onPaymentComplete={handlePaymentComplete}
          />
        ) : showConfirmation && confirmationData ? (
          <div className="absolute inset-0 transition-opacity duration-300">
            <PaymentConfirmation
              confirmationNumber={confirmationData.confirmationNumber}
              paymentSummary={confirmationData.paymentSummary}
              email={confirmationData.email}
              onClose={handleClose}
            />
          </div>
        ) : showMainContent ? (
          <div className="relative z-10">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-teal-600 via-teal-500/30 to-white" />
              <div className="absolute inset-0 bg-white/50" />
              <div className="relative z-10 flex items-center min-h-screen">
                <div className={`transition-all duration-500 px-8 ${isChatOpen ? 'max-w-[calc(100%-24rem)] pr-4' : 'max-w-2xl mx-auto'}`}>
                  <div className={`transition-all duration-500 ${isChatOpen ? '-mt-32' : '-mt-32'}`}>
                    <h1 className={`text-3xl font-bold text-teal-600 mb-4 ${isChatOpen ? 'text-left' : 'text-center'}`}>
                      Seamless Payments, Flexible Options
                    </h1>
                    <p className={`text-gray-600 text-lg leading-relaxed ${isChatOpen ? 'text-left' : 'text-center'}`}>
                      With just a few clicks, our chatbot helps you make hassle-free payments with convenient financing options. Easily manage your transactions at your own pace, while enjoying a simple and intuitive experience. Make smarter, flexible payments—all in one place, using our quick and easy chatbot interface.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-[#e8f3f3]" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#e8f3f3] via-[#f0f7f7] to-white opacity-80" />
            </div>
          </div>
        )}
        <ChatWindow
          onPaymentConfirmed={handlePaymentConfirmed}
          onShowPaymentForm={handleShowPaymentForm}
          onChatStateChange={(isOpen) => setIsChatOpen(isOpen)}
          onBackgroundChange={(showMain) => setShowMainContent(showMain)}
          voiceMessages={chatMessages}
        />
      </div>
      </VoiceModeProvider>
    </SpeechProvider>
  );
}

export default App;