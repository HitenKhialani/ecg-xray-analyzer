import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useState, useCallback, useRef } from 'react';
import { 
  GitCompare, 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  Activity,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Upload,
} from 'lucide-react';

const ComparisonSection = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [modality, setModality] = useState<'ECG' | 'X-ray' | ''>('');
  const [error, setError] = useState<string | null>(null);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const inferModality = (names: string[]): 'ECG' | 'X-ray' | 'Unknown' => {
    const n = names.join(' ').toLowerCase();
    if (/ecg|ekg/.test(n)) return 'ECG';
    if (/x[- ]?ray|xray|cxr|chest/.test(n)) return 'X-ray';
    return 'Unknown';
  };

  const onPick = useCallback((slot: number, picked: FileList | null) => {
    if (!picked || !picked[0]) return;
    const file = picked[0];
    const tmp = [...files];
    tmp[slot] = file;
    const next = tmp.slice(0, 2);
    setFiles(next);
    if (next.length === 2 && next[0] && next[1]) {
      const mA = inferModality([next[0].name]);
      const mB = inferModality([next[1].name]);
      if (mA !== 'Unknown' && mB !== 'Unknown' && mA !== mB) {
        setError('Different report types cannot be compared.');
      } else {
        setError(null);
        const inferred = mA !== 'Unknown' ? mA : (mB !== 'Unknown' ? mB : '');
        if (inferred && !modality) setModality(inferred as any);
      }
    }
  }, [files, modality]);

  const removeAt = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const startCompare = async () => {
    setError(null);
    if (files.length !== 2) { setError('Please select two reports.'); return; }
    if (!modality) { setError('Please select the report type (ECG or X-ray).'); return; }
    // Validate inferred modalities
    const mA = inferModality([files[0].name]);
    const mB = inferModality([files[1].name]);
    if (mA !== 'Unknown' && mB !== 'Unknown' && mA !== mB) {
      setError('Different report types cannot be compared.');
      return;
    }
    if ((mA !== 'Unknown' && mA !== modality) || (mB !== 'Unknown' && mB !== modality)) {
      setError('Selected report type does not match the uploaded files.');
      return;
    }
    setLoading(true);
    setAnswer(null);
    setDisclaimer(null);
    try {
      const form = new FormData();
      form.append('compare', 'true');
      form.append('question', `Both reports are ${modality}. Compare A vs B and state clearly which indicates better health overall, with rationale.`);
      files.forEach(f => form.append('reports', f));
      const res = await fetch('/analyze', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Comparison failed');
      setAnswer(data.answer || '');
      setDisclaimer(data.disclaimer || null);

      // Save to local history
      try {
        const STORAGE_KEY = 'analysisHistory';
        const raw = localStorage.getItem(STORAGE_KEY);
        const history = raw ? JSON.parse(raw) : [];
        history.unshift({
          id: Math.random().toString(36).slice(2),
          createdAt: new Date().toISOString(),
          type: 'comparison',
          files: files.map(f => f.name),
          preview: (data.answer || '').slice(0, 1000),
          modality,
          fullAnswer: data.answer || '',
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
      } catch {}
    } catch (e) {
      setAnswer('');
      setDisclaimer('An error occurred while generating the comparison. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="comparisons" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Report Comparison</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Upload two reports to get an AI-driven comparative analysis</p>
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Upload two files */}
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <GitCompare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground">Upload Two Reports</h3>
              <p className="text-muted-foreground">Select exactly two files (PDF or image)</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[0,1].map(i => (
                <Card key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-secondary">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Report {i+1}</div>
                      <div className="text-foreground text-sm font-medium">{files[i]?.name || 'Not selected'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {files[i] && (
                      <Button size="sm" variant="outline" onClick={() => removeAt(i)}>Remove</Button>
                    )}
                    <input
                      ref={inputRefs[i]}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        onPick(i, e.target.files);
                        // allow re-selecting the same file
                        if (e.currentTarget) e.currentTarget.value = '';
                      }}
                    />
                    <Button size="sm" onClick={() => inputRefs[i].current?.click()}>Choose</Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Report Type</label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value as any)}
                className="px-3 py-2 rounded-md border bg-background text-foreground"
              >
                <option value="">Select type</option>
                <option value="ECG">ECG</option>
                <option value="X-ray">X-ray</option>
              </select>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <Button className="w-full" disabled={files.length !== 2 || loading} onClick={startCompare}>
                {loading ? 'Analyzing...' : 'Compare Reports'}
              </Button>
            </div>
          </Card>

          {error && (
            <Card className="p-4 bg-destructive/10 border-destructive/30 text-destructive">{error}</Card>
          )}

          {/* Thinking */}
          {loading && (
            <Card className="p-6 bg-amber-50 border-amber-200">
              <div className="text-amber-800 font-medium">AI is thinking…</div>
              <div className="text-sm text-amber-700 mt-2">Comparing both reports and summarizing differences.</div>
            </Card>
          )}

          {/* Result */}
          {(answer || disclaimer) && (
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">AI Comparison Result</h3>
                {answer ? (
                  <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: (answer || '').replace(/\n/g, '<br/>') }} />
                ) : (
                  <p className="text-muted-foreground">No answer.</p>
                )}
              </div>
              {disclaimer && <div className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-md">{disclaimer}</div>}
            </Card>
          )}
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;