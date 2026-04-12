import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@layouts/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Accounts from '@/pages/Accounts';
import Transactions from '@/pages/Transactions';
import Installments from '@/pages/Installments';
import Debts from '@/pages/Debts';
import SignIn from '@/pages/SignIn';
import SignUp from '@/pages/SignUp';
import { ROUTES } from '@/constants';

function ProtectedRoute({ element }: { element: JSX.Element }): JSX.Element {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? element : <Navigate to="/signin" replace />;
}

export default function App(): JSX.Element {
  return (
    <Router>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          element={
            <ProtectedRoute
              element={<MainLayout />}
            />
          }
        >
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
