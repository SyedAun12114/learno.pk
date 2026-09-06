import { useState } from 'react';
import { Bot, ChevronLeft, ChevronRight, RotateCcw, Check, X, Shuffle, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';
import { api } from '../../lib/api';

interface Flashcard { question: string; answer: string; }
type Mode = 'generate' | 'study' | 'results';

const COUNTS = [
  { value: '5', label: '5 cards' },
  { value: '10', label: '10 cards' },
  { value: '15', label: '15 cards' },
  { value: '20', label: '20 cards' },
];

export default function FlashcardsPage() {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState('10');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<Mode>('generate');
  const toast = useToast();

  const generate = async () => {
    if (!topic.trim()) { toast.error('Enter a topic first'); return; }
    setGenerating(true);
    try {
      const convRes = await api.post<{ success: boolean; data: { id: number } }>(
        '/ai/conversations',
        { title: 'Flashcards: ' + topic }
      );
      const convId = convRes.data.data.id;

      const prompt = 'Generate ' + count + ' flashcards about: ' + topic + '. Return ONLY valid JSON in this exact format: {"cards":[{"question":"What is X?","answer":"X is..."}]} Make questions test genuine understanding. No extra text outside the JSON.';

      const msgRes = await api.post<{ success: boolean; data: { content: string } }>(
        '/ai/conversations/' + convId + '/messages',
        { content: prompt }
      );

      const content = msgRes.data.data.content;
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in AI response');

      const parsed = JSON.parse(match[0]);
      if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
        throw new Error('Invalid flashcard format returned');
      }

      setCards(parsed.cards);
      setIndex(0);
      setFlipped(false);
      setKnown(new Set());
      setUnknown(new Set());
      setMode('study');
      toast.success(parsed.cards.length + ' flashcards generated!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to generate flashcards: ' + msg);
    } finally {
      setGenerating(false);
    }
  };

  const shuffle = () => {
    setCards(c => [...c].sort(() => Math.random() - 0.5));
    setIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
  };

  const markKnown = () => {
    setKnown(k => new Set([...k, index]));
    setUnknown(u => { const n = new Set(u); n.delete(index); return n; });
    nextCard();
  };

  const markUnknown = () => {
    setUnknown(u => new Set([...u, index]));
    setKnown(k => { const n = new Set(k); n.delete(index); return n; });
    nextCard();
  };

  const nextCard = () => {
    if (index < cards.length - 1) { setIndex(i => i + 1); setFlipped(false); }
    else setMode('results');
  };

  const prevCard = () => {
    if (index > 0) { setIndex(i => i - 1); setFlipped(false); }
  };

  const restart = () => {
    setIndex(0); setFlipped(false);
    setKnown(new Set()); setUnknown(new Set());
    setMode('study');
  };

  return (
    <div className="space-y-6 pb-16 md:pb-0 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary">AI Flashcards</h1>
        <p className="text-sm text-muted mt-0.5">Generate and study flashcards on any topic</p>
      </div>

      {mode === 'generate' && (
        <Card>
          <h2 className="text-sm font-semibold text-primary mb-4">Generate Flashcards</h2>
          <div className="space-y-4">
            <Input
              label="Topic *"
              placeholder="e.g. JavaScript Arrays, Photosynthesis, World War 2"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') generate(); }}
            />
            <Select
              label="Number of cards"
              options={COUNTS}
              value={count}
              onChange={e => setCount(e.target.value)}
            />
            <Button
              variant="accent"
              className="w-full"
              isLoading={generating}
              leftIcon={<Bot className="w-4 h-4" />}
              onClick={generate}
            >
              {generating ? 'Generating flashcards...' : 'Generate Flashcards'}
            </Button>
          </div>
        </Card>
      )}

      {mode === 'study' && cards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">{index + 1} of {cards.length}</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-600"><Check className="w-3.5 h-3.5" />{known.size} known</span>
              <span className="flex items-center gap-1 text-red-500"><X className="w-3.5 h-3.5" />{unknown.size} learning</span>
            </div>
          </div>

          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: (index / cards.length * 100) + '%' }} />
          </div>

          <div className="cursor-pointer select-none" onClick={() => setFlipped(f => !f)}>
            <Card className={'min-h-64 flex flex-col items-center justify-center text-center p-8 transition-colors ' + (flipped ? 'bg-primary' : 'hover:border-accent/50')}>
              <p className={'text-xs font-semibold uppercase tracking-widest mb-4 ' + (flipped ? 'text-background/60' : 'text-muted')}>
                {flipped ? 'Answer' : 'Question — tap to reveal answer'}
              </p>
              <p className={'text-lg font-medium leading-relaxed ' + (flipped ? 'text-background' : 'text-primary')}>
                {flipped ? cards[index].answer : cards[index].question}
              </p>
            </Card>
          </div>

          {flipped && (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="danger" className="w-full" leftIcon={<X className="w-4 h-4" />} onClick={markUnknown}>
                Still learning
              </Button>
              <Button variant="accent" className="w-full" leftIcon={<Check className="w-4 h-4" />} onClick={markKnown}>
                Got it
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />} onClick={prevCard} disabled={index === 0}>
              Prev
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Shuffle className="w-3.5 h-3.5" />} onClick={shuffle}>
              Shuffle
            </Button>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />} onClick={nextCard} disabled={index === cards.length - 1}>
              Next
            </Button>
          </div>
        </div>
      )}

      {mode === 'results' && (
        <Card className="text-center py-10">
          <div className="text-5xl font-bold text-primary mb-2">
            {Math.round((known.size / cards.length) * 100)}%
          </div>
          <p className="text-sm text-muted mb-6">{known.size} of {cards.length} cards marked as known</p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-8">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{known.size}</p>
              <p className="text-xs text-green-600">Known</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{unknown.size}</p>
              <p className="text-xs text-red-500">Still learning</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={restart}>
              Study again
            </Button>
            <Button variant="accent" onClick={() => { setMode('generate'); setCards([]); setTopic(''); }}>
              New topic
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
