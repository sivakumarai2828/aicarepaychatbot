import type { Bill } from '../types/chat';

export const bills: Bill[] = [
  {
    id: 'bill_1',
    provider: 'Medical Center',
    amount: 1250.00,
    paymentOptions: [
      { id: 'full', label: 'Pay in Full', action: 'pay_full' },
      { id: 'installment', label: 'Installment Plan', action: 'pay_installment' }
    ],
    paymentPlans: [
      {
        id: 'plan_6mo',
        type: 'no_interest',
        months: 6,
        monthlyPayment: 208.33,
        label: '6 Months No Interest',
        details: 'No interest if paid in full within 6 months'
      },
      {
        id: 'plan_12mo',
        type: 'no_interest',
        months: 12,
        monthlyPayment: 104.17,
        label: '12 Months No Interest',
        details: 'No interest if paid in full within 12 months'
      },
      {
        id: 'plan_18mo',
        type: 'no_interest',
        months: 18,
        monthlyPayment: 69.44,
        label: '18 Months No Interest',
        details: 'No interest if paid in full within 18 months'
      },
      {
        id: 'plan_24mo_reduced',
        type: 'reduced_apr',
        months: 24,
        monthlyPayment: 58.00, // Approximate with interest
        label: '24 Months Reduced APR',
        details: '14.90% APR for 24 months'
      }
    ]
  },
  {
    id: 'bill_2',
    provider: 'Dental Care',
    amount: 850.50,
    paymentOptions: [
      { id: 'full', label: 'Pay in Full', action: 'pay_full' },
      { id: 'installment', label: 'Installment Plan', action: 'pay_installment' }
    ],
    paymentPlans: [
      {
        id: 'plan_6mo',
        type: 'no_interest',
        months: 6,
        monthlyPayment: 141.75,
        label: '6 Months No Interest',
        details: 'No interest if paid in full within 6 months'
      },
      {
        id: 'plan_12mo',
        type: 'no_interest',
        months: 12,
        monthlyPayment: 70.88,
        label: '12 Months No Interest',
        details: 'No interest if paid in full within 12 months'
      }
    ]
  },
  {
    id: 'bill_3',
    provider: 'Vision Care',
    amount: 450.00,
    paymentOptions: [
      { id: 'full', label: 'Pay in Full', action: 'pay_full' },
      { id: 'installment', label: 'Installment Plan', action: 'pay_installment' }
    ],
    paymentPlans: [
      {
        id: 'plan_6mo',
        type: 'no_interest',
        months: 6,
        monthlyPayment: 75.00,
        label: '6 Months No Interest',
        details: 'No interest if paid in full within 6 months'
      }
    ]
  }
];

