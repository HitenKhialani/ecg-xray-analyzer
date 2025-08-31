import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:5000';

export default function Home() {
  const [location, setLocation] = useState('');
  const [question, setQuestion] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [compare, setCompare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [disclaimer, setDisclaimer] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const items = [];
    const revokers = [];
    for (const f of files) {
      if (f.type?.startsWith('image/')) {
        const url = URL.createObjectURL(f);
        items.push({ kind: 'image', url, name: f.name });
        revokers.push(url);
      } else if (f.type === 'application/pdf') {
        items.push({ kind: 'pdf', url: '', name: f.name });
      }
    }
    setPreviews(items);
    return () => revokers.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setAnswer('');
    setDisclaimer('');
    setError('');

    try {
      const fd = new FormData();
      fd.append('location', location);
      fd.append('question', question);
      if (compare) fd.append('compare', 'true');
      files.forEach((f) => fd.append('reports', f));

      const res = await fetch(`${API_BASE}/analyze`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      setAnswer(data.answer || '');
      setDisclaimer(data.disclaimer || '');
    } catch (err) {
      setError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header>
        <h1>Medical Analysis Assistant</h1>
        <p className="subtitle">ECG • X-ray • Radiology • Labs — AI-powered insights (not a diagnosis)</p>
      </header>

      <section className="card">
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label htmlFor="location">Your location (city / region):</label>
            <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Pune, Maharashtra" />
          </div>

          <div className="form-row">
            <label htmlFor="question">Your question / symptoms / context:</label>
            <textarea id="question" rows={4} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Describe your concern or paste report text..." />
          </div>

          <div className="form-row">
            <label htmlFor="reports">Upload report files (images or PDFs):</label>
            <input id="reports" type="file" accept="image/*,application/pdf" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            <small>Supported: PNG, JPG, JPEG, GIF, BMP, WEBP, PDF.</small>
          </div>

          <div className="form-row">
            <label className="inline">
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Compare two images (first two selected as A and B)
            </label>
            <small>If enabled, select at least two images. The assistant will highlight differences between Image A and Image B.</small>
          </div>

          <div className="preview">
            {previews.slice(0, 6).map((p, i) => (
              <div className="thumbWrap" key={`${p.kind}-${p.name}-${i}`}>
                {compare && p.kind === 'image' && (i === 0 || i === 1) ? (
                  <span className="badge">{i === 0 ? 'A' : 'B'}</span>
                ) : null}
                {p.kind === 'image' ? (
                  <img className="thumb" src={p.url} alt={`preview-${i}`} />
                ) : (
                  <div className="pdfThumb">
                    <span className="pdfBadge">PDF</span>
                    <span className="pdfName" title={p.name}>{p.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="actions">
            <button className="primary" type="submit" disabled={loading}>{loading ? 'Analyzing…' : 'Analyze'}</button>
          </div>
        </form>
      </section>

      {error && (
        <section className="card error">
          {error}
        </section>
      )}

      {(answer || disclaimer) && (
        <section className="card">
          <h2>Analysis</h2>
          <div className="output" dangerouslySetInnerHTML={{ __html: (answer || '').replace(/\n/g, '<br/>') }} />
          <p className="disclaimer">{disclaimer}</p>
        </section>
      )}

      <footer>
        <small>Important: This tool is for information only and not a medical diagnosis. Seek professional care for urgent issues.</small>
      </footer>
    </div>
  );
}
