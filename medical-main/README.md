# Medical Analysis Assistant (Flask)

A minimal web app to ask medical questions and analyze uploaded report images (ECG, X‑ray, lab screenshots) using OpenRouter's `qwen/qwen2.5-vl-72b-instruct:free` model. Includes a medical-focused system prompt and safety disclaimer.

Important: This tool is for informational purposes only and not a medical diagnosis. Always consult a licensed clinician.

## Project Structure

- `server.js` — Express server, serves `/` UI and `/analyze` API. Reads `OPENROUTER_API_KEY` from `.env.local`.
- `templates/index.html` — UI form for location, question, and image uploads.
- `static/main.js` — Client logic to submit the form and render results.
- `static/styles.css` — Styling.
- `.env.local` — Put your OpenRouter key as `OPENROUTER_API_KEY=...`.
- `package.json` — Node dependencies and scripts.

## Prerequisites

- Node.js 18+
- An OpenRouter API key with access to the free model tier.

## Setup (Windows PowerShell)

1) Ensure `.env.local` contains:
```
OPENROUTER_API_KEY=sk-or-...
```

2) Install dependencies:
```
npm install
```

3) Run the app:
```
npm start
```

The server starts at http://127.0.0.1:5000

## How it works

- The client sends:
  - `location` (text)
  - `question` (text)
  - `reports` (one or more images)
- The server converts images to base64 data URLs and calls OpenRouter `/chat/completions` with:
  - model: `qwen/qwen2.5-vl-72b-instruct:free`
  - a medical analysis system prompt
  - multimodal user content (text + image_url parts)

## Notes

- Supported image types: PNG, JPG/JPEG, GIF, BMP, WEBP.
- For PDFs, upload screenshots.
- If you get API errors, verify your key and that the model is available in your region and plan.
- This app does not store uploads server-side; images are processed in-memory and sent to the model as data URLs.

## Safety

The assistant is not a substitute for professional medical advice, diagnosis, or treatment. In emergencies or if red flags are present, seek immediate medical care.
