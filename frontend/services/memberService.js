import Config from '../constants/Config';
import { members as seedMembers, memberHistory, defaultMemberHistory } from '../data/mockMembers';

/**
 * Member service.
 *
 * Holds the roster in a module-level array so a member added during a demo
 * stays visible while navigating between screens. That is deliberate: it
 * avoids pulling in a state-management library for one session-scoped list,
 * and it disappears on reload exactly like the mock data it stands in for.
 *
 * Replacing the bodies below with calls to Config.API_BASE_URL is the only
 * change needed once the backend exists.
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Working copy of the roster for this session. */
let roster = [...seedMembers];

/** Shorter than the prediction delay -- a list read should feel quick. */
const LIST_DELAY = Math.round(Config.MOCK_DELAY / 2);

export async function getMembers() {
  await wait(LIST_DELAY);
  return roster.map((member) => ({ ...member }));
}

export async function getMemberById(id) {
  await wait(LIST_DELAY);
  const member = roster.find((entry) => entry.id === id);
  if (!member) throw new Error('Member not found.');

  const history = memberHistory[id] || defaultMemberHistory;
  return { ...member, ...history };
}

/**
 * Adds a member to the session roster.
 * @param {object} input - { name, phone, village, initialSavings }
 */
export async function addMember(input) {
  await wait(Config.MOCK_DELAY);

  const nextNumber = roster.length + 1;
  const member = {
    id: `MEM-${String(nextNumber).padStart(3, '0')}`,
    name: input.name.trim(),
    phone: input.phone.trim(),
    village: input.village.trim(),
    savings: Number(input.initialSavings) || 0,
    outstandingLoan: 0,
    repaymentStatus: 'No Active Loan',
    joinedAt: new Date().toISOString().slice(0, 10),
  };

  roster = [member, ...roster];
  return { ...member };
}

/** Test/demo helper: restores the seeded roster. */
export function resetMembers() {
  roster = [...seedMembers];
}

export default { getMembers, getMemberById, addMember, resetMembers };
