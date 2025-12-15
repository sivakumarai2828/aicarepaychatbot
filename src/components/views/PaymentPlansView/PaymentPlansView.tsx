import React from 'react';
import type { Bill, PaymentPlan } from '../../../types/chat';

interface PaymentPlansViewProps {
    bill: Bill;
    onPlanSelect?: (plan: PaymentPlan) => void;
}

export const PaymentPlansView: React.FC<PaymentPlansViewProps> = ({ bill, onPlanSelect }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 py-12 px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="inline-block p-4 bg-teal-500 rounded-full shadow-lg mb-4">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">Choose Your Payment Plan</h1>
                    <p className="text-xl text-gray-600">Flexible financing options for your {bill.provider} bill</p>
                </div>

                {/* Bill Summary */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-teal-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Selected Bill</p>
                            <p className="text-2xl font-bold text-gray-900">{bill.provider}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                            <p className="text-3xl font-bold text-teal-600">${bill.amount.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Payment Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {bill.paymentPlans?.map((plan, index) => {
                        const isPopular = plan.months === 12;
                        const totalWithInterest = plan.monthlyPayment * plan.months;
                        const interestAmount = totalWithInterest - bill.amount;

                        return (
                            <div
                                key={plan.id}
                                className={`relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer overflow-hidden ${isPopular ? 'ring-2 ring-teal-500' : ''
                                    }`}
                                onClick={() => onPlanSelect?.(plan)}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Popular Badge */}
                                {isPopular && (
                                    <div className="absolute top-4 right-4 z-10">
                                        <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 text-xs font-bold rounded-full shadow-lg">
                                            ⭐ POPULAR
                                        </span>
                                    </div>
                                )}

                                {/* Card Header */}
                                <div className={`p-6 ${isPopular
                                    ? 'bg-gradient-to-r from-teal-500 to-teal-600'
                                    : 'bg-gradient-to-r from-gray-600 to-gray-700'
                                    }`}>
                                    <div className="text-center">
                                        <p className="text-white/80 text-sm font-medium mb-2">
                                            {plan.type === 'no_interest' ? 'No Interest' : 'Reduced APR'}
                                        </p>
                                        <p className="text-5xl font-bold text-white mb-2">{plan.months}</p>
                                        <p className="text-white/90 text-lg font-medium">Months</p>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-6">
                                    {/* Monthly Payment */}
                                    <div className="text-center mb-6 pb-6 border-b border-gray-100">
                                        <p className="text-sm text-gray-500 mb-2">Monthly Payment</p>
                                        <p className="text-4xl font-bold text-gray-900">
                                            ${plan.monthlyPayment.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">per month</p>
                                    </div>

                                    {/* Plan Details */}
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-start gap-2">
                                            <svg className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <p className="text-sm text-gray-700">{plan.details}</p>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <svg className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <p className="text-sm text-gray-700">
                                                Total: ${totalWithInterest.toFixed(2)}
                                            </p>
                                        </div>

                                        {plan.type === 'no_interest' ? (
                                            <div className="flex items-start gap-2">
                                                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <p className="text-sm text-green-600 font-semibold">
                                                    Save ${Math.abs(interestAmount).toFixed(2)} in interest
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-2">
                                                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                <p className="text-sm text-orange-600">
                                                    +${interestAmount.toFixed(2)} interest
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Select Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPlanSelect?.(plan);
                                        }}
                                        className={`w-full py-3 font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${isPopular
                                            ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-lg hover:shadow-xl'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                            }`}>
                                        <span>Select Plan</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pay in Full Option */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-xl p-8 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold mb-2">Pay in Full</h3>
                            <p className="text-green-100 mb-4">Complete your payment today and avoid any future payments</p>
                            <div className="flex items-center gap-2 text-green-100">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm">No monthly payments</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-green-100 text-sm mb-1">One-time payment</p>
                            <p className="text-5xl font-bold mb-4">${bill.amount.toFixed(2)}</p>
                            <button
                                onClick={() => onPlanSelect?.({
                                    id: 'pay-in-full',
                                    type: 'no_interest',
                                    months: 1,
                                    monthlyPayment: bill.amount,
                                    label: 'Pay in Full',
                                    details: 'One-time payment'
                                })}
                                className="px-8 py-3 bg-white text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-colors duration-200"
                            >
                                Pay Now
                            </button>
                        </div>
                    </div>
                </div>

                {/* Help Text */}
                <div className="mt-12 text-center">
                    <p className="text-gray-500 text-sm">
                        💬 Questions about these plans? Ask me in the chat panel →
                    </p>
                </div>
            </div>
        </div>
    );
};
