// All fake demo data lives in this file. Names, addresses, phone numbers,
// chemical products and EPA numbers are invented. Every date is generated
// relative to the real current date, so "today", "this week" and "past due"
// always make sense whenever the demo is opened.
import type {
  AppData,
  AuditEntry,
  Customer,
  Employee,
  Invoice,
  Payment,
  PaymentMethod,
  Route,
  Settings,
  WorkOrder,
  WorkOrderStatus,
} from './types';
import { addDays, daysBetween, mondayOf, todayISO } from '../lib/format';

export const DATA_VERSION = 2;

export const COMPANY = {
  name: 'Billy Goat Lawn Care LLC',
  street: '418 Quarry Road',
  cityStateZip: 'Millbrook, OH 44190',
  phone: '(330) 555-0142',
  email: 'office@billygoatlawn.example',
  license: 'Commercial Applicator Business Lic. OH-CAB-77314',
};

export const LANDSCAPE_SUBSERVICES = [
  'Planting',
  'Bed installation',
  'Bed maintenance',
  'Shrub trimming',
  'Tree trimming',
  'Edging sidewalks and driveways',
  'Mulch work',
];

export const FERT_PROGRAM = 'Lawn fertilization program';

/** Type-of-work options, in the order the client listed them. */
export const SERVICE_TYPES = [
  'Lawn mowing',
  ...LANDSCAPE_SUBSERVICES.map((s) => `Landscape work – ${s}`),
  'Stone work',
  FERT_PROGRAM,
];

/** Fertilization applications, each with its (invented) product and EPA registration number. */
export const FERT_APPLICATIONS: { name: string; chemical: string; epa: string }[] = [
  { name: 'Crab grass preventer', chemical: 'BG Prodiamine Pre-Emergent 0.38G', epa: '81234-17' },
  { name: 'Weed control and fertilization', chemical: 'TurfMax 24-0-6 + Broadleaf Control', epa: '75012-203' },
  { name: 'Summer fertilizer', chemical: 'SummerGreen 18-0-4 Slow Release', epa: 'Exempt – fertilizer only' },
  { name: 'Summer fertilizer with insecticide', chemical: 'SummerGuard 18-0-4 + Bifenthrin 0.1%', epa: '68841-9' },
  { name: 'Grub control', chemical: 'GrubStop Chlorantraniliprole 0.067G', epa: '59639-271' },
  { name: 'Ant control', chemical: 'AntOut Granular Bait 0.2%', epa: '47000-155' },
  { name: 'Fungicides', chemical: 'TurfShield Propiconazole 14.3', epa: '53883-412' },
];

/** The five scheduled program rounds (ant control and fungicides are as-needed add-ons). */
export const FERT_ROUNDS = FERT_APPLICATIONS.slice(0, 5).map((a) => a.name);
/** Week offsets (from this week's Monday) when each program round went out. */
const ROUND_WEEK_OFFSETS = [-25, -19, -13, -7, 0];

export const DEFAULT_SETTINGS: Settings = {
  routePrefix: 'Route',
  optimizeWithMaps: false,
  pricing: {
    laborRate: 55,
    bedInstallPerLinearFt: 14,
    bedMaterialCost: 150,
    mulchPerYard: 48,
    stonePerTon: 72,
    weedBarrierPerSqFt: 0.35,
    prepayDiscountPct: 5,
  },
  lateFees: { d30: 10, d60: 25, d90: 50 },
};

const employees: Employee[] = [
  { id: 'e1', name: 'Marcus Whitfield', role: 'Owner / Lead Applicator', license: 'OH-PA-102938' },
  { id: 'e2', name: 'Rosa Delgado', role: 'Licensed Applicator', license: 'OH-PA-118274' },
  { id: 'e3', name: 'Dana Okafor', role: 'Crew Lead' },
  { id: 'e4', name: 'Tyler Brandt', role: 'Mowing Technician' },
  { id: 'e5', name: 'Jamie Lindqvist', role: 'Landscape Technician' },
];

