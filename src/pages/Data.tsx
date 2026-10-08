import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { isValidData, routeLabel, useStore } from '../data/store';
import { DATA_VERSION, FERT_PROGRAM } from '../data/seed';
import type { AppData, Customer } from '../data/types';
import { EmptyState, Icon, Modal, useToast } from '../components/ui';
import { downloadText, parseCsv, toCsv } from '../lib/files';
import { fmtTimestamp, num, todayISO } from '../lib/format';

const BACKUP_APP = 'billy-goat-lawn-care';

/* ---------- CSV migration ---------- */
interface ImportRow {
  line: number;
  raw: Record<string, string>;
  fields: Partial<Customer>;
  service: string;
  errors: string[];
  warnings: string[];
}

const TEMPLATE = toCsv([
  ['first_name', 'last_name', 'street', 'city', 'state', 'zip', 'email', 'phone', 'services'],
  ['Doris', 'Pruitt', '45 Elm St', 'Millbrook', 'OH', '44190', 'doris.pruitt@example.com', '(330) 555-2201', 'Lawn mowing'],
]);

// Looks like a typical export from the old Windows 95 program, with a few problems on purpose.
const SAMPLE = toCsv([
  ['NAME', 'ADDRESS', 'EMAIL', 'PHONE', 'SERVICES'],
  ['Pruitt, Doris', '45 Elm St, Millbrook, OH 44190', 'doris.pruitt@example.com', '330-555-2201', 'Mowing'],
  ['Sanderson, Carl', '1180 Bell Rd, Millbrook, OH 44191', 'carl.s@example.com', '(330) 555-3398', 'Fertilization; Mowing'],
  ['Tran, Mai', '77 Spring St, Harlow Springs, OH 44192', 'mai.tran@example', '330-555-7710', 'Mulch'],
  ['Oyelaran, Femi', '9 Oak St, Fernwood, OH 44195', '', '330-555-41', 'Shrub trimming'],
  ['', '', 'nobody@example.com', '', 'Mowing'],
  ['Abernathy, Evelyn', '112 Larkspur Ln, Millbrook, OH 44190', 'evelyn@example.com', '330-555-1000', 'Fertilization'],
  ['Hollis, Ray', '300 Kiln Rd, Millbrook, OH 44191', 'ray.hollis@example.com', '3305559012', 'Snow plowing'],
  ['Quist, Elena', '18 Heron Bay Rd, Fernwood, OH 44195', 'elena.quist@example.com', '330-555-6620', 'Stone work'],
]);

function mapService(s: string): string | null {
  const v = s.toLowerCase();
  if (v.includes('fert')) return FERT_PROGRAM;
  if (v.includes('mow')) return 'Lawn mowing';
  if (v.includes('stone')) return 'Stone work';
  if (v.includes('mulch')) return 'Landscape work – Mulch work';
  if (v.includes('edg')) return 'Landscape work – Edging sidewalks and driveways';
  if (v.includes('shrub')) return 'Landscape work – Shrub trimming';
  if (v.includes('tree')) return 'Landscape work – Tree trimming';
  if (v.includes('plant')) return 'Landscape work – Planting';
  if (v.includes('install')) return 'Landscape work – Bed installation';
  if (v.includes('bed')) return 'Landscape work – Bed maintenance';
  return null;
}

