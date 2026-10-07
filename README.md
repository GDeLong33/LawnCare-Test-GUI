# Billy Goat Lawn Care — Field Service & Billing Demo

A clickable UI prototype of a field-service and billing system for **Billy Goat Lawn Care LLC**, built for a capstone project.

**Live demo:** https://gdelong33.github.io/LawnCare-Test-GUI/ <!-- replace if the repo/user name changes -->

> This is a front-end prototype only. There is no backend. All customers, work orders, and payments are invented sample data from `src/data/seed.ts`. Any edits you make are saved in your browser's localStorage, so they stick around between visits. Use **Reset demo data** at the bottom of the sidebar to start over.

## Screens

- **Dashboard**: stats, today's route, recent payments
- **Customers**: searchable list plus an editable profile, prepayments, and application history
- **Work Orders**: printable work order sheet, with reprint and print-all-for-route
- **Routes**: drag-and-drop stop ordering and square-footage totals
- **Pricing / Proposal**: live job price calculator
- **Reports & Payments**: production, payments, open invoices, and coverage reports, with payment reversal, service credit, and refunds

## Run locally

Requires [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm run dev       # http://localhost:5173/LawnCare-Test-GUI/
npm run build     # production build into dist/
npm run preview   # serve the production build
```

## Tech

React 18, TypeScript, Vite, and React Router (`HashRouter`, so page refreshes work on GitHub Pages). Styling is a single plain CSS file. There is no UI library.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and deploys the site on every push to `main`. You only need to do this once:

1. On GitHub, open the repo and go to **Settings → Pages**.
2. Under **Build and deployment → Source**, pick **GitHub Actions**.
3. Push to `main`, or open the **Actions** tab and run **Deploy to GitHub Pages** by hand.
4. When the run turns green, the site URL appears on the Settings → Pages screen.

If you rename the repo, also update `base` in `vite.config.ts` to match the new name.
