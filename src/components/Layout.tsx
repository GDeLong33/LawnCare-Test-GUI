import { NavLink, Outlet } from 'react-router-dom';
import { useStore } from '../data/store';
import { Icon } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/customers', label: 'Customers', icon: 'customers' },
  { to: '/work-orders', label: 'Work Orders', icon: 'workorder' },
  { to: '/routes', label: 'Routes', icon: 'routes' },
  { to: '/pricing', label: 'Pricing / Proposal', icon: 'pricing' },
  { to: '/reports', label: 'Reports & Payments', icon: 'reports' },
];

export default function Layout() {
  const { reset } = useStore();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}goat.svg`} alt="" />
          <div>
            <div className="brand-name">Billy Goat</div>
            <div className="brand-sub">Lawn Care LLC</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">Marcus Whitfield</div>
          <div>Owner · Demo mode</div>
          <button
            className="link-btn"
            onClick={() => {
              if (confirm('Reset all demo data back to the original sample data?')) reset();
            }}
          >
            Reset demo data
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
