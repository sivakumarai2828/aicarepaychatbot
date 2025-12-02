import React from 'react';
import type { Bill, PaymentOption } from '../../types/chat';

interface BillDisplayProps {
  bill: Bill;
  onSelectPayment: (billId: string, option: PaymentOption) => void;
}

export const BillDisplay: React.FC<BillDisplayProps> = ({ bill, onSelectPayment }) => {
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-800">{bill.provider}</h3>
        <span className="text-lg font-bold text-teal-600">${bill.amount.toFixed(2)}</span>
      </div>
      <div className="flex gap-2 mt-3">
        {bill.paymentOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelectPayment(bill.id, option)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg transition-colors"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

