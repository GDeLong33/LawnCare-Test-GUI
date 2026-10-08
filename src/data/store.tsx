import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildSeed, DATA_VERSION, priceFor } from './seed';
import type { AppData, Customer, Invoice, Payment, PaymentMethod, Route, Settings, WorkOrder } from './types';
import { addDays, daysBetween, mondayOf, round2, todayISO } from '../lib/format';

const STORAGE_KEY = 'billy-goat-demo-data';

/**
 * Saved demo data keeps its dates, so a visitor returning weeks later would see
 * an empty "this week". Shift every calendar date forward by whole weeks so
 * weekdays (and route days) stay aligned with the real calendar.
 */
function shiftToCurrentWeek(d: AppData): AppData {
  const nowMonday = mondayOf(todayISO());
  const delta = daysBetween(d.anchorMonday, nowMonday);
  if (delta <= 0) return d;
  const s = (iso: string) => addDays(iso, delta);
  d.workOrders.forEach((w) => {
    w.date = s(w.date);
    if (w.completedDate) w.completedDate = s(w.completedDate);
  });
  d.invoices.forEach((i) => (i.date = s(i.date)));
  d.payments.forEach((p) => (p.date = s(p.date)));
  d.customers.forEach((c) => (c.createdAt = s(c.createdAt)));
  d.anchorMonday = nowMonday;
  return d;
}

export function isValidData(x: unknown): x is AppData {
  const d = x as AppData;
  return (
    !!d &&
    typeof d === 'object' &&
    Array.isArray(d.customers) &&
    Array.isArray(d.workOrders) &&
    Array.isArray(d.payments) &&
    Array.isArray(d.invoices) &&
    Array.isArray(d.routes) &&
    !!d.settings
  );
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed.version === DATA_VERSION && isValidData(parsed)) return shiftToCurrentWeek(parsed);
    }
  } catch {
    /* storage unavailable or corrupt: fall back to seed */
  }
  return buildSeed();
}

let idCounter = Date.now();
export const newId = (prefix: string) => `${prefix}${(idCounter++).toString(36)}`;

function log(d: AppData, action: string, detail: string, customerId?: string, amount?: number) {
  d.audit.unshift({ id: newId('a'), ts: new Date().toISOString(), action, detail, customerId, amount });
}

function pushPayment(d: AppData, p: Omit<Payment, 'id' | 'reversed' | 'date'> & { date?: string }): Payment {
  const pay: Payment = { id: newId('p'), reversed: false, date: todayISO(), ...p };
  d.payments.push(pay);
  return pay;
}

export function invoiceBalance(i: Invoice): number {
  return round2(i.amount + i.lateFee - i.amountPaid);
}

/** Apply `amount` to a customer's oldest open invoices; returns the unapplied remainder. */
function applyToInvoices(d: AppData, customerId: string, amount: number): number {
  const open = d.invoices
    .filter((i) => i.customerId === customerId && invoiceBalance(i) > 0.005)
    .sort((a, b) => a.date.localeCompare(b.date));
  let left = round2(amount);
  for (const inv of open) {
    if (left <= 0) break;
    const take = Math.min(left, invoiceBalance(inv));
    inv.amountPaid = round2(inv.amountPaid + take);
    left = round2(left - take);
  }
  return left;
}

export function nextCustomerNumber(d: AppData): string {
  const max = d.customers.reduce((m, c) => Math.max(m, Number(c.number.replace(/\D/g, '')) || 0), 0);
  return `C-${String(max + 1).padStart(5, '0')}`;
}

function nextSeq(list: { number: string }[], start: number): number {
  return list.reduce((m, x) => Math.max(m, Number(x.number.replace(/\D/g, '')) || 0), start - 1) + 1;
}

export const customerName = (c: Pick<Customer, 'firstName' | 'lastName'> | undefined) =>
  c ? `${c.firstName} ${c.lastName}` : '—';

export const routeLabel = (r: Route | undefined, s: Settings) => (r ? `${s.routePrefix} ${r.number} – ${r.name}` : 'Unassigned');

export function openBalance(d: AppData, customerId: string): number {
  return round2(d.invoices.filter((i) => i.customerId === customerId).reduce((s, i) => s + invoiceBalance(i), 0));
}

export type NewWorkOrder = Pick<WorkOrder, 'customerId' | 'date' | 'service'> & Partial<WorkOrder>;

