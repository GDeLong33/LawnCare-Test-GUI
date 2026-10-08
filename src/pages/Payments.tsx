import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { customerName, invoiceBalance, openBalance, useStore } from '../data/store';
import type { Invoice, Payment, PaymentKind, PaymentMethod } from '../data/types';
import CustomerSelect from '../components/CustomerSelect';
import { EmptyState, Icon, Modal, StatusPill, useToast } from '../components/ui';
import { MethodFields } from './Customers';
import { addDays, daysBetween, fmtDate, fmtTimestamp, money, todayISO } from '../lib/format';

type Tab = 'payments' | 'invoices' | 'audit';
type Dialog = { kind: 'record' | 'credit' | 'refund' } | { kind: 'reverse'; payment: Payment } | null;

const KINDS: PaymentKind[] = ['Payment', 'Prepayment', 'Prepay debit', 'Service credit', 'Refund', 'Reversal'];
const REVERSIBLE: PaymentKind[] = ['Payment', 'Prepayment', 'Prepay debit', 'Service credit'];

export default function Payments() {
  const { data } = useStore();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'payments';
  const account = params.get('account') ?? '';
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, showToast] = useToast();
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const acct = data.customers.find((c) => c.id === account);
  const tabs: [Tab, string][] = [
    ['payments', 'Payments by account'],
    ['invoices', 'Open invoices'],
    ['audit', 'Audit log'],
  ];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Billing</div>
          <h1>Payments</h1>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setDialog({ kind: 'credit' })}>
            Add service credit
          </button>
          <button className="btn" onClick={() => setDialog({ kind: 'refund' })}>
            Post refund
          </button>
          <button className="btn btn-primary" onClick={() => setDialog({ kind: 'record' })}>
            <Icon name="plus" /> Record payment
          </button>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Payments views">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setParam('tab', id === 'payments' ? '' : id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="card toolbar">
        <div style={{ minWidth: 340 }}>
          <CustomerSelect value={account} onChange={(v) => setParam('account', v)} label="Account" allowEmpty="All accounts" includeInactive />
        </div>
        {acct && (
          <dl className="acct-strip">
            <div>
              <dt>Open balance</dt>
              <dd className={openBalance(data, acct.id) > 0 ? 'danger-text' : ''}>{money(openBalance(data, acct.id))}</dd>
            </div>
            <div>
              <dt>Prepaid credit</dt>
              <dd>{money(acct.prepayBalance)}</dd>
            </div>
            <div>
              <dt>Profile</dt>
              <dd>
                <Link to={`/customers/${acct.id}`}>{acct.number}</Link>
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'payments' && <PaymentsTable account={account} onReverse={(p) => setDialog({ kind: 'reverse', payment: p })} />}
        {tab === 'invoices' && <OpenInvoices account={account} showToast={showToast} />}
        {tab === 'audit' && <AuditLog account={account} />}
      </div>

      {dialog?.kind === 'reverse' && (
        <ReverseDialog
          payment={dialog.payment}
          onClose={() => setDialog(null)}
          onDone={(msg) => {
            setDialog(null);
            showToast(msg);
          }}
        />
      )}
      {dialog && dialog.kind !== 'reverse' && (
        <MoneyDialog
          kind={dialog.kind}
          initialCustomer={account}
          onClose={() => setDialog(null)}
          onDone={(msg) => {
            setDialog(null);
            showToast(msg);
          }}
        />
      )}
      {toast}
    </div>
  );
}

