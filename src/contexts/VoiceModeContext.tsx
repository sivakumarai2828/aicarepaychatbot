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
    email: 'siva.kumar@example.com',
    lastFour: '5678'
  },
  {
    id: 'acc_2',
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-0123',
    email: 'john.doe@example.com',
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
}

export const VoiceModeProvider: React.FC<VoiceModeProviderProps> = ({ children, onMessage }) => {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const messageCallbackRef = useRef(onMessage);

  useEffect(() => {
    messageCallbackRef.current = onMessage;
  }, [onMessage]);

  const addMessageToHistory = useCallback((message: Message) => {
    if (messageCallbackRef.current) {
      messageCallbackRef.current(message);
    }
  }, []);

  const handleFunctionCall = useCallback((event: any) => {
    const { call_id, name, arguments: args } = event;
    let parsedArgs;

    try {
      parsedArgs = JSON.parse(args);
    } catch {
      parsedArgs = {};
    }

    let result: any = { success: false, error: 'Unknown function' };

    switch (name) {
      case 'lookup_account':
        const identifier = parsedArgs.identifier || '';
        const normalizedIdentifier = identifier.replace(/\D/g, '');

        const account = mockAccounts.find((acc: any) => {
          const normalizedPhone = acc.phone.replace(/\D/g, '');
          return normalizedPhone === normalizedIdentifier ||
            acc.email?.toLowerCase() === identifier.toLowerCase() ||
            (parsedArgs.firstName && parsedArgs.lastName &&
              acc.firstName?.toLowerCase() === parsedArgs.firstName.toLowerCase() &&
              acc.lastName?.toLowerCase() === parsedArgs.lastName.toLowerCase());
        });

        result = account
          ? { success: true, account }
          : { success: false, error: 'Account not found' };
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
        // Find the bill and plan to verify
        const bill = bills.find((b: any) => b.id === bill_id);
        const plan = bill?.paymentPlans?.find((p: any) => p.id === plan_id);

        if (bill && plan) {
          // Dispatch event to update UI
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('planSelected', {
              detail: { planId: plan_id, billId: bill_id }
            }));
          }
          result = {
            success: true,
            message: `Selected ${plan.label} for bill ${bill.provider}. Proceeding to payment details.`
          };
        } else {
          result = {
            success: false,
            error: 'Invalid bill or plan selected.'
          };
        }
        break;

      case 'process_payment':
        result = {
          success: true,
          transaction_id: `TXN${Date.now()}`,
          amount: parsedArgs.amount,
          bill_id: parsedArgs.bill_id,
          timestamp: new Date().toISOString(),
          message: `Payment of $${parsedArgs.amount} processed successfully`
        };

        // Let OpenAI handle the response naturally
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
    console.log('🎤 Voice transcript event:', event.type, event);

    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      setTranscript(event.transcript || '');
      if (event.transcript) {
        console.log('👤 User voice message:', event.transcript);
        // Don't add to history here - it will be synced via voiceMessages prop
        // addMessageToHistory({
        //   id: Date.now().toString(),
        //   text: event.transcript,
        //   sender: 'user',
        //   timestamp: new Date()
        // });
      }
    } else if (event.type === 'response.audio_transcript.delta') {
      setTranscript(prev => prev + (event.delta || ''));
    } else if (event.type === 'response.audio_transcript.done') {
      if (event.transcript) {
        console.log('🤖 Bot voice response:', event.transcript);
        // Create a unique ID based on transcript content and timestamp to help with duplicate detection
        const messageId = `voice-bot-${Date.now()}-${event.transcript.substring(0, 20).replace(/\s/g, '-')}`;
        addMessageToHistory({
          id: messageId,
          text: event.transcript,
          sender: 'bot',
          timestamp: new Date()
        });
      }
      setTranscript('');
    }
  }, [addMessageToHistory]);

  const toggleVoiceMode = useCallback(async () => {
    if (isVoiceMode) {
      // Clean up event handlers before disconnecting
      realtimeService.off('function_call', handleFunctionCall);
      realtimeService.off('conversation.item.input_audio_transcription.completed', handleTranscript);
      realtimeService.off('response.audio_transcript.delta', handleTranscript);
      realtimeService.off('response.audio_transcript.done', handleTranscript);

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
        realtimeService.on('response.audio.delta', () => {
          console.log('🔊 Audio delta received in VoiceModeContext');
        });
        realtimeService.on('response.audio.done', () => {
          console.log('✅ Audio response complete in VoiceModeContext');
        });

        setIsVoiceMode(true);

        // Wait for connection to be fully ready before sending events
        // Check connection state before sending
        const checkAndSend = () => {
          if (realtimeService.isReady()) {
            realtimeService.sendEvent({
              type: 'response.create'
            });
          } else {
            console.warn('⚠️ Connection not ready, retrying...');
            setTimeout(checkAndSend, 200);
          }
        };

        // Trigger initial response after a short delay to ensure connection is ready
        setTimeout(checkAndSend, 500);

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
  }, [isVoiceMode, handleFunctionCall, handleTranscript, addMessageToHistory]);

  const startRecording = useCallback(async () => {
    if (!isVoiceMode || isRecording) return;

    try {
      await realtimeService.startRecording();
      setIsRecording(true);

      // Wait for connection to be ready before sending events
      const checkAndSend = () => {
        if (realtimeService.isReady()) {
          realtimeService.sendEvent({
            type: 'response.create'
          });
        } else {
          setTimeout(checkAndSend, 200);
        }
      };

      // Trigger a response after starting recording
      setTimeout(checkAndSend, 300);
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