interface Store {
  data: AppData;
  update: (fn: (d: AppData) => void) => void;
  reset: () => void;
  restore: (d: AppData) => void;
  addCustomer: (fields?: Partial<Customer>) => string;
  addWorkOrder: (wo: NewWorkOrder) => string;
  completeWorkOrder: (woId: string) => void;
  recordPayment: (customerId: string, amount: number, method: PaymentMethod, reference: string) => void;
  addPrepayment: (customerId: string, amount: number, method: PaymentMethod, reference: string) => void;
  reversePayment: (paymentId: string) => void;
  addServiceCredit: (customerId: string, amount: number, note: string) => void;
  postRefund: (customerId: string, amount: number, method: PaymentMethod, reference: string, note: string) => void;
  setLateFee: (invoiceId: string, fee: number) => void;
  markBackedUp: () => void;
  logEvent: (action: string, detail: string, customerId?: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota / private mode */
    }
  }, [data]);

  const update = useCallback((fn: (d: AppData) => void) => {
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const store = useMemo<Store>(
    () => ({
      data,
      update,
      reset: () => setData(buildSeed()),
      restore: (d) => setData(shiftToCurrentWeek(structuredClone(d))),

      addCustomer: (fields = {}) => {
        const id = newId('c');
        update((d) => {
          const routeId = fields.routeId ?? d.routes[0]?.id ?? '';
          const blank = { street: '', city: '', state: 'OH', zip: '' };
          const c: Customer = {
            id,
            number: nextCustomerNumber(d),
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            billing: { ...blank },
            shipSameAsBilling: true,
            shipTo: { ...blank },
            sqft: 0,
            routeId,
            crossStreet: '',
            gateCode: '',
            callFirst: false,
            active: true,
            prepayBalance: 0,
            serviceType: 'Lawn mowing',
            notes: '',
            createdAt: todayISO(),
            ...fields,
          };
          c.id = id;
          d.customers.push(c);
          d.routes.find((r) => r.id === routeId)?.stops.push(id);
          log(d, 'Customer created', `${c.number} ${customerName(c)}`.trim(), id);
        });
        return id;
      },

      addWorkOrder: (wo) => {
        const id = newId('wo');
        update((d) => {
          const c = d.customers.find((x) => x.id === wo.customerId);
          const number = `WO-${nextSeq(d.workOrders, 10001)}`;
          d.workOrders.push({
            employeeId: d.employees[0].id,
            manHours: 1,
            price: priceFor(wo.service, c?.sqft ?? 0),
            status: 'Scheduled',
            chemical: '',
            epaReg: '',
            notes: '',
            ...wo,
            id,
            number,
          });
          log(d, 'Work order created', `${number} for ${customerName(c)} – ${wo.service}`, wo.customerId);
        });
        return id;
      },

      completeWorkOrder: (woId) =>
        update((d) => {
          const wo = d.workOrders.find((w) => w.id === woId);
          if (!wo || wo.status === 'Completed') return;
          wo.status = 'Completed';
          wo.completedDate = todayISO();
          const inv: Invoice = {
            id: newId('inv'),
            number: `INV-${nextSeq(d.invoices, 20001)}`,
            customerId: wo.customerId,
            workOrderId: wo.id,
            date: wo.completedDate,
            description: wo.application ? `Fertilization – ${wo.application}` : wo.service,
            amount: wo.price,
            amountPaid: 0,
            lateFee: 0,
          };
          d.invoices.push(inv);
          log(d, 'Service recorded', `${wo.number} completed; invoice ${inv.number} created`, wo.customerId, wo.price);
          // Prepaid credit is debited automatically when a service is recorded.
          const cust = d.customers.find((c) => c.id === wo.customerId);
          if (cust && cust.prepayBalance > 0) {
            const debit = round2(Math.min(cust.prepayBalance, inv.amount));
            cust.prepayBalance = round2(cust.prepayBalance - debit);
            inv.amountPaid = debit;
            pushPayment(d, {
              customerId: cust.id,
              invoiceId: inv.id,
              kind: 'Prepay debit',
              method: 'Prepaid balance',
              reference: wo.number,
              amount: debit,
              note: `Auto-debit for ${inv.description}`,
            });
            log(d, 'Prepay debit', `Debited prepaid balance for ${inv.number}`, cust.id, debit);
          }
        }),

      recordPayment: (customerId, amount, method, reference) =>
        update((d) => {
          const c = d.customers.find((x) => x.id === customerId);
          if (!c || amount <= 0) return;
          const left = applyToInvoices(d, customerId, amount);
          if (left > 0) c.prepayBalance = round2(c.prepayBalance + left);
          pushPayment(d, { customerId, kind: 'Payment', method, reference, amount, note: left > 0 ? `${left.toFixed(2)} left as credit` : '' });
          log(d, 'Payment recorded', `${method}${reference ? ' ' + reference : ''}`, customerId, amount);
        }),

      addPrepayment: (customerId, amount, method, reference) =>
        update((d) => {
          const c = d.customers.find((x) => x.id === customerId);
          if (!c || amount <= 0) return;
          c.prepayBalance = round2(c.prepayBalance + amount);
          pushPayment(d, { customerId, kind: 'Prepayment', method, reference, amount, note: 'Prepayment on account' });
          log(d, 'Prepayment added', `${method}${reference ? ' ' + reference : ''}`, customerId, amount);
        }),

      reversePayment: (paymentId) =>
        update((d) => {
          const p = d.payments.find((x) => x.id === paymentId);
          if (!p || p.reversed || p.amount <= 0) return;
          p.reversed = true;
          const c = d.customers.find((x) => x.id === p.customerId);
          const inv = p.invoiceId ? d.invoices.find((i) => i.id === p.invoiceId) : undefined;
          if (inv) inv.amountPaid = round2(Math.max(0, inv.amountPaid - p.amount));
          else if (c && (p.kind === 'Payment' || p.kind === 'Service credit')) {
            // Unlinked payment was spread over invoices: pull it back off the newest ones first.
            let left = p.amount;
            const paid = d.invoices
              .filter((i) => i.customerId === c.id && i.amountPaid > 0)
              .sort((a, b) => b.date.localeCompare(a.date));
            for (const i of paid) {
              if (left <= 0) break;
              const take = Math.min(left, i.amountPaid);
              i.amountPaid = round2(i.amountPaid - take);
              left = round2(left - take);
            }
          }
          if (c && p.kind === 'Prepayment') c.prepayBalance = round2(Math.max(0, c.prepayBalance - p.amount));
          if (c && p.kind === 'Prepay debit') c.prepayBalance = round2(c.prepayBalance + p.amount);
          pushPayment(d, {
            customerId: p.customerId,
            invoiceId: p.invoiceId,
            kind: 'Reversal',
            method: p.method,
            reference: p.reference,
            amount: -p.amount,
            note: `Reverses ${p.kind.toLowerCase()} of ${p.date}`,
          });
          log(d, 'Payment reversed', `${p.kind} ${p.method}${p.reference ? ' ' + p.reference : ''} (entry error)`, p.customerId, -p.amount);
        }),

      addServiceCredit: (customerId, amount, note) =>
        update((d) => {
          const c = d.customers.find((x) => x.id === customerId);
          if (!c || amount <= 0) return;
          const left = applyToInvoices(d, customerId, amount);
          if (left > 0) c.prepayBalance = round2(c.prepayBalance + left);
          pushPayment(d, { customerId, kind: 'Service credit', method: 'Credit', reference: '', amount, note: note || 'Service credit' });
          log(d, 'Service credit', note || 'Balance credited', customerId, amount);
        }),

      postRefund: (customerId, amount, method, reference, note) =>
        update((d) => {
          const c = d.customers.find((x) => x.id === customerId);
          if (!c || amount <= 0) return;
          c.prepayBalance = round2(Math.max(0, c.prepayBalance - amount));
          pushPayment(d, { customerId, kind: 'Refund', method, reference, amount: -amount, note: note || 'Refund issued' });
          log(d, 'Refund posted', `${method}${reference ? ' ' + reference : ''}${note ? ' – ' + note : ''}`, customerId, -amount);
        }),

      setLateFee: (invoiceId, fee) =>
        update((d) => {
          const inv = d.invoices.find((i) => i.id === invoiceId);
          if (!inv) return;
          inv.lateFee = fee;
          log(d, fee > 0 ? 'Late fee applied' : 'Late fee removed', inv.number, inv.customerId, fee);
        }),

      logEvent: (action, detail, customerId) => update((d) => log(d, action, detail, customerId)),

      markBackedUp: () =>
        update((d) => {
          d.lastBackup = new Date().toISOString();
          log(d, 'Backup exported', 'Full JSON backup downloaded');
        }),
    }),
    [data, update],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
