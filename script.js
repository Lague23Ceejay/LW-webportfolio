/* =========================================================
   Shared data model (also used by admin.js)
   Stored under localStorage key "portfolioData" as JSON:
   {
     about: string,
     footer: string,
     facts: { location, focus, status },
     projects: [{ id, name, desc, tags: [string], image, link }]
   }
   ========================================================= */

const STORAGE_KEY = 'portfolioData';

/* =========================================================
   Zod schema — validates whatever is loaded from / saved to
   localStorage so a corrupted or malformed record can't silently
   break the site or get written back out.
   Loaded from a CDN at runtime since this project has no build step.
   ========================================================= */
let PortfolioSchema = null;
let _schemaReadyPromise = null;

function ensureSchema(){
  if(PortfolioSchema) return Promise.resolve(PortfolioSchema);
  if(!_schemaReadyPromise){
    _schemaReadyPromise = import('https://esm.sh/zod@3.23.8')
      .then(({ z }) => {
        const ProjectSchema = z.object({
          id: z.string().min(1),
          name: z.string().min(1, 'Project name is required'),
          desc: z.string().default(''),
          tags: z.array(z.string()).default([]),
          image: z.string().default(''),
          link: z.string().default('')
        });
        PortfolioSchema = z.object({
          about: z.string().default(''),
          footer: z.string().default(''),
          facts: z.object({
            location: z.string().default(''),
            focus: z.string().default(''),
            status: z.string().default('')
          }).default({}),
          profile: z.object({
            primary: z.string().default(''),
            secondary: z.string().default('')
          }).default({}),
          resume: z.object({
            url: z.string().default(''),
            filename: z.string().default(''),
            type: z.string().default('')
          }).default({}),
          projects: z.array(ProjectSchema).default([])
        });
        return PortfolioSchema;
      })
      .catch((err) => {
        console.warn('Could not load validation library; continuing without schema validation.', err);
        return null;
      });
  }
  return _schemaReadyPromise;
}

const DEFAULT_DATA = {
  about: document.getElementById('about-text')?.textContent.trim() || '',
  footer: 'Designed and built from scratch. Thanks for stopping by.',
  facts: {
    location: 'Remote / Worldwide',
    focus: 'Frontend & full-stack development',
    status: 'Open to new projects'
  },
  profile: {
    primary: '',
    secondary: ''
  },
  resume: {
    url: '',
    filename: '',
    type: ''
  },
  projects: [
    {
      id: 'p1',
      name: 'Realtime Analytics Dashboard',
      desc: 'A live dashboard for tracking product usage, built for a small SaaS team.',
      tags: ['React', 'WebSockets', 'D3'],
      image: '',
      link: 'https://github.com'
    },
    {
      id: 'p2',
      name: 'Recipe Sharing App',
      desc: 'Mobile-first app for saving and remixing recipes with friends.',
      tags: ['Vue', 'Node', 'Postgres'],
      image: '',
      link: 'https://github.com'
    },
    {
      id: 'p3',
      name: 'Static Site Generator',
      desc: 'A lightweight, zero-dependency static site generator written for fun.',
      tags: ['Node', 'CLI'],
      image: '',
      link: 'https://github.com'
    }
  ]
};

/**
 * Loads content from the shared server-side store (/api/content, backed by
 * Vercel Blob) so every device and browser sees the same thing. Falls back
 * to a locally cached copy (if the network/API is unreachable) and finally
 * to the built-in defaults.
 */
async function loadData(){
  let merged = null;

  try{
    const res = await fetch('/api/content');
    if(res.ok){
      const { data } = await res.json();
      if(data){
        merged = { ...structuredClone(DEFAULT_DATA), ...data };
        // keep a local cache purely as an offline fallback
        try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); }catch(e){ /* ignore quota errors */ }
      }
    }
  }catch(e){
    console.warn('Could not reach /api/content, checking local cache.', e);
  }

  if(!merged){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) merged = { ...structuredClone(DEFAULT_DATA), ...JSON.parse(raw) };
    }catch(e){
      console.warn('Local cache unreadable, using defaults.', e);
    }
  }

  if(!merged) merged = structuredClone(DEFAULT_DATA);

  const schema = await ensureSchema();
  if(!schema) return merged;

  const result = schema.safeParse(merged);
  if(result.success) return result.data;

  console.warn('Saved content failed validation, falling back to defaults.', result.error);
  return structuredClone(DEFAULT_DATA);
}

/**
 * Validates `data` against the schema and, if valid, saves it to the
 * shared server-side store (/api/content). Returns { ok: true } on success
 * or { ok: false, message } if validation or the save request failed.
 */
async function saveData(data){
  const schema = await ensureSchema();
  let toSave = data;

  if(schema){
    const result = schema.safeParse(data);
    if(!result.success){
      const message = result.error.issues
        .map(i => `${i.path.join('.') || 'value'}: ${i.message}`)
        .join('\n');
      return { ok: false, message };
    }
    toSave = result.data;
  }

  try{
    const res = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSave)
    });
    if(!res.ok){
      const errBody = await res.json().catch(() => ({}));
      return { ok: false, message: errBody.error || `Save failed (${res.status})` };
    }
  }catch(e){
    return { ok: false, message: 'Could not reach the server. Check your connection and try again.' };
  }

  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)); }catch(e){ /* ignore quota errors */ }
  return { ok: true };
}

