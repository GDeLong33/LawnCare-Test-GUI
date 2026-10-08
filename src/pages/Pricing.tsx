import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerName, useStore } from '../data/store';
import { COMPANY } from '../data/seed';
import type { PricingDefaults, Settings } from '../data/types';
import CustomerSelect from '../components/CustomerSelect';
import { Icon, PrintArea } from '../components/ui';
import { addDays, longDate, money, round2, todayISO } from '../lib/format';

type JobType = 'mowing' | 'bedInstall' | 'bedMaint' | 'mulch' | 'stone' | 'trimming';
type Key = 'hours' | 'rate' | 'linearFt' | 'perLf' | 'materials' | 'yards' | 'perYard' | 'tons' | 'perTon' | 'barrierSqft' | 'perBarrier';

const JOBS: Record<JobType, { label: string; service: string; fields: Key[]; hours: number; qty: Partial<Record<Key, number>> }> = {
  mowing: { label: 'Lawn mowing', service: 'Lawn mowing', fields: ['hours', 'rate'], hours: 1, qty: {} },
  bedInstall: {
    label: 'Bed installation',
    service: 'Landscape work – Bed installation',
    fields: ['hours', 'rate', 'linearFt', 'perLf', 'materials', 'barrierSqft', 'perBarrier'],
    hours: 16,
    qty: { linearFt: 60, barrierSqft: 300 },
  },
  bedMaint: { label: 'Bed maintenance', service: 'Landscape work – Bed maintenance', fields: ['hours', 'rate', 'materials'], hours: 3, qty: {} },
  mulch: {
    label: 'Mulch',
    service: 'Landscape work – Mulch work',
    fields: ['hours', 'rate', 'yards', 'perYard', 'barrierSqft', 'perBarrier'],
    hours: 4,
    qty: { yards: 6, barrierSqft: 0 },
  },
  stone: {
    label: 'Stone',
    service: 'Stone work',
    fields: ['hours', 'rate', 'tons', 'perTon', 'barrierSqft', 'perBarrier'],
    hours: 12,
    qty: { tons: 4, barrierSqft: 250 },
  },
  trimming: { label: 'Shrub / tree trimming', service: 'Landscape work – Shrub trimming', fields: ['hours', 'rate', 'materials'], hours: 4, qty: {} },
};

const FIELD_META: Record<Key, { label: string; step: number; money?: boolean; unit?: string }> = {
  hours: { label: 'Man-hours', step: 0.25, unit: 'hrs' },
  rate: { label: 'Labor rate per man-hour', step: 1, money: true },
  linearFt: { label: 'Bed edge length', step: 1, unit: 'linear ft' },
  perLf: { label: 'Price per linear foot', step: 0.5, money: true },
  materials: { label: 'Material cost', step: 1, money: true },
  yards: { label: 'Mulch', step: 0.5, unit: 'yards' },
  perYard: { label: 'Mulch price per yard', step: 1, money: true },
  tons: { label: 'Stone', step: 0.5, unit: 'tons' },
  perTon: { label: 'Stone price per ton', step: 1, money: true },
  barrierSqft: { label: 'Weed barrier', step: 10, unit: 'sq ft' },
  perBarrier: { label: 'Weed barrier price per sq ft', step: 0.05, money: true },
};

function defaultsFor(job: JobType, p: PricingDefaults): Record<Key, number> {
  const j = JOBS[job];
  return {
    hours: j.hours,
    rate: p.laborRate,
    linearFt: j.qty.linearFt ?? 0,
    perLf: p.bedInstallPerLinearFt,
    materials: job === 'bedInstall' ? p.bedMaterialCost : job === 'trimming' ? 35 : job === 'bedMaint' ? 20 : 0,
    yards: j.qty.yards ?? 0,
    perYard: p.mulchPerYard,
    tons: j.qty.tons ?? 0,
    perTon: p.stonePerTon,
    barrierSqft: j.qty.barrierSqft ?? 0,
    perBarrier: p.weedBarrierPerSqFt,
  };
}

