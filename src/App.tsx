import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ComingSoon from './pages/ComingSoon';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="customers/:id?" element={<ComingSoon title="Customers" />} />
        <Route path="routes" element={<ComingSoon title="Schedule & routes" />} />
        <Route path="work-orders/*" element={<ComingSoon title="Work orders" />} />
        <Route path="pricing" element={<ComingSoon title="Pricing & proposals" />} />
        <Route path="payments" element={<ComingSoon title="Payments" />} />
        <Route path="reports/:reportId?" element={<ComingSoon title="Reports" />} />
        <Route path="data" element={<ComingSoon title="Data backup & import" />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
