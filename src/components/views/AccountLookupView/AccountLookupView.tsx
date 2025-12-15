import React, { useState, useEffect } from 'react';
import { FiLoader, FiArrowRight, FiCheck, FiUser } from "react-icons/fi";

interface Account {
    id: string;
    last4: string;
    type: string;
    isPrimary?: boolean;
}

interface AccountLookupViewProps {
    onAccountSelect: (account: Account) => void;
    phoneNumber?: string;
}

export const AccountLookupView: React.FC<AccountLookupViewProps> = ({
    onAccountSelect,
    phoneNumber = "(555) 123-4567" // Default mock if not provided
}) => {
    const [isSearching, setIsSearching] = useState(true);
    const [activeAccount, setActiveAccount] = useState<string | null>(null);

    // Mock accounts data
    const accounts: Account[] = [
        { id: 'acc_1', last4: '5678', type: 'CareCredit Rewards', isPrimary: true },
        { id: 'acc_2', last4: '4321', type: 'CareCredit Standard' },
        { id: 'acc_3', last4: '9876', type: 'CareCredit Standard' },
    ];

    useEffect(() => {
        // Simulate API search delay
        const timer = setTimeout(() => {
            setIsSearching(false);
        }, 2000); // 2 seconds delay

        return () => clearTimeout(timer);
    }, []);

    if (isSearching) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-fade-in">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-white p-4 rounded-full shadow-lg border border-gray-100">
                        <FiLoader className="w-8 h-8 text-emerald-600 animate-spin" />
                    </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Searching for accounts...</h3>
                <p className="text-gray-500">Linked to {phoneNumber}</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-8 animate-fade-in">
            <div className="space-y-2 text-center md:text-left">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Select Your Account</h2>
                <p className="text-lg text-gray-600">
                    We found {accounts.length} accounts associated with your information.
                </p>
            </div>

            <div className="space-y-4">
                {accounts.map((account) => (
                    <button
                        key={account.id}
                        onClick={() => setActiveAccount(account.id)}
                        className={`group relative flex items-center w-full p-4 rounded-xl border-2 transition-all duration-300 text-left
                ${activeAccount === account.id
                                ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-1 ring-emerald-500/20'
                                : 'border-gray-100 bg-white hover:border-emerald-200 hover:shadow-lg'
                            }`}
                    >
                        <div className={`p-3 rounded-lg mr-4 transition-colors ${activeAccount === account.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'
                            }`}>
                            <FiUser className="w-6 h-6" />
                        </div>

                        <div className="flex-grow">
                            <div className="flex items-center gap-2">
                                <h3 className={`font-semibold text-lg ${activeAccount === account.id ? 'text-emerald-900' : 'text-gray-900'}`}>
                                    Account ending in {account.last4}
                                </h3>
                                {account.isPrimary && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                        Primary
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">{account.type}</p>
                        </div>

                        <div className={`transition-all duration-300 ${activeAccount === account.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                            <FiCheck className="w-6 h-6 text-emerald-600" />
                        </div>
                    </button>
                ))}
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={() => activeAccount && onAccountSelect(accounts.find(a => a.id === activeAccount)!)}
                    disabled={!activeAccount}
                    className={`flex items-center px-8 py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg
                ${activeAccount
                            ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-500/25 hover:-translate-y-0.5'
                            : 'bg-gray-300 cursor-not-allowed'
                        }`}
                >
                    Continue with Selected Account
                    <FiArrowRight className="ml-2 w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
