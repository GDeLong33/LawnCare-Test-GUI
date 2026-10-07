import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerName, useStore } from '../data/store';
import { Icon, StatusPill } from '../components/ui';
import { addDays, daysBetween, fmtDate, longToday, money, num, shortService, todayISO } from '../lib/format';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const { data, update, completeWorkOrder } = useStore();
  const navigate = useNavigate();
  const today = todayISO();

  const stats = useMemo(() => {
    const active = data.customers.filter((c) => c.active).length;
    const open = data.invoices.filter((i) => i.amount - i.amountPaid > 0.005);
    const openTotal = open.reduce((s, i) => s + i.amount - i.amountPaid, 0);
    const pastDue = open
      .filter((i) => daysBetween(i.date, today) > 30)
      .reduce((s, i) => s + i.amount - i.amountPaid, 0);
    const todays = data.workOrders.filter((w) => w.date === today);
    const weekEnd = addDays(today, 6);
    const fertDue = data.workOrders.filter(
      (w) =>
        w.service === 'Lawn Fertilization Program' &&
        w.status !== 'Completed' &&
        w.date >= today &&
        w.date <= weekEnd,
    );
    return { active, open, openTotal, pastDue, todays, fertDue };
  }, [data, today]);

  const custById = useMemo(() => new Map(data.customers.map((c) => [c.id, c])), [data.customers]);
  const empById = useMemo(() => new Map(data.employees.map((e) => [e.id, e])), [data.employees]);

  // Today's stops in route order.
  const todayRoute = data.routes.find((r) => stats.todays.some((w) => custById.get(w.customerId)?.routeId === r.id));
  const routeOrder = todayRoute?.stops ?? [];
  const todays = [...stats.todays].sort(
    (a, b) => routeOrder.indexOf(a.customerId) - routeOrder.indexOf(b.customerId),
  );
  const done = todays.filter((w) => w.status === 'Completed').length;
  const inProg = todays.filter((w) => w.status === 'In progress').length;

  const recentPayments = [...data.payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  const advance = (id: string, status: string) => {
    if (status === 'Upcoming') {
      update((d) => {
        const w = d.workOrders.find((x) => x.id === id);
        if (w) w.status = 'In progress';
      });
    } else {
      completeWorkOrder(id);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{greeting()}, Marcus</h1>
          <div className="sub">{longToday()} · {todayRoute ? `${todayRoute.name} is out today` : 'No route scheduled today'}</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => navigate(`/work-orders/print/${todayRoute?.id ?? 'r1'}`)}>
            <Icon name="print" /> Print Route Work Orders
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/work-orders/new')}>
            <Icon name="plus" /> New Work Order
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="card stat">
          <div className="stat-icon"><Icon name="customers" /></div>
          <div className="label">Active customers</div>
          <div className="value">{stats.active}</div>
          <div className="foot">{data.customers.length - stats.active} inactive · {data.routes.length} routes</div>
        </div>
        <div className="card stat">
          <div className="stat-icon"><Icon name="invoice" /></div>
          <div className="label">Open invoices</div>
          <div className="value">{stats.open.length}</div>
          <div className="foot">
            {money(stats.openTotal)} open · <strong>{money(stats.pastDue)} past due</strong>
          </div>
        </div>
        <div className="card stat">
          <div className="stat-icon"><Icon name="truck" /></div>
          <div className="label">Today's stops</div>
          <div className="value">{todays.length}</div>
          <div className="foot">{done} completed · {inProg} in progress</div>
        </div>
        <div className="card stat">
          <div className="stat-icon"><Icon name="leaf" /></div>
          <div className="label">Fertilization this week</div>
          <div className="value">{stats.fertDue.length}</div>
          <div className="foot">
            {num(stats.fertDue.reduce((s, w) => s + (custById.get(w.customerId)?.sqft ?? 0), 0))} sq ft to treat
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-head">
            <h2>Today's route</h2>
            <span className="muted small">{todayRoute?.name}</span>
          </div>
          <div className="table-wrap"><table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Service</th>
                <th className="num">Sq ft</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {todays.map((w, i) => {
                const c = custById.get(w.customerId);
                return (
                  <tr key={w.id}>
                    <td className="muted">{i + 1}</td>
                    <td>
                      <Link to={`/customers/${w.customerId}`}>{customerName(c)}</Link>
                      <div className="small muted">{c?.billing.street}{c?.callFirst ? " · Call first" : ""}</div>
                    </td>
                    <td>{shortService(w.service)}<div className="small muted">{empById.get(w.employeeId)?.name}</div></td>
                    <td className="num">{num(c?.sqft ?? 0)}</td>
                    <td><StatusPill status={w.status} /></td>
                    <td className="num">
                      {w.status === 'Completed' ? (
                        <Link className="btn btn-sm" to={`/work-orders/${w.id}`}>Open</Link>
                      ) : (
                        <button className="btn btn-sm" onClick={() => advance(w.id, w.status)}>
                          {w.status === 'Upcoming' ? 'Start' : 'Complete'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {todays.length === 0 && (
                <tr><td colSpan={6} className="muted">No stops scheduled for today.</td></tr>
              )}
            </tbody>
          </table></div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Recent payments</h2>
            <Link to="/reports/payments" className="small">View all</Link>
          </div>
          <ul className="pay-list">
            {recentPayments.map((p) => (
              <li key={p.id}>
                <div>
                  <div style={{ fontWeight: 600 }}>{customerName(custById.get(p.customerId))}</div>
                  <div className="small muted">
                    {fmtDate(p.date)} · {p.kind === 'Payment' ? p.method : p.kind}
                    {p.reference ? ` ${p.reference}` : ''}
                  </div>
                </div>
                <div className="amt" style={{ color: p.amount < 0 ? 'var(--danger)' : undefined }}>
                  {money(p.amount)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
