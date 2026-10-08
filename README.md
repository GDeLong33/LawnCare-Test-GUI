# Billy Goat Lawn Care — Field Service & Billing Demo

A clickable UI prototype of a field-service and billing system for **Billy Goat Lawn Care LLC**, built for a capstone project to replace the company's old Windows 95 program.

**Live demo:** https://gdelong33.github.io/LawnCare-Test-GUI/ <!-- replace if the repo/user name changes -->

> This is a front-end prototype only. There is no backend. All customers, work orders, and payments are invented sample data from `src/data/seed.ts`. Any edits you make are saved in your browser's localStorage, so they stick around between visits. Use **Data → Reset demo data** to start over.

## Screens

- **Home (start menu)**: customer lookup, prepayment letters (print or email), report shortcuts, this week by route, revenue and past-due tiles, fertilization round progress
- **Customers**: searchable list and an editable profile with prepaid balance and application history
- **Schedule / Routes**: drag-and-drop stop order, renameable routes, sq ft totals for chemical ordering
- **Work orders**: printable work order sheets, with reprint and print-all-for-route
- **Pricing**: proposal calculator with overridable defaults
- **Payments**: record, reverse, credit and refund payments, with an audit log and open invoices
- **Reports**: production, payment, open invoice, fertilization and sq ft coverage reports
- **Data**: JSON backup and restore, plus a CSV importer for migrating from the old system

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
