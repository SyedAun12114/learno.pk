import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, Bot, BookOpen, Zap, TestTube2, Briefcase, BarChart3, ChevronRight, Target } from 'lucide-react';
import { Button } from '../components/ui/Button';

const FEATURES = [
  { icon: Bot, title: 'AI Study Assistant', desc: 'Get instant explanations, practice questions, and personalized help from your AI tutor.' },
  { icon: BookOpen, title: 'Personalized Study Plans', desc: 'AI generates day-by-day study plans based on your exam dates and available time.' },
  { icon: Zap, title: 'Skill Roadmaps', desc: 'Follow structured learning paths for Frontend, AI, Design, Marketing, and more.' },
  { icon: TestTube2, title: 'AI-Generated Tests', desc: 'Practice with smart tests tailored to your subject. Get detailed performance analysis.' },
  { icon: Briefcase, title: 'Opportunities Portal', desc: 'Discover internships, freelance gigs, and jobs matched to your current skills.' },
  { icon: BarChart3, title: 'Progress Tracking', desc: 'Track study hours, test scores, skill progress, and career readiness in one place.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-accent" />
            </div>
            <span className="font-bold text-primary text-base">Learno</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/signup"><Button variant="accent" size="sm">Get started</Button></Link>
          </div>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-5 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-accent/20 text-primary border border-accent/40 rounded-full px-4 py-1.5 text-xs font-semibold mb-6">
          <span className="w-2 h-2 bg-accent rounded-full" />
          Alibaba Cloud AI Hackathon Pakistan 2026
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-primary leading-tight mb-5">
          Your AI-powered path<br />from learning to earning.
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-8 leading-relaxed">
          Learno helps students organize their studies, build personalized learning plans, master useful skills,
          and move toward real career opportunities.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/signup">
            <Button variant="accent" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Start Learning
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg">Log in</Button>
          </Link>
        </div>
      </section>

      <section className="bg-surface py-14 border-y border-border">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">Students have many tools but no clear direction.</h2>
          <p className="text-muted text-base leading-relaxed">
            YouTube for studying. Notion for notes. LinkedIn for jobs. Each tool is separate.
            None of them know where you are, where you want to go, or what you should do next.
          </p>
          <div className="mt-6 bg-card border border-border rounded-2xl p-6">
            <p className="text-primary font-semibold text-base">
              Learno understands where a student is today, where they want to go,
              and helps them decide what to do next.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14 max-w-4xl mx-auto px-5">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-primary mb-2">The Learno Journey</h2>
        </div>
        <div className="flex items-center justify-center gap-0 flex-wrap">
          {['Plan', 'Learn', 'Practice', 'Prove', 'Earn'].map((step, i, arr) => (
            <div key={step} className="flex items-center">
              <div className={'px-5 py-3 rounded-xl font-semibold text-sm ' + (i === arr.length - 1 ? 'bg-accent text-primary' : 'bg-card border border-border text-primary')}>
                {step}
              </div>
              {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-muted mx-1" />}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface py-14 border-y border-border">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-primary mb-2">Everything you need, connected.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-card border border-border rounded-2xl p-5">
                <div className="w-9 h-9 bg-surface rounded-xl flex items-center justify-center mb-3">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold text-primary text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 max-w-3xl mx-auto px-5 text-center">
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="w-10 h-10 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">"What should I do next?"</h2>
          <p className="text-muted text-sm mb-5 leading-relaxed">
            Learno considers your pending tasks, upcoming exams, skill roadmap progress,
            and available time - then recommends one high-value action.
          </p>
          <div className="bg-surface border border-border rounded-xl p-4 text-left text-sm">
            <p className="font-semibold text-primary mb-1">Your next best action</p>
            <p className="text-primary">Study Mathematics - Chapter 7 <span className="text-muted font-normal">35 minutes</span></p>
            <p className="text-muted text-xs mt-1">Your test is in 4 days and this chapter is currently behind schedule.</p>
          </div>
        </div>
      </section>

      <section className="bg-primary py-14">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <h2 className="text-2xl font-bold text-background mb-3">Build your future with Learno.</h2>
          <p className="text-background/70 mb-6 text-sm">Join students turning studies into skills and skills into careers.</p>
          <Link to="/signup">
            <Button variant="accent" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Start for free
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-5 text-xs text-muted text-center">
          Learno.pk - Demo for Alibaba Cloud AI Hackathon Pakistan 2026
        </div>
      </footer>
    </div>
  );
}
