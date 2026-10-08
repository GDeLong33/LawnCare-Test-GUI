import { COMPANY, priceFor, visitsPerSeason } from '../data/seed';
import { customerName } from '../data/store';
import type { AppData, Customer } from '../data/types';
import { addDays, longDate, money, round2, todayISO } from '../lib/format';

export interface LetterInfo {
  season: number;
  service: string;
  perVisit: number;
  visits: number;
  seasonTotal: number;
  discountPct: number;
  discount: number;
  prepayAmount: number;
  creditOnAccount: number;
  amountDue: number;
  dueBy: string;
}

/** Everything on the letter comes from the customer record and settings. Nothing is typed by hand. */
export function letterInfo(d: AppData, c: Customer): LetterInfo {
  const today = todayISO();
  const month = Number(today.slice(5, 7));
  // Letters sent in the fall are for next season.
  const season = Number(today.slice(0, 4)) + (month >= 9 ? 1 : 0);
  const lastWo = d.workOrders
    .filter((w) => w.customerId === c.id && w.service === c.serviceType)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const perVisit = lastWo?.price ?? priceFor(c.serviceType, c.sqft);
  const visits = visitsPerSeason(c.serviceType);
  const seasonTotal = round2(perVisit * visits);
  const discountPct = d.settings.pricing.prepayDiscountPct;
  const discount = round2((seasonTotal * discountPct) / 100);
  const prepayAmount = round2(seasonTotal - discount);
  const creditOnAccount = c.prepayBalance;
  return {
    season,
    service: c.serviceType,
    perVisit,
    visits,
    seasonTotal,
    discountPct,
    discount,
    prepayAmount,
    creditOnAccount,
    amountDue: round2(Math.max(0, prepayAmount - creditOnAccount)),
    dueBy: addDays(today, 30),
  };
}

export function letterFileName(c: Customer, season: number): string {
  return `Prepayment_Letter_${c.number}_${c.lastName.replace(/[^A-Za-z]/g, '')}_${season}.pdf`;
}

export default function PrepayLetter({ data, customer: c }: { data: AppData; customer: Customer }) {
  const L = letterInfo(data, c);
  const a = c.billing;
  return (
    <article className="paper letter">
      <header className="letter-head">
        <div>
          <div className="letter-co">{COMPANY.name}</div>
          <div>{COMPANY.street}</div>
          <div>{COMPANY.cityStateZip}</div>
        </div>
        <div className="letter-co-contact">
          <div>{COMPANY.phone}</div>
          <div>{COMPANY.email}</div>
        </div>
      </header>

      <p>{longDate(todayISO())}</p>
      <address className="letter-addr">
        {customerName(c)}
        <br />
        {a.street}
        <br />
        {a.city}, {a.state} {a.zip}
      </address>

      <p>Account number: <strong>{c.number}</strong></p>
      <p>Dear {c.firstName} {c.lastName},</p>
      <p>
        Thank you for choosing {COMPANY.name}. We are now booking the {L.season} season. If you prepay for the full
        season by <strong>{longDate(L.dueBy)}</strong>, you will receive a {L.discountPct}% discount. Your prepayment is
        kept as a credit on your account and is used up automatically as each service is completed.
      </p>

      <table className="letter-table">
        <tbody>
          <tr>
            <td>Service</td>
            <td>{L.service}</td>
          </tr>
          <tr>
            <td>Lawn size on file</td>
            <td>{c.sqft ? `${c.sqft.toLocaleString()} sq ft` : 'To be measured'}</td>
          </tr>
          <tr>
            <td>Price per visit</td>
            <td>{money(L.perVisit)}</td>
          </tr>
          <tr>
            <td>Visits in a typical season</td>
            <td>{L.visits}</td>
          </tr>
          <tr>
            <td>Season total</td>
            <td>{money(L.seasonTotal)}</td>
          </tr>
          <tr>
            <td>Prepayment discount ({L.discountPct}%)</td>
            <td>−{money(L.discount)}</td>
          </tr>
          {L.creditOnAccount > 0 && (
            <tr>
              <td>Credit already on your account</td>
              <td>−{money(L.creditOnAccount)}</td>
            </tr>
          )}
          <tr className="letter-total">
            <td>Prepayment amount due</td>
            <td>{money(L.amountDue)}</td>
          </tr>
        </tbody>
      </table>

      <p>
        You can pay by check made out to {COMPANY.name}, or call the office to pay by card. If you have any questions,
        call us at {COMPANY.phone}.
      </p>
      <p>
        Sincerely,
        <br />
        <br />
        Marcus Whitfield
        <br />
        Owner, {COMPANY.name}
      </p>

      <div className="letter-stub">
        <div className="letter-stub-cut">Detach and return with your payment</div>
        <div className="letter-stub-row">
          <span>
            {customerName(c)} · {c.number}
          </span>
          <span>
            {L.season} season prepayment: <strong>{money(L.amountDue)}</strong>
          </span>
        </div>
      </div>
    </article>
  );
}
