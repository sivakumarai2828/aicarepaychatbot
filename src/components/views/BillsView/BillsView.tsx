import React from 'react';
import type { Bill } from '../../../types/chat';

interface BillsViewProps {
    bills: Bill[];
    onBillSelect?: (bill: Bill) => void;
}

export const BillsView: React.FC<BillsViewProps> = ({ bills, onBillSelect }) => {
    const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 py-12 px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="inline-block p-4 bg-teal-500 rounded-full shadow-lg mb-4">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">Your Bills</h1>
                    <p className="text-xl text-gray-600">Review and manage your outstanding balances</p>
                </div>

                {/* Total Summary Card */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl shadow-2xl p-8 mb-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-teal-100 text-sm font-medium mb-1">Total Outstanding Balance</p>
                            <p className="text-5xl font-bold">${totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-teal-100 text-sm font-medium mb-1">Number of Bills</p>
                            <p className="text-4xl font-bold">{bills.length}</p>
                        </div>
                    </div>
                </div>

                {/* Bills Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bills.map((bill, index) => (
                        <div
                            key={bill.id}
                            className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden group"
                            onClick={() => onBillSelect?.(bill)}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Card Header */}
                            <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6 group-hover:from-teal-600 group-hover:to-teal-700 transition-all duration-300">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
                                        Bill #{index + 1}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-white">{bill.provider}</h3>
                            </div>

                            {/* Card Body */}
                            <div className="p-6">
                                <div className="mb-4">
                                    <p className="text-sm text-gray-500 mb-1">Amount Due</p>
                                    <p className="text-3xl font-bold text-gray-900">${bill.amount.toFixed(2)}</p>
                                </div>

                                {/* Payment Options */}
                                <div className="space-y-2 mb-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Options</p>
                                    {bill.paymentOptions.map((option) => (
                                        <div key={option.id} className="flex items-center gap-2 text-sm text-gray-600">
                                            <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span>{option.label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Available Plans */}
                                {bill.paymentPlans && bill.paymentPlans.length > 0 && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                            {bill.paymentPlans.length} Financing Plans Available
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {bill.paymentPlans.slice(0, 3).map((plan) => (
                                                <span
                                                    key={plan.id}
                                                    className="px-2 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full"
                                                >
                                                    {plan.months} mo
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                <button className="w-full mt-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 group-hover:shadow-lg">
                                    <span>Select Bill</span>
                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Help Text */}
                <div className="mt-12 text-center">
                    <p className="text-gray-500 text-sm">
                        💬 Need help? Ask me anything in the chat panel →
                    </p>
                </div>
            </div>
        </div>
    );
};
