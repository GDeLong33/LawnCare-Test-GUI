// All fake demo data lives in this file. Names, addresses, phone numbers,
// chemicals and EPA numbers are invented. Dates are generated relative to the
// day the demo is first loaded so "today's route" and "past due" always make sense.
import type {
  AppData,
  Customer,
  Employee,
  Invoice,
  Payment,
  PaymentMethod,
  Route,
  WorkOrder,
  WorkOrderStatus,
} from './types';
import { addDays, todayISO } from '../lib/format';

export const DATA_VERSION = 1;

export const COMPANY = {
  name: 'Billy Goat Lawn Care LLC',
  street: '418 Quarry Road',
  cityStateZip: 'Millbrook, OH 44190',
  phone: '(330) 555-0142',
  email: 'office@billygoatlawn.example',
  applicatorBusinessLicense: 'OH-CPA-77314',
};

export const LANDSCAPE_SUBSERVICES = [
  'Planting',
  'Bed Installation',
  'Bed Maintenance',
  'Shrub Trimming',
  'Tree Trimming',
  'Edging',
  'Mulch Work',
];

export const SERVICE_TYPES = [
  'Lawn Mowing',
  ...LANDSCAPE_SUBSERVICES.map((s) => `Landscape Work > ${s}`),
  'Stone Work',
  'Lawn Fertilization Program',
];

/** Fake products used on fertilization work orders. */
export const CHEMICALS = [
  { name: 'GreenGuard Pre-Emergent 0.38G', epa: '81234-17' },
  { name: 'TurfMax 24-0-6 w/ Broadleaf Control', epa: '75012-203' },
  { name: 'BillyBlend Summer Grub Shield', epa: '68841-9' },
  { name: 'FallFeed Winterizer 32-0-10', epa: 'Exempt (fertilizer only)' },
];

export const LATE_FEE_SCHEDULE = [
  { days: 30, fee: '$10.00 late fee + 1.5% monthly finance charge' },
  { days: 60, fee: '$25.00 late fee; service paused until balance paid' },
  { days: 90, fee: 'Account referred to collections; $50.00 admin fee' },
];

const employees: Employee[] = [
  { id: 'e1', name: 'Marcus Whitfield', role: 'Owner / Lead Applicator', license: 'OH-PA-102938' },
  { id: 'e2', name: 'Rosa Delgado', role: 'Licensed Applicator', license: 'OH-PA-118274' },
  { id: 'e3', name: 'Dana Okafor', role: 'Crew Lead' },
  { id: 'e4', name: 'Tyler Brandt', role: 'Mowing Technician' },
  { id: 'e5', name: 'Jamie Lindqvist', role: 'Landscape Technician' },
];

const routeDefs: Omit<Route, 'stops'>[] = [
  { id: 'r1', name: 'Route 1 – North Millbrook', day: 'Monday' },
  { id: 'r2', name: 'Route 2 – Harlow Springs', day: 'Tuesday' },
  { id: 'r3', name: 'Route 3 – Fernwood', day: 'Wednesday' },
  { id: 'r4', name: 'Route 4 – East Millbrook', day: 'Thursday' },
];

const CITY_BY_ROUTE: Record<string, { city: string; zip: string }> = {
  r1: { city: 'Millbrook', zip: '44190' },
  r2: { city: 'Harlow Springs', zip: '44192' },
  r3: { city: 'Fernwood', zip: '44195' },
  r4: { city: 'Millbrook', zip: '44191' },
};

