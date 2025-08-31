import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

interface HistoryItem {
  id: string;
  createdAt: string;
  type: 'single' | 'comparison';
  files: string[];
  preview?: string;
  modality?: 'ECG' | 'X-ray' | 'Unknown';
  fullAnswer?: string;
}

const STORAGE_KEY = 'analysisHistory';

const ProfileSection = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  const toDateKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

  // --- Local text analysis utils (heuristic) ---
  const POSITIVE = [
    'normal', 'clear', 'improved', 'stable', 'within normal range', 'no abnormality', 'no effusion', 'no consolidation'
  ];
  const NEGATIVE = [
    'worse', 'worsening', 'abnormal', 'effusion', 'consolidation', 'fracture', 'opacity', 'pneumonia', 'critical', 'urgent', 'high risk'
  ];

  const clamp = (v:number, lo=0, hi=100) => Math.max(lo, Math.min(hi, v));

  const analyzeText = (txt: string) => {
    const t = (txt || '').toLowerCase();
    let score = 50;
    let pos = 0, neg = 0;
    for (const k of POSITIVE) { const c = (t.match(new RegExp(k, 'g')) || []).length; pos += c; score += 6 * c; }
    for (const k of NEGATIVE) { const c = (t.match(new RegExp(k, 'g')) || []).length; neg += c; score -= 8 * c; }
    // Quick heart-rate extraction if present
    const hrMatch = t.match(/(\d{2,3})\s?bpm/);
    const hr = hrMatch ? parseInt(hrMatch[1], 10) : undefined;
    // Risk banding
    const s = clamp(score);
    let risk: 'Low' | 'Medium' | 'High' = 'Medium';
    if (s >= 70) risk = 'Low'; else if (s <= 40) risk = 'High';
    return { score: s, positives: pos, negatives: neg, hr };
  };

  const singles = useMemo(() => history.filter(h => h.type === 'single'), [history]);
  const singlesWithScores = useMemo(() => singles.map(h => ({
    ...h,
    metrics: analyzeText(h.fullAnswer || h.preview || ''),
  })), [singles]);

  const seriesByModality = useMemo(() => {
    const mods: ('ECG'|'X-ray')[] = ['ECG','X-ray'];
    const out: Record<string, { date: string; score: number }[]> = {};
    for (const m of mods) {
      const items = singlesWithScores.filter(s => s.modality === m)
        .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      out[m] = items.map(i => ({ date: toDateKey(i.createdAt), score: i.metrics.score }));
    }
    return out;
  }, [singlesWithScores]);

  const pickPrevLatestByModality = (mod: 'ECG' | 'X-ray') => {
    const all = singlesWithScores
      .filter(h => h.modality === mod)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { latest: all[0], previous: all[1] } as any;
  };

  const progressSummary = useMemo(() => {
    const out: { title: string; delta?: number; latest?: number }[] = [];
    for (const mod of ['ECG','X-ray'] as const) {
      const { latest, previous } = pickPrevLatestByModality(mod);
      if (latest && previous) {
        out.push({ title: mod, delta: clamp(latest.metrics.score - previous.metrics.score, -100, 100), latest: latest.metrics.score });
      } else if (latest) {
        out.push({ title: mod, delta: undefined, latest: latest.metrics.score });
      }
    }
    return out;
  }, [refreshTick, history]);

  const healthBreakdown = useMemo(() => {
    // Aggregate last 6 singles
    const recent = singlesWithScores
      .slice()
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
    const total = recent.length || 1;
    const sumScore = recent.reduce((acc, r) => acc + r.metrics.score, 0);
    const avg = Math.round(sumScore / total);
    const pos = recent.reduce((acc, r) => acc + r.metrics.positives, 0);
    const neg = recent.reduce((acc, r) => acc + r.metrics.negatives, 0);
    return { avg, pos, neg };
  }, [singlesWithScores, refreshTick]);

  const dailyBar = useMemo(() => {
    // Most recent date group
    const groups: Record<string, typeof singlesWithScores> = {} as any;
    for (const h of singlesWithScores) {
      const k = toDateKey(h.createdAt);
      (groups[k] ||= []).push(h);
    }
    const dates = Object.keys(groups).sort().reverse();
    const today = dates[0];
    if (!today) return [] as { name: string; score: number }[];
    const rows = groups[today].map(h => ({ name: `${h.modality || 'Unknown'}` , score: h.metrics.score }));
    return rows;
  }, [singlesWithScores, refreshTick]);

  const refresh = () => setRefreshTick(v => v + 1);

  return (
    <section id="profile" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Profile</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Personalized dashboard derived locally from your saved analyses (no API calls)</p>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">{history.length ? `${history.length} saved analyses` : 'No history yet'}</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={refresh}>Refresh</Button>
              <Button variant="outline" onClick={clearHistory}>Clear History</Button>
            </div>
          </div>

          {error && (
            <Card className="p-4 bg-destructive/10 border-destructive/30 text-destructive">{error}</Card>
          )}

          {/* Derived Panels (local) */}
          {history.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-4">
              {/* Progress Overview */}
              <Card className="p-4 space-y-3">
                <div className="text-sm font-semibold text-foreground">Progress Overview</div>
                <div className="space-y-2 text-sm">
                  {progressSummary.map((p) => (
                    <div key={p.title} className="flex items-center justify-between">
                      <div className="text-muted-foreground">{p.title}</div>
                      <div className="font-medium text-foreground">
                        {p.delta === undefined ? `Score ${p.latest}` : `${p.delta >= 0 ? '+' : ''}${p.delta} (latest ${p.latest})`}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={seriesByModality['ECG'] || []}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={[0,100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#22c55e" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Current Health State */}
              <Card className="p-4 space-y-3">
                <div className="text-sm font-semibold text-foreground">Current Health State (last 6)</div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">Avg Score</div>
                  <div className="font-medium">{healthBreakdown.avg}</div>
                </div>
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie dataKey="value" data={[
                        { name: 'Positive signals', value: healthBreakdown.pos },
                        { name: 'Negative signals', value: healthBreakdown.neg },
                      ]} innerRadius={28} outerRadius={40} paddingAngle={2}>
                        <Cell fill="#16a34a" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Legend verticalAlign="middle" align="right" layout="vertical" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Daily Health Overview */}
              <Card className="p-4 space-y-3">
                <div className="text-sm font-semibold text-foreground">Daily Health Overview (latest day)</div>
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyBar}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0,100]} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#3b82f6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-6 text-center text-muted-foreground">No history yet. Upload and analyze to see records here.</Card>
          )}

          {history.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              {history.map(item => (
                <Card key={item.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                    <Badge variant={item.type === 'comparison' ? 'default' : 'outline'}>
                      {item.type === 'comparison' ? 'Comparison' : 'Single'}
                    </Badge>
                  </div>
                  <div className="text-foreground text-sm">
                    <strong>Files:</strong> {item.files.join(', ')} {item.modality ? `• ${item.modality}` : ''}
                  </div>
                  {item.preview && (
                    <div className="text-sm text-muted-foreground line-clamp-3" dangerouslySetInnerHTML={{ __html: item.preview }} />
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProfileSection;