const routeDefs: Omit<Route, 'stops'>[] = [
  { id: 'r1', number: 1, name: 'North Millbrook', weekday: 1 },
  { id: 'r2', number: 2, name: 'Harlow Springs', weekday: 2 },
  { id: 'r3', number: 3, name: 'Fernwood', weekday: 3 },
  { id: 'r4', number: 4, name: 'East Millbrook', weekday: 4 },
];

const CITY_BY_ROUTE: Record<string, { city: string; zip: string }> = {
  r1: { city: 'Millbrook', zip: '44190' },
  r2: { city: 'Harlow Springs', zip: '44192' },
  r3: { city: 'Fernwood', zip: '44195' },
  r4: { city: 'Millbrook', zip: '44191' },
};

const MOW = 'Lawn mowing';
const FERT = FERT_PROGRAM;
const LW = (s: string) => `Landscape work – ${s}`;

// [first, last, street, cross street, gate code, call first, sqft, route, type of work, active]
type Row = [string, string, string, string, string, boolean, number, string, string, boolean];
const customerRows: Row[] = [
  ['Evelyn', 'Abernathy', '112 Larkspur Ln', 'Larkspur & Hollow Rd', '', false, 8200, 'r1', FERT, true],
  ['Grant', 'Bellweather', '27 Orchard Hill Dr', 'Orchard Hill & Main St', '4417', false, 12400, 'r1', MOW, true],
  ['Priya', 'Castellano', '903 Juniper Ct', 'Juniper & Quarry Rd', '', true, 6100, 'r1', FERT, true],
  ['Walter', 'Dunmore', '45 Birchwood Ave', 'Birchwood & 3rd St', '', false, 9800, 'r1', MOW, true],
  ['Hannah', 'Eckhart', '1501 Millrace Rd', 'Millrace & Pine St', '0921', false, 15300, 'r1', LW('Bed maintenance'), true],
  ['Desmond', 'Fairchild', '78 Copper Kettle Way', 'Copper Kettle & Elm St', '', true, 7400, 'r1', FERT, true],
  ['Lucia', 'Greaves', '230 Thistle Row', 'Thistle & Hollow Rd', '', false, 5600, 'r1', MOW, true],
  ['Arthur', 'Abernathy', '118 Larkspur Ln', 'Larkspur & Hollow Rd', '', false, 7900, 'r1', MOW, true],
  ['Owen', 'Halvorsen', '14 Saddlebrook Ln', 'Saddlebrook & Route 9', '', false, 11200, 'r2', FERT, true],
  ['Marisol', 'Ibarra', '602 Kestrel Pl', 'Kestrel & Spring St', '7781', true, 8900, 'r2', MOW, true],
  ['Theodore', 'Jansen', '19 Wren Hollow Dr', 'Wren Hollow & Spring St', '', false, 13600, 'r2', LW('Shrub trimming'), true],
  ['Ada', 'Kowalczyk', '387 Pinecrest Blvd', 'Pinecrest & Lake Ave', '', false, 0, 'r2', FERT, true],
  ['Bennett', 'Lockridge', '55 Fox Run', 'Fox Run & Lake Ave', '2025', false, 10100, 'r2', MOW, true],
  ['Celeste', 'Marchetti', '1220 Brookstone Ct', 'Brookstone & Route 9', '', true, 4700, 'r2', 'Stone work', false],
  ['Evelyn', 'Ibarra', '610 Kestrel Pl', 'Kestrel & Spring St', '', false, 6300, 'r2', FERT, true],
  ['Isaac', 'Nakamura', '9 Heron Bay Rd', 'Heron Bay & Fern St', '', false, 9300, 'r3', FERT, true],
  ['Rhea', 'Olmsted', '410 Quillfeather Ln', 'Quillfeather & Fern St', '3390', false, 7700, 'r3', MOW, true],
  ['Silas', 'Pemberton', '61 Ashgrove Ter', 'Ashgrove & Mill Creek Rd', '', false, 14800, 'r3', LW('Mulch work'), true],
  ['Nora', 'Quintero', '275 Bramble Way', 'Bramble & Mill Creek Rd', '', true, 5900, 'r3', FERT, true],
  ['Felix', 'Rademacher', '840 Tanglewood Dr', 'Tanglewood & Oak St', '', false, 11900, 'r3', MOW, true],
  ['June', 'Sorensen', '33 Clover Gate Rd', 'Clover Gate & Oak St', '5512', false, 8400, 'r3', LW('Edging sidewalks and driveways'), false],
  ['Grant', 'Olmsted', '418 Quillfeather Ln', 'Quillfeather & Fern St', '', false, 10400, 'r3', FERT, true],
  ['Victor', 'Thornbury', '1702 Harrow Ln', 'Harrow & Bell Rd', '', false, 10600, 'r4', FERT, true],
  ['Imogen', 'Umbridge-Lee', '88 Ridgefield Ave', 'Ridgefield & Bell Rd', '', true, 7200, 'r4', MOW, true],
  ['Rafael', 'Valdivia', '516 Sycamore Bend', 'Sycamore & East Main St', '8804', false, 16200, 'r4', LW('Tree trimming'), true],
  ['Greta', 'Whitcomb', '67 Meadowlark Ct', 'Meadowlark & East Main St', '', false, 6500, 'r4', FERT, true],
  ['Malcolm', 'Yardley', '299 Cobblestone Dr', 'Cobblestone & Kiln Rd', '', false, 9100, 'r4', MOW, true],
  ['Zara', 'Zimmerman', '12 Wildflower Path', 'Wildflower & Kiln Rd', '6060', true, 12800, 'r4', LW('Planting'), true],
  ['Leon', 'Ashby', '730 Kiln Rd', 'Kiln Rd & Bell Rd', '', false, 0, 'r4', FERT, true],
  ['Mira', 'Banerjee', '41 Cobblestone Dr', 'Cobblestone & East Main St', '', false, 8800, 'r4', LW('Bed installation'), true],
];

