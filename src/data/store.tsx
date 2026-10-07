import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildSeed, DATA_VERSION } from './seed';
import type { AppData, Customer, Invoice, Payment, PaymentMethod } from './types';
import { todayISO } from '../lib/format';

const STORAGE_KEY = 'billy-goat-demo-data';

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed.version === DATA_VERSION) return parsed;
    }
  } catch {
    /* storage unavailable or corrupt: fall back to seed */
  }
  return buildSeed();
}

type Mutator = (d: AppData) => void;

interface Store {
  data: AppData;
  update: (fn: Mutator) => void;
  reset: () => void;
  addCustomer: () => string;
  completeWorkOrder: (woId: string) => void;
  addPrepayment: (customerId: string, amount: number, method: PaymentMethod, reference: string) => void;
  reversePayment: (paymentId: string) => void;
  addServiceCredit: (customerId: string, amount: number, note: string) => void;
  postRefund: (customerId: string, amount: number, method: PaymentMethod, reference: string, note: string) => void;
}

const Ctx = createContext<Store | null>(null);

let idCounter = Date.now();
const newId = (prefix: string) => `${prefix}${(idCounter++).toString(36)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

function pushPayment(d: AppData, p: Omit<Payment, 'id' | 'reversed' | 'date'> & { date?: string }) {
  d.payments.push({ id: newId('p'), reversed: false, date: todayISO(), ...p });
}

/** Apply `amount` to a customer's oldest open invoices; returns the unapplied remainder. */
function applyToInvoices(d: AppData, customerId: string, amount: number): number {
  const open = d.invoices
    .filter((i) => i.customerId === customerId && i.amount - i.amountPaid > 0.005)
    .sort((a, b) => a.date.localeCompare(b.date));
  let left = amount;
  for (const inv of open) {
    if (left <= 0) break;
    const take = Math.min(left, inv.amount - inv.amountPaid);
    inv.amountPaid = round2(inv.amountPaid + take);
    left = round2(left - take);
  }
  return left;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota / private mode */
    }
  }, [data]);

  const update = useCallback((fn: Mutator) => {
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const store = useMemo<Store>(() => {
    // Action creators read from the draft inside `update`, so they never see stale state.
    return {
      data,
      update,
      reset: () => setData(buildSeed()),

      addCustomer: () => {
        const id = newId('c');
        update((d) => {
          const seq = d.nextCustomerSeq++;
          const blankAddr = { street: '', city: 'Millbrook', state: 'OH', zip: '' };
          const c: Customer = {
            id,
            number: `C-${String(seq).padStart(5, '0')}`,
            firstName: 'New',
            lastName: 'Customer',
            phone: '',
            email: '',
            billing: { ...blankAddr },
            shipSameAsBilling: true,
            shipTo: { ...blankAddr },
            sqft: 0,
            routeId: d.routes[0].id,
            crossStreet: '',
            gateCode: '',
            callFirst: false,
            active: true,
            prepayBalance: 0,
            serviceType: 'Lawn Mowing',
            notes: '',
          };
          d.customers.push(c);
          d.routes[0].stops.push(id);
        });
        return id;
      },

      completeWorkOrder: (woId) =>
        update((d) => {
          const wo = d.workOrders.find((w) => w.id === woId);
          if (!wo || wo.status === 'Completed') return;
          wo.status = 'Completed';
          const inv: Invoice = {
            id: newId('inv'),
            number: `INV-${d.nextInvoiceSeq++}`,
            customerId: wo.customerId,
            workOrderId: wo.id,
            date: wo.date,
            amount: wo.price,
            amountPaid: 0,
          };
          d.invoices.push(inv);
          // Prepaid credit auto-debits when the service is recorded.
          const cust = d.customers.find((c) => c.id === wo.customerId);
          if (cust && cust.prepayBalance > 0) {
            const debit = Math.min(cust.prepayBalance, inv.amount);
            cust.prepayBalance = round2(cust.prepayBalance - debit);
            inv.amountPaid = debit;
            pushPayment(d, {
              customerId: cust.id,
              invoiceId: inv.id,
              kind: 'Prepay Debit',
              method: 'Prepaid',
              reference: wo.number,
              amount: debit,
              note: `Auto-debit for ${wo.service}`,
            });
          }
        }),

      addPrepayment: (customerId, amount, method, reference) =>
        update((d) => {
          const c = d.customers.find((x) => x.id === customerId);
          if (!c || amount <= 0) return;
          c.prepayBalance = round2(c.prepayBalance + amount);
          pushPayment(d, { customerId, kind: 'Prepayment', method, reference, amount, note: 'Prepayment on account' });
        }),

      reversePayment: (paymentId) =>
        update((d) => {
          const p = d.payments.find((x) => x.id === paymentId);
          if (!p || p.reversed || p.amount <= 0) return;
          p.reversed = true;
          const c = d.customers.find((x) => x.id === p.customerId);
          const inv = p.invoiceId ? d.invoices.find((i) => i.id === p.invoiceId) : undefined;
          if (inv) inv.amountPaid = round2(Math.max(0, inv.amountPaid - p.amount));
          if (c && p.kind === 'Prepayment') c.prepayBalance = round2(Math.max(0, c.prepayBalance - p.amount));
          if (c && p.kind === 'Prepay Debit') c.prepayBalance = round2(c.prepayBalance + p.amount);
          pushPayment(d, {
            customerId: p.customerId,
            invoiceId: p.invoiceId,
            kind: 'Reversal',
            method: p.method,
            reference: p.reference,
            amount: -p.amount,
            note: `Reversal of ${p.kind.toLowerCase()} dated ${p.date}`,
          });
        }),

      addServiceCredit: (customerId, amount, note) =>
        update((d) => {
          const c = d.customers.find((x) => x.id === customerId);
          if (!c || amount <= 0) return;
          const left = applyToInvoices(d, customerId, amount);
          if (left > 0) c.prepayBalance = round2(c.prepayBalance + left);
          pushPayment(d, { customerId, kind: 'Service Credit', method: 'Credit', reference: '', amount, note: note || 'Service credit' });
        }),

      postRefund: (customerId, amount, method, reference, note) =>
        update((d) => {
          const c = d.customers.find((x) => x.id === customerId);
          if (!c || amount <= 0) return;
          c.prepayBalance = round2(Math.max(0, c.prepayBalance - amount));
          pushPayment(d, { customerId, kind: 'Refund', method, reference, amount: -amount, note: note || 'Refund issued' });
        }),
    };
  }, [data, update]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

// ---- Selectors ----

export function customerName(c: Pick<Customer, 'firstName' | 'lastName'> | undefined): string {
  return c ? `${c.firstName} ${c.lastName}` : '—';
}

export function openBalance(d: AppData, customerId: string): number {
  return round2(
    d.invoices.filter((i) => i.customerId === customerId).reduce((s, i) => s + (i.amount - i.amountPaid), 0),
  );
}
