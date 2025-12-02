import React from 'react';
import { PaymentPlan } from '../../../types/chat';

interface PaymentPlanSelectorProps {
    plans: PaymentPlan[];
    onSelect: (planId: string) => void;
}

export const PaymentPlanSelector: React.FC<PaymentPlanSelectorProps> = ({ plans, onSelect }) => {
    return (
        <div className="flex flex-col space-y-2 w-full max-w-sm">
            {plans.map((plan) => (
                <div
                    key={plan.id}
                    className="bg-white rounded-lg border border-gray-200 p-3 flex justify-between items-center hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onSelect(plan.id)}
                >
                    <div className="flex items-center">
                        <span className="font-semibold text-gray-800 text-sm">
                            {plan.months}mo • ${plan.monthlyPayment.toFixed(0)}/mo
                        </span>
                    </div>
                    <button
                        className="text-teal-600 text-xs font-medium hover:text-teal-700"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(plan.id);
                        }}
                    >
                        Learn more
                    </button>
                </div>
            ))}
        </div>
    );
};
