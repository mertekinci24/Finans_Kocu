import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '@layouts/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Accounts from '@/pages/Accounts';
import Transactions from '@/pages/Transactions';
import Installments from '@/pages/Installments';
import Debts from '@/pages/Debts';
import { ROUTES } from '@/constants';

export default function App(): JSX.Element {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.ACCOUNTS} element={<Accounts />} />
          <Route path={ROUTES.TRANSACTIONS} element={<Transactions />} />
          <Route path={ROUTES.INSTALLMENTS} element={<Installments />} />
          <Route path={ROUTES.DEBTS} element={<Debts />} />
        </Route>
      </Routes>
    </Router>
  );
}
