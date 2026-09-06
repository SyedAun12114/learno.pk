import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useAuth } from '../../hooks/useAuth';

const TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/my-day': 'My Day',
  '/app/tasks': 'Tasks',
  '/app/study': 'Study Plans',
  '/app/ai': 'AI Assistant',
  '/app/tests': 'Tests',
  '/app/skills': 'Skills',
  '/app/opportunities': 'Opportunities',
  '/app/progress': 'Progress',
  '/app/settings': 'Settings',
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-5 md:px-6">
          <h1 className="text-sm font-semibold text-primary">{TITLES[pathname] || 'Learno'}</h1>
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {user?.email?.[0]?.toUpperCase() || 'S'}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-5 md:p-6 max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
