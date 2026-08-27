/**
 * SHG finance mock data.
 *
 * Figures reconcile with data/mockMembers.js:
 *   totalSavings 48,500 = sum of the 12 member balances
 *   outstandingLoans 18,000 = sum of the 4 active member loans
 *   availableBalance 30,500 = savings minus outstanding loans
 *
 * Amounts are stored raw; utils/currency.js does the formatting.
 */

export const financeSummary = {
  totalSavings: 48500,
  availableBalance: 30500,
  outstandingLoans: 18000,
  activeMembers: 12,
  savingsThisMonth: 7500,
  savingsDelta: '+8.2%',
};

/**
 * Group ledger movements. `type` maps onto TransactionCard's built-in
 * savings | disbursement | repayment | expense handling.
 */
export const transactions = [
  {
    id: 'TXN-001',
    type: 'savings',
    description: 'Savings Deposit',
    member: 'Asha Devi',
    amount: 2000,
    date: 'Today',
    status: 'Completed',
    statusTone: 'success',
  },
  {
    id: 'TXN-002',
    type: 'disbursement',
    description: 'Loan Disbursement',
    member: 'Sunita Devi',
    amount: 5000,
    date: 'Yesterday',
    status: 'Completed',
    statusTone: 'success',
  },
  {
    id: 'TXN-003',
    type: 'repayment',
    description: 'Loan Repayment',
    member: 'Meena Devi',
    amount: 1500,
    date: '25 Aug',
    status: 'Completed',
    statusTone: 'success',
  },
  {
    id: 'TXN-004',
    type: 'savings',
    description: 'Savings Deposit',
    member: 'Lakshmi Bai',
    amount: 1200,
    date: '24 Aug',
    status: 'Completed',
    statusTone: 'success',
  },
  {
    id: 'TXN-005',
    type: 'expense',
    description: 'Group Expense',
    member: 'Meeting refreshments',
    amount: 450,
    date: '23 Aug',
    status: 'Completed',
    statusTone: 'success',
  },
  {
    id: 'TXN-006',
    type: 'repayment',
    description: 'Loan Repayment',
    member: 'Radha Kumari',
    amount: 1000,
    date: '22 Aug',
    status: 'Delayed',
    statusTone: 'warning',
  },
  {
    id: 'TXN-007',
    type: 'savings',
    description: 'Savings Deposit',
    member: 'Kavita Devi',
    amount: 800,
    date: '21 Aug',
    status: 'Completed',
    statusTone: 'success',
  },
  {
    id: 'TXN-008',
    type: 'disbursement',
    description: 'Loan Disbursement',
    member: 'Savitri Devi',
    amount: 6000,
    date: '18 Aug',
    status: 'Completed',
    statusTone: 'success',
  },
  {
    id: 'TXN-009',
    type: 'expense',
    description: 'Group Expense',
    member: 'Ledger stationery',
    amount: 250,
    date: '16 Aug',
    status: 'Completed',
    statusTone: 'success',
  },
  {
    id: 'TXN-010',
    type: 'savings',
    description: 'Savings Deposit',
    member: 'Parvati Devi',
    amount: 1500,
    date: '15 Aug',
    status: 'Completed',
    statusTone: 'success',
  },
];

/** Filter chips on the transactions screen; `types` is empty for "All". */
export const transactionFilters = [
  { id: 'all', label: 'All', types: [] },
  { id: 'savings', label: 'Savings', types: ['savings'] },
  { id: 'loans', label: 'Loans', types: ['disbursement'] },
  { id: 'repayments', label: 'Repayments', types: ['repayment'] },
  { id: 'expenses', label: 'Expenses', types: ['expense'] },
];

/** Loan book summary shown at the top of the loans screen. */
export const loanSummary = {
  outstandingTotal: 18000,
  activeCount: 4,
  repaymentDue: 4500,
};

/** The four active loans. `remaining` values sum to outstandingTotal. */
export const activeLoans = [
  {
    id: 'LN-001',
    memberId: 'MEM-001',
    member: 'Asha Devi',
    principal: 5000,
    remaining: 3000,
    durationMonths: 12,
    status: 'On Track',
    purpose: 'Crop inputs',
  },
  {
    id: 'LN-002',
    memberId: 'MEM-002',
    member: 'Meena Devi',
    principal: 8000,
    remaining: 5000,
    durationMonths: 18,
    status: 'On Track',
    purpose: 'Livestock',
  },
  {
    id: 'LN-003',
    memberId: 'MEM-005',
    member: 'Radha Kumari',
    principal: 6000,
    remaining: 4000,
    durationMonths: 12,
    status: 'Delayed',
    purpose: 'Irrigation pump',
  },
  {
    id: 'LN-004',
    memberId: 'MEM-007',
    member: 'Savitri Devi',
    principal: 6000,
    remaining: 6000,
    durationMonths: 24,
    status: 'On Track',
    purpose: 'Small trade',
  },
];

export default {
  financeSummary,
  transactions,
  transactionFilters,
  loanSummary,
  activeLoans,
};
