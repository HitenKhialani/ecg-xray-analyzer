const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');
const pdfParse = require('pdf-parse');

// Load env from .env.local at project root
dotenv.config({ path: path.join(__dirname, '.env.local') });

// (SPA fallback is registered later, after API routes)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL_ID = 'moonshotai/kimi-vl-a3b-thinking:free';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 6 } });

// Serve legacy static assets if needed
app.use('/static', express.static(path.join(__dirname, 'medical-main', 'static')));
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/], credentials: false }));

// Serve Vite production build (dist)
app.use(express.static(path.join(__dirname, 'dist')));

function sanitizeOutput(md) {
  if (!md) return '';
  let txt = String(md);
  try {
    // Strip various hidden/thinking tag variants before rendering to users
    // Covers: <think>...</think>, <|think|>...</|think|>, [think]...[/think],
    // and arrow/triangle variants like ◁think▷ ... ◁/think▷, ◀think▶, ⟨think⟩, etc.
    const openDelims = '[<\u25C1\u25C0\u27E8\u3008\u2329\u2039\u276C]';
    const closeDelims = '[>\u25B7\u25B6\u27E9\u3009\u232A\u203A\u276D]';
    const triangleBlock = new RegExp(`${openDelims}\\s*\\/?\\s*think\\s*${closeDelims}`, 'gi');

    const broadPairs = [
      /<\s*think\b[\s\S]*?<\s*\/\s*think\s*>/gi,
      /<\|\s*think\s*\|>[\s\S]*?<\|\s*\/?\s*think\s*\|>/gi,
      /\[\s*think\s*\][\s\S]*?\[\s*\/\s*think\s*\]/gi,
      /[\u25C1\u25C0\u27E8\u3008\u2329\u2039\u276C]\s*think\s*[\u25B7\u25B6\u27E9\u3009\u232A\u203A\u276D][\s\S]*?[\u25C1\u25C0\u27E8\u3008\u2329\u2039\u276C]\s*\/\s*think\s*[\u25B7\u25B6\u27E9\u3009\u232A\u203A\u276D]/gi,
    ];
    for (const rx of broadPairs) txt = txt.replace(rx, '');

    while (true) {
      const openIdx = txt.search(new RegExp(`${openDelims}\\s*think\\s*${closeDelims}`, 'i'));
      if (openIdx === -1) break;
      const afterOpen = txt.slice(openIdx + 1);
      const closeMatch = afterOpen.search(new RegExp(`${openDelims}\\s*\/\\s*think\\s*${closeDelims}`, 'i'));
      if (closeMatch === -1) { txt = txt.replace(triangleBlock, ''); break; }
      const endIdx = openIdx + 1 + closeMatch + 1;
      txt = txt.slice(0, openIdx) + txt.slice(endIdx + 1);
    }
  } catch (_) {}
  txt = txt.replace(/\r\n/g, '\n');
  txt = txt.replace(/\*\*/g, '').replace(/\*/g, '');

  const knownHeadings = new Set([
    'summary',
    'detailed findings',
    'possible diagnoses/considerations',
    'risk level',
    'red flags',
    'next steps',
    'recommendations',
    'interpretation',
    'impression',
  ]);

  const lines = txt.split('\n');
  const out = [];

  for (let raw of lines) {
    let line = raw.replace(/^\s*#{1,6}\s*/, '');
    line = line.replace(/^\s*[\-•]\s+/, '');

    const trimmed = line.trim().replace(/:$/, '');
    const lc = trimmed.toLowerCase();

    if (knownHeadings.has(lc)) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      out.push(`<strong>${trimmed}</strong>`);
      out.push('');
      continue;
    }

    out.push(line);
  }

  let result = out.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

function buildSystemPrompt(location, compare) {
  return (
    'You are a cautious, expert medical imaging and report analysis assistant specialized in ECG interpretation (priority), chest X-rays, radiology reports, and lab summaries. ' +
    'Always state that you are not a substitute for a clinician.\n\n' +
    `User location: ${location || 'Unknown'} — tailor next steps to Indian clinical practice and access (e.g., government/private facilities, availability of ECG, troponin, echo, TMT).\n\n` +
    'ECG-exclusive detailed checklist (use whenever an ECG/report image or text is provided):\n' +
    '1) Verify basics: patient name/age/sex, date/time, paper speed (25 mm/s default) and gain (10 mm/mV), device/filters; flag poor quality, noise, or wrong lead placement.\n' +
    '2) Rate & rhythm: compute ventricular rate and regularity; identify rhythm (sinus vs atrial fibrillation/flutter, ectopics, AV blocks); mention P before every QRS and constant PR for sinus.\n' +
    '3) Intervals (with reference ranges): PR 120–200 ms (short <120, long >200), QRS <120 ms (widened suggests bundle branch block/ventricular rhythm), QTc (Bazett) normal ~350–450 ms men, 360–460 ms women; flag prolonged/short.\n' +
    '4) Cardiac axis: describe normal vs left/right axis deviation; comment if axis suggests LVH/RVH or fascicular block.\n' +
    '5) Chamber hypertrophy/atrial abnormality: P pulmonale/P mitrale; LVH/RVH criteria (Sokolow–Lyon etc.) if relevant.\n' +
    '6) QRS morphology: look for pathologic Q-waves (≥40 ms wide or ≥25% of ensuing R, in ≥2 contiguous leads), R-wave progression (V1→V6), bundle branch/fascicular blocks and ventricular pre-excitation.\n' +
    '7) ST-segment & T-waves: identify STE/STD location and reciprocity by coronary territory; STE thresholds (e.g., ≥1 mm in limb, ≥2 mm precordial in men >40; adjust per age/sex), posterior MI clues (STD V1–V3 with tall R), pericarditis vs early repolarization differentiation.\n' +
    '8) Clinical synthesis: map findings to likely differentials (ACS/STEMI/NSTEMI, old infarct, electrolyte/drug effects e.g., digoxin, LVH strain, myocarditis), state certainty and red flags requiring urgent care.\n' +
    '9) Recommendations (India-aware): consider serial ECGs, high-sensitivity troponin, 12-lead with posterior/right-sided leads when indicated, chest pain protocols, echo/TMT or cardiology referral based on risk.\n\n' +
    'Output strictly in sections: Summary; Detailed Findings; Possible Diagnoses/Considerations; Risk Level (Low/Medium/High with rationale); Red Flags; Next Steps. Be concise, avoid speculative claims, and clearly state limitations if image/report quality is suboptimal.\n' +
    (compare
      ? '\nWhen two ECGs/X-rays/reports are provided for comparison (A vs B), provide: 1) Key differences; 2) Improvement vs deterioration; 3) Quality/artifacts; 4) Clear conclusion which is better (A/B) with rationale; 5) Next steps.\n'
      : '')
  );
}

function bufferToDataUrl(file) {
  const mime = file.mimetype || 'application/octet-stream';
  const b64 = file.buffer.toString('base64');
  return `data:${mime};base64,${b64}`;
}

async function extractPdfText(buffers) {
  const texts = [];
  for (const buf of buffers) {
    try {
      const data = await pdfParse(buf);
      const raw = (data.text || '').trim();
      const trimmed = raw.length > 10000 ? raw.slice(0, 10000) + '\n...[truncated]...' : raw;
      texts.push(trimmed);
    } catch (e) {
      texts.push('[Failed to extract text from PDF]');
    }
  }
  return texts;
}

app.post('/analyze', upload.array('reports'), async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY in environment' });
    }

    const userQuestion = (req.body.question || '').trim();
    const location = (req.body.location || '').trim();
    const compare = (req.body.compare === 'on' || req.body.compare === 'true');
    const files = req.files || [];

    const imageFiles = files.filter((f) => (f.mimetype || '').startsWith('image/'));
    const pdfFiles = files.filter((f) => (f.mimetype || '') === 'application/pdf');

    const imageDataUrls = imageFiles.map(bufferToDataUrl);
    const pdfTexts = pdfFiles.length ? await extractPdfText(pdfFiles.map((f) => f.buffer)) : [];

    if (!userQuestion && imageDataUrls.length === 0 && pdfTexts.length === 0) {
      return res.status(400).json({ error: 'Please provide a question and/or at least one report image or PDF.' });
    }

    const contentParts = [];
    if (userQuestion) {
      contentParts.push({ type: 'text', text: `User question: ${userQuestion}\nLocation: ${location || 'Unknown'}` });
    }
    if (pdfTexts.length) {
      for (let i = 0; i < pdfTexts.length; i++) {
        const label = pdfTexts.length > 1 ? ` (PDF ${i + 1})` : '';
        contentParts.push({ type: 'text', text: `Extracted PDF text${label}:\n${pdfTexts[i]}` });
      }
    }
    if (compare && imageDataUrls.length >= 2) {
      contentParts.push({ type: 'text', text: 'Image A' });
      contentParts.push({ type: 'image_url', image_url: { url: imageDataUrls[0] } });
      contentParts.push({ type: 'text', text: 'Image B' });
      contentParts.push({ type: 'image_url', image_url: { url: imageDataUrls[1] } });
    } else {
      for (const url of imageDataUrls) {
        contentParts.push({ type: 'image_url', image_url: { url } });
      }
    }

    const payload = {
      model: MODEL_ID,
      messages: [
        { role: 'system', content: buildSystemPrompt(location, compare) },
        { role: 'user', content: contentParts },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    };

    const headers = {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'Medical Analysis Assistant',
      'Content-Type': 'application/json',
    };

    const response = await axios.post(`${OPENROUTER_BASE_URL}/chat/completions`, payload, { headers, timeout: 90_000 });
    const data = response.data || {};
    const output = (((data.choices || [])[0] || {}).message || {}).content || '';

    const disclaimer = 'Important: This analysis is for informational purposes only and is not a medical diagnosis. Consult a licensed healthcare professional for clinical evaluation and urgent care if you experience red-flag symptoms.';

    return res.json({ answer: sanitizeOutput(output), disclaimer });
  } catch (err) {
    if (err.response) {
      return res.status(502).json({ error: `API error ${err.response.status}`, details: err.response.data });
    }
    return res.status(502).json({ error: 'Server error', details: err.message || String(err) });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});
