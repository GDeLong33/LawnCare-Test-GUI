import { useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { COMPANY, FERT_PROGRAM } from '../data/seed';
import { customerName, invoiceBalance, routeLabel, useStore } from '../data/store';
import type { AppData, WorkOrder } from '../data/types';
import { PrintArea } from './ui';
import { daysBetween, fmtDate, fmtTimestamp, money, num, todayISO } from '../lib/format';

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="wo-line">
      <span className="wo-label">{label}</span>
      <span className="wo-value">{children || <span className="wo-blank" />}</span>
    </div>
  );
}

/** The printable work order. `printedAt` is the timestamp shown in the header. */
export default function WorkOrderSheet({ data, wo, printedAt }: { data: AppData; wo: WorkOrder; printedAt?: string }) {
  const c = data.customers.find((x) => x.id === wo.customerId);
  const emp = data.employees.find((e) => e.id === wo.employeeId);
  const route = data.routes.find((r) => r.id === c?.routeId);
  const stopNo = route ? route.stops.indexOf(wo.customerId) + 1 : 0;
  const today = todayISO();
  const pastDueInvoices = data.invoices.filter(
    (i) => i.customerId === wo.customerId && invoiceBalance(i) > 0.005 && daysBetween(i.date, today) > 30,
  );
  const pastDue = pastDueInvoices.reduce((s, i) => s + invoiceBalance(i), 0);
  const oldest = pastDueInvoices.reduce((m, i) => Math.max(m, daysBetween(i.date, today)), 0);
  const fees = data.settings.lateFees;
  const tiers: { days: 30 | 60 | 90; fee: number }[] = [
    { days: 30, fee: fees.d30 },
    { days: 60, fee: fees.d60 },
    { days: 90, fee: fees.d90 },
  ];
  const previous = data.workOrders
    .filter((w) => w.customerId === wo.customerId && w.id !== wo.id && w.status === 'Completed' && w.date <= wo.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const empName = (id: string) => data.employees.find((e) => e.id === id)?.name ?? '';
  const isFert = wo.service === FERT_PROGRAM;
  const addr = c ? (c.shipSameAsBilling ? c.billing : c.shipTo) : undefined;

  return (
    <article className="paper wo-sheet">
      <header className="wo-head">
        <div>
          <div className="letter-co">{COMPANY.name}</div>
          <div>
            {COMPANY.street} · {COMPANY.cityStateZip} · {COMPANY.phone}
          </div>
          <div className="tiny">{COMPANY.license}</div>
        </div>
        <div className="wo-head-right">
          <div className="wo-title">WORK ORDER</div>
          <div className="wo-number">{wo.number}</div>
          <div className="tiny">Printed: {printedAt ? fmtTimestamp(printedAt) : '— not yet printed —'}</div>
        </div>
      </header>

      <div className="wo-cols">
        <section>
          <h3 className="wo-h">Customer</h3>
          <Line label="Name">{customerName(c)}</Line>
          <Line label="Account">{c?.number}</Line>
          <Line label="Service address">{addr ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}` : ''}</Line>
          <Line label="Phone">{c?.phone}</Line>
          <Line label="Route / stop">{route ? `${routeLabel(route, data.settings)} · stop ${stopNo}` : ''}</Line>
          <Line label="Lawn size">{c?.sqft ? `${num(c.sqft)} sq ft` : 'NOT MEASURED – measure on site'}</Line>
        </section>
        <section>
          <h3 className="wo-h">Job notes</h3>
          <Line label="Cross street">{c?.crossStreet}</Line>
          <Line label="Gate code">{c?.gateCode || 'None'}</Line>
          <Line label="Call first">{c?.callFirst ? 'YES – call before arriving' : 'No'}</Line>
          <Line label="Notes">{[c?.notes, wo.notes].filter(Boolean).join(' ')}</Line>
        </section>
      </div>

      <section>
        <h3 className="wo-h">Service</h3>
        <div className="wo-cols">
          <div>
            <Line label="Scheduled">{fmtDate(wo.date)}</Line>
            <Line label="Service">{wo.service}</Line>
            {isFert && <Line label="Application">{wo.application}</Line>}
            <Line label="Chemical name">{wo.chemical}</Line>
            <Line label="EPA Reg. No.">{wo.epaReg}</Line>
          </div>
          <div>
            <Line label="Date completed">{fmtDate(wo.completedDate)}</Line>
            <Line label="Applicator">{emp ? `${emp.name}${emp.license ? ` (Lic. ${emp.license})` : ''}` : ''}</Line>
            <Line label="Man-hours">{wo.manHours ? String(wo.manHours) : ''}</Line>
            <Line label="Price this job">{money(wo.price)}</Line>
            <Line label="Late fee option">{wo.lateFeeTier ? `${wo.lateFeeTier} days past due` : 'None'}</Line>
          </div>
        </div>
      </section>

      <div className="wo-cols">
        <section>
          <h3 className="wo-h">Late fees</h3>
          <table className="wo-table">
            <thead>
              <tr>
                <th>Days past due</th>
                <th>Late fee</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.days} className={wo.lateFeeTier === t.days ? 'wo-hl' : ''}>
                  <td>{t.days}+ days</td>
                  <td>{money(t.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="tiny" style={{ margin: '6px 0 0' }}>
            Account past due: {pastDue > 0 ? `${money(pastDue)} (oldest ${oldest} days)` : 'none'}
          </p>
        </section>
        <section>
          <h3 className="wo-h">Previous applications</h3>
          {previous.length === 0 ? (
            <p className="tiny">None on record.</p>
          ) : (
            <table className="wo-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Service</th>
                  <th>Applicator</th>
                </tr>
              </thead>
              <tbody>
                {previous.map((w) => (
                  <tr key={w.id}>
                    <td>{fmtDate(w.completedDate ?? w.date)}</td>
                    <td>{w.application ?? w.service.replace('Landscape work – ', '')}</td>
                    <td>{empName(w.employeeId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <footer className="wo-sign">
        <div>Applicator signature</div>
        <div>Customer signature (optional)</div>
      </footer>
    </article>
  );
}

/**
 * Print one or more work orders. Returns a print-only portal to render and a
 * function that stamps `lastPrinted` on each order and opens the print dialog.
 */
export function usePrintWorkOrders(): [ReactNode, (ids: string[]) => void] {
  const { data, update } = useStore();
  const [job, setJob] = useState<{ ids: string[]; at: string } | null>(null);
  const print = (ids: string[]) => {
    if (!ids.length) return;
    const at = new Date().toISOString();
    flushSync(() => setJob({ ids, at }));
    window.print();
    update((d) => d.workOrders.forEach((w) => ids.includes(w.id) && (w.lastPrinted = at)));
  };
  const node = job ? (
    <PrintArea>
      {job.ids.map((id, i) => {
        const wo = data.workOrders.find((w) => w.id === id);
        return wo ? (
          <div key={id} className={i < job.ids.length - 1 ? 'page-break' : ''}>
            <WorkOrderSheet data={data} wo={wo} printedAt={job.at} />
          </div>
        ) : null;
      })}
    </PrintArea>
  ) : null;
  return [node, print];
}
