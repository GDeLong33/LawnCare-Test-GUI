import { useMemo, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { customerName, routeLabel, useStore } from '../data/store';
import { FERT_APPLICATIONS, FERT_PROGRAM, priceFor } from '../data/seed';
import type { WorkOrder, WorkOrderStatus } from '../data/types';
import CustomerSelect from '../components/CustomerSelect';
import WorkOrderSheet, { usePrintWorkOrders } from '../components/WorkOrderSheet';
import { EmptyState, Icon, StatusPill, useToast } from '../components/ui';
import { ServiceTypeOptions } from './Customers';
import { addDays, fmtDate, fmtTimestamp, money, mondayOf, shortService, todayISO } from '../lib/format';

export default function WorkOrders() {
  return (
    <Routes>
      <Route index element={<WorkOrderList />} />
      <Route path="new" element={<NewWorkOrder />} />
      <Route path=":id" element={<WorkOrderDetail />} />
    </Routes>
  );
}

const STATUSES: WorkOrderStatus[] = ['Scheduled', 'In progress', 'Completed', 'Missed'];

function defaultEmployee(service: string) {
  return service === FERT_PROGRAM ? 'e1' : service === 'Lawn mowing' ? 'e4' : 'e5';
}

/* ---------- List ---------- */
function WorkOrderList() {
  const { data } = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const monday = mondayOf(todayISO());
  const route = params.get('route') ?? '';
  const status = params.get('status') ?? '';
  const from = params.get('from') ?? monday;
  const to = params.get('to') ?? addDays(monday, 6);
  const q = params.get('q') ?? '';
  const [printNode, print] = usePrintWorkOrders();
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const custById = useMemo(() => new Map(data.customers.map((c) => [c.id, c])), [data.customers]);

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return data.workOrders
      .filter((w) => (!from || w.date >= from) && (!to || w.date <= to))
      .filter((w) => !status || w.status === status)
      .filter((w) => !route || custById.get(w.customerId)?.routeId === route)
      .filter((w) => {
        if (!ql) return true;
        const c = custById.get(w.customerId);
        return [w.number, customerName(c), c?.number ?? '', w.service, w.application ?? ''].some((v) => v.toLowerCase().includes(ql));
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
  }, [data.workOrders, from, to, status, route, q, custById]);

  const presets: [string, string, string][] = [
    ['Today', todayISO(), todayISO()],
    ['This week', monday, addDays(monday, 6)],
    ['Last 30 days', addDays(todayISO(), -30), todayISO()],
    ['All dates', '', ''],
  ];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">{list.length} shown</div>
          <h1>Work orders</h1>
        </div>
        <div className="actions">
          <button className="btn" disabled={list.length === 0 || list.length > 60} onClick={() => print(list.map((w) => w.id))} title={list.length > 60 ? 'Narrow the filters to 60 or fewer to print' : undefined}>
            <Icon name="print" /> Print these ({list.length})
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/work-orders/new')}>
            <Icon name="plus" /> New work order
          </button>
        </div>
      </header>

      <div className="card toolbar">
        <label className="field">
          <span>Search</span>
          <input className="input" type="search" value={q} placeholder="Customer, WO number…" onChange={(e) => setParam('q', e.target.value)} />
        </label>
        <label className="field">
          <span>Route</span>
          <select className="select" value={route} onChange={(e) => setParam('route', e.target.value)}>
            <option value="">All routes</option>
            {data.routes.map((r) => (
              <option key={r.id} value={r.id}>
                {routeLabel(r, data.settings)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select className="select" value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>From</span>
          <input className="input" type="date" value={from} onChange={(e) => setParam('from', e.target.value || '')} />
        </label>
        <label className="field">
          <span>To</span>
          <input className="input" type="date" value={to} onChange={(e) => setParam('to', e.target.value || '')} />
        </label>
        <div className="seg" role="group" aria-label="Date presets">
          {presets.map(([label, f, t]) => (
            <button
              key={label}
              type="button"
              aria-pressed={from === f && to === t}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('from', f);
                next.set('to', t);
                setParams(next, { replace: true });
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="card">
        {list.length === 0 ? (
          <EmptyState title="No work orders match these filters">Try a wider date range or clear the route and status filters.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Work order</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Route</th>
                  <th>Applicator</th>
                  <th className="num">Price</th>
                  <th>Status</th>
                  <th>Last printed</th>
                </tr>
              </thead>
              <tbody>
                {list.map((w) => {
                  const c = custById.get(w.customerId);
                  return (
                    <tr key={w.id}>
                      <td>
                        <Link to={`/work-orders/${w.id}`}>{w.number}</Link>
                      </td>
                      <td className="nowrap">{fmtDate(w.date)}</td>
                      <td>
                        {customerName(c)}
                        <div className="tiny muted">{c?.number}</div>
                      </td>
                      <td>{shortService(w.service, w.application)}</td>
                      <td className="nowrap">
                        {data.settings.routePrefix} {data.routes.find((r) => r.id === c?.routeId)?.number}
                      </td>
                      <td>{data.employees.find((e) => e.id === w.employeeId)?.name}</td>
                      <td className="num">{money(w.price)}</td>
                      <td>
                        <StatusPill status={w.status} />
                      </td>
                      <td className="tiny muted nowrap">{w.lastPrinted ? fmtTimestamp(w.lastPrinted) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6}>{list.length} work orders</td>
                  <td className="num">{money(list.reduce((s, w) => s + w.price, 0))}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
      {printNode}
    </div>
  );
}

/* ---------- New ---------- */
interface Prefill {
  customerId?: string;
  service?: string;
  price?: number;
  manHours?: number;
  notes?: string;
}

function NewWorkOrder() {
  const { data, addWorkOrder } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefill = (useLocation().state ?? {}) as Prefill;
  const initialCustomer = prefill.customerId ?? params.get('customer') ?? '';
  const c0 = data.customers.find((c) => c.id === initialCustomer);
  const [customerId, setCustomerId] = useState(initialCustomer);
  const [service, setService] = useState(prefill.service ?? c0?.serviceType ?? 'Lawn mowing');
  const [application, setApplication] = useState(FERT_APPLICATIONS[0].name);
  const [date, setDate] = useState(todayISO());
  const [employeeId, setEmployeeId] = useState(defaultEmployee(service));
  const [manHours, setManHours] = useState(String(prefill.manHours ?? 1));
  const [price, setPrice] = useState(prefill.price !== undefined ? String(prefill.price) : c0 ? String(priceFor(service, c0.sqft)) : '');
  const [priceTouched, setPriceTouched] = useState(prefill.price !== undefined);
  const [notes, setNotes] = useState(prefill.notes ?? '');
  const customer = data.customers.find((c) => c.id === customerId);
  const isFert = service === FERT_PROGRAM;

  const autoPrice = (svc: string, cid: string) => {
    if (priceTouched) return;
    const c = data.customers.find((x) => x.id === cid);
    if (c) setPrice(String(priceFor(svc, c.sqft)));
  };

  const create = () => {
    if (!customerId || !date) return;
    const app = FERT_APPLICATIONS.find((a) => a.name === application);
    const id = addWorkOrder({
      customerId,
      date,
      service,
      application: isFert ? application : undefined,
      chemical: isFert ? app?.chemical ?? '' : '',
      epaReg: isFert ? app?.epa ?? '' : '',
      employeeId,
      manHours: Number(manHours) || 0,
      price: Number(price) || 0,
      notes,
    });
    navigate(`/work-orders/${id}`);
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <Link to="/work-orders">Work orders</Link> / New
          </div>
          <h1>New work order</h1>
          {prefill.price !== undefined && <div className="sub">Filled in from the pricing calculator.</div>}
        </div>
      </header>
      <form
        className="card card-pad stack"
        style={{ maxWidth: 820 }}
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <div className="grid-2">
          <CustomerSelect
            value={customerId}
            required
            onChange={(id) => {
              setCustomerId(id);
              const c = data.customers.find((x) => x.id === id);
              if (c && !prefill.service) {
                setService(c.serviceType);
                setEmployeeId(defaultEmployee(c.serviceType));
                autoPrice(c.serviceType, id);
              } else autoPrice(service, id);
            }}
          />
          <label className="field">
            <span>Scheduled date</span>
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        {customer && (
          <p className="small muted" style={{ margin: 0 }}>
            {customer.number} · {customer.billing.street} · {routeLabel(data.routes.find((r) => r.id === customer.routeId), data.settings)} ·{' '}
            {customer.sqft ? `${customer.sqft.toLocaleString()} sq ft` : 'no sq ft on file'}
          </p>
        )}
        <div className="grid-2">
          <label className="field">
            <span>Service</span>
            <select
              className="select"
              value={service}
              onChange={(e) => {
                setService(e.target.value);
                setEmployeeId(defaultEmployee(e.target.value));
                autoPrice(e.target.value, customerId);
              }}
            >
              <ServiceTypeOptions />
            </select>
          </label>
          {isFert ? (
            <label className="field">
              <span>Fertilization application</span>
              <select className="select" value={application} onChange={(e) => setApplication(e.target.value)}>
                {FERT_APPLICATIONS.map((a) => (
                  <option key={a.name}>{a.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <div />
          )}
        </div>
        <div className="grid-3">
          <label className="field">
            <span>Applicator / crew</span>
            <select className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {data.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.license ? ' (licensed)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Man-hours</span>
            <input className="input" type="number" min={0} step={0.25} value={manHours} onChange={(e) => setManHours(e.target.value)} />
          </label>
          <label className="field">
            <span>Price for this job</span>
            <input
              className="input"
              type="number"
              min={0}
              step={0.01}
              required
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setPriceTouched(true);
              }}
            />
          </label>
        </div>
        <label className="field">
          <span>Notes for the crew</span>
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="actions">
          <Link className="btn" to="/work-orders">
            Cancel
          </Link>
          <button className="btn btn-primary" type="submit" disabled={!customerId}>
            Create work order
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Detail ---------- */
function WorkOrderDetail() {
  const { id } = useParams();
  const { data, update, completeWorkOrder } = useStore();
  const [printNode, print] = usePrintWorkOrders();
  const [toast, showToast] = useToast();
  const wo = data.workOrders.find((w) => w.id === id);
  if (!wo) {
    return (
      <div className="page">
        <h1>Work order</h1>
        <div className="card" style={{ marginTop: 16 }}>
          <EmptyState title="Work order not found">
            <Link to="/work-orders">Back to work orders</Link>
          </EmptyState>
        </div>
      </div>
    );
  }
  const c = data.customers.find((x) => x.id === wo.customerId);
  const route = data.routes.find((r) => r.id === c?.routeId);
  const routeIds = data.workOrders
    .filter((w) => w.date === wo.date && data.customers.find((x) => x.id === w.customerId)?.routeId === route?.id)
    .sort((a, b) => (route?.stops.indexOf(a.customerId) ?? 0) - (route?.stops.indexOf(b.customerId) ?? 0))
    .map((w) => w.id);
  const set = (patch: Partial<WorkOrder>) =>
    update((d) => {
      const w = d.workOrders.find((x) => x.id === wo.id);
      if (w) Object.assign(w, patch);
    });
  const isFert = wo.service === FERT_PROGRAM;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <Link to="/work-orders">Work orders</Link> / {wo.number}
          </div>
          <h1>
            {wo.number} · {customerName(c)}
          </h1>
          <div className="sub">
            <StatusPill status={wo.status} /> Scheduled {fmtDate(wo.date)}
            {wo.lastPrinted && ` · last printed ${fmtTimestamp(wo.lastPrinted)}`}
          </div>
        </div>
        <div className="actions">
          {!wo.lastPrinted ? (
            <button className="btn btn-primary" onClick={() => print([wo.id])}>
              <Icon name="print" /> Print
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => print([wo.id])}>
              <Icon name="print" /> Reprint
              <span className="btn-sub">last printed {fmtTimestamp(wo.lastPrinted)}</span>
            </button>
          )}
          <button className="btn" onClick={() => print(routeIds)} disabled={!route || routeIds.length === 0}>
            <Icon name="print" /> Print all for this route ({routeIds.length})
          </button>
        </div>
      </header>

      <div className="wo-layout">
        <section className="card card-pad stack" aria-label="Edit work order">
          <h2>Job details</h2>
          {wo.status !== 'Completed' ? (
            <div className="complete-box">
              <label className="field">
                <span>Status</span>
                <select className="select" value={wo.status} onChange={(e) => set({ status: e.target.value as WorkOrderStatus })}>
                  {STATUSES.filter((s) => s !== 'Completed').map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const prepaid = (c?.prepayBalance ?? 0) > 0;
                  completeWorkOrder(wo.id);
                  showToast(
                    prepaid
                      ? `Marked completed. Invoice created and paid from prepaid balance where possible.`
                      : 'Marked completed. Invoice created.',
                  );
                }}
              >
                Mark completed
              </button>
            </div>
          ) : (
            <div className="small success-text">Completed and invoiced.</div>
          )}
          <label className="field">
            <span>Date completed</span>
            <input
              className="input"
              type="date"
              value={wo.completedDate ?? ''}
              disabled={wo.status !== 'Completed'}
              onChange={(e) => set({ completedDate: e.target.value || undefined })}
            />
          </label>
          <label className="field">
            <span>Service</span>
            <select className="select" value={wo.service} onChange={(e) => set({ service: e.target.value, application: e.target.value === FERT_PROGRAM ? wo.application ?? FERT_APPLICATIONS[0].name : undefined })}>
              <ServiceTypeOptions />
            </select>
          </label>
          {isFert && (
            <label className="field">
              <span>Fertilization application</span>
              <select
                className="select"
                value={wo.application ?? ''}
                onChange={(e) => {
                  const a = FERT_APPLICATIONS.find((x) => x.name === e.target.value);
                  set({ application: e.target.value, chemical: a?.chemical ?? '', epaReg: a?.epa ?? '' });
                }}
              >
                {FERT_APPLICATIONS.map((a) => (
                  <option key={a.name}>{a.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>Chemical name</span>
            <input className="input" value={wo.chemical} onChange={(e) => set({ chemical: e.target.value })} placeholder={isFert ? '' : 'Not applicable'} />
          </label>
          <label className="field">
            <span>EPA registration number</span>
            <input className="input" value={wo.epaReg} onChange={(e) => set({ epaReg: e.target.value })} placeholder={isFert ? 'Required for chemical applications' : 'Not applicable'} aria-invalid={isFert && !wo.epaReg} />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Applicator</span>
              <select className="select" value={wo.employeeId} onChange={(e) => set({ employeeId: e.target.value })}>
                {data.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Man-hours</span>
              <input className="input" type="number" min={0} step={0.25} value={wo.manHours} onChange={(e) => set({ manHours: Number(e.target.value) || 0 })} />
            </label>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>Price for this job</span>
              <input className="input" type="number" min={0} step={0.01} value={wo.price} onChange={(e) => set({ price: Number(e.target.value) || 0 })} disabled={wo.status === 'Completed'} />
            </label>
            <label className="field">
              <span>Late fee option</span>
              <select className="select" value={wo.lateFeeTier ?? 0} onChange={(e) => set({ lateFeeTier: Number(e.target.value) as WorkOrder['lateFeeTier'] })}>
                <option value={0}>None</option>
                <option value={30}>30 days past due ({money(data.settings.lateFees.d30)})</option>
                <option value={60}>60 days past due ({money(data.settings.lateFees.d60)})</option>
                <option value={90}>90 days past due ({money(data.settings.lateFees.d90)})</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Notes for the crew</span>
            <textarea className="textarea" value={wo.notes} onChange={(e) => set({ notes: e.target.value })} />
          </label>
          <Link to={`/customers/${wo.customerId}`} className="small">
            Open customer profile →
          </Link>
        </section>

        <section aria-label="Print preview">
          <div className="preview-label">Print preview</div>
          <div className="sheet-frame">
            <WorkOrderSheet data={data} wo={wo} printedAt={wo.lastPrinted} />
          </div>
        </section>
      </div>
      {printNode}
      {toast}
    </div>
  );
}
