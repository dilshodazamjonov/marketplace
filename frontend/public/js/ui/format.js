const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const priceFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formats an API date: a calendar date ("2026-10-23") or an ISO timestamp. */
export function formatDate(value) {
  if (!value) return '—';
  // A bare date would be read as UTC midnight and could show as the day before; read it as local.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? String(value) : dateFormat.format(date);
}

/** The API sends prices as decimal strings ("19.90") and has no currency yet. */
export function formatPrice(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? priceFormat.format(amount) : String(value);
}

/** Today as YYYY-MM-DD in the viewer's time zone, the format <input type="date"> uses. */
export function todayISO() {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
