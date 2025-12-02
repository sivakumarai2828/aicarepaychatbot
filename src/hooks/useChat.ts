import { useState, useCallback } from 'react';
import type { Message, ChatOption, ConversationState, CareAccount } from '../types/chat';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<ChatOption[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>({
    context: 'initial'
  });
  const [careAccounts, setCareAccounts] = useState<CareAccount[]>([]);

  const addMessages = useCallback(async (newMessages: Message | Message[]) => {
    const messagesToAdd = Array.isArray(newMessages) ? newMessages : [newMessages];
    setMessages(prev => {
      // Filter out duplicates by checking both message IDs and content (sender + text)
      const existingIds = new Set(prev.map(m => m.id));
      const existingContentKeys = new Set(
        prev.map(m => `${m.sender}:${m.text.substring(0, 100)}`)
      );
      
      const uniqueMessages = messagesToAdd.filter(msg => {
        const contentKey = `${msg.sender}:${msg.text.substring(0, 100)}`;
        const isDuplicate = existingIds.has(msg.id) || existingContentKeys.has(contentKey);
        if (isDuplicate) {
          console.log('⚠️ Filtering duplicate message:', msg.text.substring(0, 50));
        }
        return !isDuplicate;
      });
      
      if (uniqueMessages.length < messagesToAdd.length) {
        console.log('⚠️ Filtered out', messagesToAdd.length - uniqueMessages.length, 'duplicate messages');
      }
      
      return [...prev, ...uniqueMessages];
    });
  }, []);

  const initializeChat = useCallback(() => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: 'Hello! I\'m here to help you with your payments. How can I assist you today?',
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    setCurrentOptions([
      { id: 'lookup_account', label: 'Look up my account', action: 'lookup_account' },
      { id: 'view_bills', label: 'View my bills', action: 'view_bills' },
      { id: 'make_payment', label: 'Make a payment', action: 'make_payment' }
    ]);
    setConversationState({ context: 'initial' });
  }, []);

  return {
    messages,
    isTyping,
    currentOptions,
    conversationState,
    careAccounts,
    setCurrentOptions,
    setConversationState,
    setCareAccounts,
    addMessages,
    initializeChat,
    setIsTyping
  };
};

