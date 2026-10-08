import { NavLink, Outlet } from 'react-router-dom';
import { Icon } from './ui';

const NAV = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/customers', label: 'Customers', icon: 'customers' },
  { to: '/routes', label: 'Routes', aria: 'Schedule and routes', icon: 'routes' },
  { to: '/work-orders', label: 'Orders', aria: 'Work orders', icon: 'workorder' },
  { to: '/pricing', label: 'Pricing', icon: 'pricing' },
  { to: '/payments', label: 'Payments', icon: 'payments' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
  { to: '/data', label: 'Data', aria: 'Data backup and import', icon: 'data' },
];

export default function Layout() {
  return (
    <div className="app">
      <nav className="rail" aria-label="Main">
        <NavLink to="/" className="logo-tile" aria-label="Billy Goat Lawn Care home">
          BG
        </NavLink>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="rail-btn" aria-label={n.aria ?? n.label} title={n.aria ?? n.label}>
            <Icon name={n.icon} />
            <span aria-hidden="true">{n.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
      <main className="main" id="main">
        <Outlet />
      </main>
    </div>
  );
}