function escapeHtml(str=''){
  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

async function renderContent(){
  const data = await loadData();

  const aboutEl = document.getElementById('about-text');
  if(aboutEl) aboutEl.textContent = data.about;

  const footerEl = document.getElementById('footer-text');
  if(footerEl) footerEl.textContent = data.footer;

  const loc = document.getElementById('fact-location');
  const focus = document.getElementById('fact-focus');
  const status = document.getElementById('fact-status');
  if(loc) loc.textContent = data.facts.location;
  if(focus) focus.textContent = data.facts.focus;
  if(status) status.textContent = data.facts.status;

  const grid = document.getElementById('projects-grid');
  if(grid){
    if(!data.projects.length){
      grid.innerHTML = `<div class="empty-state">No projects added yet. Head to /admin to add your first one.</div>`;
    } else {
      grid.innerHTML = data.projects.map(renderProjectCard).join('');
    }
  }

  const resumeLink = document.getElementById('resume-link');
  if(resumeLink){
    if(data.resume?.url){
      resumeLink.href = data.resume.url;
      resumeLink.style.display = '';
      resumeLink.textContent = data.resume.filename
        ? `Download resume (${data.resume.filename})`
        : 'Download resume';
    } else {
      resumeLink.style.display = 'none';
      resumeLink.removeAttribute('href');
    }
  }
}

function renderProjectCard(p){
  const img = p.image
    ? `<img class="project-image" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)} preview">`
    : `<div class="project-image"></div>`;
  const tags = (p.tags||[]).map(t => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('');
  const link = p.link ? `<div class="project-links"><a href="${escapeHtml(p.link)}" target="_blank" rel="noopener">View &rarr;</a></div>` : '';
  return `
    <article class="project-card">
      <div class="project-titlebar">
        <span class="tb-dot r"></span><span class="tb-dot y"></span><span class="tb-dot g"></span>
        <span class="path">~/projects/${escapeHtml(p.id)}</span>
      </div>
      ${img}
      <div class="project-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.desc)}</p>
        <div class="tech-tags">${tags}</div>
        ${link}
      </div>
    </article>
  `;
}

/* =========================================================
   Profile photo (swaps between primary/secondary every 2s if both are set)
   ========================================================= */
let _avatarSwapInterval = null;

function initialsAvatarDataUrl(name){
  const initials = (name || 'JR').trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect width="200" height="200" fill="#2f6f6b"/>
    <text x="50%" y="53%" font-family="Inter, sans-serif" font-size="72" fill="#ffffff"
      text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

async function initProfilePhoto(){
  const wrap = document.getElementById('hero-avatar-wrap');
  if(!wrap) return;
  const a = document.getElementById('avatar-a');
  const b = document.getElementById('avatar-b');
  if(_avatarSwapInterval){ clearInterval(_avatarSwapInterval); _avatarSwapInterval = null; }

  const data = await loadData();
  const name = document.getElementById('brand-name')?.textContent || 'JR';
  const fallback = initialsAvatarDataUrl(name);
  const primary = data.profile?.primary || fallback;
  const secondary = data.profile?.secondary || '';

  a.src = primary;
  wrap.classList.remove('show-b');

  if(secondary){
    b.src = secondary;
    let showingB = false;
    _avatarSwapInterval = setInterval(() => {
      showingB = !showingB;
      wrap.classList.toggle('show-b', showingB);
    }, 2000);
  }
}

/* =========================================================
   Theme toggle
   ========================================================= */
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if(icon) icon.textContent = theme === 'dark' ? '\u2600' : '\u263D';
  if(label) label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  localStorage.setItem('theme', theme);
}

function initTheme(){
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  const btn = document.getElementById('theme-toggle');
  if(btn){
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
}

/* =========================================================
   Init
   ========================================================= */
/* =========================================================
   Scroll reveal
   Each section slides in from a different direction the first time it
   enters the viewport: About from the left, Projects from the right,
   Contact from below, Footer from above.
   ========================================================= */
function initScrollReveal(){
  const targets = document.querySelectorAll('.reveal');
  if(!targets.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced){
    targets.forEach(el => el.classList.add('reveal-visible'));
    return;
  }

  if(!('IntersectionObserver' in window)){
    targets.forEach(el => el.classList.add('reveal-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(el => observer.observe(el));
}

/* =========================================================
   Init
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await renderContent();
  await initProfilePhoto();
  initScrollReveal();
  const yearEl = document.getElementById('footer-year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
});

// Keep the public page in sync if content is edited in another tab (admin panel)
window.addEventListener('storage', async (e) => {
  if(e.key === STORAGE_KEY){
    await renderContent();
    await initProfilePhoto();
  }
});