/** Customers (by index) who are behind on payments. */
const DELINQUENT = new Set([3, 9, 16, 22, 26]);
/** Customers (by index) with a prepaid credit balance: index -> amount. */
const PREPAID: Record<number, number> = { 0: 240, 8: 400, 15: 180, 23: 350, 2: 120 };
/** Landscape / stone customers with a project scheduled this Friday. */
const FRIDAY_PROJECTS = new Set([4, 17, 24, 29]);

// Small deterministic PRNG so the seed looks the same after every reset.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Typical per-visit price for a service on a lawn of the given size. */
export function priceFor(service: string, sqft: number): number {
  const k = sqft / 1000;
  if (service === MOW) return Math.round(30 + k * 3.25);
  if (service === FERT) return Math.round(40 + k * 4.5);
  if (service === 'Stone work') return 850;
  if (service.endsWith('Mulch work')) return Math.round(180 + k * 9);
  if (service.endsWith('Tree trimming')) return 425;
  if (service.endsWith('Bed installation')) return 1200;
  if (service.endsWith('Planting')) return 560;
  return Math.round(90 + k * 6);
}

/** Expected visits per season, used for prepayment letters. */
export function visitsPerSeason(service: string): number {
  if (service === MOW) return 26;
  if (service === FERT) return 5;
  if (service.endsWith('Bed maintenance')) return 6;
  if (service.endsWith('Shrub trimming') || service.endsWith('Edging sidewalks and driveways')) return 3;
  return 1;
}

function manHoursFor(service: string, sqft: number, rand: () => number): number {
  const k = sqft / 1000;
  let h: number;
  if (service === MOW) h = 0.4 + k * 0.05;
  else if (service === FERT) h = 0.25 + k * 0.03;
  else if (service === 'Stone work') h = 12;
  else if (service.endsWith('Bed installation')) h = 16;
  else h = 2 + rand() * 4;
  return Math.round(h * 4) / 4;
}

