import React from 'react';
import type { PaymentSummary } from '../../types/interfaces';

interface PaymentConfirmationProps {
  confirmationNumber: string;
  paymentSummary: PaymentSummary;
  email?: string;
  onClose: () => void;
}

export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  confirmationNumber,
  paymentSummary,
  email,
  onClose
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Confirmed!</h2>
          <p className="text-gray-600">Your payment has been successfully processed.</p>
        </div>

        <div className="border-t border-b py-6 my-6 space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Confirmation Number:</span>
            <span className="font-semibold text-gray-900">{confirmationNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Provider:</span>
            <span className="font-semibold text-gray-900">{paymentSummary.provider}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-semibold text-gray-900">${paymentSummary.balance.toFixed(2)}</span>
          </div>
          {email && (
            <div className="flex justify-between">
              <span className="text-gray-600">Receipt sent to:</span>
              <span className="font-semibold text-gray-900">{email}</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

