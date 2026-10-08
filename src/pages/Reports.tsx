import { useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { customerName, invoiceBalance, routeLabel, useStore } from '../data/store';
import { COMPANY, FERT_APPLICATIONS, FERT_PROGRAM, SERVICE_TYPES } from '../data/seed';
import { REPORTS } from '../data/reports';
import type { AppData, Customer, WorkOrder } from '../data/types';
import CustomerSelect from '../components/CustomerSelect';
import { EmptyState, Icon, PrintArea } from '../components/ui';
import { downloadText, toCsv } from '../lib/files';
import { addDays, daysBetween, fmtDate, fmtTimestamp, money, mondayOf, num, shortService, todayISO } from '../lib/format';

type Filter = 'date' | 'employee' | 'service' | 'account' | 'application' | 'route' | 'hours';
interface Col {
  key: string;
  label: string;
  type?: 'money' | 'num' | 'text';
}
interface Row {
  cells: Record<string, string | number>;
  kind?: 'group' | 'subtotal';
}
interface Result {
  columns: Col[];
  rows: Row[];
  total?: Record<string, string | number>;
  summary?: string;
}
interface Filters {
  from: string;
  to: string;
  employee: string;
  service: string;
  account: string;
  application: string;
  route: string;
  showHours: boolean;
  includeInactive: boolean;
}

const FILTERS: Record<string, Filter[]> = {
  'production-by-account': ['date', 'account', 'service', 'employee'],
  'production-detail': ['date', 'service', 'employee', 'account', 'hours'],
  'production-by-employee': ['date', 'employee'],
  'production-by-service': ['date', 'service'],
  'production-open': ['date', 'service', 'employee', 'account'],
  'payments-by-account': ['date', 'account'],
  'open-invoices': ['account'],
  'fert-by-route': ['date', 'route', 'application', 'employee'],
  'sqft-check': ['route', 'application'],
};
const DEFAULT_PRESET: Record<string, string> = { 'production-by-service': 'Today', 'production-open': 'Last 30 days' };

function presets() {
  const t = todayISO();
  const m = mondayOf(t);
  return [
    { label: 'Today', from: t, to: t },
    { label: 'This week', from: m, to: addDays(m, 6) },
    { label: 'This month', from: t.slice(0, 8) + '01', to: t },
    { label: 'Last 30 days', from: addDays(t, -30), to: t },
    { label: 'This year', from: t.slice(0, 5) + '01-01', to: t },
  ];
}

const doneDate = (w: WorkOrder) => w.completedDate ?? w.date;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function build(id: string, d: AppData, f: Filters): Result {
  const cust = new Map(d.customers.map((c) => [c.id, c]));
  const emp = (eid: string) => d.employees.find((e) => e.id === eid)?.name ?? '—';
  const custOk = (c: Customer | undefined) => !!c && (f.includeInactive || c.active) && (!f.account || c.id === f.account);
  const inRange = (iso: string) => (!f.from || iso >= f.from) && (!f.to || iso <= f.to);
  const svcOk = (w: WorkOrder) => !f.service || w.service === f.service;
  const empOk = (w: WorkOrder) => !f.employee || w.employeeId === f.employee;
  const routeOf = (c?: Customer) => d.routes.find((r) => r.id === c?.routeId);
  const completed = d.workOrders
    .filter((w) => w.status === 'Completed' && inRange(doneDate(w)) && svcOk(w) && empOk(w) && custOk(cust.get(w.customerId)))
    .sort((a, b) => doneDate(a).localeCompare(doneDate(b)));
  const svcLabel = (w: WorkOrder) => (w.application ? `Fertilization – ${w.application}` : shortService(w.service));

  switch (id) {
    case 'production-by-account': {
      const byAcct = new Map<string, WorkOrder[]>();
      completed.forEach((w) => byAcct.set(w.customerId, [...(byAcct.get(w.customerId) ?? []), w]));
      const rows: Row[] = [];
      [...byAcct.entries()]
        .sort((a, b) => (cust.get(a[0])?.number ?? '').localeCompare(cust.get(b[0])?.number ?? ''))
        .forEach(([cid, ws]) => {
          const c = cust.get(cid);
          rows.push({ kind: 'group', cells: { account: `${c?.number} · ${customerName(c)}` } });
          ws.forEach((w) => rows.push({ cells: { account: '', date: fmtDate(doneDate(w)), service: svcLabel(w), employee: emp(w.employeeId), wo: w.number, price: w.price } }));
          rows.push({ kind: 'subtotal', cells: { account: `Subtotal (${ws.length} services)`, price: sum(ws.map((w) => w.price)) } });
        });
      return {
        columns: [
          { key: 'account', label: 'Account' },
          { key: 'date', label: 'Date' },
          { key: 'service', label: 'Service' },
          { key: 'employee', label: 'Employee' },
          { key: 'wo', label: 'Work order' },
          { key: 'price', label: 'Amount', type: 'money' },
        ],
        rows,
        total: { account: `${byAcct.size} accounts · ${completed.length} services`, price: sum(completed.map((w) => w.price)) },
      };
    }
    case 'production-detail': {
      const ws = [...completed].sort(
        (a, b) => doneDate(a).localeCompare(doneDate(b)) || svcLabel(a).localeCompare(svcLabel(b)) || emp(a.employeeId).localeCompare(emp(b.employeeId)),
      );
      const columns: Col[] = [
        { key: 'date', label: 'Date' },
        { key: 'service', label: 'Service' },
        { key: 'employee', label: 'Employee' },
        { key: 'account', label: 'Account' },
      ];
      if (f.showHours) columns.push({ key: 'hours', label: 'Man-hours', type: 'num' }, { key: 'perHour', label: '$ per man-hour', type: 'money' });
      columns.push({ key: 'price', label: 'Amount', type: 'money' });
      const hours = sum(ws.map((w) => w.manHours));
      const dollars = sum(ws.map((w) => w.price));
      return {
        columns,
        rows: ws.map((w) => ({
          cells: {
            date: fmtDate(doneDate(w)),
            service: svcLabel(w),
            employee: emp(w.employeeId),
            account: `${cust.get(w.customerId)?.number} ${customerName(cust.get(w.customerId))}`,
            hours: w.manHours,
            perHour: w.manHours ? w.price / w.manHours : 0,
            price: w.price,
          },
        })),
        total: { date: `${ws.length} services`, hours, perHour: hours ? dollars / hours : 0, price: dollars },
      };
    }
    case 'production-by-employee': {
      const rows: Row[] = [];
      let allStops = 0;
      let allDollars = 0;
      d.employees
        .filter((e) => !f.employee || e.id === f.employee)
        .forEach((e) => {
          const ws = completed.filter((w) => w.employeeId === e.id);
          if (!ws.length) return;
          rows.push({ kind: 'group', cells: { employee: `${e.name} · ${e.role}` } });
          const byDate = new Map<string, WorkOrder[]>();
          ws.forEach((w) => byDate.set(doneDate(w), [...(byDate.get(doneDate(w)) ?? []), w]));
          [...byDate.entries()].forEach(([date, list]) => {
            const dollars = sum(list.map((w) => w.price));
            rows.push({ cells: { employee: '', date: fmtDate(date), stops: list.length, dollars, avg: dollars / list.length } });
          });
          const dollars = sum(ws.map((w) => w.price));
          allStops += ws.length;
          allDollars += dollars;
          rows.push({ kind: 'subtotal', cells: { employee: `Total for ${e.name}`, stops: ws.length, dollars, avg: dollars / ws.length } });
        });
      return {
        columns: [
          { key: 'employee', label: 'Employee' },
          { key: 'date', label: 'Date' },
          { key: 'stops', label: 'Stops', type: 'num' },
          { key: 'dollars', label: 'Dollars generated', type: 'money' },
          { key: 'avg', label: 'Avg per stop', type: 'money' },
        ],
        rows,
        total: { employee: 'All employees', stops: allStops, dollars: allDollars, avg: allStops ? allDollars / allStops : 0 },
      };
    }
    case 'production-by-service': {
      const by = new Map<string, WorkOrder[]>();
      completed.forEach((w) => by.set(svcLabel(w), [...(by.get(svcLabel(w)) ?? []), w]));
      const rows = [...by.entries()]
        .sort((a, b) => sum(b[1].map((w) => w.price)) - sum(a[1].map((w) => w.price)))
        .map(([svc, ws]) => {
          const dollars = sum(ws.map((w) => w.price));
          return { cells: { service: svc, count: ws.length, dollars, avg: dollars / ws.length } };
        });
      const dollars = sum(completed.map((w) => w.price));
      return {
        columns: [
          { key: 'service', label: 'Service' },
          { key: 'count', label: 'Times provided', type: 'num' },
          { key: 'dollars', label: 'Dollars generated', type: 'money' },
          { key: 'avg', label: 'Avg per job', type: 'money' },
        ],
        rows,
        total: { service: `${rows.length} services`, count: completed.length, dollars, avg: completed.length ? dollars / completed.length : 0 },
      };
    }
    case 'production-open': {
      const today = todayISO();
      const ws = d.workOrders
        .filter((w) => w.status !== 'Completed' && inRange(w.date) && svcOk(w) && empOk(w) && custOk(cust.get(w.customerId)))
        .sort((a, b) => a.date.localeCompare(b.date));
      return {
        columns: [
          { key: 'wo', label: 'Work order' },
          { key: 'date', label: 'Scheduled' },
          { key: 'account', label: 'Account' },
          { key: 'service', label: 'Service' },
          { key: 'route', label: 'Route' },
          { key: 'employee', label: 'Assigned to' },
          { key: 'status', label: 'Status' },
          { key: 'days', label: 'Days open', type: 'num' },
          { key: 'price', label: 'Amount', type: 'money' },
        ],
        rows: ws.map((w) => {
          const c = cust.get(w.customerId);
          return {
            cells: {
              wo: w.number,
              date: fmtDate(w.date),
              account: `${c?.number} ${customerName(c)}`,
              service: svcLabel(w),
              route: `${d.settings.routePrefix} ${routeOf(c)?.number ?? ''}`,
              employee: emp(w.employeeId),
              status: w.status,
              days: Math.max(0, daysBetween(w.date, today)),
              price: w.price,
            },
          };
        }),
        total: { wo: `${ws.length} open work orders`, price: sum(ws.map((w) => w.price)) },
      };
    }
    case 'payments-by-account': {
      const ps = d.payments
        .filter((p) => inRange(p.date) && (!f.account || p.customerId === f.account) && (f.includeInactive || cust.get(p.customerId)?.active))
        .sort((a, b) => (cust.get(a.customerId)?.number ?? '').localeCompare(cust.get(b.customerId)?.number ?? '') || a.date.localeCompare(b.date));
      const rows: Row[] = [];
      let last = '';
      let sub = 0;
      const flush = () => last && rows.push({ kind: 'subtotal', cells: { number: 'Account total', amount: sub } });
      ps.forEach((p) => {
        if (p.customerId !== last) {
          flush();
          last = p.customerId;
          sub = 0;
        }
        const c = cust.get(p.customerId);
        sub += p.amount;
        rows.push({
          cells: {
            number: c?.number ?? '',
            name: customerName(c),
            date: fmtDate(p.date),
            method: p.method,
            ref: p.reference || '—',
            kind: p.reversed ? `${p.kind} (reversed)` : p.kind,
            amount: p.amount,
          },
        });
      });
      flush();
      return {
        columns: [
          { key: 'number', label: 'Account #' },
          { key: 'name', label: 'Account name' },
          { key: 'date', label: 'Payment date' },
          { key: 'method', label: 'Method' },
          { key: 'ref', label: 'Check # / card type' },
          { key: 'kind', label: 'Type' },
          { key: 'amount', label: 'Amount', type: 'money' },
        ],
        rows,
        total: { number: `${ps.length} entries`, amount: sum(ps.map((p) => p.amount)) },
      };
    }
    case 'open-invoices': {
      const today = todayISO();
      const inv = d.invoices
        .filter((i) => invoiceBalance(i) > 0.005 && custOk(cust.get(i.customerId)))
        .map((i) => ({ i, days: daysBetween(i.date, today) }))
        .sort((a, b) => b.days - a.days);
      const bucket = (n: number) => (n >= 90 ? '90+' : n >= 60 ? '60–89' : n >= 30 ? '30–59' : 'Current');
      const totals = ['Current', '30–59', '60–89', '90+'].map((b) => `${b}: ${money(sum(inv.filter((x) => bucket(x.days) === b).map((x) => invoiceBalance(x.i))))}`);
      return {
        columns: [
          { key: 'number', label: 'Account #' },
          { key: 'name', label: 'Name' },
          { key: 'invoice', label: 'Invoice / work order' },
          { key: 'date', label: 'Date' },
          { key: 'days', label: 'Days past due', type: 'num' },
          { key: 'bucket', label: 'Aging' },
          { key: 'fee', label: 'Late fee', type: 'money' },
          { key: 'balance', label: 'Balance', type: 'money' },
        ],
        rows: inv.map(({ i, days }) => {
          const c = cust.get(i.customerId);
          const wo = d.workOrders.find((w) => w.id === i.workOrderId);
          return {
            cells: {
              number: c?.number ?? '',
              name: customerName(c),
              invoice: `${i.number}${wo ? ` / ${wo.number}` : ''}`,
              date: fmtDate(i.date),
              days,
              bucket: bucket(days),
              fee: i.lateFee,
              balance: invoiceBalance(i),
            },
          };
        }),
        total: { number: `${inv.length} open invoices`, fee: sum(inv.map((x) => x.i.lateFee)), balance: sum(inv.map((x) => invoiceBalance(x.i))) },
        summary: totals.join(' · '),
      };
    }
    case 'fert-by-route': {
      const ws = d.workOrders.filter(
        (w) =>
          w.service === FERT_PROGRAM &&
          w.status === 'Completed' &&
          inRange(doneDate(w)) &&
          empOk(w) &&
          (!f.application || w.application === f.application) &&
          custOk(cust.get(w.customerId)) &&
          (!f.route || cust.get(w.customerId)?.routeId === f.route),
      );
      const rows: Row[] = [];
      d.routes.forEach((r) => {
        const list = ws.filter((w) => cust.get(w.customerId)?.routeId === r.id).sort((a, b) => doneDate(a).localeCompare(doneDate(b)));
        if (!list.length) return;
        rows.push({ kind: 'group', cells: { route: routeLabel(r, d.settings) } });
        list.forEach((w) => {
          const c = cust.get(w.customerId);
          rows.push({
            cells: {
              route: '',
              date: fmtDate(doneDate(w)),
              account: `${c?.number} ${customerName(c)}`,
              application: w.application ?? '',
              chemical: `${w.chemical} (EPA ${w.epaReg})`,
              applicator: emp(w.employeeId),
              sqft: c?.sqft ?? 0,
            },
          });
        });
        rows.push({ kind: 'subtotal', cells: { route: `${list.length} applications`, sqft: sum(list.map((w) => cust.get(w.customerId)?.sqft ?? 0)) } });
      });
      return {
        columns: [
          { key: 'route', label: 'Route' },
          { key: 'date', label: 'Date' },
          { key: 'account', label: 'Account' },
          { key: 'application', label: 'Application' },
          { key: 'chemical', label: 'Chemical / EPA Reg. No.' },
          { key: 'applicator', label: 'Applicator' },
          { key: 'sqft', label: 'Sq ft', type: 'num' },
        ],
        rows,
        total: { route: `${ws.length} applications`, sqft: sum(ws.map((w) => cust.get(w.customerId)?.sqft ?? 0)) },
      };
    }
    case 'sqft-check': {
      // Customers "selected" for an application: everyone in the program, or only those with that application still open.
      const scheduled = new Set(
        d.workOrders.filter((w) => f.application && w.application === f.application && w.status !== 'Completed').map((w) => w.customerId),
      );
      const list = d.customers.filter(
        (c) =>
          c.serviceType === FERT_PROGRAM &&
          (f.includeInactive || c.active) &&
          (!f.route || c.routeId === f.route) &&
          (!f.application || scheduled.has(c.id)),
      );
      const rows: Row[] = [];
      d.routes.forEach((r) => {
        const cs = list.filter((c) => c.routeId === r.id).sort((a, b) => r.stops.indexOf(a.id) - r.stops.indexOf(b.id));
        if (!cs.length) return;
        rows.push({ kind: 'group', cells: { route: routeLabel(r, d.settings) } });
        cs.forEach((c) =>
          rows.push({ cells: { route: '', account: `${c.number} ${customerName(c)}`, address: c.billing.street, check: c.sqft ? 'OK' : 'MISSING', sqft: c.sqft } }),
        );
        rows.push({ kind: 'subtotal', cells: { route: `Route total (${cs.length} lawns)`, sqft: sum(cs.map((c) => c.sqft)) } });
      });
      const missing = list.filter((c) => !c.sqft);
      return {
        columns: [
          { key: 'route', label: 'Route' },
          { key: 'account', label: 'Account' },
          { key: 'address', label: 'Address' },
          { key: 'check', label: 'Sq ft on file?' },
          { key: 'sqft', label: 'Sq ft', type: 'num' },
        ],
        rows,
        total: { route: `Overall total (${list.length} lawns)`, sqft: sum(list.map((c) => c.sqft)) },
        summary: missing.length
          ? `${missing.length} of ${list.length} customers are missing square footage: ${missing.map(customerName).join(', ')}.`
          : `All ${list.length} customers have square footage on file.`,
      };
    }
  }
  return { columns: [], rows: [] };
}

function fmtCell(v: string | number | undefined, type?: Col['type']) {
  if (v === undefined || v === '') return '';
  if (type === 'money') return money(Number(v));
  if (type === 'num') return typeof v === 'number' ? num(Math.round(v * 100) / 100) : v;
  return String(v);
}

export default function Reports() {
  const { reportId = REPORTS[0].id } = useParams();
  const meta = REPORTS.find((r) => r.id === reportId) ?? REPORTS[0];
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Reporting system</div>
          <h1>Reports</h1>
        </div>
      </header>
      <div className="reports-layout">
        <nav className="card report-menu" aria-label="Reports">
          <div className="report-menu-h">Production</div>
          {REPORTS.filter((r) => r.production).map((r) => (
            <NavLink key={r.id} to={`/reports/${r.id}`} className={r.id === meta.id ? 'active' : ''}>
              {r.title}
            </NavLink>
          ))}
          <div className="report-menu-h">Billing &amp; applications</div>
          {REPORTS.filter((r) => !r.production).map((r) => (
            <NavLink key={r.id} to={`/reports/${r.id}`} className={r.id === meta.id ? 'active' : ''}>
              {r.title}
            </NavLink>
          ))}
        </nav>
        <ReportView key={meta.id} id={meta.id} title={meta.title} />
      </div>
    </div>
  );
}

