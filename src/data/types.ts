export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  /** State pesticide applicator license number, if licensed. */
  license?: string;
}

export interface Route {
  id: string;
  number: number;
  name: string;
  /** 1 = Monday ... 5 = Friday */
  weekday: number;
  /** Customer ids in driving order. */
  stops: string[];
}

export interface Customer {
  id: string;
  number: string; // C-00001, system generated, never editable
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  billing: Address;
  shipSameAsBilling: boolean;
  shipTo: Address;
  sqft: number;
  routeId: string;
  crossStreet: string;
  gateCode: string;
  callFirst: boolean;
  active: boolean;
  /** Prepaid credit; debited automatically as services are recorded. */
  prepayBalance: number;
  /** Type of work, one of SERVICE_TYPES. */
  serviceType: string;
  notes: string;
  createdAt: string;
}

export type WorkOrderStatus = 'Completed' | 'In progress' | 'Scheduled' | 'Missed';

export interface WorkOrder {
  id: string;
  number: string; // WO-10001
  customerId: string;
  date: string; // scheduled date, YYYY-MM-DD
  completedDate?: string;
  service: string;
  /** Fertilization application type, when service is the fertilization program. */
  application?: string;
  employeeId: string;
  manHours: number;
  price: number;
  status: WorkOrderStatus;
  chemical: string;
  epaReg: string;
  notes: string;
  lastPrinted?: string; // ISO timestamp
  /** Late-fee option printed on the sheet: 0 = none, or 30 / 60 / 90 days past due. */
  lateFeeTier?: 0 | 30 | 60 | 90;
}

export interface Invoice {
  id: string;
  number: string; // INV-20001
  customerId: string;
  workOrderId?: string;
  date: string;
  description: string;
  amount: number;
  amountPaid: number;
  lateFee: number;
}

export type PaymentKind = 'Payment' | 'Prepayment' | 'Prepay debit' | 'Reversal' | 'Service credit' | 'Refund';
export type PaymentMethod = 'Check' | 'Credit card' | 'Cash' | 'ACH' | 'Prepaid balance' | 'Credit';

export interface Payment {
  id: string;
  customerId: string;
  invoiceId?: string;
  date: string;
  kind: PaymentKind;
  method: PaymentMethod;
  /** Check number or card type. Card numbers are never stored. */
  reference: string;
  amount: number;
  reversed: boolean;
  note: string;
}

export interface AuditEntry {
  id: string;
  ts: string; // ISO timestamp
  action: string;
  customerId?: string;
  amount?: number;
  detail: string;
}

export interface PricingDefaults {
  laborRate: number;
  bedInstallPerLinearFt: number;
  bedMaterialCost: number;
  mulchPerYard: number;
  stonePerTon: number;
  weedBarrierPerSqFt: number;
  prepayDiscountPct: number;
}

export interface Settings {
  routePrefix: string;
  optimizeWithMaps: boolean;
  pricing: PricingDefaults;
  /** Late fee in dollars at 30 / 60 / 90 days past due. */
  lateFees: { d30: number; d60: number; d90: number };
}

export interface AppData {
  version: number;
  /** Monday of the week the data is anchored to; data shifts forward by whole weeks on load. */
  anchorMonday: string;
  employees: Employee[];
  routes: Route[];
  customers: Customer[];
  workOrders: WorkOrder[];
  invoices: Invoice[];
  payments: Payment[];
  audit: AuditEntry[];
  settings: Settings;
  lastBackup?: string;
}