function employeeFor(service: string, rand: () => number): string {
  if (service === FERT) return rand() < 0.5 ? 'e1' : 'e2';
  if (service === MOW) return rand() < 0.6 ? 'e4' : 'e3';
  return rand() < 0.6 ? 'e5' : 'e3';
}

export function buildSeed(): AppData {
  const rand = mulberry32(20261008);
  const today = todayISO();
  const monday = mondayOf(today);
  const createdAt = addDays(monday, -26 * 7);

  const customers: Customer[] = customerRows.map((r, i) => {
    const [firstName, lastName, street, crossStreet, gateCode, callFirst, sqft, routeId, serviceType, active] = r;
    const { city, zip } = CITY_BY_ROUTE[routeId];
    const billing = { street, city, state: 'OH', zip };
    return {
      id: `c${i + 1}`,
      number: `C-${String(i + 1).padStart(5, '0')}`,
      firstName,
      lastName,
      phone: `(330) 555-${String(1000 + Math.floor(rand() * 8999)).padStart(4, '0')}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
      billing,
      shipSameAsBilling: true,
      shipTo: { ...billing },
      sqft,
      routeId,
      crossStreet,
      gateCode,
      callFirst,
      active,
      prepayBalance: PREPAID[i] ?? 0,
      serviceType,
      notes: callFirst ? 'Call 30 minutes before arrival.' : '',
      createdAt,
    };
  });

  const routes: Route[] = routeDefs.map((r) => ({
    ...r,
    stops: customers.filter((c) => c.routeId === r.id).map((c) => c.id),
  }));
  const routeDay = (c: Customer) => routes.find((r) => r.id === c.routeId)!.weekday;

  type Draft = Omit<WorkOrder, 'id' | 'number'>;
  const drafts: Draft[] = [];
  const mk = (c: Customer, date: string, status: WorkOrderStatus, application?: string): Draft => {
    const app = application ? FERT_APPLICATIONS.find((a) => a.name === application) : undefined;
    return {
      customerId: c.id,
      date,
      completedDate: status === 'Completed' ? date : undefined,
      service: c.serviceType,
      application,
      employeeId: employeeFor(c.serviceType, rand),
      manHours: manHoursFor(c.serviceType, c.sqft, rand),
      price: priceFor(c.serviceType, c.sqft),
      status,
      chemical: app?.chemical ?? '',
      epaReg: app?.epa ?? '',
      notes: '',
    };
  };

  /** Status for a job on `date` this week: past days are done, today is in progress. */
  const statusFor = (date: string, idxInDay: number): WorkOrderStatus => {
    if (date < today) return rand() < 0.06 ? 'Missed' : 'Completed';
    if (date > today) return 'Scheduled';
    return idxInDay < 3 ? 'Completed' : idxInDay === 3 ? 'In progress' : 'Scheduled';
  };

  const dayCounters: Record<string, number> = {};
  const nextIdx = (date: string) => (dayCounters[date] = (dayCounters[date] ?? -1) + 1);

  // Walk each route in stop order so "today" completes in driving order.
  routes.forEach((route) => {
    route.stops.forEach((id) => {
      const c = customers.find((x) => x.id === id)!;
      const wd = routeDay(c) - 1; // offset from Monday
      const stopsAfter = !c.active ? -9 : 0; // inactive customers stopped ~2 months ago
      if (c.serviceType === MOW) {
        for (let w = -9; w < stopsAfter; w++) drafts.push(mk(c, addDays(monday, w * 7 + wd), 'Completed'));
        if (c.active) {
          const d = addDays(monday, wd);
          drafts.push(mk(c, d, statusFor(d, nextIdx(d))));
        }
      } else if (c.serviceType === FERT) {
        ROUND_WEEK_OFFSETS.forEach((w, ri) => {
          const d = addDays(monday, w * 7 + wd);
          if (w < 0) drafts.push(mk(c, d, 'Completed', FERT_ROUNDS[ri]));
          else if (c.active) drafts.push(mk(c, d, statusFor(d, nextIdx(d)), FERT_ROUNDS[ri]));
        });
        // As-needed add-ons for a few lawns.
        if (rand() < 0.4) {
          const extra = rand() < 0.5 ? 'Ant control' : 'Fungicides';
          drafts.push(mk(c, addDays(monday, -10 * 7 + wd), 'Completed', extra));
        }
      } else {
        for (const w of [-16, -8, -3]) {
          if (!c.active && w > -9) continue;
          drafts.push(mk(c, addDays(monday, w * 7 + wd), 'Completed'));
        }
      }
    });
  });

  // Friday is the landscape / stone project day.
  customers.forEach((c, i) => {
    if (!FRIDAY_PROJECTS.has(i)) return;
    const d = addDays(monday, 4);
    drafts.push(mk(c, d, statusFor(d, nextIdx(d))));
  });

  drafts.sort((a, b) => a.date.localeCompare(b.date) || a.customerId.localeCompare(b.customerId, undefined, { numeric: true }));
  const workOrders: WorkOrder[] = drafts.map((d, i) => ({ ...d, id: `wo${i + 1}`, number: `WO-${10001 + i}` }));

  // Invoices + payments for every completed work order.
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const cardTypes = ['Visa', 'Mastercard', 'American Express', 'Discover'];
  let checkNo = 1041;
  let payN = 1;

  workOrders
    .filter((w) => w.status === 'Completed')
    .forEach((w, i) => {
      const custIdx = Number(w.customerId.slice(1)) - 1;
      const inv: Invoice = {
        id: `inv${i + 1}`,
        number: `INV-${20001 + i}`,
        customerId: w.customerId,
        workOrderId: w.id,
        date: w.date,
        description: w.application ? `Fertilization – ${w.application}` : w.service,
        amount: w.price,
        amountPaid: 0,
        lateFee: 0,
      };
      invoices.push(inv);
      const age = daysBetween(w.date, today);
      const unpaid = DELINQUENT.has(custIdx) ? age >= 20 || rand() < 0.5 : age <= 10 ? rand() < 0.3 : rand() < 0.03;
      if (unpaid) return;
      const roll = rand();
      const method: PaymentMethod = roll < 0.4 ? 'Check' : roll < 0.8 ? 'Credit card' : roll < 0.92 ? 'ACH' : 'Cash';
      inv.amountPaid = inv.amount;
      payments.push({
        id: `p${payN++}`,
        customerId: w.customerId,
        invoiceId: inv.id,
        date: addDays(w.date, Math.min(age, 2 + Math.floor(rand() * 10))),
        kind: 'Payment',
        method,
        reference: method === 'Check' ? `#${checkNo++}` : method === 'Credit card' ? cardTypes[Math.floor(rand() * 4)] : '',
        amount: inv.amount,
        reversed: false,
        note: '',
      });
    });

  Object.entries(PREPAID).forEach(([idx, amt]) => {
    const c = customers[Number(idx)];
    payments.push({
      id: `p${payN++}`,
      customerId: c.id,
      date: addDays(today, -21),
      kind: 'Prepayment',
      method: 'Check',
      reference: `#${checkNo++}`,
      amount: amt,
      reversed: false,
      note: 'Prepayment on account',
    });
  });
  payments.sort((a, b) => a.date.localeCompare(b.date));

  const audit: AuditEntry[] = [
    { id: 'a1', ts: new Date(Date.parse(addDays(today, -40)) + 14 * 3600_000).toISOString(), action: 'Data imported', detail: 'Customers migrated from legacy Windows 95 system (30 rows).' },
    { id: 'a2', ts: new Date(Date.parse(addDays(today, -21)) + 15 * 3600_000).toISOString(), action: 'Prepayments posted', detail: 'Season prepayments recorded for 5 accounts.' },
  ];

  return {
    version: DATA_VERSION,
    anchorMonday: monday,
    employees,
    routes,
    customers,
    workOrders,
    invoices,
    payments,
    audit,
    settings: structuredClone(DEFAULT_SETTINGS),
    lastBackup: new Date(Date.parse(addDays(today, -9)) + 17 * 3600_000).toISOString(),
  };
}
