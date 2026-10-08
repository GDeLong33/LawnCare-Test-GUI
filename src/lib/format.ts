// Dates are stored as 'YYYY-MM-DD' strings and treated as UTC calendar days so
// arithmetic never drifts across time zones or DST. "Today" always comes from
// the real clock; no date is hardcoded anywhere in the app.

export function todayISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(iso: string): number {
  return new Date(Date.parse(iso)).getUTCDay();
}

/** Monday of the week containing `iso` (Sunday belongs to the week before). */
export function mondayOf(iso: string): string {
  const wd = weekdayOf(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** mm/dd/yy */
export function fmtDate(iso: string | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

/** mm/dd/yy h:mm AM */
export function fmtTimestamp(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = d.getHours() % 12 || 12;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${String(d.getFullYear()).slice(2)} ${h}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

export function longDate(iso: string): string {
  return new Date(Date.parse(iso)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function monthDay(iso: string): string {
  return new Date(Date.parse(iso)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export function money(n: number): string {
  return usd.format(n);
}

export function num(n: number): string {
  return n.toLocaleString('en-US');
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Compact service label for tables: "Landscape work – Edging sidewalks and driveways" -> "Edging sidewalks and driveways". */
export function shortService(s: string, application?: string): string {
  if (application) return application;
  return s.replace('Landscape work – ', '');
}
