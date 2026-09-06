import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const toast = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('learno_notes');
    if (saved) {
      const parsed: Note[] = JSON.parse(saved);
      setNotes(parsed);
      if (parsed.length > 0) {
        setActive(parsed[0]);
        setTitle(parsed[0].title);
        setContent(parsed[0].content);
      }
    }
  }, []);

  const saveNotes = (updated: Note[]) => {
    setNotes(updated);
    localStorage.setItem('learno_notes', JSON.stringify(updated));
  };

  const createNote = () => {
    const note: Note = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [note, ...notes];
    saveNotes(updated);
    setActive(note);
    setTitle(note.title);
    setContent(note.content);
  };

  const saveActive = () => {
    if (!active) return;
    const updated = notes.map(n =>
      n.id === active.id ? { ...n, title, content, updatedAt: new Date().toISOString() } : n
    );
    saveNotes(updated);
    setActive(prev => prev ? { ...prev, title, content } : null);
    toast.success('Note saved');
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    saveNotes(updated);
    if (active?.id === id) {
      const next = updated[0] || null;
      setActive(next);
      setTitle(next?.title || '');
      setContent(next?.content || '');
    }
    toast.success('Note deleted');
  };

  const selectNote = (note: Note) => {
    setActive(note);
    setTitle(note.title);
    setContent(note.content);
  };

  return (
    <div className="space-y-5 pb-16 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Quick Notes</h1>
          <p className="text-sm text-muted mt-0.5">Private notes saved on this device</p>
        </div>
        <Button size="sm" variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={createNote}>
          New Note
        </Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-14rem)]">
        <div className="w-56 flex-shrink-0 overflow-y-auto space-y-1 scrollbar-thin">
          {notes.length === 0 && (
            <p className="text-sm text-muted text-center py-8">No notes yet. Create your first one.</p>
          )}
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => selectNote(note)}
              className={'w-full text-left px-3 py-3 rounded-xl transition-colors group ' + (active?.id === note.id ? 'bg-primary text-background' : 'bg-surface hover:bg-border text-primary')}
            >
              <p className={'text-sm font-medium truncate ' + (active?.id === note.id ? 'text-background' : 'text-primary')}>
                {note.title || 'Untitled'}
              </p>
              <p className={'text-xs mt-0.5 truncate ' + (active?.id === note.id ? 'text-background/70' : 'text-muted')}>
                {note.content.slice(0, 40) || 'Empty note'}
              </p>
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {active ? (
            <Card className="flex-1 flex flex-col" padding="none">
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="flex-1 text-base font-semibold text-primary bg-transparent outline-none placeholder:text-muted"
                  placeholder="Note title..."
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="sm" variant="accent" leftIcon={<Save className="w-3.5 h-3.5" />} onClick={saveActive}>
                    Save
                  </Button>
                  <button
                    onClick={() => deleteNote(active.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Start writing..."
                className="flex-1 p-4 text-sm text-primary bg-transparent outline-none resize-none leading-relaxed"
              />
            </Card>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-primary mb-1">No note selected</p>
                <p className="text-xs text-muted mb-4">Create a new note or select one from the list</p>
                <Button size="sm" variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={createNote}>
                  Create Note
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
