import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AppLayout from './components/layout/AppLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import OnboardingPage from './pages/onboarding/OnboardingPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import MyDayPage from './pages/myday/MyDayPage';
import TasksPage from './pages/tasks/TasksPage';
import StudyPage from './pages/study/StudyPage';
import AIAssistantPage from './pages/ai/AIAssistantPage';
import TestsPage from './pages/tests/TestsPage';
import SkillsPage from './pages/skills/SkillsPage';
import OpportunitiesPage from './pages/opportunities/OpportunitiesPage';
import ProgressPage from './pages/progress/ProgressPage';
import SettingsPage from './pages/settings/SettingsPage';
import AdminPage from './pages/admin/AdminPage';
import TimerPage from './pages/timer/TimerPage';
import NotesPage from './pages/notes/NotesPage';
import FlashcardsPage from './pages/flashcards/FlashcardsPage';
import InterviewPage from './pages/interview/InterviewPage';
import CVBuilderPage from './pages/cv/CVBuilderPage';
import CareerAdvisorPage from './pages/career/CareerAdvisorPage';
import SkillGapPage from './pages/skillgap/SkillGapPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isOnboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner fullScreen />;
  if (user) return <Navigate to={user.isOnboarded ? '/app/dashboard' : '/onboarding'} replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.isOnboarded) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="my-day" element={<MyDayPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="study" element={<StudyPage />} />
        <Route path="ai" element={<AIAssistantPage />} />
        <Route path="tests" element={<TestsPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="timer" element={<TimerPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="flashcards" element={<FlashcardsPage />} />
        <Route path="interview" element={<InterviewPage />} />
        <Route path="cv" element={<CVBuilderPage />} />
        <Route path="career" element={<CareerAdvisorPage />} />
        <Route path="skillgap" element={<SkillGapPage />} />
      </Route>

      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}