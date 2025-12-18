import React, { useState, useEffect } from 'react';

interface PasswordGateProps {
    children: React.ReactNode;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
    const [password, setPassword] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(() => {
        const savedAuth = localStorage.getItem('site_authorized');
        const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD;
        return savedAuth === 'true' || !SITE_PASSWORD;
    });
    const [error, setError] = useState(false);

    const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD;

    useEffect(() => {
        if (!isAuthorized && !SITE_PASSWORD) {
            setIsAuthorized(true);
        }
    }, [isAuthorized, SITE_PASSWORD]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === SITE_PASSWORD) {
            setIsAuthorized(true);
            setError(false);
            localStorage.setItem('site_authorized', 'true');
        } else {
            setError(true);
            setPassword('');
        }
    };

    if (isAuthorized) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full animate-fade-in">
                {/* Header Area */}
                <div className="text-center mb-8">
                    <div className="inline-block p-4 bg-teal-500 rounded-full shadow-lg mb-4">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Access</h1>
                    <p className="text-gray-600">Please enter your password to continue</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-teal-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                                className="w-full bg-teal-50/30 border border-teal-100 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:bg-white transition-all shadow-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 animate-shake">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Invalid password. Please try again.</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-teal-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <span>Unlock Dashboard</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
                            CareCredit &bull; Secure Connection
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
