import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Send, Plus, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, getErrorMessage } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import type { AIConversation, AIMessage } from '../../../../shared/types';

const MODES = [
  { id: 'explain', label: 'Explain' },
  { id: 'simplify', label: 'Simplify' },
  { id: 'quiz', label: 'Quiz Me' },
  { id: 'example', label: 'Give Example' },
  { id: 'practice', label: 'Practice Questions' },
];

export default function AIAssistantPage() {
  const [convId, setConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const qc = useQueryClient();

  const { data: convs = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: AIConversation[] }>('/ai/conversations');
      return r.data.data;
    },
  });

  const { data: usage } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: { todayCount: number; dailyLimit: number; remaining: number } }>('/ai/usage');
      return r.data.data;
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConv = async (id: number) => {
    try {
      const r = await api.get<{ success: boolean; data: AIConversation }>('/ai/conversations/' + id);
      setConvId(id);
      setMessages(r.data.data.messages || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const newConv = async () => {
    try {
      const r = await api.post<{ success: boolean; data: { id: number } }>('/ai/conversations');
      setConvId(r.data.data.id);
      setMessages([]);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const send = async () => {
    if (!input.trim() || sending) return;
    let cid = convId;
    if (!cid) {
      try {
        const r = await api.post<{ success: boolean; data: { id: number } }>('/ai/conversations');
        cid = r.data.data.id;
        setConvId(cid);
        qc.invalidateQueries({ queryKey: ['conversations'] });
      } catch (err) {
        toast.error(getErrorMessage(err));
        return;
      }
    }
    const content = input.trim();
    const userMsg: AIMessage = { id: Date.now(), conversationId: cid, role: 'user', content, createdAt: new Date().toISOString() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setSending(true);
    try {
      const r = await api.post<{ success: boolean; data: { role: string; content: string } }>(
        '/ai/conversations/' + cid + '/messages',
        { content, mode: mode || undefined }
      );
      const aiMsg: AIMessage = { id: Date.now() + 1, conversationId: cid, role: 'assistant', content: r.data.data.content, createdAt: new Date().toISOString() };
      setMessages(p => [...p, aiMsg]);
      qc.invalidateQueries({ queryKey: ['conversations', 'ai-usage'] });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setMessages(p => p.slice(0, -1));
    } finally {
      setSending(false);
      setMode(null);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-4 pb-16 md:pb-0">
      <div className="hidden md:flex flex-col w-52 flex-shrink-0 gap-3">
        <Button size="sm" variant="secondary" leftIcon={<Plus className="w-4 h-4" />} onClick={newConv} className="w-full">
          New chat
        </Button>
        {usage && (
          <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs">
            <p className="text-muted">Today: {usage.todayCount}/{usage.dailyLimit}</p>
            <div className="mt-1 h-1 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: ((usage.todayCount / usage.dailyLimit) * 100) + '%' }} />
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
          {(convs as Array<Record<string, unknown>>).map(c => (
            <button
              key={c.id as number}
              onClick={() => loadConv(c.id as number)}
              className={'w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors truncate ' + (convId === c.id ? 'bg-surface text-primary font-medium' : 'text-muted hover:text-primary hover:bg-surface')}
            >
              {String(c.title || 'New conversation')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex-shrink-0 px-5 py-3 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">AI Study Assistant</p>
            <p className="text-xs text-muted">Powered by Claude</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-muted" />
              </div>
              <h3 className="text-sm font-semibold text-primary mb-1">How can I help you today?</h3>
              <p className="text-xs text-muted max-w-xs">Ask me to explain a concept, create practice questions, or help you understand any topic.</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 bg-accent rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={'max-w-[80%] rounded-2xl px-4 py-3 text-sm ' + (msg.role === 'user' ? 'bg-primary text-background ml-auto' : 'bg-surface text-primary')}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    className="prose prose-sm max-w-none"
                    components={{
                      strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-sm">{children}</li>,
                      h1: ({ children }) => <h1 className="text-base font-bold mb-2 text-primary">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 text-primary">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-primary">{children}</h3>,
                      code: ({ children }) => <code className="bg-surface px-1.5 py-0.5 rounded text-xs font-mono text-primary">{children}</code>,
                      pre: ({ children }) => <pre className="bg-surface p-3 rounded-xl text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-accent pl-3 text-muted italic mb-2">{children}</blockquote>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>                ) : (
                  <p>{msg.content}</p>
                )}
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

        <div className="flex-shrink-0 px-4 pt-2 flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(mode === m.id ? null : m.id)}
              className={'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ' + (mode === m.id ? 'bg-accent text-primary' : 'bg-surface text-muted hover:text-primary')}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex-shrink-0 p-4 border-t border-border">
          {mode && (
            <div className="mb-2 text-xs text-muted">
              Mode: <span className="text-primary font-medium">{MODES.find(m => m.id === mode)?.label}</span>
              <button onClick={() => setMode(null)} className="ml-2 text-muted hover:text-primary">x</button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything about your studies..."
              rows={1}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="p-2.5 rounded-xl bg-accent text-primary hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
