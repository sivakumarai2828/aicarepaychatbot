import React, { useEffect, useRef } from 'react';
import { Message } from '../../../types/interfaces';
import { BotAvatar } from '../../BotAvatar/BotAvatar';
import { BillDisplay } from '../../BillDisplay/BillDisplay';
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

  const hasBillSelection = message.metadata?.type === 'bill_selection' && message.metadata?.bills;
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

        {hasBillSelection && (
          <div className="mt-4 space-y-2">
            {message.metadata!.bills!.map((bill: any) => (
              <BillDisplay
                key={bill.id}
                bill={bill}
                onSelectPayment={(billId, option) => {
                  console.log('Bill payment selected from voice mode:', billId, option);
                  window.dispatchEvent(new CustomEvent('billPaymentSelected', {
                    detail: { billId, option }
                  }));
                }}
              />
            ))}
          </div>
        )}

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