import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { realtimeService } from '../services/openai/realtimeService';
import type { RealtimeEvent } from '../types/openai';
import type { Message } from '../types/chat';
import { bills } from '../constants/bills';

const mockAccounts = [
  { id: 'acc_1', phone: '555-0123', email: 'user@example.com', lastFour: '5678' },
  { id: 'acc_2', phone: '555-0456', email: 'test@example.com', lastFour: '4321' }
];

interface VoiceModeContextType {
  isVoiceMode: boolean;
  isConnecting: boolean;
  isRecording: boolean;
  transcript: string;
  toggleVoiceMode: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  addMessageToHistory: (message: Message) => void;
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
        const account = mockAccounts.find(
          (acc: any) => acc.phone === parsedArgs.identifier || acc.email === parsedArgs.identifier
        );
        result = account
          ? { success: true, account }
          : { success: false, error: 'Account not found' };
        break;

      case 'get_bills':
        const accountBills = bills.filter((bill: any) => bill.id);
        result = { success: true, bills: accountBills };
        break;

      case 'process_payment':
        result = {
          success: true,
          transaction_id: `TXN${Date.now()}`,
          amount: parsedArgs.amount,
          bill_id: parsedArgs.bill_id,
          timestamp: new Date().toISOString()
        };

        addMessageToHistory({
          id: Date.now().toString(),
          text: `Payment of $${parsedArgs.amount} processed successfully`,
          sender: 'bot',
          timestamp: new Date()
        });
        break;

      case 'send_receipt':
        result = {
          success: true,
          method: parsedArgs.method,
          recipient: parsedArgs.recipient,
          sent_at: new Date().toISOString()
        };

        addMessageToHistory({
          id: Date.now().toString(),
          text: `Receipt sent via ${parsedArgs.method} to ${parsedArgs.recipient}`,
          sender: 'bot',
          timestamp: new Date()
        });
        break;
    }

    realtimeService.sendFunctionResult(call_id, result);
  }, [addMessageToHistory]);

  const handleTranscript = useCallback((event: RealtimeEvent) => {
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      setTranscript(event.transcript || '');
      if (event.transcript) {
        addMessageToHistory({
          id: Date.now().toString(),
          text: event.transcript,
          sender: 'user',
          timestamp: new Date()
        });
      }
    } else if (event.type === 'response.audio_transcript.delta') {
      setTranscript(prev => prev + (event.delta || ''));
    } else if (event.type === 'response.audio_transcript.done') {
      if (event.transcript) {
        addMessageToHistory({
          id: Date.now().toString(),
          text: event.transcript,
          sender: 'bot',
          timestamp: new Date()
        });
      }
    }
  }, [addMessageToHistory]);

  const toggleVoiceMode = useCallback(async () => {
    if (isVoiceMode) {
      realtimeService.stopRecording();
      realtimeService.disconnect();
      setIsVoiceMode(false);
      setIsRecording(false);
      setTranscript('');
    } else {
      setIsConnecting(true);
      try {
        await realtimeService.connect();

        realtimeService.on('function_call', handleFunctionCall);
        realtimeService.on('conversation.item.input_audio_transcription.completed', handleTranscript);
        realtimeService.on('response.audio_transcript.delta', handleTranscript);
        realtimeService.on('response.audio_transcript.done', handleTranscript);

        setIsVoiceMode(true);

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
    startRecording,
    stopRecording,
    addMessageToHistory
  };

  return (
    <VoiceModeContext.Provider value={value}>
      {children}
    </VoiceModeContext.Provider>
  );
};
