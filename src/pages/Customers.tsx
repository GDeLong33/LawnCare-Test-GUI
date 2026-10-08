import { useMemo, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customerName, invoiceBalance, newId, nextCustomerNumber, openBalance, routeLabel, useStore } from '../data/store';
import { FERT_PROGRAM, LANDSCAPE_SUBSERVICES } from '../data/seed';
import type { Address, Customer, PaymentMethod } from '../data/types';
import { EmptyState, Icon, Modal, StatusPill, Switch, useToast } from '../components/ui';
import { matchesAny } from '../lib/search';
import { daysBetween, fmtDate, money, num, todayISO } from '../lib/format';

type Filter = 'all' | 'active' | 'inactive';

export function ServiceTypeOptions() {
  return (
    <>
      <option value="Lawn mowing">Lawn mowing</option>
      <optgroup label="Landscape work">
        {LANDSCAPE_SUBSERVICES.map((s) => (
          <option key={s} value={`Landscape work – ${s}`}>
            {s}
          </option>
        ))}
      </optgroup>
      <option value="Stone work">Stone work</option>
      <option value={FERT_PROGRAM}>{FERT_PROGRAM}</option>
    </>
  );
}

export default function Customers() {
  const { id } = useParams();
  const { data } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('active');

  const list = useMemo(
    () =>
      data.customers
        .filter((c) => (filter === 'all' ? true : filter === 'active' ? c.active : !c.active))
        .filter((c) => matchesAny(c, q))
        .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)),
    [data.customers, filter, q],
  );
  const counts = {
    all: data.customers.length,
    active: data.customers.filter((c) => c.active).length,
    inactive: data.customers.filter((c) => !c.active).length,
  };
  const selected = id && id !== 'new' ? data.customers.find((c) => c.id === id) : undefined;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">{counts.active} active · {counts.inactive} inactive</div>
          <h1>Customers</h1>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => navigate('/customers/new')}>
            <Icon name="plus" /> New customer
          </button>
        </div>
      </header>

      <div className="split">
        <section className="card list-pane" aria-label="Customer list">
          <div className="list-tools">
            <label className="field">
              <span className="sr-only">Search customers</span>
              <div className="search-box">
                <Icon name="search" />
                <input
                  className="input"
                  type="search"
                  placeholder="Name, number, street, phone…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </label>
            <div className="seg" role="group" aria-label="Status filter">
              {(['active', 'inactive', 'all'] as Filter[]).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f[0].toUpperCase() + f.slice(1)} ({counts[f]})
                </button>
              ))}
            </div>
          </div>
          {list.length === 0 ? (
            <EmptyState title="No customers match">Try another search or filter.</EmptyState>
          ) : (
            <ul className="result-list list-scroll">
              {list.map((c) => (
                <li key={c.id}>
                  <Link to={`/customers/${c.id}`} aria-current={c.id === id ? 'page' : undefined} className={c.id === id ? 'is-selected' : ''}>
                    <span>
                      <span className="result-name">
                        {c.lastName}, {c.firstName}
                      </span>
                      <br />
                      <span className="result-meta">
                        {c.number} · {c.billing.street || 'No address'}
                      </span>
                    </span>
                    {!c.active && <StatusPill status="Inactive" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div>
          {id === 'new' ? (
            <Profile key="new" />
          ) : selected ? (
            <Profile key={selected.id} customer={selected} />
          ) : (
            <div className="card">
              <EmptyState title={id ? 'Customer not found' : 'Select a customer'}>
                Choose someone from the list, or create a new customer.
              </EmptyState>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function blankCustomer(routeId: string): Omit<Customer, 'id' | 'number' | 'createdAt'> {
  const a: Address = { street: '', city: '', state: 'OH', zip: '' };
  return {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    billing: { ...a },
    shipSameAsBilling: true,
    shipTo: { ...a },
    sqft: 0,
    routeId,
    crossStreet: '',
    gateCode: '',
    callFirst: false,
    active: true,
    prepayBalance: 0,
    serviceType: 'Lawn mowing',
    notes: '',
  };
}

function AddressFields({ legend, value, onChange, disabled }: { legend: string; value: Address; onChange: (a: Address) => void; disabled?: boolean }) {
  const set = (k: keyof Address) => (e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <fieldset className="fieldset" disabled={disabled}>
      <legend>{legend}</legend>
      <label className="field">
        <span>Street</span>
        <input className="input" value={value.street} onChange={set('street')} autoComplete="street-address" />
      </label>
      <div className="addr-row">
        <label className="field">
          <span>City</span>
          <input className="input" value={value.city} onChange={set('city')} />
        </label>
        <label className="field">
          <span>State</span>
          <input className="input" value={value.state} onChange={set('state')} maxLength={2} />
        </label>
        <label className="field">
          <span>ZIP</span>
          <input className="input" value={value.zip} onChange={set('zip')} inputMode="numeric" maxLength={10} />
        </label>
      </div>
    </fieldset>
  );
}

function Profile({ customer }: { customer?: Customer }) {
  const store = useStore();
  const { data, update, addCustomer } = store;
  const navigate = useNavigate();
  const [toast, showToast] = useToast();
  const isNew = !customer;
  const [draft, setDraft] = useState(() => (customer ? structuredClone(customer) : blankCustomer(data.routes[0]?.id ?? '')));
  const [errors, setErrors] = useState<string[]>([]);
  const [prepayOpen, setPrepayOpen] = useState(false);

  const dirty = isNew || JSON.stringify(draft) !== JSON.stringify(customer);
  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const validate = () => {
    const e: string[] = [];
    if (!draft.firstName.trim()) e.push('First name is required.');
    if (!draft.lastName.trim()) e.push('Last name is required.');
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) e.push('Email address does not look valid.');
    if (draft.phone && draft.phone.replace(/\D/g, '').length !== 10) e.push('Phone number should have 10 digits.');
    if (draft.sqft < 0) e.push('Square footage cannot be negative.');
    setErrors(e);
    return e.length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const clean = { ...draft, shipTo: draft.shipSameAsBilling ? { ...draft.billing } : draft.shipTo };
    if (isNew) {
      const id = addCustomer(clean);
      navigate(`/customers/${id}`);
      return;
    }
    update((d) => {
      const c = d.customers.find((x) => x.id === customer.id);
      if (!c) return;
      if (c.routeId !== clean.routeId) {
        d.routes.forEach((r) => (r.stops = r.stops.filter((s) => s !== c.id)));
        d.routes.find((r) => r.id === clean.routeId)?.stops.push(c.id);
      }
      Object.assign(c, clean, { id: c.id, number: c.number, prepayBalance: c.prepayBalance });
      d.audit.unshift({
        id: newId('a'),
        ts: new Date().toISOString(),
        action: 'Customer updated',
        customerId: c.id,
        detail: `${c.number} ${customerName(c)} profile saved`,
      });
    });
    showToast(`Saved ${customerName(clean)}.`);
  };

  const history = useMemo(
    () =>
      customer
        ? data.workOrders
            .filter((w) => w.customerId === customer.id && w.status === 'Completed')
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [data.workOrders, customer],
  );
  const upcoming = customer
    ? data.workOrders.filter((w) => w.customerId === customer.id && w.status !== 'Completed').sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const empName = (id: string) => data.employees.find((e) => e.id === id)?.name ?? '—';

  const account = useMemo(() => {
    if (!customer) return null;
    const today = todayISO();
    const invs = data.invoices.filter((i) => i.customerId === customer.id);
    const pays = data.payments.filter((p) => p.customerId === customer.id && !p.reversed && p.kind !== 'Reversal');
    const last = [...pays].filter((p) => p.amount > 0).sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      open: openBalance(data, customer.id),
      pastDue: invs.filter((i) => daysBetween(i.date, today) > 30).reduce((s, i) => s + invoiceBalance(i), 0),
      billedYtd: invs.filter((i) => i.date.slice(0, 4) === today.slice(0, 4)).reduce((s, i) => s + i.amount, 0),
      paidYtd: pays.filter((p) => p.date.slice(0, 4) === today.slice(0, 4) && p.kind === 'Payment').reduce((s, p) => s + p.amount, 0),
      last,
    };
  }, [data, customer]);

  const isFert = draft.serviceType === FERT_PROGRAM;

  return (
    <div className="profile">
      <section className="card" aria-labelledby="profile-h">
        <div className="card-head">
          <div>
            <h2 id="profile-h">{isNew ? 'New customer' : customerName(draft)}</h2>
            <div className="small muted">
              {isNew ? `Will be assigned ${nextCustomerNumber(data)} when saved` : `Customer since ${fmtDate(customer.createdAt)}`}
            </div>
          </div>
          <div className="actions">
            {!isNew && dirty && <span className="tiny muted" role="status">Unsaved changes</span>}
            {!isNew && (
              <button className="btn" disabled={!dirty} onClick={() => setDraft(structuredClone(customer))}>
                Discard
              </button>
            )}
            <button className="btn btn-primary" onClick={save} disabled={!dirty}>
              {isNew ? 'Create customer' : 'Save'}
            </button>
          </div>
        </div>

        <form
          className="card-pad profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {errors.length > 0 && (
            <div className="warn-box" role="alert">
              <Icon name="warn" />
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid-3">
            <label className="field">
              <span>Customer number</span>
              <input className="input" readOnly value={isNew ? `${nextCustomerNumber(data)} (assigned on save)` : customer.number} aria-describedby="num-help" />
              <span id="num-help" className="tiny muted" style={{ fontWeight: 400 }}>System generated, cannot be changed</span>
            </label>
            <label className="field">
              <span>First name *</span>
              <input className="input" value={draft.firstName} onChange={(e) => set('firstName', e.target.value)} required />
            </label>
            <label className="field">
              <span>Last name *</span>
              <input className="input" value={draft.lastName} onChange={(e) => set('lastName', e.target.value)} required />
            </label>
            <label className="field">
              <span>Phone</span>
              <input className="input" type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(330) 555-0100" />
            </label>
            <label className="field" style={{ gridColumn: 'span 2' }}>
              <span>Email (for letters and billing statements)</span>
              <input className="input" type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} />
            </label>
          </div>

          <div className="grid-2">
            <AddressFields legend="Billing address" value={draft.billing} onChange={(a) => set('billing', a)} />
            <div>
              <AddressFields
                legend="Ship-to (service) address"
                value={draft.shipSameAsBilling ? draft.billing : draft.shipTo}
                onChange={(a) => set('shipTo', a)}
                disabled={draft.shipSameAsBilling}
              />
              <label className="check" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={draft.shipSameAsBilling}
                  onChange={(e) => setDraft((d) => ({ ...d, shipSameAsBilling: e.target.checked, shipTo: e.target.checked ? d.shipTo : { ...d.billing } }))}
                />
                Same as billing
              </label>
            </div>
          </div>

          <div className="grid-3">
            <label className="field">
              <span>Type of work</span>
              <select className="select" value={draft.serviceType} onChange={(e) => set('serviceType', e.target.value)}>
                <ServiceTypeOptions />
              </select>
            </label>
            <label className="field">
              <span>Lawn square footage</span>
              <input
                className="input"
                type="number"
                min={0}
                step={100}
                value={draft.sqft || ''}
                placeholder="0"
                onChange={(e) => set('sqft', Number(e.target.value) || 0)}
                aria-invalid={isFert && !draft.sqft}
              />
              {isFert && !draft.sqft && <span className="tiny danger-text" style={{ fontWeight: 400 }}>Needed for fertilization chemical orders</span>}
            </label>
            <label className="field">
              <span>Route</span>
              <select className="select" value={draft.routeId} onChange={(e) => set('routeId', e.target.value)}>
                {data.routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {routeLabel(r, data.settings)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="fieldset">
            <legend>Job notes</legend>
            <div className="grid-3">
              <label className="field">
                <span>Cross street</span>
                <input className="input" value={draft.crossStreet} onChange={(e) => set('crossStreet', e.target.value)} />
              </label>
              <label className="field">
                <span>Gate code</span>
                <input className="input" value={draft.gateCode} onChange={(e) => set('gateCode', e.target.value)} />
              </label>
              <div className="field" style={{ justifyContent: 'flex-end', paddingBottom: 8 }}>
                <label className="check">
                  <input type="checkbox" checked={draft.callFirst} onChange={(e) => set('callFirst', e.target.checked)} />
                  Call before arriving
                </label>
              </div>
            </div>
            <label className="field" style={{ marginTop: 12 }}>
              <span>Other notes</span>
              <textarea className="textarea" value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
            </label>
          </fieldset>

          <div className="active-row">
            <Switch checked={draft.active} onChange={(v) => set('active', v)} label={draft.active ? 'Active customer' : 'Inactive customer'} />
            <span className="small muted">Inactive customers are left out of reports and route lists by default.</span>
          </div>
          <button type="submit" hidden />
        </form>
      </section>

      {customer && account && (
        <div className="profile-side">
          <section className="card card-pad prepay-card" aria-labelledby="prepay-h">
            <div className="label" id="prepay-h">Prepayment balance</div>
            <div className="big-money">{money(customer.prepayBalance)}</div>
            <p className="small muted" style={{ margin: '4px 0 14px' }}>
              Credit on account. It is debited automatically each time a service is recorded.
            </p>
            <button className="btn btn-primary" onClick={() => setPrepayOpen(true)}>
              <Icon name="plus" /> Add prepayment
            </button>
          </section>

          <section className="card card-pad" aria-labelledby="acct-h">
            <h3 id="acct-h" style={{ marginBottom: 10 }}>Account summary</h3>
            <dl className="kv">
              <dt>Open balance</dt>
              <dd className={account.open > 0 ? 'danger-text' : ''}>{money(account.open)}</dd>
              <dt>Past due (30+ days)</dt>
              <dd className={account.pastDue > 0 ? 'danger-text' : ''}>{money(account.pastDue)}</dd>
              <dt>Billed this year</dt>
              <dd>{money(account.billedYtd)}</dd>
              <dt>Paid this year</dt>
              <dd>{money(account.paidYtd)}</dd>
              <dt>Last payment</dt>
              <dd>{account.last ? `${money(account.last.amount)} on ${fmtDate(account.last.date)}` : 'None'}</dd>
            </dl>
            <div className="actions" style={{ marginTop: 14 }}>
              <Link className="btn btn-sm" to={`/payments?account=${customer.id}`}>
                Payments
              </Link>
              <Link className="btn btn-sm" to={`/work-orders/new?customer=${customer.id}`}>
                New work order
              </Link>
            </div>
          </section>

          {upcoming.length > 0 && (
            <section className="card card-pad" aria-labelledby="up-h">
              <h3 id="up-h" style={{ marginBottom: 8 }}>Open work orders</h3>
              <ul className="plain-list">
                {upcoming.map((w) => (
                  <li key={w.id}>
                    <Link to={`/work-orders/${w.id}`}>{w.number}</Link> · {fmtDate(w.date)} <StatusPill status={w.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {customer && (
        <section className="card profile-history" aria-labelledby="hist-h">
          <div className="card-head">
            <h2 id="hist-h">Application history</h2>
            <span className="small muted">
              {history.length} completed service{history.length === 1 ? '' : 's'} · {num(draft.sqft)} sq ft
            </span>
          </div>
          {history.length === 0 ? (
            <EmptyState title="No services recorded yet" />
          ) : (
            <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Application / chemical</th>
                    <th>Applicator</th>
                    <th className="num">Price</th>
                    <th>Work order</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((w) => (
                    <tr key={w.id}>
                      <td className="nowrap">{fmtDate(w.completedDate ?? w.date)}</td>
                      <td>{w.application ? 'Fertilization' : w.service.replace('Landscape work – ', '')}</td>
                      <td>{w.application ? `${w.application} · ${w.chemical}` : '—'}</td>
                      <td>{empName(w.employeeId)}</td>
                      <td className="num">{money(w.price)}</td>
                      <td>
                        <Link to={`/work-orders/${w.id}`}>{w.number}</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {prepayOpen && customer && (
        <PrepayModal
          customer={customer}
          onClose={() => setPrepayOpen(false)}
          onDone={(amt) => {
            setPrepayOpen(false);
            showToast(`Added ${money(amt)} prepayment for ${customerName(customer)}.`);
          }}
        />
      )}
      {toast}
    </div>
  );
}

export const CARD_TYPES = ['Visa', 'Mastercard', 'American Express', 'Discover'];

/** Method + check number / card type inputs, shared by payment modals. Card numbers are never collected. */
export function MethodFields({
  method,
  reference,
  onMethod,
  onReference,
  methods = ['Check', 'Credit card', 'Cash', 'ACH'],
}: {
  method: PaymentMethod;
  reference: string;
  onMethod: (m: PaymentMethod) => void;
  onReference: (r: string) => void;
  methods?: PaymentMethod[];
}) {
  return (
    <div className="grid-2">
      <label className="field">
        <span>Method</span>
        <select
          className="select"
          value={method}
          onChange={(e) => {
            const m = e.target.value as PaymentMethod;
            onMethod(m);
            onReference(m === 'Credit card' ? CARD_TYPES[0] : '');
          }}
        >
          {methods.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      {method === 'Check' ? (
        <label className="field">
          <span>Check number</span>
          <input className="input" value={reference.replace(/^#/, '')} onChange={(e) => onReference(e.target.value ? `#${e.target.value.replace(/^#/, '')}` : '')} inputMode="numeric" />
        </label>
      ) : method === 'Credit card' ? (
        <label className="field">
          <span>Card type (no card number stored)</span>
          <select className="select" value={reference} onChange={(e) => onReference(e.target.value)}>
            {CARD_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      ) : (
        <div />
      )}
    </div>
  );
}

function PrepayModal({ customer, onClose, onDone }: { customer: Customer; onClose: () => void; onDone: (amt: number) => void }) {
  const { addPrepayment } = useStore();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Check');
  const [reference, setReference] = useState('');
  const amt = Number(amount);
  return (
    <Modal title={`Add prepayment – ${customerName(customer)}`} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!(amt > 0)) return;
          addPrepayment(customer.id, amt, method, reference);
          onDone(amt);
        }}
      >
        <label className="field">
          <span>Amount</span>
          <input className="input" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <MethodFields method={method} reference={reference} onMethod={setMethod} onReference={setReference} />
        <p className="small muted" style={{ margin: 0 }}>
          New balance will be <strong>{money(customer.prepayBalance + (amt > 0 ? amt : 0))}</strong>.
        </p>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!(amt > 0)}>
            Add prepayment
          </button>
        </div>
      </form>
    </Modal>
  );
}
