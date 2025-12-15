import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { realtimeService } from '../services/openai/realtimeService';
import type { RealtimeEvent } from '../types/openai';
import type { Message } from '../types/chat';
import { bills } from '../constants/bills';

const mockAccounts = [
  {
    id: 'acc_1',
    firstName: 'Siva',
    lastName: 'Kumar',
    phone: '9166065168',
    email: 'sivakumar.kk@gmail.com',
    lastFour: '5678'
  },
  {
    id: 'acc_2',
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-0123',
    email: 'john.doe@gmail.com',
    lastFour: '9876'
  }
];

interface VoiceModeContextType {
  isVoiceMode: boolean;
  isConnecting: boolean;
  isRecording: boolean;
  transcript: string;
  toggleVoiceMode: () => Promise<void>;
  toggleRecording: () => Promise<void>;
  addMessageToHistory: (message: Message) => void;
  sendTextMessage: (text: string) => void;
}

const VoiceModeContext = createContext<VoiceModeContextType | undefined>(undefined);

export const useVoiceMode = () => {
  const context = useContext(VoiceModeContext);
  if (!context) {
    throw new Error('useVoiceMode must be used within VoiceModeProvider');
  }
  return context;
};

interface VoiceModeProviderProps {
  children: React.ReactNode;
  onMessage?: (message: Message) => void;
  onPaymentOptionSelect?: (option: string) => void;
}

