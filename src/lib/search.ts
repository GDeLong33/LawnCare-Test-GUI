import type { Customer } from '../data/types';

export type SearchMode = 'last' | 'first' | 'number' | 'street';

export const SEARCH_MODES: { id: SearchMode; label: string; placeholder: string }[] = [
  { id: 'last', label: 'Last name', placeholder: 'e.g. Abernathy' },
  { id: 'first', label: 'First name', placeholder: 'e.g. Evelyn' },
  { id: 'number', label: 'Customer number', placeholder: 'e.g. C-00012 or 12' },
  { id: 'street', label: 'Street address', placeholder: 'e.g. Larkspur' },
];

/**
 * Name searches match from the start of the name, so "Aber" lists every
 * customer with that last name. Numbers match "C-00012", "00012" or "12".
 */
export function searchCustomers(customers: Customer[], mode: SearchMode, query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const digits = q.replace(/\D/g, '');
  const hits = customers.filter((c) => {
    switch (mode) {
      case 'last':
        return c.lastName.toLowerCase().startsWith(q);
      case 'first':
        return c.firstName.toLowerCase().startsWith(q);
      case 'number': {
        if (c.number.toLowerCase().includes(q)) return true;
        return digits !== '' && Number(c.number.replace(/\D/g, '')) === Number(digits);
      }
      case 'street':
        return c.billing.street.toLowerCase().includes(q) || c.shipTo.street.toLowerCase().includes(q);
    }
  });
  return hits.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
}

/** Free-text search across every field, used by list pages. */
export function matchesAny(c: Customer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [c.firstName, c.lastName, `${c.firstName} ${c.lastName}`, c.number, c.billing.street, c.email, c.phone].some((v) =>
    v.toLowerCase().includes(q),
  );
}
