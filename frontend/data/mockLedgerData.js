/**
 * Secure ledger mock data.
 *
 * Shapes here mirror what the FastAPI ledger endpoints will eventually
 * return, so swapping the service body for a real fetch stays mechanical.
 *
 * The hashes below are hand-written placeholders. Nothing in the frontend
 * computes or checks them -- hash chaining and verification belong to the
 * backend. Amounts are raw numbers; formatting lives in utils/currency.js.
 */

/** Genesis anchor, shown as the previous hash of the very first record. */
export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Newest record first. `previousHash` of a record equals `currentHash` of the
 * record below it, which is what the chain diagram on the detail screen shows.
 */
export const ledgerRecords = [
  {
    id: 'TXN-024',
    sequence: 24,
    memberName: 'Asha Devi',
    type: 'Savings Deposit',
    kind: 'savings',
    amount: 2000,
    direction: 'in',
    timestamp: '2026-08-26T10:32:00',
    note: 'Monthly savings contribution',
    verified: true,
    currentHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    previousHash: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',
  },
  {
    id: 'TXN-023',
    sequence: 23,
    memberName: 'Sunita Devi',
    type: 'Loan Disbursement',
    kind: 'disbursement',
    amount: 5000,
    direction: 'out',
    timestamp: '2026-08-25T14:15:00',
    note: 'Approved by group vote on 24 Aug',
    verified: true,
    currentHash: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',
    previousHash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  },
  {
    id: 'TXN-022',
    sequence: 22,
    memberName: 'Asha Devi',
    type: 'Loan Repayment',
    kind: 'repayment',
    amount: 1500,
    direction: 'in',
    timestamp: '2026-08-24T17:40:00',
    note: 'Instalment 4 of 10',
    verified: true,
    currentHash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    previousHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  },
  {
    id: 'TXN-021',
    sequence: 21,
    memberName: 'Lakshmi Bai',
    type: 'Savings Deposit',
    kind: 'savings',
    amount: 1200,
    direction: 'in',
    timestamp: '2026-08-23T09:05:00',
    note: 'Monthly savings contribution',
    verified: true,
    currentHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    previousHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
  },
  {
    id: 'TXN-020',
    sequence: 20,
    memberName: 'Kavita Rao',
    type: 'Group Expense',
    kind: 'expense',
    amount: 800,
    direction: 'out',
    timestamp: '2026-08-22T16:20:00',
    note: 'Seed purchase for shared plot',
    verified: true,
    currentHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    previousHash: '486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7',
  },
  {
    id: 'TXN-019',
    sequence: 19,
    memberName: 'Sunita Devi',
    type: 'Loan Repayment',
    kind: 'repayment',
    amount: 2500,
    direction: 'in',
    timestamp: '2026-08-21T11:10:00',
    note: 'Instalment 7 of 12',
    verified: true,
    currentHash: '486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7',
    previousHash: 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
  },
  {
    id: 'TXN-018',
    sequence: 18,
    memberName: 'Meera Kumari',
    type: 'Savings Deposit',
    kind: 'savings',
    amount: 1000,
    direction: 'in',
    timestamp: '2026-08-20T08:45:00',
    note: 'Monthly savings contribution',
    verified: true,
    currentHash: 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
    previousHash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
  },
  {
    id: 'TXN-017',
    sequence: 17,
    memberName: 'Kavita Rao',
    type: 'Loan Disbursement',
    kind: 'disbursement',
    amount: 4000,
    direction: 'out',
    timestamp: '2026-08-19T13:30:00',
    note: 'Approved by group vote on 18 Aug',
    verified: true,
    currentHash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
    previousHash: GENESIS_HASH,
  },
];

/** Counts for the summary tiles. Kept beside the data, not derived in JSX. */
export const ledgerSummary = {
  totalRecords: 24,
  savingsEntries: 12,
  loanEntries: 7,
  repaymentEntries: 5,
};

/** Response returned by a clean integrity check. */
export const verifiedResult = {
  verified: true,
  totalRecords: 24,
  checkedRecords: 24,
  tamperedRecordId: null,
  verifiedAt: '2026-08-26T10:42:00',
};

/**
 * Failure response used by the tampered demo mode. The backend decides this;
 * the frontend only renders whichever result it is handed.
 */
export const tamperedResult = {
  verified: false,
  totalRecords: 24,
  checkedRecords: 24,
  tamperedRecordId: 'TXN-017',
  verifiedAt: '2026-08-26T10:42:00',
};

export default {
  GENESIS_HASH,
  ledgerRecords,
  ledgerSummary,
  verifiedResult,
  tamperedResult,
};