export const VoiceModeProvider: React.FC<VoiceModeProviderProps> = ({ children, onMessage, onPaymentOptionSelect }) => {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const messageCallbackRef = useRef(onMessage);
  const currentResponseId = useRef<string>('');
  const interruptedResponseIds = useRef<Set<string>>(new Set());
  const latestTranscriptRef = useRef('');

  useEffect(() => {
    messageCallbackRef.current = onMessage;
  }, [onMessage]);

  const paymentOptionCallbackRef = useRef(onPaymentOptionSelect);

  useEffect(() => {
    paymentOptionCallbackRef.current = onPaymentOptionSelect;
  }, [onPaymentOptionSelect]);

  const addMessageToHistory = useCallback((message: Message) => {
    if (messageCallbackRef.current) {
      messageCallbackRef.current(message);
    }
  }, []);

  const handleFunctionCall = useCallback((event: any) => {
    const { call_id, name, arguments: args } = event;
    console.log(`🔧 Function call received: ${name}`, { call_id, args });

    let parsedArgs;

    try {
      parsedArgs = JSON.parse(args);
      console.log(`📋 Parsed arguments for ${name}:`, parsedArgs);
    } catch {
      parsedArgs = {};
    }

    let result: any = { success: false, error: 'Unknown function' };

    switch (name) {
      case 'lookup_account':
        const identifier = parsedArgs.identifier || '';
        // Normalize identifier: remove non-digits
        // If it starts with '1' and is 11 digits, remove the '1'
        let normalizedIdentifier = identifier.replace(/\D/g, '');
        if (normalizedIdentifier.length === 11 && normalizedIdentifier.startsWith('1')) {
          normalizedIdentifier = normalizedIdentifier.substring(1);
        }

        console.log(`🔍 Lookup Account: "${identifier}" -> "${normalizedIdentifier}"`);

        const account = mockAccounts.find((acc: any) => {
          if (!acc.phone) return false;

          let normalizedPhone = acc.phone.replace(/\D/g, '');
          if (normalizedPhone.length === 11 && normalizedPhone.startsWith('1')) {
            normalizedPhone = normalizedPhone.substring(1);
          }

          console.log(`Checking against: ${acc.phone} -> ${normalizedPhone}`);

          const phoneMatch = normalizedPhone === normalizedIdentifier;
          // Also try checking if one contains the other if lengths differ significantly (unlikely but safe)
          // or exact match 10 digits

          return phoneMatch ||
            acc.email?.toLowerCase() === identifier.toLowerCase() ||
            (parsedArgs.firstName && parsedArgs.lastName &&
              acc.firstName?.toLowerCase() === parsedArgs.firstName.toLowerCase() &&
              acc.lastName?.toLowerCase() === parsedArgs.lastName.toLowerCase());
        });

        console.log('✅ Account found:', account ? account.id : 'No');

        result = account
          ? { success: true, account }
          : { success: false, error: 'Account not found. Please try providing your email address.' };
        break;

      case 'get_bills':
        // Dispatch event to update UI - bills will be shown visually
        if (typeof window !== 'undefined') {
          console.log('Dispatching billsRequested event');
          window.dispatchEvent(new CustomEvent('billsRequested'));
        }

        result = {
          success: true,
          message: 'Bills are now displayed on the screen for you to review.'
        };

        // Let OpenAI handle the response naturally - don't add message here
        // This prevents duplicate responses
        break;


      case 'show_payment_plans':
        const showPlansBillId = parsedArgs.bill_id;

        // Check if bill_id is provided
        if (!showPlansBillId) {
          result = {
            success: false,
            error: `Please specify which bill you'd like to see payment plans for. Available bills: ${bills.map((b: any) => b.provider).join(', ')}`
          };
          break;
        }

        // Try to find bill by ID first, then by provider name (case-insensitive)
        let targetBill = bills.find((b: any) => b.id === showPlansBillId);

        if (!targetBill) {
          // Try matching by provider name (case-insensitive, partial match)
          const searchTerm = showPlansBillId.toLowerCase();
          targetBill = bills.find((b: any) =>
            b.provider.toLowerCase().includes(searchTerm) ||
            searchTerm.includes(b.provider.toLowerCase())
          );
        }

        if (targetBill) {
          // Dispatch event to show payment plans for this bill
          if (typeof window !== 'undefined') {
            console.log('Dispatching billSelected event for payment plans:', targetBill.id);
            window.dispatchEvent(new CustomEvent('billSelected', {
              detail: { billId: targetBill.id }
            }));
          }
          result = {
            success: true,
            message: `Payment plans are now displayed on screen for ${targetBill.provider}.`
          };
        } else {
          result = {
            success: false,
            error: `Bill not found. Available bills: ${bills.map((b: any) => b.provider).join(', ')}`
          };
        }
        break;

      case 'select_payment_plan':
        const { bill_id, plan_id } = parsedArgs;

        // Find the bill by ID first, then by provider name (case-insensitive)
        let selectedBill = bills.find((b: any) => b.id === bill_id);

        if (!selectedBill) {
          // Try matching by provider name (case-insensitive, partial match)
          const searchTerm = bill_id?.toLowerCase() || '';
          selectedBill = bills.find((b: any) =>
            b.provider.toLowerCase().includes(searchTerm) ||
            searchTerm.includes(b.provider.toLowerCase())
          );
        }

        const plan = selectedBill?.paymentPlans?.find((p: any) => p.id === plan_id);

        if (selectedBill && plan) {
          // Dispatch event to update UI with the actual bill ID
          if (typeof window !== 'undefined') {
            const planObject = { ...plan, billId: selectedBill.id }; // Attach billId just in case
            console.log('Dispatching planSelected event:', planObject);
            window.dispatchEvent(new CustomEvent('planSelected', {
              detail: planObject
            }));
          }
          result = {
            success: true,
            message: `Payment plan selected: ${plan.label} for ${selectedBill.provider}. Payment form is now displayed on screen. Waiting for user to enter payment details and click "Pay Now".`
          };
        } else {
          const availableBills = bills.map((b: any) => b.provider).join(', ');
          const availablePlans = selectedBill?.paymentPlans?.map((p: any) => p.id).join(', ') || 'N/A';
          result = {
            success: false,
            error: `Invalid bill or plan. Bill provided: "${bill_id}", Plan: "${plan_id}". Available bills: ${availableBills}. ${selectedBill ? `Available plans for ${selectedBill.provider}: ${availablePlans}` : ''}`
          };
        }
        break;

      case 'select_payment_option':
        const { option } = parsedArgs;
        console.log('🎤 Voice selected payment option:', option, 'parsedArgs:', parsedArgs);
        // Ensure option is lowercased for comparison in App.tsx
        let normalizedOption = option?.toLowerCase();

        // Fix potential AI mismatches
        if (normalizedOption.includes('carecredit') && normalizedOption.includes('card')) {
          normalizedOption = 'carecredit-card';
        } else if (normalizedOption.includes('account') && normalizedOption.includes('lookup')) {
          normalizedOption = 'account-lookup';
        } else if (normalizedOption.includes('apply')) {
          normalizedOption = 'apply-new';
        }

        let message = '';

        if (typeof window !== 'undefined') {
          if (normalizedOption === 'apply-new') {
            window.dispatchEvent(new Event('applyForCard'));
            message = 'Opening application for new CareCredit card.';
          } else {
            // Dispatch a generic event for other options that App.tsx can listen to
            // We'll reuse the same pattern - App.tsx listens for specific events or we can make a new one
            console.log('Dispatching paymentOptionSelected event:', normalizedOption);
            // Call the callback directly if available
            if (paymentOptionCallbackRef.current) {
              console.log('📞 Calling onPaymentOptionSelect prop directly');
              paymentOptionCallbackRef.current(normalizedOption);
            } else {
              // Fallback to event
              window.dispatchEvent(new CustomEvent('paymentOptionSelected', {
                detail: { option: normalizedOption }
              }));
            }

            if (normalizedOption === 'account-lookup') {
              message = `I've opened the account lookup screen. Please select your account to continue.`;
            } else if (normalizedOption === 'carecredit-card') {
              message = `I've opened the secure payment form. Please enter your card details.`;
            } else {
              message = `Selected payment option: ${normalizedOption}.`;
            }
          }
        }

        result = {
          success: true,
          message: message
        };
        break;

      case 'select_account':
        const { account_identifier } = parsedArgs;
        console.log('🎤 Voice selected account identifier:', account_identifier);

        let accountMessage = '';
        if (typeof window !== 'undefined') {
          // We can infer the account based on identifier (simplified logic)
          // In a real app, this would match against the actual list of accounts
          let accountDetail = { id: 'acc_1', last4: '5678', type: 'CareCredit Rewards' };

          if (account_identifier.includes('4321')) {
            accountDetail = { id: 'acc_2', last4: '4321', type: 'CareCredit Standard' };
          }

          console.log('Dispatching accountSelected event:', accountDetail);
          window.dispatchEvent(new CustomEvent('accountSelected', {
            detail: accountDetail
          }));
          // IMPORTANT: Do NOT say "payment successful" here. Just say the details are ready relative to the user's action.
          // But since our app logic currently auto-confirms, we might need to adjust the App logic first if we want manual confirmation.
          // However, based on the user's request "when user not clicked on paynow but open ai is saying payment sucessful",
          // it implies the AI *thinks* it's done.
          // The "payment successful" message usually comes from the 'process_payment' tool or a manual completion event.

          // Let's check `App.tsx`: `handleAccountSelect` calls `handlePaymentConfirmed`.
          // This auto-confirms the payment immediately upon account selection.
          // We need to change `App.tsx` to SHOW the confirmation screen (or a review screen) but NOT finalize it until user says "Pay" or clicks "Pay".

          // For now, let's change the AI's response to be accurate to the current state (which is "Payment Confirmed" screen).
          accountMessage = `I've selected the account ending in ${accountDetail.last4}. Please confirm the payment details on the screen to proceed.`;
        }

        result = {
          success: true,
          message: accountMessage
        };
        break;
        break;

      case 'process_payment':
        const transactionId = `TXN${Date.now()}`;
        result = {
          success: true,
          transaction_id: transactionId,
          amount: parsedArgs.amount,
          bill_id: parsedArgs.bill_id,
          email: 'sivakumar.kk@gmail.com',
          timestamp: new Date().toISOString(),
          message: `Payment of $${parsedArgs.amount} processed successfully`
        };

        // Dispatch event to update UI (close form, show confirmation)
        if (typeof window !== 'undefined') {
          console.log('Dispatching paymentProcessed event');
          window.dispatchEvent(new CustomEvent('paymentProcessed', {
            detail: {
              transactionId,
              amount: parsedArgs.amount,
              billId: parsedArgs.bill_id
            }
          }));
        }
        break;


      case 'apply_for_card':
        if (typeof window !== 'undefined') {
          console.log('Dispatching applyForCard event');
          window.dispatchEvent(new CustomEvent('applyForCard'));
        }
        result = {
          success: true,
          message: 'I have provided the link to apply for a new CareCredit card in the chat.'
        };
        break;

      case 'send_receipt':
        result = {
          success: true,
          method: parsedArgs.method,
          recipient: parsedArgs.recipient,
          sent_at: new Date().toISOString(),
          message: `Receipt sent via ${parsedArgs.method} to ${parsedArgs.recipient}`
        };

        // Let OpenAI handle the response naturally
        break;
    }

    realtimeService.sendFunctionResult(call_id, result);
  }, [addMessageToHistory]);

  const handleTranscript = useCallback((event: RealtimeEvent) => {
    // console.log('🎤 Voice transcript event:', event.type);

    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      setTranscript(event.transcript || '');
      if (event.transcript) {
        console.log('👤 User voice message:', event.transcript);
      }
    } else if (event.type === 'response.audio_transcript.delta') {
      const delta = event.delta || '';
      setTranscript(prev => prev + delta);
      latestTranscriptRef.current += delta;
    } else if (event.type === 'response.audio_transcript.done') {
      // Check if this specific response was interrupted
      const responseId = (event as any).response_id;
      const wasInterrupted = responseId && interruptedResponseIds.current.has(responseId);

      // If we were interrupted, use the partial transcript we captured
      // If not, use the full transcript provided by the event
      const finalTranscript = wasInterrupted
        ? latestTranscriptRef.current + '...' // Add ellipsis to indicate interruption
        : (event.transcript || latestTranscriptRef.current);

      if (finalTranscript) {
        console.log('🤖 Bot voice response (saved):', finalTranscript);
        console.log(`INFO: Response ${responseId} interrupted state:`, wasInterrupted);

        const messageId = `voice-bot-${Date.now()}-${finalTranscript.substring(0, 20).replace(/\s/g, '-')}`;
        addMessageToHistory({
          id: messageId,
          text: finalTranscript,
          sender: 'bot',
          timestamp: new Date()
        });

        // Safety fallback: If AI says it's showing bills but didn't call the tool, force the UI update
        const lowerTranscript = finalTranscript.toLowerCase();
        if (lowerTranscript.includes('here are your remaining bills') ||
          lowerTranscript.includes('displayed your bills') ||
          lowerTranscript.includes('bringing up your bills')) {
          console.log('🛡️ Safety Fallback: AI mentioned showing bills. Dispatching billsRequested event.');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('billsRequested'));
          }
        }
      }

      // Cleanup
      if (responseId) {
        interruptedResponseIds.current.delete(responseId);
      }
      setTranscript('');
      latestTranscriptRef.current = '';
    }
  }, [addMessageToHistory]);

  const handleResponseCreated = useCallback((event: any) => {
    if (event.response && event.response.id) {
      console.log('🎬 Response created:', event.response.id);
      currentResponseId.current = event.response.id;
      // Reset transcript accumulator for new response
      latestTranscriptRef.current = '';
    }
  }, []);

  const handleSpeechStarted = useCallback(() => {
    console.log('🗣️ User started speaking');
    // Mark the current response as interrupted
    if (currentResponseId.current) {
      console.log('🚫 Marking response as interrupted:', currentResponseId.current);
      interruptedResponseIds.current.add(currentResponseId.current);
    }
  }, []);

  const toggleVoiceMode = useCallback(async () => {
    if (isVoiceMode) {
      // Clean up event handlers before disconnecting
      realtimeService.off('function_call', handleFunctionCall);
      realtimeService.off('conversation.item.input_audio_transcription.completed', handleTranscript);
      realtimeService.off('response.audio_transcript.delta', handleTranscript);
      realtimeService.off('response.audio_transcript.done', handleTranscript);
      realtimeService.off('response.created', handleResponseCreated);
      realtimeService.off('input_audio_buffer.speech_started', handleSpeechStarted);

      realtimeService.stopRecording();
      realtimeService.disconnect();
      setIsVoiceMode(false);
      setIsRecording(false);
      setTranscript('');
    } else {
      setIsConnecting(true);
      try {
        await realtimeService.connect();

        // Register event handlers
        realtimeService.on('function_call', handleFunctionCall);
        realtimeService.on('conversation.item.input_audio_transcription.completed', handleTranscript);
        realtimeService.on('response.audio_transcript.delta', handleTranscript);
        realtimeService.on('response.audio_transcript.done', handleTranscript);
        realtimeService.on('response.created', handleResponseCreated);
        realtimeService.on('input_audio_buffer.speech_started', handleSpeechStarted);

        realtimeService.on('response.audio.delta', () => {
          // console.log('🔊 Audio delta received in VoiceModeContext');
        });
        realtimeService.on('response.audio.done', () => {
          console.log('✅ Audio response complete in VoiceModeContext');
        });

        setIsVoiceMode(true);

        // Don't trigger an automatic response - wait for user to speak first
        // The system instructions tell the AI to wait for user input

        addMessageToHistory({
          id: Date.now().toString(),
          text: 'Voice mode activated. I can hear you now!',
          sender: 'bot',
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Failed to connect:', error);
        addMessageToHistory({
          id: Date.now().toString(),
          text: 'Failed to connect to voice service. Please try again.',
          sender: 'bot',
          timestamp: new Date()
        });
      } finally {
        setIsConnecting(false);
      }
    }
  }, [isVoiceMode, handleFunctionCall, handleTranscript, handleResponseCreated, handleSpeechStarted, addMessageToHistory]);

  const startRecording = useCallback(async () => {
    if (!isVoiceMode || isRecording) return;

    try {
      await realtimeService.startRecording();
      setIsRecording(true);

      // Don't trigger response.create here - let the user speak first
      // The AI will respond automatically after detecting speech via server VAD
    } catch (error) {
      console.error('Failed to start recording:', error);
      addMessageToHistory({
        id: Date.now().toString(),
        text: 'Could not access microphone. Please check permissions.',
        sender: 'bot',
        timestamp: new Date()
      });
    }
  }, [isVoiceMode, isRecording, addMessageToHistory]);

  const stopRecording = useCallback(() => {
    realtimeService.stopRecording();
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(async () => {
    if (!isVoiceMode) return;

    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isVoiceMode, isRecording, stopRecording, startRecording]);

  const sendTextMessage = useCallback((text: string) => {
    if (!isVoiceMode) return;

    addMessageToHistory({
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    });

    realtimeService.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    });

    realtimeService.sendEvent({
      type: 'response.create'
    });
  }, [isVoiceMode, addMessageToHistory]);

  // Listen for payment completion from UI button click
  useEffect(() => {
    const handlePaymentCompletedByUser = (event: CustomEvent) => {
      if (isVoiceMode) {
        const { confirmationNumber, amount, provider } = event.detail;
        console.log('💳 VoiceMode: Payment completed by user via button', event.detail);

        // Send a message to the AI to inform it about the payment
        sendTextMessage(`I have successfully completed the payment. Confirmation number: ${confirmationNumber}. Amount: $${amount} for ${provider}.`);
      }
    };

    window.addEventListener('paymentCompletedByUser', handlePaymentCompletedByUser as EventListener);

    return () => {
      window.removeEventListener('paymentCompletedByUser', handlePaymentCompletedByUser as EventListener);
    };
  }, [isVoiceMode, sendTextMessage]);

  useEffect(() => {
    return () => {
      if (isVoiceMode) {
        realtimeService.disconnect();
      }
    };
  }, [isVoiceMode]);

  const value: VoiceModeContextType = {
    isVoiceMode,
    isConnecting,
    isRecording,
    transcript,
    toggleVoiceMode,
    toggleRecording,
    addMessageToHistory,
    sendTextMessage
  };

  return (
    <VoiceModeContext.Provider value={value}>
      {children}
    </VoiceModeContext.Provider>
  );
};
