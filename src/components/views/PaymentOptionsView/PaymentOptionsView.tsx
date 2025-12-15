import React from 'react';
import { FiCreditCard, FiSearch, FiUserPlus, FiArrowRight } from "react-icons/fi";

interface PaymentOptionsViewProps {
    onOptionSelect: (option: 'account-lookup' | 'carecredit-card' | 'apply-new') => void;
    selectedPlan: any; // Using any for now, ideally strictly typed if we pass the plan
}

export const PaymentOptionsView: React.FC<PaymentOptionsViewProps> = ({
    onOptionSelect,
    selectedPlan
}) => {
    const options = [
        {
            id: 'account-lookup',
            title: 'Account Lookup',
            description: 'Use your existing account details to pay.',
            icon: FiSearch,
            color: 'bg-blue-50 text-blue-600',
        },
        {
            id: 'carecredit-card',
            title: 'CareCredit Card',
            description: 'Pay directly with your CareCredit card.',
            icon: FiCreditCard,
            color: 'bg-emerald-50 text-emerald-600',
        },
        {
            id: 'apply-new',
            title: 'Apply for a new CareCredit card',
            description: 'Don\'t have a card? Apply for one now.',
            icon: FiUserPlus,
            color: 'bg-purple-50 text-purple-600',
        },
    ] as const;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
            <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in">
                <div className="space-y-2 text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Payment Options</h2>
                    <p className="text-lg text-gray-600">
                        How would you like to proceed with your selected plan?
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => {
                                console.log('🔘 Option clicked:', option.id);
                                onOptionSelect(option.id as any);
                            }}
                            className="group relative flex flex-col items-start p-6 bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-2xl hover:border-emerald-500/20 transition-all duration-300 text-left w-full h-full transform hover:-translate-y-1"
                        >
                            <div className={`p-4 rounded-xl ${option.color} mb-6 group-hover:scale-110 transition-transform duration-300 ring-1 ring-black/5`}>
                                <option.icon className="w-8 h-8" />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors">
                                {option.title}
                            </h3>

                            <p className="text-gray-500 text-sm mb-8 leading-relaxed flex-grow">
                                {option.description}
                            </p>

                            <div className="flex items-center text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-lg group-hover:bg-emerald-100 transition-colors w-full justify-between">
                                Select <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    ))}
                </div>

                {selectedPlan && (
                    <div className="mt-8 p-6 bg-white rounded-2xl shadow-md border border-gray-100 flex items-center justify-between text-base text-gray-600">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span>Selected Plan: <span className="font-bold text-gray-900">{selectedPlan.months} Months</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Monthly Payment: <span className="font-bold text-gray-900 text-lg">${(selectedPlan.monthlyPayment || selectedPlan.amount || 0).toFixed(2)}</span></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
