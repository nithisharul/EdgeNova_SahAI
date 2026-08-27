/**
 * Transaction list filters.
 *
 * Filter configuration, not data: which ledger entry types each chip shows.
 * The `types` values are the vocabulary financeService maps ledger entry
 * types onto, so this stays in step with the API without holding any records
 * of its own.
 */
export const transactionFilters = [
  { id: 'all', label: 'All', types: [] },
  { id: 'savings', label: 'Savings', types: ['savings'] },
  { id: 'loans', label: 'Loans', types: ['disbursement'] },
  { id: 'repayments', label: 'Repayments', types: ['repayment'] },
];

export default { transactionFilters };
