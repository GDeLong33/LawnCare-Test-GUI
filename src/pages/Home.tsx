import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerName, invoiceBalance, routeLabel, useStore } from '../data/store';
import { FERT_PROGRAM, FERT_ROUNDS } from '../data/seed';
import { REPORTS } from '../data/reports';
import type { Customer, WorkOrder } from '../data/types';
import { EmptyState, Icon, Modal, PrintArea, StatusPill, useToast } from '../components/ui';
import PrepayLetter, { letterFileName, letterInfo } from '../components/PrepayLetter';
import { SEARCH_MODES, matchesAny, searchCustomers, type SearchMode } from '../lib/search';
import { addDays, daysBetween, longDate, money, monthDay, mondayOf, num, shortService, todayISO, weekdayOf, WEEKDAYS } from '../lib/format';

function MenuCard({ n, title, blurb, children }: { n: number; title: string; blurb: string; children: ReactNode }) {
  const id = `menu-${n}`;
  return (
    <section className="card menu-card" aria-labelledby={id}>
      <div className="menu-card-head">
        <span className="badge-num" aria-hidden="true">{n}</span>
        <div>
          <h2 id={id}>{title}</h2>
          <p>{blurb}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/* ---------- 1. Customer lookup ---------- */
function CustomerLookup({ customers }: { customers: Customer[] }) {
  const [mode, setMode] = useState<SearchMode>('last');
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const results = useMemo(() => searchCustomers(customers, mode, q), [customers, mode, q]);
  const meta = SEARCH_MODES.find((m) => m.id === mode)!;

  return (
    <>
      <div className="seg" role="group" aria-label="Search by">
        {SEARCH_MODES.map((m) => (
          <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Search by {meta.label.toLowerCase()}</span>
        <div className="search-box">
          <Icon name="search" />
          <input
            className="input"
            type="search"
            value={q}
            placeholder={meta.placeholder}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results.length === 1) navigate(`/customers/${results[0].id}`);
            }}
          />
        </div>
      </label>
      <div className="menu-results" aria-live="polite">
        {!q.trim() ? (
          <div className="menu-hint">Type to see matching customers. Click a result to open the profile.</div>
        ) : results.length === 0 ? (
          <EmptyState title="No customers found">Try a different spelling or search type.</EmptyState>
        ) : (
          <>
            <div className="tiny muted" style={{ padding: '0 10px 4px' }}>
              {results.length} match{results.length === 1 ? '' : 'es'}
            </div>
            <ul className="result-list">
              {results.map((c) => (
                <li key={c.id}>
                  <Link to={`/customers/${c.id}`}>
                    <span>
                      <span className="result-name">
                        {c.lastName}, {c.firstName}
                      </span>
                      <br />
                      <span className="result-meta">
                        {c.number} · {c.billing.street}
                      </span>
                    </span>
                    {!c.active && <StatusPill status="Inactive" />}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

/* ---------- 2. Prepayment letters ---------- */
function PrepayLetters({ showToast }: { showToast: (m: ReactNode) => void }) {
  const { data, logEvent } = useStore();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const customer = data.customers.find((c) => c.id === picked);
  const matches = useMemo(
    () =>
      q.trim()
        ? data.customers
            .filter((c) => c.active && matchesAny(c, q))
            .sort((a, b) => a.lastName.localeCompare(b.lastName))
            .slice(0, 6)
        : [],
    [data.customers, q],
  );

  const emailPdf = () => {
    if (!customer) return;
    if (!customer.email) {
      showToast(
        <>
          {customerName(customer)} has no email address on file.{' '}
          <Link to={`/customers/${customer.id}`} style={{ color: '#fff' }}>Add one in the profile.</Link>
        </>,
      );
      return;
    }
    const L = letterInfo(data, customer);
    const file = letterFileName(customer, L.season);
    logEvent('Letter emailed', `Prepayment letter ${file} sent to ${customer.email}`, customer.id);
    showToast(
      <>
        <strong>Email sent</strong> to {customer.email}
        <br />
        <span className="tiny">Attached: {file} (demo – nothing was actually sent)</span>
      </>,
    );
  };

  if (customer) {
    const L = letterInfo(data, customer);
    return (
      <>
        <div className="letter-pick">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <strong className="head-font">{customerName(customer)}</strong>
            <button className="btn btn-sm btn-ghost" onClick={() => setPicked(null)}>
              Change
            </button>
          </div>
          <dl>
            <dt>Account</dt>
            <dd>{customer.number}</dd>
            <dt>Address</dt>
            <dd>
              {customer.billing.street}, {customer.billing.city}
            </dd>
            <dt>Service</dt>
            <dd>{shortService(customer.serviceType)}</dd>
            <dt>Season</dt>
            <dd>
              {L.visits} × {money(L.perVisit)} = {money(L.seasonTotal)}
            </dd>
            <dt>Amount due</dt>
            <dd>
              <strong>{money(L.amountDue)}</strong> <span className="tiny muted">after {L.discountPct}% discount</span>
            </dd>
          </dl>
        </div>
        <div className="actions card-push">
          <button className="btn btn-primary" onClick={() => setPreview(true)}>
            <Icon name="print" /> Print letter
          </button>
          <button className="btn" onClick={emailPdf}>
            <Icon name="mail" /> Email PDF
          </button>
        </div>
        {preview && (
          <Modal title={`Prepayment letter – ${customerName(customer)}`} onClose={() => setPreview(false)} wide>
            <div className="preview-frame">
              <PrepayLetter data={data} customer={customer} />
            </div>
            <PrintArea>
              <PrepayLetter data={data} customer={customer} />
            </PrintArea>
            <div className="actions">
              <button className="btn" onClick={() => setPreview(false)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  logEvent('Letter printed', `Prepayment letter for ${customer.number}`, customer.id);
                  window.print();
                }}
              >
                <Icon name="print" /> Print
              </button>
            </div>
          </Modal>
        )}
      </>
    );
  }

  return (
    <>
      <label className="field">
        <span>Find customer (name, number or street)</span>
        <div className="search-box">
          <Icon name="search" />
          <input className="input" type="search" value={q} placeholder="Start typing…" onChange={(e) => setQ(e.target.value)} />
        </div>
      </label>
      <div className="menu-results" aria-live="polite">
        {!q.trim() ? (
          <div className="menu-hint">
            Pick a customer. Their name, address and season price are filled in from the customer record, so nothing is
            typed by hand.
          </div>
        ) : matches.length === 0 ? (
          <EmptyState title="No active customers match" />
        ) : (
          <ul className="result-list">
            {matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(c.id);
                    setQ('');
                  }}
                >
                  <span>
                    <span className="result-name">{customerName(c)}</span>
                    <br />
                    <span className="result-meta">
                      {c.number} · {c.billing.street}
                    </span>
                  </span>
                  <span className="tiny muted">Select</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/* ---------- Home ---------- */
const dotClass = (w: WorkOrder) =>
  'dot' + (w.status === 'Completed' ? ' done' : w.status === 'In progress' ? ' prog' : w.status === 'Missed' ? ' miss' : '');

export default function Home() {
  const { data } = useStore();
  const navigate = useNavigate();
  const [toast, showToast] = useToast();
  const today = todayISO();
  const monday = mondayOf(today);
  const custById = useMemo(() => new Map(data.customers.map((c) => [c.id, c])), [data.customers]);

  const week = useMemo(() => {
    const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
    const sunday = addDays(monday, 6);
    const wos = data.workOrders.filter((w) => w.date >= monday && w.date <= sunday);
    const done = wos.filter((w) => w.status === 'Completed');
    const revenue = done.reduce((s, w) => s + w.price, 0);
    const scheduledRevenue = wos.reduce((s, w) => s + w.price, 0);
    return { days, wos, done, revenue, scheduledRevenue };
  }, [data.workOrders, monday]);

  const pastDue = useMemo(() => {
    const late = data.invoices.filter((i) => invoiceBalance(i) > 0.005 && daysBetween(i.date, today) > 30);
    return { total: late.reduce((s, i) => s + invoiceBalance(i), 0), accounts: new Set(late.map((i) => i.customerId)).size };
  }, [data.invoices, today]);

  const fert = useMemo(() => {
    const seasonStart = addDays(monday, -30 * 7);
    const lawns = data.customers.filter((c) => c.active && c.serviceType === FERT_PROGRAM);
    const rounds = FERT_ROUNDS.map((name, i) => {
      const doneIds = new Set(
        data.workOrders
          .filter((w) => w.application === name && w.status === 'Completed' && w.date >= seasonStart)
          .map((w) => w.customerId),
      );
      const done = lawns.filter((c) => doneIds.has(c.id));
      return { n: i + 1, name, done: done.length, total: lawns.length, remaining: lawns.filter((c) => !doneIds.has(c.id)) };
    });
    const totalSqft = lawns.reduce((s, c) => s + c.sqft, 0);
    const missing = lawns.filter((c) => !c.sqft);
    const current = rounds.find((r) => r.done < r.total) ?? rounds[rounds.length - 1];
    const remainingSqft = current.remaining.reduce((s, c) => s + c.sqft, 0);
    const byRoute = data.routes.map((r) => ({
      route: r,
      sqft: lawns.filter((c) => c.routeId === r.id).reduce((s, c) => s + c.sqft, 0),
    }));
    return { lawns, rounds, totalSqft, missing, current, remainingSqft, byRoute };
  }, [data, monday]);

  const avgPerStop = week.done.length ? week.revenue / week.done.length : 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">{longDate(today)}</div>
          <h1>Start menu</h1>
          <div className="sub">Billy Goat Lawn Care LLC · choose where to start</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => navigate('/customers/new')}>
            <Icon name="plus" /> New customer
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/work-orders/new')}>
            <Icon name="plus" /> New work order
          </button>
        </div>
      </header>

      <div className="menu-grid">
        <MenuCard n={1} title="Customer lookup" blurb="Find a customer and open the profile.">
          <CustomerLookup customers={data.customers} />
        </MenuCard>
        <MenuCard n={2} title="Create prepayment letters" blurb="Season letters filled in from the customer record.">
          <PrepayLetters showToast={showToast} />
        </MenuCard>
        <MenuCard n={3} title="Reporting system" blurb="Production reports for any date or date range.">
          <ul className="report-links">
            {REPORTS.filter((r) => r.production).map((r) => (
              <li key={r.id}>
                <Link to={`/reports/${r.id}`}>
                  {r.title}
                  <Icon name="chevron" />
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/reports" className="btn card-push" style={{ alignSelf: 'flex-start' }}>
            All reports
          </Link>
        </MenuCard>
      </div>

      <section className="card week-board" aria-labelledby="week-h">
        <div className="card-head">
          <h2 id="week-h">This week by route</h2>
          <span className="muted small">
            Week of {monthDay(monday)} · {week.done.length} of {week.wos.length} stops completed
          </span>
        </div>
        <div className="week-cols">
          {week.days.map((day) => {
            const wd = weekdayOf(day);
            const routes = data.routes.filter((r) => r.weekday === wd);
            const wos = week.wos.filter((w) => w.date === day);
            const isToday = day === today;
            const ordered = [...wos].sort((a, b) => {
              const ra = routes.find((r) => r.id === custById.get(a.customerId)?.routeId)?.stops ?? [];
              const rb = routes.find((r) => r.id === custById.get(b.customerId)?.routeId)?.stops ?? [];
              return ra.indexOf(a.customerId) - rb.indexOf(b.customerId);
            });
            const shown = ordered.slice(0, 7);
            const doneCount = wos.filter((w) => w.status === 'Completed').length;
            return (
              <div key={day} className={'week-col' + (isToday ? ' is-today' : '')} aria-current={isToday ? 'date' : undefined}>
                <div className="week-day">
                  <strong>
                    {WEEKDAYS[wd].slice(0, 3)} {monthDay(day).split(' ')[1]}
                  </strong>
                  {isToday && <span className="today-tag">Today</span>}
                </div>
                {routes.length > 0 ? (
                  routes.map((r) => (
                    <Link key={r.id} className="week-route" to={`/routes?route=${r.id}`}>
                      {routeLabel(r, data.settings)}
                    </Link>
                  ))
                ) : (
                  <span className="week-route" style={{ color: 'var(--muted)' }}>
                    Landscape &amp; stone projects
                  </span>
                )}
                {wos.length === 0 ? (
                  <div className="muted small">No stops scheduled.</div>
                ) : (
                  <ul className="week-stops">
                    {shown.map((w) => (
                      <li key={w.id}>
                        <span className={dotClass(w)} aria-hidden="true" />
                        <Link to={`/work-orders/${w.id}`} title={`${customerName(custById.get(w.customerId))} – ${w.status}`}>
                          {customerName(custById.get(w.customerId))}
                        </Link>
                        <span className="sr-only">{w.status}</span>
                      </li>
                    ))}
                    {ordered.length > shown.length && (
                      <li>
                        <Link to={routes[0] ? `/routes?route=${routes[0].id}` : '/work-orders'} className="tiny">
                          +{ordered.length - shown.length} more
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
                <div className="week-foot">
                  {doneCount}/{wos.length} done · {money(wos.reduce((s, w) => s + w.price, 0))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="home-stats">
        <div className="card stat">
          <div className="label">Weekly revenue</div>
          <div className="value">{money(week.revenue)}</div>
          <div className="foot">
            Completed so far · {money(week.scheduledRevenue)} scheduled this week
          </div>
        </div>
        <div className="card stat">
          <div className="label">Average per stop</div>
          <div className="value">{money(avgPerStop)}</div>
          <div className="foot">Across {week.done.length} completed stops this week</div>
        </div>
        <div className="card stat">
          <div className="label">Past due</div>
          <div className="value danger-text">{money(pastDue.total)}</div>
          <div className="foot">
            Over 30 days · {pastDue.accounts} account{pastDue.accounts === 1 ? '' : 's'} ·{' '}
            <Link to="/payments">View open invoices</Link>
          </div>
        </div>
      </div>

      <section className="card" aria-labelledby="fert-h">
        <div className="card-head">
          <h2 id="fert-h">Fertilization program rounds</h2>
          <span className="muted small">{fert.lawns.length} lawns in the program</span>
        </div>
        <div className="fert-grid">
          <div>
            {fert.rounds.map((r) => (
              <div className="round-row" key={r.name}>
                <div className="round-label">
                  <strong>
                    Round {r.n} · {r.name}
                  </strong>
                  <span className="muted">
                    {r.done} of {r.total} lawns
                  </span>
                </div>
                <div
                  className={'progress' + (r.done < r.total ? ' partial' : '')}
                  role="progressbar"
                  aria-label={`Round ${r.n} ${r.name}`}
                  aria-valuemin={0}
                  aria-valuemax={r.total}
                  aria-valuenow={r.done}
                >
                  <span style={{ width: `${r.total ? (r.done / r.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="tally">
            <div className="label">Overall sq ft tally for chemical ordering</div>
            <div className="big">{num(fert.totalSqft)} sq ft</div>
            <table>
              <tbody>
                {fert.byRoute.map((r) => (
                  <tr key={r.route.id}>
                    <td>{routeLabel(r.route, data.settings)}</td>
                    <td>{num(r.sqft)}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>Left in round {fert.current.n}</strong>
                  </td>
                  <td>
                    <strong>{num(fert.remainingSqft)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
            {fert.missing.length > 0 && (
              <div className="warn-box" role="alert">
                <Icon name="warn" />
                <div>
                  {fert.missing.length} program lawn{fert.missing.length === 1 ? ' is' : 's are'} missing square footage:{' '}
                  {fert.missing.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ', '}
                      <Link to={`/customers/${c.id}`} style={{ color: 'var(--danger)' }}>
                        {customerName(c)}
                      </Link>
                    </span>
                  ))}
                  . The tally is short until they are measured.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      {toast}
    </div>
  );
}
