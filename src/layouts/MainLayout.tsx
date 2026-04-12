import { Outlet } from 'react-router-dom';
import TopBar from '@components/layout/TopBar';
import Sidebar from '@components/layout/Sidebar';

export default function MainLayout(): JSX.Element {
  return (
    <div className="min-h-screen bg-neutral-0">
      <TopBar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
