import { useState } from 'react';
import { Bot, Download, FileText, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../hooks/useToast';
import { api } from '../../lib/api';
import type { StudentProfile } from '../../../../shared/types';

export default function CVBuilderPage() {
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [extra, setExtra] = useState('');
  const [cv, setCv] = useState('');
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: StudentProfile }>('/profile');
      return r.data.data;
    },
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['my-skills'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: unknown[] }>('/skills/my-skills');
      return r.data.data;
    },
  });

  const generate = async () => {
    if (!profile) {
      toast.error('Complete your profile in Settings first');
      return;
    }
    setGenerating(true);
    try {
      const skillList = (skills as Array<Record<string, unknown>>)
        .map(s => String(s.pathTitle || ''))
        .filter(Boolean)
        .join(', ');

      const lines = [
        'Generate a professional CV for the Pakistan job market.',
        'Name: ' + profile.fullName,
        'Education: ' + (profile.educationLevel || 'Student') + ' at ' + (profile.institution || 'University'),
        'Career Goal: ' + (profile.careerGoal || profile.careerInterest || 'Software Development'),
        'Current Skills: ' + (profile.currentSkills || 'Not specified'),
        'Learning Paths: ' + (skillList || 'Various'),
      ];
      if (phone) lines.push('Phone: ' + phone);
      if (linkedin) lines.push('LinkedIn: ' + linkedin);
      if (github) lines.push('GitHub: ' + github);
      if (extra) lines.push('Additional info: ' + extra);
      lines.push('');
      lines.push('Create a clean ATS-friendly CV with sections: Contact Info, Career Objective, Education, Technical Skills, Projects and Learning, and Certifications if applicable.');
      lines.push('Use plain text with dashes for bullets. Keep it to 1 page.');

      const prompt = lines.join('\n');

      const convRes = await api.post<{ success: boolean; data: { id: number } }>(
        '/ai/conversations',
        { title: 'CV: ' + profile.fullName }
      );
      const cid = convRes.data.data.id;

      const msgRes = await api.post<{ success: boolean; data: { content: string } }>(
        '/ai/conversations/' + cid + '/messages',
        { content: prompt }
      );

      setCv(msgRes.data.data.content);
      toast.success('CV generated! Copy it into Word or Google Docs.');
    } catch {
      toast.error('Failed to generate CV. Check your AI configuration.');
    } finally {
      setGenerating(false);
    }
  };

  const copyCV = () => {
    navigator.clipboard.writeText(cv);
    toast.success('CV copied to clipboard!');
  };

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-primary">CV Builder</h1>
        <p className="text-sm text-muted mt-0.5">
          AI generates a professional CV from your Learno profile
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary">Profile Used</h2>
            </div>
            {profile ? (
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Name', value: profile.fullName },
                  { label: 'Education', value: profile.educationLevel || '-' },
                  { label: 'Institution', value: profile.institution || '-' },
                  { label: 'Skills', value: profile.currentSkills || '-' },
                  { label: 'Career Goal', value: profile.careerGoal || '-' },
                ].map(row => (
                  <div
                    key={row.label}
                    className="flex justify-between py-1.5 border-b border-border last:border-0"
                  >
                    <span className="text-muted">{row.label}</span>
                    <span className="text-primary text-right max-w-48 truncate">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                Complete your profile in Settings first.
              </p>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary">Additional Details</h2>
            </div>
            <div className="space-y-3">
              <Input
                label="Phone"
                placeholder="+92 300 1234567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <Input
                label="LinkedIn"
                placeholder="linkedin.com/in/yourname"
                value={linkedin}
                onChange={e => setLinkedin(e.target.value)}
              />
              <Input
                label="GitHub"
                placeholder="github.com/yourname"
                value={github}
                onChange={e => setGithub(e.target.value)}
              />
              <Textarea
                label="Projects, internships or achievements"
                placeholder="Any additional experience you want to include..."
                rows={3}
                value={extra}
                onChange={e => setExtra(e.target.value)}
              />
              <Button
                variant="accent"
                className="w-full"
                isLoading={generating}
                leftIcon={<Bot className="w-4 h-4" />}
                onClick={generate}
              >
                {generating ? 'Generating your CV...' : 'Generate My CV'}
              </Button>
            </div>
          </Card>
        </div>

        <div>
          {cv ? (
            <Card className="flex flex-col" style={{ minHeight: '500px' }}>
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h2 className="text-sm font-semibold text-primary">Your CV</h2>
                <Button
                  size="sm"
                  variant="accent"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={copyCV}
                >
                  Copy to clipboard
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <pre className="text-xs text-primary whitespace-pre-wrap font-mono leading-relaxed bg-surface rounded-xl p-4">
                  {cv}
                </pre>
              </div>
              <p className="text-xs text-muted mt-3 flex-shrink-0">
                Copy and paste into Word or Google Docs, format, then download as PDF.
              </p>
            </Card>
          ) : (
            <Card
              className="flex items-center justify-center"
              style={{ minHeight: '300px' }}
            >
              <div className="text-center">
                <FileText className="w-10 h-10 text-muted mx-auto mb-3" />
                <p className="text-sm font-medium text-primary mb-1">
                  Your CV will appear here
                </p>
                <p className="text-xs text-muted">
                  Fill in the details on the left and click Generate
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}