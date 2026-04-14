import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@layouts/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Accounts from '@/pages/Accounts';
import Transactions from '@/pages/Transactions';
import Installments from '@/pages/Installments';
import Debts from '@/pages/Debts';
import Categories from '@/pages/Categories';
import Findeks from '@/pages/Findeks';
import Assistant from '@/pages/Assistant';
import ScenarioSimulator from '@/pages/ScenarioSimulator';
import Goals from '@/pages/Goals';
import Upgrade from '@/pages/Upgrade';
import SignIn from '@/pages/SignIn';
import SignUp from '@/pages/SignUp';
import { ROUTES } from '@/constants';

function ProtectedRoute({ element }: { element: JSX.Element }): JSX.Element {
  const { isAuthenticated, loading } = useAuth();
  const [timeoutError, setTimeoutError] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      console.log('[Trace] ProtectedRoute loading durumunda (10s zamanlayıcı başladı)...');
      timer = setTimeout(() => {
        console.warn('[Trace] ProtectedRoute 10 saniye zaman aşımına uğradı!');
        setTimeoutError(true);
      }, 10000); // 10 seconds timeout
    } else {
      console.log(`[Trace] ProtectedRoute loading tamamlandı. isAuthenticated: ${isAuthenticated}`);
      setTimeoutError(false);
    }
    return () => clearTimeout(timer);
  }, [loading, isAuthenticated]);

  if (loading) {
    if (timeoutError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-50">
          <div className="text-center">
            <div className="w-16 h-16 text-error-500 mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-neutral-800 font-semibold mb-2">Bağlantı zaman aşımına uğradı.</p>
            <p className="text-neutral-500 mb-6 max-w-xs mx-auto">Veriler yüklenemiyor. Profil kontrolü veya bağlantı hatası olabilir.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Yeniden Dene
            </button>
          </div>
        </div>
      );
    }

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
          <Route path={ROUTES.CATEGORIES} element={<Categories />} />
          <Route path={ROUTES.FINDEKS} element={<Findeks />} />
          <Route path={ROUTES.ASSISTANT} element={<Assistant />} />
          <Route path={ROUTES.SCENARIO} element={<ScenarioSimulator />} />
          <Route path={ROUTES.GOALS} element={<Goals />} />
          <Route path={ROUTES.UPGRADE} element={<Upgrade />} />
        </Route>
      </Routes>
    </Router>
  );
}