function PaymentsTable({ account, onReverse }: { account: string; onReverse: (p: Payment) => void }) {
  const { data } = useStore();
  const [kind, setKind] = useState('');
  const [from, setFrom] = useState(addDays(todayISO(), -60));
  const [to, setTo] = useState(todayISO());
  const custById = useMemo(() => new Map(data.customers.map((c) => [c.id, c])), [data.customers]);
  const rows = useMemo(
    () =>
      data.payments
        .filter((p) => (!account || p.customerId === account) && (!kind || p.kind === kind) && (!from || p.date >= from) && (!to || p.date <= to))
        .sort((a, b) => {
          const ca = custById.get(a.customerId)?.number ?? '';
          const cb = custById.get(b.customerId)?.number ?? '';
          return ca.localeCompare(cb) || b.date.localeCompare(a.date);
        }),
    [data.payments, account, kind, from, to, custById],
  );
  // Reversed originals and their reversal rows cancel out, so the plain sum is the net.
  const net = rows.reduce((s, p) => s + p.amount, 0);
  const received = rows.filter((p) => !p.reversed && (p.kind === 'Payment' || p.kind === 'Prepayment')).reduce((s, p) => s + p.amount, 0);

  return (
    <section className="card">
      <div className="card-head">
        <div className="toolbar-inline">
          <label className="field">
            <span>Type</span>
            <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All types</option>
              {KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>From</span>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field">
            <span>To</span>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <span className="small muted">{rows.length} entries</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No payments in this range">Widen the dates or choose a different account.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Account #</th>
                <th>Account name</th>
                <th>Date</th>
                <th>Method</th>
                <th>Check # / card type</th>
                <th>Type</th>
                <th className="num">Amount</th>
                <th>Note</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const c = custById.get(p.customerId);
                return (
                  <tr key={p.id} className={p.reversed ? 'is-reversed' : ''}>
                    <td className="nowrap">{c?.number}</td>
                    <td className="nowrap">{customerName(c)}</td>
                    <td className="nowrap">{fmtDate(p.date)}</td>
                    <td>{p.method}</td>
                    <td>{p.reference || '—'}</td>
                    <td>
                      {p.reversed ? <StatusPill status="Reversed" /> : p.kind}
                    </td>
                    <td className={'num' + (p.amount < 0 ? ' danger-text' : '')}>{money(p.amount)}</td>
                    <td className="tiny muted">{p.note}</td>
                    <td className="num">
                      {REVERSIBLE.includes(p.kind) && !p.reversed && p.amount > 0 && (
                        <button className="btn btn-sm btn-danger" onClick={() => onReverse(p)}>
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6}>Received (payments + prepayments): {money(received)}</td>
                <td className="num">{money(net)}</td>
                <td colSpan={2} className="tiny muted" style={{ fontWeight: 400 }}>
                  net of reversals and refunds
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

function suggestedTier(days: number): 0 | 30 | 60 | 90 {
  return days >= 90 ? 90 : days >= 60 ? 60 : days >= 30 ? 30 : 0;
}

function OpenInvoices({ account, showToast }: { account: string; showToast: (m: string) => void }) {
  const { data, setLateFee, update } = useStore();
  const [includeInactive, setIncludeInactive] = useState(false);
  const today = todayISO();
  const fees = data.settings.lateFees;
  const feeFor = (t: number) => (t === 90 ? fees.d90 : t === 60 ? fees.d60 : t === 30 ? fees.d30 : 0);
  const custById = useMemo(() => new Map(data.customers.map((c) => [c.id, c])), [data.customers]);
  const rows = data.invoices
    .filter((i) => invoiceBalance(i) > 0.005 && (!account || i.customerId === account))
    .filter((i) => includeInactive || custById.get(i.customerId)?.active)
    .map((i) => ({ inv: i, days: daysBetween(i.date, today) }))
    .sort((a, b) => b.days - a.days);
  const buckets = [
    { label: 'Current (0–29)', test: (d: number) => d < 30 },
    { label: '30–59 days', test: (d: number) => d >= 30 && d < 60 },
    { label: '60–89 days', test: (d: number) => d >= 60 && d < 90 },
    { label: '90+ days', test: (d: number) => d >= 90 },
  ].map((b) => ({ ...b, total: rows.filter((r) => b.test(r.days)).reduce((s, r) => s + invoiceBalance(r.inv), 0) }));
  const eligible = rows.filter((r) => suggestedTier(r.days) > 0 && r.inv.lateFee !== feeFor(suggestedTier(r.days)));

  const applyAll = () => {
    update((d) =>
      eligible.forEach(({ inv, days }) => {
        const i = d.invoices.find((x) => x.id === inv.id);
        if (i) i.lateFee = feeFor(suggestedTier(days));
      }),
    );
    showToast(`Applied late fees to ${eligible.length} invoice${eligible.length === 1 ? '' : 's'}.`);
  };

  return (
    <>
      <div className="bucket-row">
        {buckets.map((b, i) => (
          <div key={b.label} className={'card stat' + (i > 0 && b.total > 0 ? ' stat-warn' : '')}>
            <div className="label">{b.label}</div>
            <div className={'value' + (i > 0 && b.total > 0 ? ' danger-text' : '')}>{money(b.total)}</div>
          </div>
        ))}
      </div>
      <section className="card">
        <div className="card-head">
          <label className="check">
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            Include inactive customers
          </label>
          <button className="btn btn-sm" disabled={eligible.length === 0} onClick={applyAll}>
            Apply suggested late fees ({eligible.length})
          </button>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No open invoices">Every invoice in this view is paid in full.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Account</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th className="num">Amount</th>
                  <th className="num">Paid</th>
                  <th className="num">Days past due</th>
                  <th>Late fee (optional)</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ inv, days }) => {
                  const c = custById.get(inv.customerId);
                  const tier = suggestedTier(days);
                  return (
                    <tr key={inv.id}>
                      <td className="nowrap">{inv.number}</td>
                      <td>
                        {customerName(c)}
                        <div className="tiny muted">{c?.number}</div>
                      </td>
                      <td className="nowrap">{fmtDate(inv.date)}</td>
                      <td>{inv.description.replace('Landscape work – ', '')}</td>
                      <td className="num">{money(inv.amount)}</td>
                      <td className="num">{money(inv.amountPaid)}</td>
                      <td className="num">{tier ? <span className="pill pill-danger">{days}</span> : days}</td>
                      <td>
                        <LateFeeSelect inv={inv} maxTier={tier} feeFor={feeFor} onChange={(fee) => setLateFee(inv.id, fee)} />
                      </td>
                      <td className="num">
                        <strong>{money(invoiceBalance(inv))}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={8}>
                    {rows.length} open invoices · {new Set(rows.map((r) => r.inv.customerId)).size} accounts
                  </td>
                  <td className="num">{money(rows.reduce((s, r) => s + invoiceBalance(r.inv), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function LateFeeSelect({ inv, maxTier, feeFor, onChange }: { inv: Invoice; maxTier: number; feeFor: (t: number) => number; onChange: (fee: number) => void }) {
  if (maxTier === 0 && inv.lateFee === 0) return <span className="tiny muted">Not yet eligible</span>;
  const tiers = [30, 60, 90].filter((t) => t <= maxTier);
  return (
    <select className="select select-sm" aria-label={`Late fee for ${inv.number}`} value={inv.lateFee} onChange={(e) => onChange(Number(e.target.value))}>
      <option value={0}>None</option>
      {tiers.map((t) => (
        <option key={t} value={feeFor(t)}>
          {t} days · {money(feeFor(t))}
        </option>
      ))}
      {inv.lateFee > 0 && !tiers.some((t) => feeFor(t) === inv.lateFee) && <option value={inv.lateFee}>{money(inv.lateFee)}</option>}
    </select>
  );
}

function AuditLog({ account }: { account: string }) {
  const { data } = useStore();
  const rows = data.audit.filter((a) => !account || a.customerId === account);
  const custById = new Map(data.customers.map((c) => [c.id, c]));
  return (
    <section className="card">
      <div className="card-head">
        <h2>Audit log</h2>
        <span className="small muted">Every billing change is recorded here and can't be edited.</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No audit entries yet" />
      ) : (
        <div className="table-wrap" style={{ maxHeight: 560, overflowY: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Account</th>
                <th>Detail</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const c = a.customerId ? custById.get(a.customerId) : undefined;
                return (
                  <tr key={a.id}>
                    <td className="nowrap">{fmtTimestamp(a.ts)}</td>
                    <td className="nowrap">
                      <strong>{a.action}</strong>
                    </td>
                    <td>{c ? `${c.number} ${customerName(c)}` : '—'}</td>
                    <td>{a.detail}</td>
                    <td className={'num' + ((a.amount ?? 0) < 0 ? ' danger-text' : '')}>{a.amount !== undefined ? money(a.amount) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ReverseDialog({ payment: p, onClose, onDone }: { payment: Payment; onClose: () => void; onDone: (msg: string) => void }) {
  const { data, reversePayment } = useStore();
  const c = data.customers.find((x) => x.id === p.customerId);
  return (
    <Modal title="Reverse payment?" onClose={onClose}>
      <p style={{ marginTop: 0 }}>
        This undoes the {p.kind.toLowerCase()} of <strong>{money(p.amount)}</strong> from {customerName(c)} on {fmtDate(p.date)} ({p.method}
        {p.reference ? ` ${p.reference}` : ''}). Use it to fix an entry error. The original entry stays in the history, crossed out, and
        a reversal row and audit log entry are added.
      </p>
      <div className="actions">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            reversePayment(p.id);
            onDone(`Reversed ${money(p.amount)} for ${customerName(c)}.`);
          }}
        >
          Reverse payment
        </button>
      </div>
    </Modal>
  );
}

function MoneyDialog({
  kind,
  initialCustomer,
  onClose,
  onDone,
}: {
  kind: 'record' | 'credit' | 'refund';
  initialCustomer: string;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const { data, recordPayment, addServiceCredit, postRefund } = useStore();
  const [customerId, setCustomerId] = useState(initialCustomer);
  const c = data.customers.find((x) => x.id === customerId);
  const balance = c ? openBalance(data, c.id) : 0;
  const [amount, setAmount] = useState(kind === 'credit' && c ? String(balance) : '');
  const [method, setMethod] = useState<PaymentMethod>('Check');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const amt = Number(amount);
  const title = kind === 'record' ? 'Record payment' : kind === 'credit' ? 'Add service credit' : 'Post refund';

  const submit = () => {
    if (!c || !(amt > 0)) return;
    if (kind === 'record') {
      recordPayment(c.id, amt, method, reference);
      onDone(`Recorded ${money(amt)} ${method.toLowerCase()} payment from ${customerName(c)}.`);
    } else if (kind === 'credit') {
      addServiceCredit(c.id, amt, note);
      onDone(`Credited ${money(amt)} to ${customerName(c)}.`);
    } else {
      postRefund(c.id, amt, method, reference, note);
      onDone(`Refunded ${money(amt)} to ${customerName(c)}.`);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <CustomerSelect
          value={customerId}
          onChange={(id) => {
            setCustomerId(id);
            if (kind === 'credit') setAmount(String(openBalance(data, id)));
          }}
          includeInactive
          required
        />
        {c && (
          <dl className="acct-strip boxed">
            <div>
              <dt>Balance due</dt>
              <dd className={balance > 0 ? 'danger-text' : ''}>{money(balance)}</dd>
            </div>
            <div>
              <dt>Prepaid credit</dt>
              <dd>{money(c.prepayBalance)}</dd>
            </div>
          </dl>
        )}
        <label className="field">
          <span>Amount</span>
          <input className="input" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        {kind === 'credit' && c && balance > 0 && (
          <p className="tiny muted" style={{ margin: 0 }}>
            Defaults to the full balance due, which wipes it out. Lower the amount for a partial credit.
          </p>
        )}
        {kind !== 'credit' && (
          <MethodFields
            method={method}
            reference={reference}
            onMethod={setMethod}
            onReference={setReference}
            methods={kind === 'refund' ? ['Check', 'Credit card', 'Cash'] : undefined}
          />
        )}
        {kind !== 'record' && (
          <label className="field">
            <span>Reason</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'credit' ? 'e.g. Missed visit, goodwill' : 'e.g. Moved away, unused prepayment'} />
          </label>
        )}
        {kind === 'record' && c && amt > balance && amt > 0 && (
          <p className="tiny muted" style={{ margin: 0 }}>
            {money(amt - balance)} more than the balance due will be kept as prepaid credit.
          </p>
        )}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!c || !(amt > 0)}>
            {title}
          </button>
        </div>
      </form>
    </Modal>
  );
}
