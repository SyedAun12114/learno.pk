import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { api, getErrorMessage } from '../../lib/api';

const EDU = [
  { value: '', label: 'Select level' },
  { value: 'High School', label: 'High School' },
  { value: 'Intermediate', label: 'Intermediate / A-Levels' },
  { value: 'Undergraduate', label: 'Undergraduate' },
  { value: 'Postgraduate', label: 'Postgraduate' },
  { value: 'Self-taught', label: 'Self-taught' },
];

const CAREER = [
  { value: '', label: 'Select interest' },
  { value: 'Frontend Development', label: 'Frontend Development' },
  { value: 'Backend Development', label: 'Backend Development' },
  { value: 'Full-Stack Development', label: 'Full-Stack Development' },
  { value: 'AI/ML Engineering', label: 'AI/ML Engineering' },
  { value: 'UI/UX Design', label: 'UI/UX Design' },
  { value: 'Data Science', label: 'Data Science' },
  { value: 'Digital Marketing', label: 'Digital Marketing' },
  { value: 'Graphic Design', label: 'Graphic Design' },
  { value: 'Other', label: 'Other' },
];

const STEPS = [
  { title: 'About you', desc: "Let's start with the basics" },
  { title: 'Your education', desc: 'Tell us about your studies' },
  { title: 'Your goals', desc: 'Where do you want to go?' },
  { title: 'Your schedule', desc: 'How much time do you have?' },
];

type Form = {
  fullName: string; age: string; educationLevel: string; institution: string;
  subjects: string; careerInterest: string; currentSkills: string;
  academicGoal: string; careerGoal: string; dailyLearningMinutes: string;
};

const DEF: Form = {
  fullName: '', age: '', educationLevel: '', institution: '',
  subjects: '', careerInterest: '', currentSkills: '',
  academicGoal: '', careerGoal: '', dailyLearningMinutes: '60',
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Form>(DEF);
  const { setUser, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const pct = ((step + 1) / STEPS.length) * 100;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/profile/onboarding', {
        fullName: form.fullName,
        age: form.age ? parseInt(form.age) : undefined,
        educationLevel: form.educationLevel || undefined,
        institution: form.institution || undefined,
        careerInterest: form.careerInterest || undefined,
        dailyLearningMinutes: parseInt(form.dailyLearningMinutes) || 60,
        academicGoal: form.academicGoal || undefined,
        careerGoal: form.careerGoal || undefined,
        currentSkills: form.currentSkills || undefined,
        subjects: form.subjects ? form.subjects.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      if (user) setUser({ ...user, isOnboarded: true });
      toast.success('Welcome to Learno!');
      navigate('/app/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-accent" />
            </div>
            <span className="font-bold text-primary">Learno</span>
          </div>
          <span className="text-xs text-muted">{step + 1} of {STEPS.length}</span>
        </div>
        <div className="h-1 bg-surface">
          <div className="h-full bg-accent transition-all duration-500" style={{ width: pct + '%' }} />
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-primary">{STEPS[step].title}</h1>
            <p className="text-muted text-sm mt-1">{STEPS[step].desc}</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            {step === 0 && (
              <>
                <Input label="Full name *" placeholder="e.g. Aun Raza" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
                <Input label="Age" type="number" placeholder="e.g. 20" value={form.age} onChange={e => set('age', e.target.value)} />
              </>
            )}
            {step === 1 && (
              <>
                <Select label="Education level" options={EDU} value={form.educationLevel} onChange={e => set('educationLevel', e.target.value)} />
                <Input label="School / University" placeholder="e.g. FAST NUCES" value={form.institution} onChange={e => set('institution', e.target.value)} />
                <Input label="Current subjects" placeholder="e.g. Mathematics, Physics, CS" hint="Separate with commas" value={form.subjects} onChange={e => set('subjects', e.target.value)} />
              </>
            )}
            {step === 2 && (
              <>
                <Select label="Career interest" options={CAREER} value={form.careerInterest} onChange={e => set('careerInterest', e.target.value)} />
                <Input label="Current skills" placeholder="e.g. HTML, CSS, JavaScript" hint="Skills you already have" value={form.currentSkills} onChange={e => set('currentSkills', e.target.value)} />
                <Textarea label="Academic goal" placeholder="e.g. Pass all exams with A grades" rows={2} value={form.academicGoal} onChange={e => set('academicGoal', e.target.value)} />
                <Textarea label="Career goal" placeholder="e.g. Get a frontend job in 6 months" rows={2} value={form.careerGoal} onChange={e => set('careerGoal', e.target.value)} />
              </>
            )}
            {step === 3 && (
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Daily learning time</label>
                <div className="grid grid-cols-3 gap-2">
                  {['30', '60', '90', '120', '180', '240'].map(m => (
                    <label
                      key={m}
                      className={'flex items-center justify-center py-3 rounded-xl border cursor-pointer text-sm font-medium transition-colors ' + (form.dailyLearningMinutes === m ? 'bg-accent text-primary border-accent' : 'bg-surface border-border text-muted hover:border-primary/40')}
                    >
                      <input
                        type="radio"
                        value={m}
                        checked={form.dailyLearningMinutes === m}
                        onChange={e => set('dailyLearningMinutes', e.target.value)}
                        className="sr-only"
                      />
                      {parseInt(m) < 60 ? m + 'm' : (parseInt(m) / 60) + 'h'}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-5 gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                variant="accent"
                onClick={() => setStep(s => s + 1)}
                disabled={step === 0 && !form.fullName.trim()}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="accent"
                isLoading={loading}
                onClick={handleSubmit}
                rightIcon={<Check className="w-4 h-4" />}
              >
                Finish setup
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted mt-5">
            You can update this information later in Settings.
          </p>
        </div>
      </main>
    </div>
  );
}
