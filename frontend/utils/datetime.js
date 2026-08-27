/**
 * Timestamp formatting for ledger entries.
 *
 * Written out by hand rather than through Intl so the output is identical on
 * Android, iOS and web regardless of the device locale data available.
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function parse(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 2026-08-26T10:32:00 -> "26 Aug 2026". */
export function formatDate(value) {
  const date = parse(value);
  if (!date) return '';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** 2026-08-26T10:32:00 -> "10:32 AM". */
export function formatTime(value) {
  const date = parse(value);
  if (!date) return '';
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

/** 2026-08-26T10:32:00 -> "26 Aug 2026 · 10:32 AM". */
export function formatDateTime(value) {
  const date = parse(value);
  if (!date) return '';
  return `${formatDate(date)} \u00B7 ${formatTime(date)}`;
}

/** Same as formatDateTime but says "Today" / "Yesterday" where it applies. */
export function formatRelativeDateTime(value, now = new Date()) {
  const date = parse(value);
  if (!date) return '';

  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (days === 0) return `Today, ${formatTime(date)}`;
  if (days === 1) return `Yesterday, ${formatTime(date)}`;
  return formatDateTime(date);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export default { formatDate, formatTime, formatDateTime, formatRelativeDateTime };
