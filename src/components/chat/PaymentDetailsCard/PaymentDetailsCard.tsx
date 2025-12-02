import React from 'react';
import { PaymentSummary } from '../../../types/chat';

interface PaymentDetailsCardProps {
    summary: PaymentSummary;
}

export const PaymentDetailsCard: React.FC<PaymentDetailsCardProps> = ({ summary }) => {
    return (
        <div className="bg-white rounded-lg border border-teal-100 shadow-sm overflow-hidden w-full max-w-sm mt-2">
            <div className="bg-teal-50 px-4 py-2 border-b border-teal-100">
                <h3 className="text-teal-800 font-semibold text-sm">Payment Details</h3>
            </div>
            <div className="p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Amount Being Financed:</span>
                    <span className="font-semibold text-gray-900">${summary.balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-start">
                    <span className="text-gray-600 whitespace-nowrap mr-2">Payment Plan:</span>
                    <span className="font-semibold text-gray-900 text-right">{summary.planType}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Payment:</span>
                    <span className="font-semibold text-gray-900">${summary.monthlyPayment.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold text-gray-900">{summary.totalMonths} months</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">First Payment Date:</span>
                    <span className="font-semibold text-gray-900">
                        {new Date(summary.firstPaymentDate).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    );
};
