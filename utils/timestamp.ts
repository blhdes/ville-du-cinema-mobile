/**
 * formatTakeTimestamp
 *
 * Formats a UTC ISO 8601 timestamp for display in Village.
 *
 * Two modes:
 *   isDetail = false  → relative (feed / comments)
 *   isDetail = true   → full absolute (take detail screen only)
 *
 * All output is in the user's local device timezone via native JS Date,
 * which already converts UTC to local time automatically.
 * No external libraries required – the native Intl API is sufficient on
 * both iOS and Android for the formatting we need here.
 */

export const formatTakeTimestamp = (
  createdAt: string | Date,
  isDetail: boolean,
): string => {
  // Parse the input into a Date object.
  // JS Date always stores time as UTC internally and converts to local
  // time when you call methods like getHours(), getDate(), etc.
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);

  // Guard: if the date is invalid, fail loudly so bugs surface early.
  if (isNaN(date.getTime())) {
    console.error('[formatTakeTimestamp] Invalid date received:', createdAt);
    return '—';
  }

  // IMPORTANT – timezone note:
  // `new Date(isoString)` parses the UTC moment and stores it internally as
  // UTC milliseconds. Every method called WITHOUT the "UTC" suffix
  // (getDate, getMonth, getFullYear, getHours, getMinutes) automatically
  // converts to the device's LOCAL timezone. We never call getUTCDate() etc.,
  // so ALL displayed values reflect the user's local time, not UTC.
  const now = new Date();

  // Posts from the future (clock skew, optimistic UI, etc.) are treated as
  // "just now" to avoid showing negative or confusing values.
  const elapsedMs = Math.max(0, now.getTime() - date.getTime());

  // ─── DETAIL VIEW ────────────────────────────────────────────────────────────
  // Always shows the full absolute timestamp, e.g. "2/7/26 · 18:06"
  if (isDetail) {
    // getDate/getMonth/getFullYear use the user's LOCAL timezone automatically.
    const day = date.getDate();           // no leading zero (e.g. 2)
    const month = date.getMonth() + 1;   // getMonth() is 0-indexed
    const year = String(date.getFullYear()).slice(-2); // last 2 digits of year

    const hours = date.getHours();       // 24-hour, no leading zero
    // Minutes always need two digits (e.g. "06"), so we pad with a leading zero.
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} · ${hours}:${minutes}`;
  }

  // ─── FEED / COMMENT VIEW (relative) ─────────────────────────────────────────
  const MINUTE = 60 * 1000;
  const HOUR   = 60 * MINUTE;
  const DAY    = 24 * HOUR;

  // < 1 minute
  if (elapsedMs < MINUTE) {
    return 'just now';
  }

  // 1–59 minutes  →  "1m", "5m", "59m"
  if (elapsedMs < HOUR) {
    const mins = Math.floor(elapsedMs / MINUTE);
    return `${mins}m`;
  }

  // 1–23 hours  →  "1h", "6h", "23h"
  if (elapsedMs < DAY) {
    const hours = Math.floor(elapsedMs / HOUR);
    return `${hours}h`;
  }

  // 1–6 days  →  "1d", "5d"
  if (elapsedMs < 7 * DAY) {
    const days = Math.floor(elapsedMs / DAY);
    return `${days}d`;
  }

  // 7+ days  →  short numerical date: d/M/yy  (e.g. "2/7/26")
  // Same local-timezone extraction as in the detail view above.
  const day   = date.getDate();
  const month = date.getMonth() + 1;
  const year  = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};
