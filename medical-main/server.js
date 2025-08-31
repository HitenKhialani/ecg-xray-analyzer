const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');
const pdfParse = require('pdf-parse');

// Load env from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL_ID = 'moonshotai/kimi-vl-a3b-thinking:free';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 6 } });

app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/], credentials: false }));

function sanitizeOutput(md) {
  if (!md) return '';
  let txt = String(md);
  // Remove any chain-of-thought blocks if present
  try {
    // Standard closing tag
    txt = txt.replace(/<think[\s\S]*?<\/think>/gi, '');
    // Non-standard escaped closing tag variants
    txt = txt.replace(/<think[\s\S]*?<\\think>/gi, '');
  } catch (_) {}
  // Normalize newlines
  txt = txt.replace(/\r\n/g, '\n');
  // Remove bold/italic asterisks globally
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
    // Drop markdown heading hashes but keep the title text
    let line = raw.replace(/^\s*#{1,6}\s*/, '');
    // Remove bullet symbols from list items
    line = line.replace(/^\s*[\-•]\s+/, '');

    const trimmed = line.trim().replace(/:$/, '');
    const lc = trimmed.toLowerCase();

    if (knownHeadings.has(lc)) {
      // Ensure a blank line before and after section titles
      if (out.length && out[out.length - 1] !== '') out.push('');
      out.push(`<strong>${trimmed}</strong>`); // bold minimal section title without symbols
      out.push('');
      continue;
    }

    out.push(line);
  }

  let result = out.join('\n');
  // Collapse excessive blank lines
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

function buildSystemPrompt(location, compare) {
  return (
    'You are a cautious, expert medical imaging and report analysis assistant specialized in interpreting ECGs, chest X-rays, radiology reports, and lab summaries. ' +
    'You can also handle general medical questions. Always be clear that you are not a substitute for a clinician.\n\n' +
    `User location: ${location || 'Unknown'} — when advising on next steps, consider local language and practical access.\n\n` +
    'Guidelines:\n' +
    '- If images are provided, examine them meticulously; describe key findings, possible artifacts, and differential considerations.\n' +
    '- If text is provided (symptoms, report text), summarize, interpret ranges, and flag critical values.\n' +
    '- Provide structured output: Summary, Detailed Findings, Possible Diagnoses/Considerations, Risk Level (Low/Medium/High with rationale), Red Flags, Next Steps.\n' +
    '- Be conservative: avoid definitive diagnoses; suggest urgent evaluation if any red flags or uncertainty with concerning features.\n' +
    '- If data quality is low, note limitations and ask for clearer images or missing data.\n' +
    (compare
      ? '\nWhen two images are provided for comparison (Image A vs Image B), highlight similarities and differences, progression/regression, alignment, and potential artifacts causing perceived changes. Conclude with a brief comparative impression.'
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
      // Trim very long PDFs to reduce token usage
      const trimmed = raw.length > 10000 ? raw.slice(0, 10000) + '\n...[truncated]...' : raw;
      texts.push(trimmed);
    } catch (e) {
      texts.push('[Failed to extract text from PDF]');
    }
  }
  return texts;
}

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

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
