import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

type Mode = 'focus' | 'short' | 'long';

const MODES: Record<Mode, { label: string; minutes: number; color: string; icon: React.ElementType }> = {
  focus: { label: 'Focus', minutes: 25, color: 'bg-primary text-background', icon: Brain },
  short: { label: 'Short Break', minutes: 5, color: 'bg-green-500 text-white', icon: Coffee },
  long: { label: 'Long Break', minutes: 15, color: 'bg-blue-500 text-white', icon: Coffee },
};

export default function TimerPage() {
  const [mode, setMode] = useState<Mode>('focus');
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toast = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('learno_pomodoro_today');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.date === new Date().toDateString()) {
        setCompletedToday(data.count || 0);
      }
    }
  }, []);

  useEffect(() => {
    setSeconds(MODES[mode].minutes * 60);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            if (mode === 'focus') {
              const newCount = completedToday + 1;
              setCompletedToday(newCount);
              setSessions(prev => prev + 1);
              localStorage.setItem('learno_pomodoro_today', JSON.stringify({ date: new Date().toDateString(), count: newCount }));
              toast.success('Focus session complete! Take a break.');
            } else {
              toast.success('Break over! Ready to focus?');
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, completedToday, toast]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const total = MODES[mode].minutes * 60;
  const progress = ((total - seconds) / total) * 100;
  const circumference = 2 * Math.PI * 90;
  const strokeDash = circumference - (progress / 100) * circumference;

  const reset = () => {
    setRunning(false);
    setSeconds(MODES[mode].minutes * 60);
  };

  return (
    <div className="space-y-6 pb-16 md:pb-0 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary">Focus Timer</h1>
        <p className="text-sm text-muted mt-0.5">Pomodoro technique for deep work sessions</p>
      </div>

      <div className="flex gap-2">
        {(Object.keys(MODES) as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={'flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ' + (mode === m ? 'bg-primary text-background' : 'bg-surface text-muted hover:text-primary')}
          >
            {MODES[m].label}
          </button>
        ))}
      </div>

      <Card className="flex flex-col items-center py-10">
        <div className="relative w-56 h-56 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#EEEAE2" strokeWidth="8" />
            <circle
              cx="100" cy="100" r="90" fill="none"
              stroke={mode === 'focus' ? '#C8FF4D' : mode === 'short' ? '#22c55e' : '#3b82f6'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDash}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-primary tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <span className="text-sm text-muted mt-1">{MODES[mode].label}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={reset}>
            Reset
          </Button>
          <Button
            variant={running ? 'secondary' : 'accent'}
            size="lg"
            leftIcon={running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            onClick={() => setRunning(r => !r)}
          >
            {running ? 'Pause' : 'Start'}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-primary">{completedToday}</p>
          <p className="text-xs text-muted">Today</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-primary">{sessions}</p>
          <p className="text-xs text-muted">This session</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-primary">{Math.round(completedToday * 25)}</p>
          <p className="text-xs text-muted">Minutes focused</p>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-primary mb-3">How it works</h3>
        <div className="space-y-2 text-xs text-muted">
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" /><span>Work for 25 minutes without interruption</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" /><span>Take a 5 minute short break</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" /><span>After 4 sessions, take a 15 minute long break</span></div>
        </div>
      </Card>
    </div>
  );
}
