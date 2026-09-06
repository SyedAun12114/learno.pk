export interface User {
  id: number;
  email: string;
  role: 'student' | 'admin';
  isOnboarded: boolean;
  createdAt: string;
}

export interface StudentProfile {
  id: number;
  userId: number;
  fullName: string;
  age?: number;
  educationLevel?: string;
  institution?: string;
  careerInterest?: string;
  dailyLearningMinutes: number;
  academicGoal?: string;
  careerGoal?: string;
  currentSkills?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  userId: number;
  title: string;
  description?: string;
  category: 'study' | 'assignment' | 'exam' | 'skill' | 'career' | 'personal';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlan {
  id: number;
  userId: number;
  title: string;
  subject: string;
  goal?: string;
  examDate?: string;
  totalDays?: number;
  dailyMinutes: number;
  status: 'active' | 'completed' | 'paused';
  items?: StudyPlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlanItem {
  id: number;
  planId: number;
  dayNumber: number;
  title: string;
  description?: string;
  durationMinutes: number;
  phase?: string;
  status: 'pending' | 'completed' | 'skipped';
  scheduledDate?: string;
  completedAt?: string;
}

export interface AIConversation {
  id: number;
  userId: number;
  title?: string;
  contextType: 'general' | 'study' | 'skill' | 'career';
  createdAt: string;
  updatedAt: string;
  messages?: AIMessage[];
}

export interface AIMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Test {
  id: number;
  userId: number;
  title: string;
  subject: string;
  topic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
  questions?: TestQuestion[];
  createdAt: string;
}

export interface TestQuestion {
  id: number;
  testId: number;
  questionNumber: number;
  type: 'multiple_choice' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface TestAttempt {
  id: number;
  testId: number;
  userId: number;
  score?: number;
  totalQuestions: number;
  correctCount: number;
  timeTakenSeconds?: number;
  analysis?: string;
  strengths?: string;
  weakAreas?: string;
  status: 'in_progress' | 'completed';
  answers?: TestAnswer[];
  completedAt?: string;
  createdAt: string;
}

export interface TestAnswer {
  id: number;
  attemptId: number;
  questionId: number;
  userAnswer?: string;
  isCorrect?: boolean;
}

export interface SkillPath {
  id: number;
  title: string;
  description?: string;
  category?: string;
  totalSteps: number;
  estimatedHours?: number;
  icon?: string;
  isActive: boolean;
  steps?: SkillPathStep[];
  enrollment?: StudentSkillEnrollment;
}

export interface SkillPathStep {
  id: number;
  pathId: number;
  stepNumber: number;
  title: string;
  description?: string;
  estimatedHours?: number;
  resources?: Array<{ title: string; url: string; type: string }>;
  userStatus?: 'locked' | 'active' | 'completed';
}

export interface StudentSkillEnrollment {
  id: number;
  userId: number;
  pathId: number;
  currentStep: number;
  progressPercent: number;
  status: 'active' | 'completed' | 'paused';
  enrolledAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: number;
  title: string;
  company: string;
  description: string;
  type: 'internship' | 'freelance' | 'part_time' | 'full_time' | 'apprenticeship';
  location?: string;
  isRemote: boolean;
  requiredSkills?: string[];
  experienceLevel?: string;
  applicationUrl?: string;
  deadline?: string;
  isFeatured: boolean;
  isActive: boolean;
  isSaved?: boolean;
  matchPercent?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  createdAt: string;
}

export interface DashboardData {
  profile: StudentProfile | null;
  todayTasks: Task[];
  upcomingTasks: Task[];
  activePlans: StudyPlan[];
  enrollments: StudentSkillEnrollment[];
  recentTests: TestAttempt[];
  featuredOpportunity: Opportunity | null;
  stats: {
    tasksCompletedThisWeek: number;
    tasksTotal: number;
    studyMinutesThisWeek: number;
    testsThisMonth: number;
    averageTestScore: number;
    skillsInProgress: number;
  };
}
