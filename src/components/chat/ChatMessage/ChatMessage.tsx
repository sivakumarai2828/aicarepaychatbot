import React, { useEffect, useRef } from 'react';
import { Message } from '../../../types/interfaces';
import { BotAvatar } from '../../BotAvatar/BotAvatar';

import { PaymentPlanSelector } from '../PaymentPlanSelector/PaymentPlanSelector';
import { PaymentDetailsCard } from '../PaymentDetailsCard/PaymentDetailsCard';

interface ChatMessageProps {
  message: Message;
  isLatest: boolean;
  onMessageDisplay?: (messageId: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLatest,
  onMessageDisplay
}) => {
  const isBot = message.sender === 'bot';
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLatest && onMessageDisplay) {
      onMessageDisplay(message.id);
    }
  }, [isLatest, message.id, onMessageDisplay]);

  const hasPlanSelection = message.metadata?.type === 'plan_selection' && message.metadata?.plans;
  const hasPaymentSummary = message.metadata?.type === 'payment_summary' && message.metadata?.summary;

  return (
    <div
      ref={messageRef}
      id={`message-${message.id}`}
      className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}
    >
      {isBot && <BotAvatar />}
      <div
        className={`max-w-[85%] p-4 rounded-lg ${isBot ? 'bg-white shadow-sm ml-2' : 'bg-teal-600 text-white'
          }`}
      >
        <p className="break-words whitespace-pre-wrap">{message.text}</p>

        {/* Bills are displayed in the main view, not in chat */}

        {hasPlanSelection && (
          <div className="mt-4">
            <PaymentPlanSelector
              plans={message.metadata!.plans}
              onSelect={(planId) => {
                window.dispatchEvent(new CustomEvent('planSelected', {
                  detail: { planId }
                }));
              }}
            />
          </div>
        )}

        {hasPaymentSummary && (
          <div className="mt-4">
            <PaymentDetailsCard summary={message.metadata!.summary} />
          </div>
        )}

        <span className="text-xs text-gray-500 mt-2 block">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
};