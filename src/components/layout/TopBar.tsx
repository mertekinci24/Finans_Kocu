import { useUIStore } from '@stores/index';
import { APP_NAME } from '@constants/index';

export default function TopBar(): JSX.Element {
  const { toggleSidebar } = useUIStore();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-neutral-200 flex items-center px-4 gap-4 z-40">
      <button
        onClick={toggleSidebar}
        className="p-2 hover:bg-neutral-100 rounded-md transition-colors lg:hidden"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <h1 className="text-xl font-bold text-primary-600">{APP_NAME}</h1>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <button
          className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 font-semibold flex items-center justify-center hover:bg-primary-200 transition-colors"
          title="Profil"
        >
          U
        </button>
      </div>
    </header>
  );
}
