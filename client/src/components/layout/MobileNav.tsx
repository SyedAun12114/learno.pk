import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Sun, CheckSquare, Bot, Zap } from 'lucide-react';

const NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/app/my-day', icon: Sun, label: 'My Day' },
  { to: '/app/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/app/skills', icon: Zap, label: 'Skills' },
  { to: '/app/ai', icon: Bot, label: 'AI' },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="flex">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors ' +
              (isActive ? 'text-primary' : 'text-muted')
            }
          >
            {({ isActive }) => (
              <>
                <div className={'p-1.5 rounded-xl transition-colors ' + (isActive ? 'bg-accent' : '')}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px]">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
