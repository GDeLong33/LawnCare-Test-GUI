import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="customers/:id?" element={<ComingSoon title="Customers" />} />
        <Route path="work-orders/*" element={<ComingSoon title="Work Orders" />} />
        <Route path="routes" element={<ComingSoon title="Routes" />} />
        <Route path="pricing" element={<ComingSoon title="Pricing / Proposal" />} />
        <Route path="reports/*" element={<ComingSoon title="Reports & Payments" />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
