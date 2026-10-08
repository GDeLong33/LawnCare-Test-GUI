export interface ReportMeta {
  id: string;
  title: string;
  /** Shown on the Home start menu (the client's five production reports). */
  production?: boolean;
}

export const REPORTS: ReportMeta[] = [
  { id: 'production-by-account', title: 'Completed production by account', production: true },
  { id: 'production-detail', title: 'Production by date, service and employee', production: true },
  { id: 'production-by-employee', title: 'Production totals by employee', production: true },
  { id: 'production-by-service', title: 'Production totals by service', production: true },
  { id: 'production-open', title: 'Production due / still open', production: true },
  { id: 'payments-by-account', title: 'Payments in detail by account' },
  { id: 'open-invoices', title: 'Open invoices and days past due' },
  { id: 'fert-by-route', title: 'Fertilization applications by route' },
  { id: 'sqft-check', title: 'Sq ft coverage check' },
];