function analyze(text: string, existing: Customer[]): { rows: ImportRow[]; error?: string } {
  const grid = parseCsv(text);
  if (grid.length < 2) return { rows: [], error: 'The file has no data rows.' };
  const headers = grid[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  const pick = (r: Record<string, string>, ...keys: string[]) => keys.map((k) => r[k]).find((v) => v && v.trim())?.trim() ?? '';
  const known = ['name', 'fullname', 'firstname', 'first', 'lastname', 'last', 'address', 'street', 'streetaddress', 'email'];
  if (!headers.some((h) => known.includes(h))) {
    return { rows: [], error: 'Could not find name or address columns. Use the template, or columns named name, address, email, phone, services.' };
  }
  const seen = new Set<string>();
  const rows = grid.slice(1).map((cells, i) => {
    const raw: Record<string, string> = {};
    headers.forEach((h, j) => (raw[h] = cells[j] ?? ''));
    const errors: string[] = [];
    const warnings: string[] = [];

    let firstName = pick(raw, 'firstname', 'first');
    let lastName = pick(raw, 'lastname', 'last');
    const full = pick(raw, 'name', 'fullname');
    if (!firstName && !lastName && full) {
      if (full.includes(',')) [lastName, firstName] = full.split(',').map((s) => s.trim());
      else {
        const parts = full.split(/\s+/);
        lastName = parts.pop() ?? '';
        firstName = parts.join(' ');
      }
    }
    let street = pick(raw, 'street', 'streetaddress');
    let city = pick(raw, 'city');
    let state = pick(raw, 'state') || 'OH';
    let zip = pick(raw, 'zip', 'zipcode', 'postalcode');
    const address = pick(raw, 'address');
    if (!street && address) {
      const parts = address.split(',').map((s) => s.trim());
      street = parts[0] ?? '';
      city = parts[1] ?? city;
      const m = (parts[2] ?? '').match(/([A-Za-z]{2})\s*(\d{5})?/);
      if (m) {
        state = m[1].toUpperCase();
        zip = m[2] ?? zip;
      }
    }
    const email = pick(raw, 'email', 'emailaddress');
    const phoneRaw = pick(raw, 'phone', 'phonenumber', 'telephone');
    const digits = phoneRaw.replace(/\D/g, '');
    const phone = digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : phoneRaw;
    const servicesRaw = pick(raw, 'services', 'service', 'typeofwork');

    if (!firstName && !lastName) errors.push('Missing name');
    else if (!firstName || !lastName) warnings.push('Only one name given');
    if (!street) errors.push('Missing street address');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Email "${email}" is not valid`);
    if (phoneRaw && digits.length !== 10) warnings.push(`Phone "${phoneRaw}" is not 10 digits; kept as typed`);
    if (!email) warnings.push('No email (needed for emailed letters)');

    const svcParts = servicesRaw.split(/[;/|]/).map((s) => s.trim()).filter(Boolean);
    const mapped = svcParts.map(mapService).filter((s): s is string => !!s);
    let service = mapped[0] ?? 'Lawn mowing';
    if (!svcParts.length) warnings.push('No service listed; set to Lawn mowing');
    else if (!mapped.length) warnings.push(`Unknown service "${servicesRaw}"; set to Lawn mowing`);
    else if (svcParts.length > 1) {
      // Fertilization is the program customers sign up for; keep it when listed.
      if (mapped.includes(FERT_PROGRAM)) service = FERT_PROGRAM;
      warnings.push(`Several services listed; kept "${service.replace('Landscape work – ', '')}"`);
    }

    const key = `${lastName.toLowerCase()}|${street.toLowerCase()}`;
    const dupe = existing.find((c) => c.lastName.toLowerCase() === lastName.toLowerCase() && c.billing.street.toLowerCase() === street.toLowerCase());
    if (street && lastName && dupe) errors.push(`Already in the system as ${dupe.number}`);
    else if (street && lastName && seen.has(key)) errors.push('Duplicate row in this file');
    seen.add(key);

    const billing = { street, city, state, zip };
    return {
      line: i + 2,
      raw,
      service,
      errors,
      warnings,
      fields: { firstName, lastName, email, phone, billing, shipTo: { ...billing }, shipSameAsBilling: true, serviceType: service },
    };
  });
  return { rows };
}

export default function DataPage() {
  const store = useStore();
  const { data, markBackedUp, restore, reset, addCustomer, logEvent } = store;
  const [toast, showToast] = useToast();
  const [pendingRestore, setPendingRestore] = useState<{ data: AppData; exportedAt?: string; name: string } | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importName, setImportName] = useState('');
  const [importError, setImportError] = useState('');
  const [importRoute, setImportRoute] = useState(data.routes[0]?.id ?? '');
  const restoreInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);

  const daysSince = data.lastBackup ? Math.floor((Date.now() - Date.parse(data.lastBackup)) / 86_400_000) : null;
  const overdue = daysSince === null || daysSince > 7;
  const json = JSON.stringify(data);

  const backup = () => {
    const payload = { app: BACKUP_APP, exportedAt: new Date().toISOString(), data: { ...data, lastBackup: new Date().toISOString() } };
    downloadText(`billygoat-backup-${todayISO()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    markBackedUp();
    showToast('Backup downloaded. Copy the file to your external hard drive.');
  };

  const onRestoreFile = async (file: File) => {
    setRestoreError('');
    try {
      const parsed = JSON.parse(await file.text());
      const candidate = parsed?.app === BACKUP_APP ? parsed.data : parsed;
      if (!isValidData(candidate)) throw new Error('This file is not a Billy Goat Lawn Care backup.');
      if (candidate.version !== DATA_VERSION) throw new Error(`This backup is from a different version of the app (v${candidate.version}).`);
      setPendingRestore({ data: candidate, exportedAt: parsed?.exportedAt, name: file.name });
    } catch (e) {
      setRestoreError(e instanceof SyntaxError ? 'The file could not be read. Is it a .json backup?' : (e as Error).message);
    }
  };

  const onCsvFile = (text: string, name: string) => {
    setImportName(name);
    const res = analyze(text, data.customers);
    setImportError(res.error ?? '');
    setImportRows(res.error ? null : res.rows);
  };

  const valid = importRows?.filter((r) => r.errors.length === 0) ?? [];
  const doImport = () => {
    valid.forEach((r) => addCustomer({ ...r.fields, routeId: importRoute }));
    logEvent('Data imported', `${valid.length} customers migrated from ${importName}`);
    showToast(`Imported ${valid.length} customers. They were numbered after the highest existing customer number.`);
    setImportRows(null);
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Backup &amp; migration</div>
          <h1>Data</h1>
        </div>
      </header>

      {overdue && (
        <div className="banner" role="alert">
          <Icon name="warn" />
          <div>
            <strong>{daysSince === null ? 'No backup on record.' : `Last backup was ${daysSince} days ago.`}</strong> Back up at least once a week to
            your external hard drive.
          </div>
          <button className="btn btn-primary" onClick={backup}>
            Back up now
          </button>
        </div>
      )}

      <div className="data-grid">
        <section className="card card-pad stack" aria-labelledby="backup-h">
          <h2 id="backup-h">Backup &amp; restore</h2>
          <dl className="kv">
            <dt>Last backed up</dt>
            <dd className={overdue ? 'danger-text' : 'success-text'}>{data.lastBackup ? fmtTimestamp(data.lastBackup) : 'Never'}</dd>
          </dl>
          <p className="small muted" style={{ margin: 0 }}>
            The backup is one file that holds everything: customers, routes, work orders, invoices, payments, settings and the audit log.
          </p>
          <button className="btn btn-primary" onClick={backup}>
            <Icon name="download" /> Download full backup (.json)
          </button>
          <hr className="rule" />
          <div>
            <h3>Restore from a backup</h3>
            <p className="small muted" style={{ margin: '4px 0 10px' }}>
              Replaces all current data with the backup. You'll be asked to confirm first.
            </p>
            <input
              ref={restoreInput}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              id="restore-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onRestoreFile(f);
                e.target.value = '';
              }}
            />
            <button className="btn" onClick={() => restoreInput.current?.click()}>
              <Icon name="upload" /> Choose backup file…
            </button>
            {restoreError && (
              <div className="warn-box" role="alert">
                <Icon name="warn" />
                {restoreError}
              </div>
            )}
          </div>
        </section>

        <section className="card card-pad stack" aria-labelledby="portable-h">
          <h2 id="portable-h">Moving to another laptop</h2>
          <p style={{ margin: 0 }}>
            The finished app will store everything in <strong>one portable database file</strong> (for example <code>billygoat.db</code>). To
            move the system, copy that file to the new laptop or an external drive. There is no product license, activation key or code
            needed.
          </p>
          <p className="small muted" style={{ margin: 0 }}>
            This demo keeps its data in your web browser instead, so use the backup file above to move it.
          </p>
          <dl className="kv">
            <dt>Customers</dt>
            <dd>{num(data.customers.length)}</dd>
            <dt>Work orders</dt>
            <dd>{num(data.workOrders.length)}</dd>
            <dt>Invoices</dt>
            <dd>{num(data.invoices.length)}</dd>
            <dt>Payments</dt>
            <dd>{num(data.payments.length)}</dd>
            <dt>Audit log entries</dt>
            <dd>{num(data.audit.length)}</dd>
            <dt>Data size</dt>
            <dd>{(json.length / 1024).toFixed(0)} KB</dd>
          </dl>
          <button className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={() => setResetOpen(true)}>
            Reset demo data
          </button>
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }} aria-labelledby="migrate-h">
        <div className="card-head">
          <div>
            <h2 id="migrate-h">Migrate from old system</h2>
            <div className="small muted">Import customers from a CSV export: name, address, email, phone, services.</div>
          </div>
          <div className="actions">
            <button className="btn btn-sm" onClick={() => downloadText('customer-import-template.csv', TEMPLATE, 'text/csv')}>
              <Icon name="download" /> CSV template
            </button>
            <button className="btn btn-sm" onClick={() => onCsvFile(SAMPLE, 'old-system-export-sample.csv')}>
              Load sample export
            </button>
            <input
              ref={csvInput}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              id="csv-file"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) onCsvFile(await f.text(), f.name);
                e.target.value = '';
              }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => csvInput.current?.click()}>
              <Icon name="upload" /> Choose CSV file…
            </button>
          </div>
        </div>

        {importError && (
          <div className="card-pad">
            <div className="warn-box" role="alert" style={{ marginTop: 0 }}>
              <Icon name="warn" />
              {importError}
            </div>
          </div>
        )}

        {!importRows ? (
          !importError && (
            <EmptyState title="No file loaded">
              Choose a CSV file, or click “Load sample export” to see how row checking works.
            </EmptyState>
          )
        ) : importRows.length === 0 ? (
          <EmptyState title="The file has no rows" />
        ) : (
          <>
            <div className="import-summary">
              <span>
                <strong>{importName}</strong> · {importRows.length} rows
              </span>
              <span className="pill pill-completed">{valid.length} ready</span>
              <span className="pill pill-in-progress">{importRows.filter((r) => !r.errors.length && r.warnings.length).length} with warnings</span>
              <span className="pill pill-danger">{importRows.filter((r) => r.errors.length).length} will be skipped</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Line</th>
                    <th>Status</th>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Type of work</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((r) => (
                    <tr key={r.line}>
                      <td className="muted">{r.line}</td>
                      <td>
                        {r.errors.length ? (
                          <span className="pill pill-danger">Error</span>
                        ) : r.warnings.length ? (
                          <span className="pill pill-in-progress">Warning</span>
                        ) : (
                          <span className="pill pill-completed">Ready</span>
                        )}
                      </td>
                      <td>
                        {r.fields.lastName || r.fields.firstName ? `${r.fields.lastName}, ${r.fields.firstName}` : <span className="muted">—</span>}
                      </td>
                      <td>
                        {r.fields.billing?.street || <span className="muted">—</span>}
                        {r.fields.billing?.city && <div className="tiny muted">{`${r.fields.billing.city}, ${r.fields.billing.state} ${r.fields.billing.zip}`}</div>}
                      </td>
                      <td>{r.fields.email || <span className="muted">—</span>}</td>
                      <td className="nowrap">{r.fields.phone || <span className="muted">—</span>}</td>
                      <td>{r.service.replace('Landscape work – ', '')}</td>
                      <td className="tiny">
                        {r.errors.map((e) => (
                          <div key={e} className="danger-text">
                            ✕ {e}
                          </div>
                        ))}
                        {r.warnings.map((w) => (
                          <div key={w} style={{ color: 'var(--amber-text)' }}>
                            ! {w}
                          </div>
                        ))}
                        {!r.errors.length && !r.warnings.length && <span className="success-text">✓ Ready</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-foot import-foot">
              <label className="field" style={{ minWidth: 300 }}>
                <span>Put imported customers on</span>
                <select className="select" value={importRoute} onChange={(e) => setImportRoute(e.target.value)}>
                  {data.routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {routeLabel(r, data.settings)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="actions">
                <button className="btn" onClick={() => setImportRows(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" disabled={valid.length === 0} onClick={doImport}>
                  Import {valid.length} customer{valid.length === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {pendingRestore && (
        <Modal title="Restore this backup?" onClose={() => setPendingRestore(null)}>
          <p style={{ marginTop: 0 }}>
            <strong>{pendingRestore.name}</strong>
            {pendingRestore.exportedAt && <> was made on {fmtTimestamp(pendingRestore.exportedAt)}</>}. It contains:
          </p>
          <dl className="kv">
            <dt>Customers</dt>
            <dd>{pendingRestore.data.customers.length}</dd>
            <dt>Work orders</dt>
            <dd>{pendingRestore.data.workOrders.length}</dd>
            <dt>Payments</dt>
            <dd>{pendingRestore.data.payments.length}</dd>
          </dl>
          <div className="warn-box" role="alert">
            <Icon name="warn" />
            Everything currently in the system will be replaced. Download a backup first if you might need today's data.
          </div>
          <div className="actions">
            <button className="btn" onClick={() => setPendingRestore(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                restore(pendingRestore.data);
                setPendingRestore(null);
                showToast('Backup restored.');
              }}
            >
              Replace data and restore
            </button>
          </div>
        </Modal>
      )}

      {resetOpen && (
        <Modal title="Reset demo data?" onClose={() => setResetOpen(false)}>
          <p style={{ marginTop: 0 }}>
            This puts back the original sample customers, work orders and payments and erases every change made in this browser.
          </p>
          <div className="actions">
            <button className="btn" onClick={() => setResetOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                reset();
                setResetOpen(false);
                showToast('Demo data reset.');
              }}
            >
              Reset
            </button>
          </div>
        </Modal>
      )}
      <p className="tiny muted" style={{ marginTop: 20 }}>
        Looking for something else? <Link to="/">Back to the start menu</Link>.
      </p>
      {toast}
    </div>
  );
}
