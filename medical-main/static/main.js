const form = document.getElementById('analyze-form');
const preview = document.getElementById('preview');
const resultSection = document.getElementById('result');
const outputEl = document.getElementById('output');
const disclaimerEl = document.getElementById('disclaimer');
const errorSection = document.getElementById('error');

function sanitizeClient(md) {
  if (!md) return '';
  let txt = String(md);
  try {
    const patterns = [
      /<\s*think\b[\s\S]*?<\s*\/\s*think\s*>/gi,
      /<\|\s*think\s*\|>[\s\S]*?<\|\s*\/?\s*think\s*\|>/gi,
      /\[\s*think\s*\][\s\S]*?\[\s*\/\s*think\s*\]/gi,
      /◁\s*think\s*▷[\s\S]*?◁\s*\/\s*think\s*▷/gi,
    ];
    for (const rx of patterns) txt = txt.replace(rx, '');
  } catch (_) {}
  return txt.replace(/\n/g, '<br/>' );
}

function resetUI() {
  resultSection.classList.add('hidden');
  errorSection.classList.add('hidden');
  outputEl.textContent = '';
  disclaimerEl.textContent = '';
}

// Preview selected images
const fileInput = document.getElementById('reports');
fileInput.addEventListener('change', () => {
  preview.innerHTML = '';
  const files = Array.from(fileInput.files || []);
  files.slice(0, 6).forEach((file) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'thumb';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetUI();

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Analyzing…';

  try {
    const formData = new FormData(form);

    const res = await fetch('/analyze', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Server error');
    }

    resultSection.classList.remove('hidden');
    // Preserve basic formatting and strip hidden thinking segments
    outputEl.innerHTML = sanitizeClient(data.answer || '');
    disclaimerEl.textContent = data.disclaimer || '';
  } catch (err) {
    errorSection.classList.remove('hidden');
    errorSection.textContent = err.message || 'Unexpected error';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Analyze';
  }
});
