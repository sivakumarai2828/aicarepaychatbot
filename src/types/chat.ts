export interface Bill {
  id: string;
  provider: string;
  amount: number;
  paymentOptions: PaymentOption[];
  paymentPlans?: PaymentPlan[];
}

export interface PaymentOption {
  id: string;
  label: string;
  action: string;
}

export interface ChatOption {
  id: string;
  label: string;
  action: string;
  details?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
  metadata?: {
    type?: string;
    bills?: Bill[];
    [key: string]: any;
  };
}

export interface CareAccount {
  id: string;
  lastFour: string;
  type: 'primary' | 'secondary';
}

export interface PaymentPlan {
  id: string;
  type: 'no_interest' | 'reduced_apr';
  months: number;
  monthlyPayment: number;
  label: string;
  details: string;
}

export interface PaymentSummary {
  balance: number;
  planType: string;
  monthlyPayment: number;
  totalMonths: number;
  firstPaymentDate: string;
  provider: string;
}

export interface ConversationState {
  context: string;
  lastIntent?: string;
  pendingAction?: string;
  selectedBill?: string;
  paymentFlow?: {
    method?: string;
    cardStep?: 'card_number' | 'cvv' | 'expiry_date';
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    selectedAccount?: string;
    selectedPlan?: PaymentPlan;
    paymentSummary?: PaymentSummary;
    confirmationNumber?: string;
    selectedBill?: Bill;
  };
}

export interface MessageHandlersProps {
  conversationState: ConversationState;
  selectedBill: Bill | null;
  careAccounts: CareAccount[];
  setIsProcessing: (value: boolean) => void;
  setCurrentOptions: (options: any[]) => void;
  setShowBills: (value: boolean) => void;
  setShowCustomAmount: (value: boolean) => void;
  setShowPaymentSummary: (value: boolean) => void;
  addMessages: (messages: any[]) => Promise<void>;
  handleAccountLookup: (text: string) => Promise<void>;
  handleCardLookup: (text: string) => Promise<void>;
  handleAccountSelection: (accountId: string, accounts: CareAccount[], bill: Bill) => Promise<void>;
  handlePlanSelection: (planId: string, bill: Bill) => Promise<void>;
  handleConfirmation: (confirmationNumber: string) => Promise<void>;
  handleFollowUp: (wantsMoreHelp: boolean) => Promise<void>;
  handlePaymentMethodSelect: (method: string) => Promise<void>;
  handleOTPVerification: (otp: string) => Promise<void>;
  handleResendOTP: () => Promise<void>;
  setConversationState: (state: (prev: ConversationState) => ConversationState) => void;
  onBackgroundChange?: (showMain: boolean) => void;
  onShowPaymentForm?: (paymentSummary: PaymentSummary) => void;
}