// [first, last, street, cross street, gate code, call first, sqft, route, service, active]
type Row = [string, string, string, string, string, boolean, number, string, string, boolean];
const customerRows: Row[] = [
  ['Evelyn', 'Abernathy', '112 Larkspur Ln', 'Larkspur & Hollow Rd', '', false, 8200, 'r1', 'Lawn Fertilization Program', true],
  ['Grant', 'Bellweather', '27 Orchard Hill Dr', 'Orchard Hill & Main', '4417', false, 12400, 'r1', 'Lawn Mowing', true],
  ['Priya', 'Castellano', '903 Juniper Ct', 'Juniper & Quarry Rd', '', true, 6100, 'r1', 'Lawn Fertilization Program', true],
  ['Walter', 'Dunmore', '45 Birchwood Ave', 'Birchwood & 3rd St', '', false, 9800, 'r1', 'Lawn Mowing', true],
  ['Hannah', 'Eckhart', '1501 Millrace Rd', 'Millrace & Pine', '0921', false, 15300, 'r1', 'Landscape Work > Bed Maintenance', true],
  ['Desmond', 'Fairchild', '78 Copper Kettle Way', 'Copper Kettle & Elm', '', true, 7400, 'r1', 'Lawn Fertilization Program', true],
  ['Lucia', 'Greaves', '230 Thistle Row', 'Thistle & Hollow Rd', '', false, 5600, 'r1', 'Lawn Mowing', true],
  ['Owen', 'Halvorsen', '14 Saddlebrook Ln', 'Saddlebrook & Route 9', '', false, 11200, 'r2', 'Lawn Fertilization Program', true],
  ['Marisol', 'Ibarra', '602 Kestrel Pl', 'Kestrel & Spring St', '7781', true, 8900, 'r2', 'Lawn Mowing', true],
  ['Theodore', 'Jansen', '19 Wren Hollow Dr', 'Wren Hollow & Spring St', '', false, 13600, 'r2', 'Landscape Work > Shrub Trimming', true],
  ['Ada', 'Kowalczyk', '387 Pinecrest Blvd', 'Pinecrest & Lake Ave', '', false, 6800, 'r2', 'Lawn Fertilization Program', true],
  ['Bennett', 'Lockridge', '55 Fox Run', 'Fox Run & Lake Ave', '2025', false, 10100, 'r2', 'Lawn Mowing', true],
  ['Celeste', 'Marchetti', '1220 Brookstone Ct', 'Brookstone & Route 9', '', true, 4700, 'r2', 'Stone Work', false],
  ['Isaac', 'Nakamura', '9 Heron Bay Rd', 'Heron Bay & Fern St', '', false, 9300, 'r3', 'Lawn Fertilization Program', true],
  ['Rhea', 'Olmsted', '410 Quillfeather Ln', 'Quillfeather & Fern St', '3390', false, 7700, 'r3', 'Lawn Mowing', true],
  ['Silas', 'Pemberton', '61 Ashgrove Ter', 'Ashgrove & Mill Creek Rd', '', false, 14800, 'r3', 'Landscape Work > Mulch Work', true],
  ['Nora', 'Quintero', '275 Bramble Way', 'Bramble & Mill Creek Rd', '', true, 5900, 'r3', 'Lawn Fertilization Program', true],
  ['Felix', 'Rademacher', '840 Tanglewood Dr', 'Tanglewood & Oak St', '', false, 11900, 'r3', 'Lawn Mowing', true],
  ['June', 'Sorensen', '33 Clover Gate Rd', 'Clover Gate & Oak St', '5512', false, 8400, 'r3', 'Landscape Work > Edging', false],
  ['Victor', 'Thornbury', '1702 Harrow Ln', 'Harrow & Bell Rd', '', false, 10600, 'r4', 'Lawn Fertilization Program', true],
  ['Imogen', 'Umbridge-Lee', '88 Ridgefield Ave', 'Ridgefield & Bell Rd', '', true, 7200, 'r4', 'Lawn Mowing', true],
  ['Rafael', 'Valdivia', '516 Sycamore Bend', 'Sycamore & East Main', '8804', false, 16200, 'r4', 'Landscape Work > Tree Trimming', true],
  ['Greta', 'Whitcomb', '67 Meadowlark Ct', 'Meadowlark & East Main', '', false, 6500, 'r4', 'Lawn Fertilization Program', true],
  ['Malcolm', 'Yardley', '299 Cobblestone Dr', 'Cobblestone & Kiln Rd', '', false, 9100, 'r4', 'Lawn Mowing', true],
  ['Zara', 'Zimmerman', '12 Wildflower Path', 'Wildflower & Kiln Rd', '6060', true, 12800, 'r4', 'Landscape Work > Planting', true],
];

/** Customers (by index) who are behind on payments. */
const DELINQUENT = new Set([3, 8, 14, 19, 22]);
/** Customers (by index) with a prepaid credit balance: index -> amount. */
const PREPAID: Record<number, number> = { 0: 240, 7: 400, 13: 180, 21: 350 };

// Small deterministic PRNG so the seed looks the same every reset.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function priceFor(service: string, sqft: number): number {
  const k = sqft / 1000;
  if (service === 'Lawn Mowing') return Math.round(30 + k * 3.25);
  if (service === 'Lawn Fertilization Program') return Math.round(40 + k * 4.5);
  if (service === 'Stone Work') return 850;
  if (service.endsWith('Mulch Work')) return Math.round(180 + k * 9);
  if (service.endsWith('Tree Trimming')) return 425;
  if (service.endsWith('Bed Installation')) return 1200;
  if (service.endsWith('Planting')) return 560;
  return Math.round(90 + k * 6);
}

function employeeFor(service: string, rand: () => number): string {
  if (service === 'Lawn Fertilization Program') return rand() < 0.5 ? 'e1' : 'e2';
  if (service === 'Lawn Mowing') return rand() < 0.6 ? 'e4' : 'e3';
  return rand() < 0.6 ? 'e5' : 'e3';
}

/** Days-from-today offsets for each customer's past service history. */
function historyOffsets(service: string): number[] {
  if (service === 'Lawn Mowing') return [-98, -56, -49, -42, -35, -28, -21, -14, -7];
  if (service === 'Lawn Fertilization Program') return [-140, -98, -56, -14];
  if (service === 'Stone Work') return [-120, -45];
  return [-105, -63, -21];
}

