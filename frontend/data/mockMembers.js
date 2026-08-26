/**
 * SHG member roster (demo data).
 *
 * Every person here is fictional and the phone numbers are placeholders --
 * no real personal information belongs in this file.
 *
 * Figures are internally consistent with data/mockFinanceData.js:
 * the 12 savings balances total 48,500 and the four outstanding loans
 * total 18,000.
 */

export const members = [
  {
    id: 'MEM-001',
    name: 'Asha Devi',
    phone: '9800000101',
    village: 'Rampur',
    savings: 8500,
    outstandingLoan: 3000,
    repaymentStatus: 'On Track',
    joinedAt: '2025-06-12',
  },
  {
    id: 'MEM-002',
    name: 'Meena Devi',
    phone: '9800000102',
    village: 'Rampur',
    savings: 7800,
    outstandingLoan: 5000,
    repaymentStatus: 'On Track',
    joinedAt: '2025-06-12',
  },
  {
    id: 'MEM-003',
    name: 'Sunita Devi',
    phone: '9800000103',
    village: 'Kondapur',
    savings: 6200,
    outstandingLoan: 0,
    repaymentStatus: 'No Active Loan',
    joinedAt: '2025-07-03',
  },
  {
    id: 'MEM-004',
    name: 'Lakshmi Bai',
    phone: '9800000104',
    village: 'Kondapur',
    savings: 5400,
    outstandingLoan: 0,
    repaymentStatus: 'No Active Loan',
    joinedAt: '2025-07-19',
  },
  {
    id: 'MEM-005',
    name: 'Radha Kumari',
    phone: '9800000105',
    village: 'Rampur',
    savings: 4600,
    outstandingLoan: 4000,
    repaymentStatus: 'Delayed',
    joinedAt: '2025-08-02',
  },
  {
    id: 'MEM-006',
    name: 'Kavita Devi',
    phone: '9800000106',
    village: 'Bhimpur',
    savings: 3800,
    outstandingLoan: 0,
    repaymentStatus: 'No Active Loan',
    joinedAt: '2025-08-14',
  },
  {
    id: 'MEM-007',
    name: 'Savitri Devi',
    phone: '9800000107',
    village: 'Bhimpur',
    savings: 3200,
    outstandingLoan: 6000,
    repaymentStatus: 'On Track',
    joinedAt: '2025-09-01',
  },
  {
    id: 'MEM-008',
    name: 'Parvati Devi',
    phone: '9800000108',
    village: 'Rampur',
    savings: 2400,
    outstandingLoan: 0,
    repaymentStatus: 'No Active Loan',
    joinedAt: '2025-09-22',
  },
  {
    id: 'MEM-009',
    name: 'Gita Devi',
    phone: '9800000109',
    village: 'Kondapur',
    savings: 1900,
    outstandingLoan: 0,
    repaymentStatus: 'No Active Loan',
    joinedAt: '2025-10-08',
  },
  {
    id: 'MEM-010',
    name: 'Rukmini Devi',
    phone: '9800000110',
    village: 'Bhimpur',
    savings: 1600,
    outstandingLoan: 0,
    repaymentStatus: 'No Active Loan',
    joinedAt: '2025-11-11',
  },
  {
    id: 'MEM-011',
    name: 'Shanti Devi',
    phone: '9800000111',
    village: 'Rampur',
    savings: 1500,
    outstandingLoan: 0,
    repaymentStatus: 'No Active Loan',
    joinedAt: '2026-01-15',
  },
  {
    id: 'MEM-012',
    name: 'Anita Devi',
    phone: '9800000112',
    village: 'Kondapur',
    savings: 1600,
    outstandingLoan: 0,
    repaymentStatus: 'No Active Loan',
    joinedAt: '2026-02-04',
  },
];

/** Per-member history shown on the member details screen. */
export const memberHistory = {
  'MEM-001': {
    savingsHistory: [
      { id: 'sh-1', label: 'Monthly deposit', amount: 2000, date: 'Today' },
      { id: 'sh-2', label: 'Monthly deposit', amount: 1500, date: '28 Jul' },
      { id: 'sh-3', label: 'Monthly deposit', amount: 1500, date: '28 Jun' },
    ],
    loanHistory: [
      { id: 'lh-1', label: 'Crop input loan', amount: 5000, status: 'On Track', date: '10 Jun' },
      { id: 'lh-2', label: 'Seed purchase loan', amount: 2500, status: 'Closed', date: '02 Feb' },
    ],
  },
};

/** Fallback history so every member profile has something to show. */
export const defaultMemberHistory = {
  savingsHistory: [
    { id: 'sh-d1', label: 'Monthly deposit', amount: 1000, date: '28 Jul' },
    { id: 'sh-d2', label: 'Monthly deposit', amount: 1000, date: '28 Jun' },
  ],
  loanHistory: [],
};

export default { members, memberHistory, defaultMemberHistory };