function lineItems(job: JobType, v: Record<Key, number>) {
  const f = JOBS[job].fields;
  const items: { label: string; detail: string; amount: number }[] = [
    { label: 'Labor', detail: `${v.hours} hrs × ${money(v.rate)}`, amount: v.hours * v.rate },
  ];
  if (f.includes('linearFt')) items.push({ label: 'Bed edging / installation', detail: `${v.linearFt} lf × ${money(v.perLf)}`, amount: v.linearFt * v.perLf });
  if (f.includes('materials') && v.materials) items.push({ label: job === 'trimming' ? 'Disposal / materials' : 'Materials', detail: 'flat', amount: v.materials });
  if (f.includes('yards')) items.push({ label: 'Mulch', detail: `${v.yards} yd × ${money(v.perYard)}`, amount: v.yards * v.perYard });
  if (f.includes('tons')) items.push({ label: 'Stone', detail: `${v.tons} tons × ${money(v.perTon)}`, amount: v.tons * v.perTon });
  if (f.includes('barrierSqft') && v.barrierSqft) items.push({ label: 'Weed barrier', detail: `${v.barrierSqft} sq ft × ${money(v.perBarrier)}`, amount: v.barrierSqft * v.perBarrier });
  return items.map((i) => ({ ...i, amount: round2(i.amount) }));
}