function ReportView({ id, title }: { id: string; title: string }) {
  const { data } = useStore();
  const ps = presets();
  const initial = ps.find((p) => p.label === (DEFAULT_PRESET[id] ?? 'This month'))!;
  const [f, setF] = useState<Filters>({
    from: initial.from,
    to: initial.to,
    employee: '',
    service: '',
    account: '',
    application: '',
    route: '',
    showHours: true,
    includeInactive: false,
  });
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const filters = FILTERS[id] ?? [];
  const has = (x: Filter) => filters.includes(x);
  const result = useMemo(() => build(id, data, f), [id, data, f]);
  const dataRows = result.rows.filter((r) => !r.kind).length;

  const filterText = [
    has('date') ? `${fmtDate(f.from) || 'start'} – ${fmtDate(f.to) || 'today'}` : '',
    f.employee && has('employee') ? `Employee: ${data.employees.find((e) => e.id === f.employee)?.name}` : '',
    f.service && has('service') ? `Service: ${f.service}` : '',
    f.account && has('account') ? `Account: ${customerName(data.customers.find((c) => c.id === f.account))}` : '',
    f.route && has('route') ? `Route: ${routeLabel(data.routes.find((r) => r.id === f.route), data.settings)}` : '',
    f.application && has('application') ? `Application: ${f.application}` : '',
    f.includeInactive ? 'Including inactive customers' : 'Active customers only',
  ]
    .filter(Boolean)
    .join(' · ');

  const exportCsv = () => {
    const header = result.columns.map((c) => c.label);
    const body = result.rows.map((r) => result.columns.map((c) => (r.cells[c.key] === undefined ? '' : typeof r.cells[c.key] === 'number' ? Math.round(Number(r.cells[c.key]) * 100) / 100 : r.cells[c.key])));
    const total = result.total ? [result.columns.map((c) => (result.total![c.key] === undefined ? '' : typeof result.total![c.key] === 'number' ? Math.round(Number(result.total![c.key]) * 100) / 100 : result.total![c.key]))] : [];
    downloadText(`${id}_${todayISO()}.csv`, toCsv([[title], [filterText], [], header, ...body, ...total]), 'text/csv');
  };

  const table = (
    <table className="table report-table">
      <thead>
        <tr>
          {result.columns.map((c) => (
            <th key={c.key} className={c.type && c.type !== 'text' ? 'num' : ''}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.map((r, i) => (
          <tr key={i} className={r.kind ? `row-${r.kind}` : ''}>
            {r.kind === 'group' ? (
              <td colSpan={result.columns.length}>{r.cells[result.columns[0].key]}</td>
            ) : (
              result.columns.map((c) => (
                <td key={c.key} className={(c.type && c.type !== 'text' ? 'num' : '') + (r.cells[c.key] === 'MISSING' ? ' danger-text' : '')}>
                  {r.cells[c.key] === 'MISSING' ? <span className="pill pill-danger">Missing</span> : fmtCell(r.cells[c.key], c.type)}
                </td>
              ))
            )}
          </tr>
        ))}
      </tbody>
      {result.total && (
        <tfoot>
          <tr>
            {result.columns.map((c) => (
              <td key={c.key} className={c.type && c.type !== 'text' ? 'num' : ''}>
                {fmtCell(result.total![c.key], c.type)}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );

  return (
    <section className="card report-main" aria-labelledby="report-h">
      <div className="card-head">
        <h2 id="report-h">{title}</h2>
        <div className="actions">
          <button className="btn" onClick={exportCsv} disabled={dataRows === 0}>
            <Icon name="download" /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => window.print()} disabled={dataRows === 0}>
            <Icon name="print" /> Print
          </button>
        </div>
      </div>

      <div className="report-filters">
        {has('date') && (
          <>
            <label className="field">
              <span>From</span>
              <input className="input" type="date" value={f.from} onChange={(e) => set('from', e.target.value)} />
            </label>
            <label className="field">
              <span>To</span>
              <input className="input" type="date" value={f.to} onChange={(e) => set('to', e.target.value)} />
            </label>
            <div className="seg" role="group" aria-label="Date presets" style={{ alignSelf: 'flex-end' }}>
              {ps.map((p) => (
                <button key={p.label} type="button" aria-pressed={f.from === p.from && f.to === p.to} onClick={() => setF((x) => ({ ...x, from: p.from, to: p.to }))}>
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}
        {has('employee') && (
          <label className="field">
            <span>Employee</span>
            <select className="select" value={f.employee} onChange={(e) => set('employee', e.target.value)}>
              <option value="">All employees</option>
              {data.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('service') && (
          <label className="field">
            <span>Service</span>
            <select className="select" value={f.service} onChange={(e) => set('service', e.target.value)}>
              <option value="">All services</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('route') && (
          <label className="field">
            <span>Route</span>
            <select className="select" value={f.route} onChange={(e) => set('route', e.target.value)}>
              <option value="">All routes</option>
              {data.routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {routeLabel(r, data.settings)}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('application') && (
          <label className="field">
            <span>{id === 'sqft-check' ? 'Customers selected for' : 'Application'}</span>
            <select className="select" value={f.application} onChange={(e) => set('application', e.target.value)}>
              <option value="">{id === 'sqft-check' ? 'All program customers' : 'All applications'}</option>
              {FERT_APPLICATIONS.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('account') && (
          <div style={{ minWidth: 260 }}>
            <CustomerSelect value={f.account} onChange={(v) => set('account', v)} label="Account" allowEmpty="All accounts" includeInactive />
          </div>
        )}
        <div className="report-checks">
          {has('hours') && (
            <label className="check">
              <input type="checkbox" checked={f.showHours} onChange={(e) => set('showHours', e.target.checked)} />
              Show man-hours and $ per man-hour
            </label>
          )}
          <label className="check">
            <input type="checkbox" checked={f.includeInactive} onChange={(e) => set('includeInactive', e.target.checked)} />
            Include inactive customers
          </label>
        </div>
      </div>

      {result.summary && (
        <div className={'report-summary' + (result.summary.includes('missing') ? ' is-warn' : '')} role="status">
          {result.summary}
        </div>
      )}

      {dataRows === 0 ? (
        <EmptyState title="Nothing to report for these filters">Try a wider date range or clear a filter.</EmptyState>
      ) : (
        <div className="table-wrap">{table}</div>
      )}

      <PrintArea>
        <article className="paper report-paper">
          <header className="letter-head">
            <div>
              <div className="letter-co">{COMPANY.name}</div>
              <div>{title}</div>
            </div>
            <div className="letter-co-contact tiny">
              <div>Printed {fmtTimestamp(new Date().toISOString())}</div>
              <div>{filterText}</div>
            </div>
          </header>
          {result.summary && <p>{result.summary}</p>}
          {table}
        </article>
      </PrintArea>
    </section>
  );
}
