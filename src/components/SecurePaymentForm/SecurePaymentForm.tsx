import React, { useState } from 'react';
import type { PaymentSummary } from '../../types/interfaces';

interface SecurePaymentFormProps {
  paymentSummary: PaymentSummary;
  onClose: () => void;
  onPaymentComplete: () => void;
}


export const SecurePaymentForm: React.FC<SecurePaymentFormProps> = ({
  paymentSummary,
  onClose,
  onPaymentComplete
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    window.paymentFormCompletionCallback = () => {
      console.log('🎯 SecurePaymentForm: Global completion callback triggered');
      onPaymentComplete();
    };
    return () => {
      delete window.paymentFormCompletionCallback;
    };
  }, [onPaymentComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      if (window.paymentFormCompletionCallback) {
        window.paymentFormCompletionCallback();
      } else {
        onPaymentComplete();
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Secure Payment</h2>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Provider:</span>
            <span className="font-semibold">{paymentSummary.provider}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Amount:</span>
            <span className="font-semibold text-teal-600">${paymentSummary.balance.toFixed(2)}</span>
          </div>
          {paymentSummary.planType !== 'full' && (
            <>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Monthly Payment:</span>
                <span className="font-semibold">${paymentSummary.monthlyPayment.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Term:</span>
                <span className="font-semibold">{paymentSummary.totalMonths} months</span>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Number
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
              placeholder="1234 5678 9012 3456"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d{0,2})/, '$1/$2'))}
                placeholder="MM/YY"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVV
              </label>
              <input
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="123"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

