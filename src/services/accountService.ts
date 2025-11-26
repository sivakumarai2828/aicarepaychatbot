import { CareAccount } from '../types/interfaces';
import { delay } from '../utils/delay';

export interface AccountSearchParams {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface AccountSearchResult {
  accounts: CareAccount[];
  totalAccounts: number;
  primaryAccount?: CareAccount;
}

export const searchAccounts = async (searchParams: AccountSearchParams): Promise<AccountSearchResult> => {
  await delay(2000);

  const validAccounts = [
    { firstName: 'Siva', lastName: 'Kumar', phone: '9166065168', accounts: [
      { id: "acc_1", lastFour: "5678", type: "primary" as const },
      { id: "acc_2", lastFour: "4321", type: "secondary" as const }
    ]},
    { firstName: 'John', lastName: 'Doe', phone: '555-0123', accounts: [
      { id: "acc_3", lastFour: "9876", type: "primary" as const }
    ]}
  ];

  const normalizedPhone = searchParams.phoneNumber.replace(/\D/g, '');
  const normalizedFirst = searchParams.firstName.toLowerCase().trim();
  const normalizedLast = searchParams.lastName.toLowerCase().trim();

  const matchedUser = validAccounts.find(user => {
    const userPhone = user.phone.replace(/\D/g, '');
    const userFirst = user.firstName.toLowerCase();
    const userLast = user.lastName.toLowerCase();

    return userPhone === normalizedPhone &&
           userFirst === normalizedFirst &&
           userLast === normalizedLast;
  });

  if (!matchedUser) {
    return {
      accounts: [],
      totalAccounts: 0
    };
  }

  const primaryAccount = matchedUser.accounts.find(acc => acc.type === "primary");

  return {
    accounts: matchedUser.accounts,
    totalAccounts: matchedUser.accounts.length,
    primaryAccount
  };
};