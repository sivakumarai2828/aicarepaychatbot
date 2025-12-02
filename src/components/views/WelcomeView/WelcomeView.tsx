import React from 'react';

export const WelcomeView: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50">
            <div className="max-w-3xl px-8 text-center">
                <div className="mb-8 animate-fade-in">
                    <div className="inline-block p-6 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full shadow-lg mb-6">
                        <svg
                            className="w-16 h-16 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                        </svg>
                    </div>

                    <h1 className="text-5xl font-bold text-gray-900 mb-4">
                        Welcome to <span className="text-teal-600">CareCredit</span>
                    </h1>

                    <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                        Seamless Payments, Flexible Options
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <p className="text-lg text-gray-700 leading-relaxed mb-6">
                        With just a few clicks, our chatbot helps you make hassle-free payments
                        with convenient financing options. Easily manage your transactions at your
                        own pace, while enjoying a simple and intuitive experience.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <div className="p-6 bg-teal-50 rounded-xl">
                            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Flexible Plans</h3>
                            <p className="text-sm text-gray-600">Choose from multiple payment options that fit your budget</p>
                        </div>

                        <div className="p-6 bg-teal-50 rounded-xl">
                            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Secure</h3>
                            <p className="text-sm text-gray-600">Bank-level encryption protects your information</p>
                        </div>

                        <div className="p-6 bg-teal-50 rounded-xl">
                            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Fast</h3>
                            <p className="text-sm text-gray-600">Complete payments in minutes with our AI assistant</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-3 text-teal-600 animate-bounce">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <p className="text-lg font-medium">
                        Start by saying "Show my bills" or click the chat icon →
                    </p>
                </div>
            </div>
        </div>
    );
};
