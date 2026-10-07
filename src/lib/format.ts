// Dates are stored as 'YYYY-MM-DD' strings and treated as UTC calendar days so
// arithmetic never drifts across time zones or DST.

export function todayISO(): string {
  const d = new Date();
  const local = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  return local.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const t = Date.parse(iso) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000);
}

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

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export function money(n: number): string {
  return usd.format(n);
}

export function num(n: number): string {
  return n.toLocaleString('en-US');
}

export function longToday(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/** Compact service label for tables: "Landscape Work > Edging" -> "Edging". */
export function shortService(s: string): string {
  return s.replace('Landscape Work > ', '').replace('Lawn Fertilization Program', 'Fertilization');
}
