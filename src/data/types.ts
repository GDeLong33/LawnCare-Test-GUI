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
  name: string;
  day: string;
  /** Customer ids in driving order. */
  stops: string[];
}

export interface Customer {
  id: string;
  number: string; // C-00001
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
  /** Prepaid credit; auto-debited when a service is recorded. */
  prepayBalance: number;
  serviceType: string;
  notes: string;
}

export type WorkOrderStatus = 'Completed' | 'In progress' | 'Upcoming';

export interface WorkOrder {
  id: string;
  number: string; // WO-10001
  customerId: string;
  date: string; // YYYY-MM-DD
  service: string;
  employeeId: string;
  price: number;
  status: WorkOrderStatus;
  chemical: string;
  epaReg: string;
  lastPrinted?: string; // ISO timestamp
}

export interface Invoice {
  id: string;
  number: string; // INV-20001
  customerId: string;
  workOrderId: string;
  date: string;
  amount: number;
  amountPaid: number;
}

export type PaymentKind = 'Payment' | 'Prepayment' | 'Prepay Debit' | 'Reversal' | 'Service Credit' | 'Refund';
export type PaymentMethod = 'Check' | 'Card' | 'Cash' | 'ACH' | 'Prepaid' | 'Credit';

export interface Payment {
  id: string;
  customerId: string;
  invoiceId?: string;
  date: string;
  kind: PaymentKind;
  method: PaymentMethod;
  /** Check number or card type. */
  reference: string;
  amount: number;
  reversed: boolean;
  note: string;
}

export interface PricingDefaults {
  laborRate: number;
  mulchPerYard: number;
  stonePerTon: number;
  weedBarrierPerSqFt: number;
}

export interface AppData {
  version: number;
  employees: Employee[];
  routes: Route[];
  customers: Customer[];
  workOrders: WorkOrder[];
  invoices: Invoice[];
  payments: Payment[];
  pricing: PricingDefaults;
  nextCustomerSeq: number;
  nextWorkOrderSeq: number;
  nextInvoiceSeq: number;
}