export function buildSeed(): AppData {
  const rand = mulberry32(20261006);
  const today = todayISO();

  const customers: Customer[] = customerRows.map((r, i) => {
    const [firstName, lastName, street, crossStreet, gateCode, callFirst, sqft, routeId, serviceType, active] = r;
    const { city, zip } = CITY_BY_ROUTE[routeId];
    const billing = { street, city, state: 'OH', zip };
    const area = 330;
    const phone = `(${area}) 555-${String(1000 + Math.floor(rand() * 8999)).padStart(4, '0')}`;
    return {
      id: `c${i + 1}`,
      number: `C-${String(i + 1).padStart(5, '0')}`,
      firstName,
      lastName,
      phone,
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
      notes: callFirst ? 'Customer asked for a call 30 minutes before arrival.' : '',
    };
  });

  const routes: Route[] = routeDefs.map((r) => ({
    ...r,
    stops: customers.filter((c) => c.routeId === r.id).map((c) => c.id),
  }));

  type Draft = Omit<WorkOrder, 'id' | 'number'>;
  const drafts: Draft[] = [];
  const mk = (c: Customer, date: string, status: WorkOrderStatus): Draft => {
    const isFert = c.serviceType === 'Lawn Fertilization Program';
    const chem = isFert ? CHEMICALS[Math.floor(rand() * CHEMICALS.length)] : undefined;
    return {
      customerId: c.id,
      date,
      service: c.serviceType,
      employeeId: employeeFor(c.serviceType, rand),
      price: priceFor(c.serviceType, c.sqft),
      status,
      chemical: chem?.name ?? '',
      epaReg: chem?.epa ?? '',
    };
  };

  customers.forEach((c) => {
    for (const off of historyOffsets(c.serviceType)) {
      if (!c.active && off > -60) continue; // inactive customers stopped service
      drafts.push(mk(c, addDays(today, off), 'Completed'));
    }
  });

  // Today's route: Route 1 active stops, in route order.
  const todayStops = routes[0].stops
    .map((id) => customers.find((c) => c.id === id)!)
    .filter((c) => c.active);
  todayStops.forEach((c, i) => {
    const status: WorkOrderStatus = i < 3 ? 'Completed' : i === 3 ? 'In progress' : 'Upcoming';
    drafts.push(mk(c, today, status));
  });

  // Upcoming week: fertilization rounds due in the next few days + other routes.
  customers
    .filter((c) => c.active && c.routeId !== 'r1')
    .forEach((c) => {
      const routeIdx = Number(c.routeId.slice(1)) - 1;
      drafts.push(mk(c, addDays(today, routeIdx), 'Upcoming'));
    });

  drafts.sort((a, b) => a.date.localeCompare(b.date) || a.customerId.localeCompare(b.customerId, undefined, { numeric: true }));
  const workOrders: WorkOrder[] = drafts.map((d, i) => ({ ...d, id: `wo${i + 1}`, number: `WO-${10001 + i}` }));

  // Invoices + payments for every completed work order.
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const cardTypes = ['Visa', 'Mastercard', 'Amex', 'Discover'];
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
        amount: w.price,
        amountPaid: 0,
      };
      invoices.push(inv);
      const age = daysBetween(w.date, today);
      const unpaid = DELINQUENT.has(custIdx) ? age >= 25 || rand() < 0.5 : age <= 10 ? rand() < 0.35 : rand() < 0.04;
      if (unpaid) return;
      const roll = rand();
      const method: PaymentMethod = roll < 0.4 ? 'Check' : roll < 0.8 ? 'Card' : roll < 0.92 ? 'ACH' : 'Cash';
      const payDate = addDays(w.date, Math.min(age, 2 + Math.floor(rand() * 10)));
      inv.amountPaid = inv.amount;
      payments.push({
        id: `p${payN++}`,
        customerId: w.customerId,
        invoiceId: inv.id,
        date: payDate,
        kind: 'Payment',
        method,
        reference: method === 'Check' ? `#${checkNo++}` : method === 'Card' ? cardTypes[Math.floor(rand() * 4)] : '',
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
      date: addDays(today, -30),
      kind: 'Prepayment',
      method: 'Check',
      reference: `#${checkNo++}`,
      amount: amt,
      reversed: false,
      note: 'Season prepayment',
    });
  });

  payments.sort((a, b) => a.date.localeCompare(b.date));

  return {
    version: DATA_VERSION,
    employees,
    routes,
    customers,
    workOrders,
    invoices,
    payments,
    pricing: { laborRate: 55, mulchPerYard: 48, stonePerTon: 72, weedBarrierPerSqFt: 0.35 },
    nextCustomerSeq: customers.length + 1,
    nextWorkOrderSeq: 10001 + workOrders.length,
    nextInvoiceSeq: 20001 + invoices.length,
  };
}

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000);
}
