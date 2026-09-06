import { useState, useEffect } from 'react';
import { Settings, User, Save, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import type { StudentProfile } from '../../../../shared/types';

const EDU_OPTIONS = [
  { value: '', label: 'Select level' },
  { value: 'High School', label: 'High School' },
  { value: 'Intermediate', label: 'Intermediate / A-Levels' },
  { value: 'Undergraduate', label: 'Undergraduate' },
  { value: 'Postgraduate', label: 'Postgraduate' },
  { value: 'Self-taught', label: 'Self-taught' },
];

interface FormState {
  fullName: string;
  age: string;
  educationLevel: string;
  institution: string;
  careerInterest: string;
  dailyLearningMinutes: string;
  academicGoal: string;
  careerGoal: string;
  currentSkills: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState<FormState>({
    fullName: '',
    age: '',
    educationLevel: '',
    institution: '',
    careerInterest: '',
    dailyLearningMinutes: '60',
    academicGoal: '',
    careerGoal: '',
    currentSkills: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: StudentProfile }>('/profile');
      return r.data.data;
    },
    staleTime: 0,
  });

  // Sync form whenever profile data arrives from server
  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName || '',
        age: profile.age?.toString() || '',
        educationLevel: profile.educationLevel || '',
        institution: profile.institution || '',
        careerInterest: profile.careerInterest || '',
        dailyLearningMinutes: profile.dailyLearningMinutes?.toString() || '60',
        academicGoal: profile.academicGoal || '',
        careerGoal: profile.careerGoal || '',
        currentSkills: profile.currentSkills || '',
      });
    }
  }, [profile]);

  const update = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const r = await api.put('/profile', data);
      if (!r.data.success) throw new Error(r.data.error || 'Update failed');
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['ai-insight'] });
      toast.success('Profile saved successfully');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const handleSave = () => {
    if (!form.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    update.mutate({
      fullName: form.fullName.trim(),
      age: form.age ? parseInt(form.age, 10) : undefined,
      educationLevel: form.educationLevel || undefined,
      institution: form.institution || undefined,
      careerInterest: form.careerInterest || undefined,
      dailyLearningMinutes: parseInt(form.dailyLearningMinutes, 10) || 60,
      academicGoal: form.academicGoal || undefined,
      careerGoal: form.careerGoal || undefined,
      currentSkills: form.currentSkills || undefined,
    });
  };

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 md:pb-0 max-w-2xl">
      <h1 className="text-2xl font-bold text-primary">Settings</h1>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <User className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-primary">Account</h2>
        </div>
        <div className="divide-y divide-border text-sm">
          <div className="flex justify-between py-3">
            <span className="text-muted">Email</span>
            <span className="text-primary font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-muted">Role</span>
            <span className="text-primary font-medium capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-muted">Status</span>
            <span className="text-green-600 font-medium">Active</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-5">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-primary">Profile</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full name *" placeholder="Your name" {...field('fullName')} />
            <Input label="Age" type="number" placeholder="e.g. 20" {...field('age')} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-primary">Education level</label>
            <select
              {...field('educationLevel')}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            >
              {EDU_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <Input label="School / University" placeholder="e.g. FAST NUCES" {...field('institution')} />

          <Input label="Career interest" placeholder="e.g. Frontend Development" {...field('careerInterest')} />

          <Input
            label="Current skills"
            placeholder="e.g. HTML, CSS, JavaScript"
            hint="Comma-separated"
            {...field('currentSkills')}
          />

          <Textarea
            label="Academic goal"
            placeholder="e.g. Pass all exams with distinction"
            rows={2}
            {...field('academicGoal')}
          />

          <Textarea
            label="Career goal"
            placeholder="e.g. Get a frontend job within 6 months"
            rows={2}
            {...field('careerGoal')}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-primary">Daily study time</label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {['30', '60', '90', '120', '180', '240'].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, dailyLearningMinutes: mins }))}
                  className={
                    'py-2.5 rounded-xl border text-sm font-medium transition-colors ' +
                    (form.dailyLearningMinutes === mins
                      ? 'bg-accent text-primary border-accent'
                      : 'bg-surface border-border text-muted hover:border-primary/40')
                  }
                >
                  {parseInt(mins) < 60 ? mins + 'm' : (parseInt(mins) / 60) + 'h'}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="accent"
            className="w-full"
            isLoading={update.isPending}
            leftIcon={<Save className="w-4 h-4" />}
            onClick={handleSave}
          >
            {update.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}