import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Customers from './pages/Customers';
import RoutesPage from './pages/Routes';
import WorkOrders from './pages/WorkOrders';
import Pricing from './pages/Pricing';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import DataPage from './pages/Data';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="customers/:id?" element={<Customers />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="work-orders/*" element={<WorkOrders />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reports/:reportId?" element={<Reports />} />
        <Route path="data" element={<DataPage />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
