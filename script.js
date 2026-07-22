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

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_DATA), ...parsed };
  }catch(e){
    console.warn('Could not read saved content, using defaults.', e);
    return structuredClone(DEFAULT_DATA);
  }
}

function escapeHtml(str=''){
  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function renderContent(){
  const data = loadData();

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

function initProfilePhoto(){
  const wrap = document.getElementById('hero-avatar-wrap');
  if(!wrap) return;
  const a = document.getElementById('avatar-a');
  const b = document.getElementById('avatar-b');
  if(_avatarSwapInterval){ clearInterval(_avatarSwapInterval); _avatarSwapInterval = null; }

  const data = loadData();
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
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderContent();
  initProfilePhoto();
  const yearEl = document.getElementById('footer-year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
});

// Keep the public page in sync if content is edited in another tab (admin panel)
window.addEventListener('storage', (e) => {
  if(e.key === STORAGE_KEY){
    renderContent();
    initProfilePhoto();
  }
});