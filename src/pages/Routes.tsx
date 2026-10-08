import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { customerName, routeLabel, useStore } from '../data/store';
import { FERT_PROGRAM } from '../data/seed';
import type { Customer } from '../data/types';
import CustomerSelect from '../components/CustomerSelect';
import { EmptyState, Icon, Modal, StatusPill, Switch, useToast } from '../components/ui';
import { num, shortService, WEEKDAYS } from '../lib/format';

/** Fake but stable map position for a customer (0–100 x, 0–64 y). */
function coords(c: Customer): [number, number] {
  let h = 2166136261;
  for (const ch of c.billing.street + c.id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const x = 8 + ((h >>> 0) % 84);
  const y = 6 + (((h >>> 0) / 84) % 52);
  return [x, Math.floor(y)];
}
const DEPOT: [number, number] = [50, 62];
const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Pretend 1 map unit ≈ 0.12 miles. */
function routeMiles(stops: Customer[]): number {
  let d = 0;
  let at = DEPOT;
  for (const c of stops) {
    const p = coords(c);
    d += dist(at, p);
    at = p;
  }
  return (d + dist(at, DEPOT)) * 0.12;
}
function nearestNeighbor(stops: Customer[]): Customer[] {
  const left = [...stops];
  const out: Customer[] = [];
  let at = DEPOT;
  while (left.length) {
    let best = 0;
    left.forEach((c, i) => {
      if (dist(at, coords(c)) < dist(at, coords(left[best]))) best = i;
    });
    const [c] = left.splice(best, 1);
    out.push(c);
    at = coords(c);
  }
  return out;
}

export default function RoutesPage() {
  const { data, update } = useStore();
  const [params, setParams] = useSearchParams();
  const routeId = params.get('route') && data.routes.some((r) => r.id === params.get('route')) ? params.get('route')! : data.routes[0]?.id;
  const route = data.routes.find((r) => r.id === routeId);
  const [showInactive, setShowInactive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const custById = useMemo(() => new Map(data.customers.map((c) => [c.id, c])), [data.customers]);
  const s = data.settings;

  const stops = (route?.stops ?? []).map((id) => custById.get(id)).filter((c): c is Customer => !!c && (showInactive || c.active));

  /** Reorder only the visible stops, keeping hidden (inactive) stops in their slots. */
  const applyVisibleOrder = (ordered: string[]) =>
    update((d) => {
      const r = d.routes.find((x) => x.id === routeId);
      if (!r) return;
      const visible = new Set(ordered);
      let i = 0;
      r.stops = r.stops.map((id) => (visible.has(id) ? ordered[i++] : id));
    });

  const move = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = stops.map((c) => c.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    applyVisibleOrder(ids);
  };
  const nudge = (id: string, delta: number) => {
    const ids = stops.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    applyVisibleOrder(ids);
  };

  const changeRoute = (customerId: string, newRouteId: string) => {
    update((d) => {
      d.routes.forEach((r) => (r.stops = r.stops.filter((x) => x !== customerId)));
      d.routes.find((r) => r.id === newRouteId)?.stops.push(customerId);
      const c = d.customers.find((x) => x.id === customerId);
      if (c) c.routeId = newRouteId;
    });
    const c = custById.get(customerId);
    showToast(`Moved ${customerName(c)} to ${routeLabel(data.routes.find((r) => r.id === newRouteId), s)}.`);
  };

  const activeAll = data.customers.filter((c) => c.active);
  const routeSqft = stops.reduce((t, c) => t + c.sqft, 0);
  const overallSqft = activeAll.reduce((t, c) => t + c.sqft, 0);
  const fertSqft = activeAll.filter((c) => c.serviceType === FERT_PROGRAM).reduce((t, c) => t + c.sqft, 0);
  const missing = activeAll.filter((c) => c.serviceType === FERT_PROGRAM && !c.sqft);
  const miles = routeMiles(stops);
  const optimized = nearestNeighbor(stops);
  const optMiles = routeMiles(optimized);

  if (!route) {
    return (
      <div className="page">
        <h1>Schedule &amp; routes</h1>
        <EmptyState title="No routes set up" />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Runs every {WEEKDAYS[route.weekday]}</div>
          <h1>Schedule &amp; routes</h1>
        </div>
        <div className="actions">
          <button className="btn" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((v) => !v)}>
            Route naming &amp; numbering
          </button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Icon name="plus" /> Add customer to route
          </button>
        </div>
      </header>

      {settingsOpen && <RouteSettings />}

      {missing.length > 0 && (
        <div className="warn-box" role="alert" style={{ marginTop: 0, marginBottom: 16 }}>
          <Icon name="warn" />
          <div>
            <strong>Missing square footage:</strong> {missing.length} fertilization program customer{missing.length === 1 ? '' : 's'} (
            {missing.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ', '}
                <Link to={`/customers/${c.id}`} style={{ color: 'var(--danger)' }}>
                  {customerName(c)}
                </Link>
              </span>
            ))}
            ) can't be included in chemical orders until they are measured.
          </div>
        </div>
      )}

      <div className="toolbar card">
        <label className="field" style={{ minWidth: 320 }}>
          <span>Route</span>
          <select className="select" value={routeId} onChange={(e) => setParams({ route: e.target.value })}>
            {data.routes.map((r) => (
              <option key={r.id} value={r.id}>
                {routeLabel(r, s)} ({WEEKDAYS[r.weekday]})
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive customers
        </label>
        <div style={{ marginLeft: 'auto' }}>
          <Switch
            checked={s.optimizeWithMaps}
            onChange={(v) => update((d) => (d.settings.optimizeWithMaps = v))}
            label="Optimize order with Google Maps"
          />
        </div>
      </div>

      <div className={s.optimizeWithMaps ? 'routes-grid with-map' : 'routes-grid'}>
        <section className="card" aria-labelledby="stops-h">
          <div className="card-head">
            <h2 id="stops-h">{routeLabel(route, s)}</h2>
            <span className="small muted">
              {s.optimizeWithMaps ? 'Map suggestion available · you can still drag to adjust' : 'Manual order · drag rows or use the arrows'}
            </span>
          </div>
          {stops.length === 0 ? (
            <EmptyState title="No stops on this route">Use “Add customer to route” to build it.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="table stops-table">
                <thead>
                  <tr>
                    <th aria-label="Drag handle" />
                    <th>Stop</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th className="num">Sq ft</th>
                    <th>Route</th>
                    <th>
                      <span className="sr-only">Reorder</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stops.map((c, i) => {
                    const flag = c.serviceType === FERT_PROGRAM && !c.sqft;
                    return (
                      <tr
                        key={c.id}
                        draggable
                        onDragStart={(e) => {
                          setDragId(c.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', c.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setOverId(c.id);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragId) move(dragId, c.id);
                          setDragId(null);
                          setOverId(null);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverId(null);
                        }}
                        className={(dragId === c.id ? 'dragging ' : '') + (overId === c.id && dragId !== c.id ? 'drop-target' : '')}
                      >
                        <td className="grip" aria-hidden="true">
                          <Icon name="grip" />
                        </td>
                        <td className="num" style={{ textAlign: 'left' }}>
                          {i + 1}
                        </td>
                        <td>
                          <Link to={`/customers/${c.id}`}>{customerName(c)}</Link>{' '}
                          {!c.active && <StatusPill status="Inactive" />}
                          <div className="tiny muted">
                            {c.number} · {c.billing.street}
                            {c.callFirst ? ' · Call first' : ''}
                          </div>
                        </td>
                        <td>{shortService(c.serviceType)}</td>
                        <td className="num">
                          {flag ? <span className="pill pill-danger">Missing sq ft</span> : num(c.sqft)}
                        </td>
                        <td>
                          <label className="sr-only" htmlFor={`rt-${c.id}`}>
                            Route for {customerName(c)}
                          </label>
                          <select id={`rt-${c.id}`} className="select select-sm" value={route.id} onChange={(e) => changeRoute(c.id, e.target.value)}>
                            {data.routes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {s.routePrefix} {r.number}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="nowrap">
                          <button className="btn btn-sm btn-ghost" aria-label={`Move ${customerName(c)} up`} disabled={i === 0} onClick={() => nudge(c.id, -1)}>
                            ↑
                          </button>
                          <button
                            className="btn btn-sm btn-ghost"
                            aria-label={`Move ${customerName(c)} down`}
                            disabled={i === stops.length - 1}
                            onClick={() => nudge(c.id, 1)}
                          >
                            ↓
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Totals</td>
                    <td>{stops.length} stops</td>
                    <td />
                    <td className="num">{num(routeSqft)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <div className="totals-bar">
            <div>
              <div className="label">Total stops</div>
              <div className="tot">{stops.length}</div>
            </div>
            <div>
              <div className="label">Sq ft – this route</div>
              <div className="tot">{num(routeSqft)}</div>
            </div>
            <div>
              <div className="label">Sq ft – all routes</div>
              <div className="tot">{num(overallSqft)}</div>
            </div>
            <div>
              <div className="label">Fertilization lawns – all routes (chemical order)</div>
              <div className="tot">{num(fertSqft)}</div>
            </div>
          </div>
        </section>

        {s.optimizeWithMaps && (
          <section className="card" aria-labelledby="map-h">
            <div className="card-head">
              <h2 id="map-h">Map preview</h2>
              <span className="tiny muted">Placeholder · no live Google Maps connection in this demo</span>
            </div>
            <div className="card-pad">
              <svg viewBox="0 0 100 68" className="fake-map" role="img" aria-label={`Map placeholder with ${stops.length} stops`}>
                <rect width="100" height="68" fill="#eaf0e6" />
                {[12, 30, 48, 66, 84].map((x) => (
                  <line key={'v' + x} x1={x} y1="0" x2={x} y2="68" stroke="#fff" strokeWidth="1.6" />
                ))}
                {[14, 32, 50].map((y) => (
                  <line key={'h' + y} x1="0" y1={y} x2="100" y2={y} stroke="#fff" strokeWidth="1.6" />
                ))}
                <path d="M0 58 C 30 50, 60 66, 100 54" stroke="#cfe0ef" strokeWidth="4" fill="none" />
                <polyline
                  points={[DEPOT, ...stops.map(coords), DEPOT].map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke="#1D5FA8"
                  strokeWidth="0.7"
                  strokeDasharray="1.5 1"
                />
                <rect x={DEPOT[0] - 2.5} y={DEPOT[1] - 2.5} width="5" height="5" rx="1" fill="#16212B" />
                {stops.map((c, i) => {
                  const [x, y] = coords(c);
                  return (
                    <g key={c.id}>
                      <circle cx={x} cy={y} r="2.8" fill="#1D5FA8" stroke="#fff" strokeWidth="0.6" />
                      <text x={x} y={y + 1.1} fontSize="3" textAnchor="middle" fill="#fff" fontFamily="sans-serif" fontWeight="700">
                        {i + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <dl className="kv" style={{ marginTop: 14 }}>
                <dt>Current order</dt>
                <dd>{miles.toFixed(1)} mi</dd>
                <dt>Suggested order</dt>
                <dd className="success-text">{optMiles.toFixed(1)} mi</dd>
              </dl>
              <button
                className="btn btn-primary"
                style={{ marginTop: 14, width: '100%' }}
                disabled={optMiles >= miles - 0.05}
                onClick={() => {
                  applyVisibleOrder(optimized.map((c) => c.id));
                  showToast(`Stops reordered. Saves about ${(miles - optMiles).toFixed(1)} miles.`);
                }}
              >
                {optMiles >= miles - 0.05 ? 'Already in the best order' : 'Apply suggested order'}
              </button>
              <p className="tiny muted" style={{ marginBottom: 0 }}>
                The real app would send these addresses to Google Maps and get back the shortest driving order.
              </p>
            </div>
          </section>
        )}
      </div>

      {addOpen && (
        <AddToRouteModal
          routeId={route.id}
          onClose={() => setAddOpen(false)}
          onAdd={(cid) => {
            changeRoute(cid, route.id);
            setAddOpen(false);
          }}
        />
      )}
      {toast}
    </div>
  );
}

function AddToRouteModal({ routeId, onClose, onAdd }: { routeId: string; onClose: () => void; onAdd: (id: string) => void }) {
  const { data } = useStore();
  const [cid, setCid] = useState('');
  const c = data.customers.find((x) => x.id === cid);
  const route = data.routes.find((r) => r.id === routeId);
  return (
    <Modal title={`Add customer to ${routeLabel(route, data.settings)}`} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (cid) onAdd(cid);
        }}
      >
        <CustomerSelect value={cid} onChange={setCid} />
        {c && (
          <p className="small muted" style={{ margin: 0 }}>
            {c.routeId === routeId
              ? 'Already on this route.'
              : `Currently on ${routeLabel(data.routes.find((r) => r.id === c.routeId), data.settings)}. They will be moved and added as the last stop.`}
          </p>
        )}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!cid || c?.routeId === routeId}>
            Add to route
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RouteSettings() {
  const { data, update } = useStore();
  const s = data.settings;
  const dupes = new Set(data.routes.map((r) => r.number).filter((n, i, a) => a.indexOf(n) !== i));
  return (
    <section className="card card-pad" style={{ marginBottom: 16 }} aria-labelledby="rs-h">
      <h2 id="rs-h" style={{ marginBottom: 4 }}>
        Route naming &amp; numbering
      </h2>
      <p className="small muted" style={{ marginTop: 0 }}>
        Changes save right away and show up everywhere routes are listed.
      </p>
      <div className="route-settings">
        <label className="field" style={{ maxWidth: 200 }}>
          <span>Prefix</span>
          <input className="input" value={s.routePrefix} onChange={(e) => update((d) => (d.settings.routePrefix = e.target.value))} />
        </label>
        <table className="table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Name</th>
              <th>Day</th>
              <th>Shows as</th>
            </tr>
          </thead>
          <tbody>
            {data.routes.map((r, i) => (
              <tr key={r.id}>
                <td style={{ width: 110 }}>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    aria-label={`Number for ${r.name}`}
                    aria-invalid={dupes.has(r.number)}
                    value={r.number}
                    onChange={(e) => update((d) => (d.routes[i].number = Number(e.target.value) || 0))}
                  />
                </td>
                <td>
                  <input className="input" aria-label={`Name for route ${r.number}`} value={r.name} onChange={(e) => update((d) => (d.routes[i].name = e.target.value))} />
                </td>
                <td style={{ width: 160 }}>
                  <select
                    className="select"
                    aria-label={`Day for route ${r.number}`}
                    value={r.weekday}
                    onChange={(e) => update((d) => (d.routes[i].weekday = Number(e.target.value)))}
                  >
                    {[1, 2, 3, 4, 5].map((wd) => (
                      <option key={wd} value={wd}>
                        {WEEKDAYS[wd]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="nowrap">
                  {routeLabel(r, s)}
                  {dupes.has(r.number) && <div className="tiny danger-text">Number used twice</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
