import React, { useState, useEffect, useRef } from 'react';
import { Search, X, CheckSquare, BookOpen, Zap, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface SearchResult {
  id: number;
  type: 'task' | 'study' | 'skill' | 'opportunity';
  title: string;
  subtitle?: string;
  path: string;
}

const ICONS = {
  task: CheckSquare,
  study: BookOpen,
  skill: Zap,
  opportunity: Briefcase,
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const { data: results = [] } = useQuery({
    queryKey: ['search', query],
    enabled: query.length >= 2,
    queryFn: async (): Promise<SearchResult[]> => {
      const q = encodeURIComponent(query);
      const [tasksRes, plansRes, skillsRes, oppsRes] = await Promise.allSettled([
        api.get('/tasks?limit=5'),
        api.get('/study?limit=5'),
        api.get('/skills/paths'),
        api.get('/opportunities?search=' + q + '&limit=5'),
      ]);
      const results: SearchResult[] = [];
      const lower = query.toLowerCase();
      if (tasksRes.status === 'fulfilled') {
        (tasksRes.value.data.data as Array<{ id: number; title: string; category: string }>)
          .filter(t => t.title.toLowerCase().includes(lower))
          .slice(0, 3)
          .forEach(t => results.push({ id: t.id, type: 'task', title: t.title, subtitle: t.category, path: '/app/tasks' }));
      }
      if (plansRes.status === 'fulfilled') {
        (plansRes.value.data.data as Array<{ id: number; title: string; subject: string }>)
          .filter(p => p.title.toLowerCase().includes(lower) || p.subject.toLowerCase().includes(lower))
          .slice(0, 3)
          .forEach(p => results.push({ id: p.id, type: 'study', title: p.title, subtitle: p.subject, path: '/app/study' }));
      }
      if (skillsRes.status === 'fulfilled') {
        (skillsRes.value.data.data as Array<{ id: number; title: string; category: string }>)
          .filter(s => s.title.toLowerCase().includes(lower))
          .slice(0, 3)
          .forEach(s => results.push({ id: s.id, type: 'skill', title: s.title, subtitle: s.category, path: '/app/skills' }));
      }
      if (oppsRes.status === 'fulfilled') {
        (oppsRes.value.data.data as Array<{ id: number; title: string; company: string }>)
          .slice(0, 3)
          .forEach(o => results.push({ id: o.id, type: 'opportunity', title: o.title, subtitle: o.company, path: '/app/opportunities' }));
      }
      return results;
    },
    staleTime: 1000 * 30,
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-muted hover:text-primary transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search...</span>
        <kbd className="text-xs bg-card border border-border px-1.5 py-0.5 rounded">Ctrl K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, plans, skills, opportunities..."
            className="flex-1 text-sm text-primary bg-transparent outline-none placeholder:text-muted"
          />
          <button onClick={() => setOpen(false)} className="text-muted hover:text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
        {query.length >= 2 && (
          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No results found for "{query}"</p>
            ) : (
              <div className="p-2 space-y-0.5">
                {results.map((r, i) => {
                  const Icon = ICONS[r.type];
                  return (
                    <button
                      key={r.type + '-' + r.id + '-' + i}
                      onClick={() => { navigate(r.path); setOpen(false); setQuery(''); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors text-left"
                    >
                      <div className="w-7 h-7 bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{r.title}</p>
                        {r.subtitle && <p className="text-xs text-muted capitalize">{r.subtitle}</p>}
                      </div>
                      <span className="text-xs text-muted capitalize flex-shrink-0">{r.type}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {query.length < 2 && (
          <div className="p-4 text-center text-xs text-muted">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
}