export default function Pricing() {
  const { data } = useStore();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobType>('mulch');
  const [customerId, setCustomerId] = useState('');
  const defaults = useMemo(() => defaultsFor(job, data.settings.pricing), [job, data.settings.pricing]);
  const [overrides, setOverrides] = useState<Partial<Record<Key, string>>>({});
  const values = Object.fromEntries(
    (Object.keys(defaults) as Key[]).map((k) => [k, overrides[k] !== undefined ? Number(overrides[k]) || 0 : defaults[k]]),
  ) as Record<Key, number>;
  const items = lineItems(job, values);
  const total = round2(items.reduce((s, i) => s + i.amount, 0));
  const customer = data.customers.find((c) => c.id === customerId);
  const overriddenCount = JOBS[job].fields.filter((k) => overrides[k] !== undefined && Number(overrides[k]) !== defaults[k]).length;

  const saveAsWorkOrder = () =>
    navigate('/work-orders/new', {
      state: {
        customerId,
        service: JOBS[job].service,
        price: total,
        manHours: values.hours,
        notes: `Proposal: ${items.map((i) => `${i.label} ${i.detail}`).join('; ')}.`,
      },
    });

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Proposals</div>
          <h1>Pricing calculator</h1>
          <div className="sub">Defaults come from the settings table below. Change any number for this job; prices fluctuate.</div>
        </div>
      </header>

      <div className="pricing-grid">
        <section className="card card-pad stack" aria-label="Job inputs">
          <div className="grid-2">
            <label className="field">
              <span>Job type</span>
              <select
                className="select"
                value={job}
                onChange={(e) => {
                  setJob(e.target.value as JobType);
                  setOverrides({});
                }}
              >
                {(Object.keys(JOBS) as JobType[]).map((k) => (
                  <option key={k} value={k}>
                    {JOBS[k].label}
                  </option>
                ))}
              </select>
            </label>
            <CustomerSelect value={customerId} onChange={setCustomerId} label="Customer (optional)" allowEmpty="No customer yet" />
          </div>

          <div className="calc-fields">
            {JOBS[job].fields.map((k) => {
              const m = FIELD_META[k];
              const isOver = overrides[k] !== undefined && Number(overrides[k]) !== defaults[k];
              return (
                <div key={k} className={'calc-field' + (isOver ? ' is-over' : '')}>
                  <label className="field">
                    <span>
                      {m.label}
                      {m.unit ? ` (${m.unit})` : ''}
                    </span>
                    <div className="input-affix">
                      {m.money && <span aria-hidden="true">$</span>}
                      <input
                        className="input"
                        type="number"
                        min={0}
                        step={m.step}
                        value={overrides[k] ?? String(defaults[k])}
                        onChange={(e) => setOverrides((o) => ({ ...o, [k]: e.target.value }))}
                      />
                    </div>
                  </label>
                  <div className="calc-note">
                    {isOver ? (
                      <>
                        <span>Default {m.money ? money(defaults[k]) : defaults[k]}</span>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() =>
                            setOverrides((o) => {
                              const n = { ...o };
                              delete n[k];
                              return n;
                            })
                          }
                        >
                          Reset
                        </button>
                      </>
                    ) : (
                      <span>Default</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {overriddenCount > 0 && (
            <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setOverrides({})}>
              Reset all {overriddenCount} changed value{overriddenCount === 1 ? '' : 's'} to defaults
            </button>
          )}
        </section>

        <section className="card proposal-card" aria-labelledby="prop-h">
          <div className="card-head">
            <h2 id="prop-h">Proposal</h2>
            <span className="small muted">{JOBS[job].label}</span>
          </div>
          <table className="table">
            <tbody>
              {items.map((i) => (
                <tr key={i.label}>
                  <td>
                    {i.label}
                    <div className="tiny muted">{i.detail}</div>
                  </td>
                  <td className="num">{money(i.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Proposal total</td>
                <td className="num proposal-total" aria-live="polite">
                  {money(total)}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="card-pad stack">
            {customer ? (
              <p className="small muted" style={{ margin: 0 }}>
                For {customerName(customer)} · {customer.number}
              </p>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>
                Choose a customer to save this proposal as a work order.
              </p>
            )}
            <button className="btn btn-primary" disabled={!customerId} onClick={saveAsWorkOrder}>
              Save as work order
            </button>
            <button className="btn" onClick={() => window.print()}>
              <Icon name="print" /> Print proposal
            </button>
          </div>
        </section>
      </div>

      <DefaultsTable />

      <PrintArea>
        <article className="paper letter">
          <header className="letter-head">
            <div>
              <div className="letter-co">{COMPANY.name}</div>
              <div>
                {COMPANY.street}, {COMPANY.cityStateZip}
              </div>
            </div>
            <div className="letter-co-contact">
              <div>{COMPANY.phone}</div>
              <div>{COMPANY.email}</div>
            </div>
          </header>
          <h2 style={{ marginBottom: 8 }}>Proposal – {JOBS[job].label}</h2>
          <p>
            {longDate(todayISO())}
            {customer && (
              <>
                <br />
                Prepared for {customerName(customer)}, {customer.billing.street}, {customer.billing.city}
              </>
            )}
          </p>
          <table className="letter-table" style={{ width: '100%' }}>
            <tbody>
              {items.map((i) => (
                <tr key={i.label}>
                  <td>
                    {i.label} ({i.detail})
                  </td>
                  <td>{money(i.amount)}</td>
                </tr>
              ))}
              <tr className="letter-total">
                <td>Total</td>
                <td>{money(total)}</td>
              </tr>
            </tbody>
          </table>
          <p className="tiny">Proposal valid until {longDate(addDays(todayISO(), 30))}. Material prices may change after that date.</p>
        </article>
      </PrintArea>
    </div>
  );
}

const DEFAULT_ROWS: { key: keyof PricingDefaults; label: string; unit: string; step: number }[] = [
  { key: 'laborRate', label: 'Labor rate', unit: 'per man-hour', step: 1 },
  { key: 'bedInstallPerLinearFt', label: 'Bed installation', unit: 'per linear foot', step: 0.5 },
  { key: 'bedMaterialCost', label: 'Bed installation materials', unit: 'per job', step: 5 },
  { key: 'mulchPerYard', label: 'Mulch', unit: 'per yard', step: 1 },
  { key: 'stonePerTon', label: 'Stone', unit: 'per ton', step: 1 },
  { key: 'weedBarrierPerSqFt', label: 'Weed barrier', unit: 'per sq ft', step: 0.05 },
  { key: 'prepayDiscountPct', label: 'Prepayment discount', unit: '% off season total', step: 0.5 },
];
const FEE_ROWS: { key: keyof Settings['lateFees']; label: string }[] = [
  { key: 'd30', label: 'Late fee at 30 days past due' },
  { key: 'd60', label: 'Late fee at 60 days past due' },
  { key: 'd90', label: 'Late fee at 90 days past due' },
];

function DefaultsTable() {
  const { data, update } = useStore();
  return (
    <section className="card" style={{ marginTop: 20 }} aria-labelledby="defaults-h">
      <div className="card-head">
        <h2 id="defaults-h">Settings: default prices</h2>
        <span className="small muted">Saved automatically. New proposals start from these.</span>
      </div>
      <div className="defaults-grid">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Unit</th>
              <th className="num">Default</th>
            </tr>
          </thead>
          <tbody>
            {DEFAULT_ROWS.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td className="muted">{r.unit}</td>
                <td className="num" style={{ width: 150 }}>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={r.step}
                    aria-label={`${r.label} ${r.unit}`}
                    value={data.settings.pricing[r.key]}
                    onChange={(e) => update((d) => (d.settings.pricing[r.key] = Number(e.target.value) || 0))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="table">
          <thead>
            <tr>
              <th>Late fees</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {FEE_ROWS.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td className="num" style={{ width: 150 }}>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1}
                    aria-label={r.label}
                    value={data.settings.lateFees[r.key]}
                    onChange={(e) => update((d) => (d.settings.lateFees[r.key] = Number(e.target.value) || 0))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
