/**
 * Indian rupee formatting helpers.
 *
 * Indian grouping puts the last three digits together and then groups the
 * remaining digits in pairs, so 120000 becomes 1,20,000 rather than 120,000.
 */

const RUPEE = '\u20B9';

/** Groups a positive integer string the Indian way. */
function groupIndian(digits) {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
}

/**
 * Formats a number as rupees, e.g. formatCurrency(48500) -> "₹48,500".
 * Pass { showSign: true } to prefix + or - for transaction amounts.
 */
export function formatCurrency(value, options = {}) {
  const { showSign = false, decimals = 0 } = options;
  const amount = Number(value);

  if (!Number.isFinite(amount)) return `${RUPEE}0`;

  const isNegative = amount < 0;
  const absolute = Math.abs(amount);
  const fixed = absolute.toFixed(decimals);
  const [whole, fraction] = fixed.split('.');

  let result = RUPEE + groupIndian(whole);
  if (fraction) result += '.' + fraction;

  if (showSign) {
    result = (isNegative ? '- ' : '+ ') + result;
  } else if (isNegative) {
    result = '-' + result;
  }

  return result;
}

/** Short form for dashboard tiles: 125000 -> "₹1.25L", 2500000 -> "₹25L". */
export function formatCompactCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${RUPEE}0`;

  const absolute = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absolute >= 10000000) return `${sign}${RUPEE}${trimZeros(absolute / 10000000)}Cr`;
  if (absolute >= 100000) return `${sign}${RUPEE}${trimZeros(absolute / 100000)}L`;
  if (absolute >= 1000) return `${sign}${RUPEE}${trimZeros(absolute / 1000)}K`;
  return formatCurrency(amount);
}

function trimZeros(n) {
  return String(Number(n.toFixed(2)));
}

export default { formatCurrency, formatCompactCurrency };
