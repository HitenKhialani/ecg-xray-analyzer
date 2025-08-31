import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  Heart, 
  Scan, 
  CheckCircle, 
  AlertCircle,
  X,
  BarChart3
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  type: 'ecg' | 'xray';
  size: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  file?: File;
}

const UploadSection = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFiles = (fileList: File[]) => {
    const validFiles = fileList.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
    });

    if (validFiles.length !== fileList.length) {
      toast({
        title: "Invalid files detected",
        description: "Only JPG, PNG, and PDF files under 10MB are supported.",
        variant: "destructive"
      });
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const newFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.name.toLowerCase().includes('ecg') ? 'ecg' : 'xray',
        size: (file.size / (1024 * 1024)).toFixed(1) + 'MB',
        status: 'uploading',
        progress: 0,
        file,
      };

      setFiles(prev => [...prev, newFile]);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id === newFile.id && f.progress < 100) {
            const newProgress = f.progress + 10;
            if (newProgress >= 100) {
              clearInterval(progressInterval);
              return { ...f, progress: 100, status: 'completed' };
            }
            return { ...f, progress: newProgress };
          }
          return f;
        }));
      }, 200);
    });
  };

  const removeFile = (id: string) => {
    const toRemove = files.find(f => f.id === id);
    setFiles(prev => prev.filter(f => f.id !== id));
    if (toRemove?.file) {
      setSelectedFiles(prev => prev.filter(sf => sf !== toRemove.file));
    }
  };

  const startAnalysis = async () => {
    try {
      if (selectedFiles.length === 0) {
        toast({ title: 'Nothing to analyze', description: 'Add at least one file.' });
        return;
      }
      setLoading(true);
      setAnswer(null);
      setDisclaimer(null);

      const form = new FormData();
      for (const f of selectedFiles) form.append('reports', f);

      const res = await fetch('/analyze', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Analysis failed');
      }
      setAnswer(data.answer || '');
      setDisclaimer(data.disclaimer || null);

      // Save to local history for ProfileSection
      try {
        const STORAGE_KEY = 'analysisHistory';
        const raw = localStorage.getItem(STORAGE_KEY);
        const history = raw ? JSON.parse(raw) : [];
        const inferModality = (names: string[]): 'ECG' | 'X-ray' | 'Unknown' => {
          const n = names.join(' ').toLowerCase();
          if (/ecg|ekg/.test(n)) return 'ECG';
          if (/x[- ]?ray|xray|cxr|chest/.test(n)) return 'X-ray';
          return 'Unknown';
        };
        history.unshift({
          id: Math.random().toString(36).slice(2),
          createdAt: new Date().toISOString(),
          type: 'single',
          files: selectedFiles.map(f => f.name),
          preview: (data.answer || '').slice(0, 1000),
          modality: inferModality(selectedFiles.map(f => f.name)),
          fullAnswer: data.answer || '',
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
      } catch {}
    } catch (e: any) {
      toast({ title: 'Analysis error', description: e.message || String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    return type === 'ecg' ? <Heart className="h-5 w-5" /> : <Scan className="h-5 w-5" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <section id="upload" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Upload Medical Reports</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Securely upload your ECG and X-Ray reports for AI-powered analysis. 
            Supported formats: JPG, PNG, PDF (max 10MB per file)
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upload Zone */}
          <Card 
            className={`p-8 border-2 border-dashed transition-all duration-200 ${
              isDragOver 
                ? 'border-primary bg-primary-soft' 
                : 'border-border hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <div className="mb-4">
                <Upload className="h-12 w-12 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Drop files here or click to browse
              </h3>
              <p className="text-muted-foreground mb-6">
                Upload ECG and X-Ray reports for instant AI analysis
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Button 
                  className="bg-primary hover:bg-primary-hover"
                  onClick={() => document.getElementById('ecg-input')?.click()}
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Upload ECG Report
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('xray-input')?.click()}
                >
                  <Scan className="mr-2 h-4 w-4" />
                  Upload X-Ray Report
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="outline">JPG</Badge>
                <Badge variant="outline">PNG</Badge>
                <Badge variant="outline">PDF</Badge>
                <Badge variant="outline">Max 10MB</Badge>
              </div>
            </div>

            <input
              id="ecg-input"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
            />
            <input
              id="xray-input"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
            />
          </Card>

          {/* Uploaded Files */}
          {files.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Uploaded Files</h3>
              <div className="space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        file.type === 'ecg' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                      }`}>
                        {getFileIcon(file.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{file.name}</p>
                          <Badge variant="outline" className={
                            file.type === 'ecg' ? 'text-primary' : 'text-accent'
                          }>
                            {file.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{file.size}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {file.status === 'uploading' && (
                        <div className="w-24">
                          <Progress value={file.progress} className="h-2" />
                        </div>
                      )}
                      {getStatusIcon(file.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {files.some(f => f.status === 'completed') && (
                <div className="mt-6 pt-6 border-t border-border">
                  <Button size="lg" className="w-full bg-accent hover:bg-accent/90" onClick={startAnalysis} disabled={loading}>
                    <BarChart3 className="mr-2 h-5 w-5" />
                    {loading ? 'Analyzing...' : 'Start AI Analysis'}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Thinking Phase */}
          {loading && (
            <Card className="p-6 bg-amber-50 border-amber-200">
              <div className="text-amber-800 font-medium">AI is thinking…</div>
              <div className="text-sm text-amber-700 mt-2">Reviewing your report(s) to generate a structured clinical summary.</div>
            </Card>
          )}

          {/* Results */}
          {(answer || disclaimer) && (
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">AI Findings</h3>
                {answer ? (
                  <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: answer.replace(/\n/g, '<br/>') }} />
                ) : (
                  <p className="text-muted-foreground">No answer.</p>
                )}
              </div>
              {disclaimer && (
                <div className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-md">
                  {disclaimer}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </section>
  );
};

export default UploadSection;