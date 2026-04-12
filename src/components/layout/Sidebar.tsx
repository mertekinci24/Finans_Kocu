import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '@stores/index';
import { ROUTES } from '@constants/index';
import clsx from 'clsx';

const menuItems = [
  { label: 'Kontrol Paneli', path: ROUTES.DASHBOARD },
  { label: 'Hesaplarım', path: ROUTES.ACCOUNTS },
  { label: 'İşlemler', path: ROUTES.TRANSACTIONS },
  { label: 'Borçlar', path: ROUTES.DEBTS },
  { label: 'Taksitler', path: ROUTES.INSTALLMENTS },
  { label: 'Ayarlar', path: ROUTES.SETTINGS },
];

export default function Sidebar(): JSX.Element {
  const { sidebarOpen } = useUIStore();
  const location = useLocation();

  return (
    <aside
      className={clsx(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-neutral-50 border-r border-neutral-200 transition-transform duration-300 lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'
      )}
    >
      <nav className="flex flex-col gap-1 p-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'px-4 py-3 rounded-md transition-colors duration-200 text-sm font-medium',
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
