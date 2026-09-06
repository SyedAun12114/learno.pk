import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Sun, CheckSquare, BookOpen, Bot, TestTube2,
  Zap, Briefcase, BarChart3, Settings, LogOut, GraduationCap,
  Layers, MessageSquare, FileText, Target, TrendingUp, Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../lib/api';

const NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/app/my-day', icon: Sun, label: 'My Day' },
  { to: '/app/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/app/study', icon: BookOpen, label: 'Study' },
  { to: '/app/skills', icon: Zap, label: 'Skills' },
  { to: '/app/tests', icon: TestTube2, label: 'Tests' },
  { to: '/app/opportunities', icon: Briefcase, label: 'Opportunities' },
  { to: '/app/ai', icon: Bot, label: 'AI Assistant' },
  { to: '/app/flashcards', icon: Layers, label: 'Flashcards' },
  { to: '/app/interview', icon: MessageSquare, label: 'Interview Prep' },
  { to: '/app/cv', icon: FileText, label: 'CV Builder' },
  { to: '/app/career', icon: Target, label: 'Career Advisor' },
  { to: '/app/skillgap', icon: TrendingUp, label: 'Skill Gap' },
  { to: '/app/timer', icon: Clock, label: 'Focus Timer' },
  { to: '/app/notes', icon: FileText, label: 'Notes' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    try { await logout(); navigate('/'); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const cls = (active: boolean) =>
    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
    (active ? 'bg-accent text-primary' : 'text-muted hover:text-primary hover:bg-surface');

  return (
    <aside className="hidden md:flex flex-col w-60 h-full bg-card border-r border-border flex-shrink-0">
      <div className="flex-shrink-0 h-14 flex items-center px-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-accent" />
          </div>
          <span className="font-bold text-primary text-base tracking-tight">Learno</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-thin">
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => cls(isActive)}>
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex-shrink-0 border-t border-border p-3 space-y-0.5">
        <NavLink to="/app/progress" className={({ isActive }) => cls(isActive)}>
          <BarChart3 className="w-4 h-4" /> Progress
        </NavLink>
        <NavLink to="/app/settings" className={({ isActive }) => cls(isActive)}>
          <Settings className="w-4 h-4" /> Settings
        </NavLink>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">
              {user?.email?.[0]?.toUpperCase() || 'S'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary truncate">{user?.email}</p>
            <p className="text-xs text-muted capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-primary transition-colors"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
