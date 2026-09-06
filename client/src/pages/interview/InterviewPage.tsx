import { useState, useRef, useEffect } from 'react';
import { Bot, Send, RotateCcw, Briefcase, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { api } from '../../lib/api';

interface Message { role: 'user' | 'assistant'; content: string; }

const ROLES = [
  { value: 'Frontend Developer', label: 'Frontend Developer' },
  { value: 'Backend Developer', label: 'Backend Developer' },
  { value: 'Full-Stack Developer', label: 'Full-Stack Developer' },
  { value: 'UI/UX Designer', label: 'UI/UX Designer' },
  { value: 'Data Analyst', label: 'Data Analyst' },
  { value: 'AI/ML Engineer', label: 'AI/ML Engineer' },
  { value: 'Digital Marketer', label: 'Digital Marketer' },
  { value: 'Custom', label: 'Custom role...' },
];

const LEVELS = [
  { value: 'internship', label: 'Internship' },
  { value: 'junior', label: 'Junior (0-2 years)' },
  { value: 'mid', label: 'Mid-level (2-5 years)' },
];

export default function InterviewPage() {
  const [role, setRole] = useState('Frontend Developer');
  const [customRole, setCustomRole] = useState('');
  const [level, setLevel] = useState('internship');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const targetRole = role === 'Custom' ? customRole : role;

  const startInterview = async () => {
    if (!targetRole.trim()) { toast.error('Enter a role name'); return; }
    setSending(true);
    try {
      const convRes = await api.post<{ success: boolean; data: { id: number } }>(
        '/ai/conversations',
        { title: 'Interview: ' + targetRole }
      );
      const cid = convRes.data.data.id;
      setConvId(cid);

      const startPrompt = 'You are a professional technical interviewer. Conduct a realistic ' + level + ' level ' + targetRole + ' interview. Start by briefly introducing yourself as the interviewer, then ask your first interview question. After each of my answers, give brief encouraging feedback then ask the next question. Ask 5-7 questions total, then give a final assessment with a score out of 10 and specific feedback.';

      const msgRes = await api.post<{ success: boolean; data: { content: string } }>(
        '/ai/conversations/' + cid + '/messages',
        { content: startPrompt }
      );

      setMessages([{ role: 'assistant', content: msgRes.data.data.content }]);
      setStarted(true);
    } catch (err) {
      toast.error('Failed to start interview. Check your AI configuration.');
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    if (!input.trim() || sending || !convId) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setSending(true);
    try {
      const res = await api.post<{ success: boolean; data: { content: string } }>(
        '/ai/conversations/' + convId + '/messages',
        { content: userMsg }
      );
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.data.content }]);
    } catch (err) {
      toast.error('Failed to send message. Try again.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([]); setStarted(false);
    setConvId(null); setInput('');
  };

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Interview Prep</h1>
          <p className="text-sm text-muted mt-0.5">Practice with an AI interviewer for any role</p>
        </div>
        {started && (
          <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={reset}>
            New Session
          </Button>
        )}
      </div>

      {!started ? (
        <Card>
          <h2 className="text-sm font-semibold text-primary mb-4">Configure Your Interview</h2>
          <div className="space-y-4">
            <Select label="Role" options={ROLES} value={role} onChange={e => setRole(e.target.value)} />
            {role === 'Custom' && (
              <Input label="Custom role name" placeholder="e.g. DevOps Engineer" value={customRole} onChange={e => setCustomRole(e.target.value)} />
            )}
            <Select label="Level" options={LEVELS} value={level} onChange={e => setLevel(e.target.value)} />
            <Card variant="surface" padding="sm">
              <p className="text-xs font-semibold text-primary mb-1">What to expect</p>
              <p className="text-xs text-muted">The AI will conduct a realistic mock interview with 5-7 questions. Answer as you would in a real interview. You will receive feedback and a final score.</p>
            </Card>
            <Button
              variant="accent"
              className="w-full"
              isLoading={sending}
              leftIcon={<Briefcase className="w-4 h-4" />}
              onClick={startInterview}
            >
              {sending ? 'Starting interview...' : 'Start Interview'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 14rem)' }}>
          <div className="flex-shrink-0 px-5 py-3 border-b border-border flex items-center gap-2 bg-surface/50">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">AI Interviewer</p>
              <p className="text-xs text-muted">{targetRole} — {level}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 bg-accent rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ' + (msg.role === 'user' ? 'bg-primary text-background' : 'bg-surface text-primary')}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-accent rounded-lg flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-surface rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="flex-shrink-0 p-4 border-t border-border">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
                rows={2}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="p-2.5 rounded-xl bg-accent text-primary hover:bg-accent/90 transition-colors disabled:opacity-40 self-end"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
