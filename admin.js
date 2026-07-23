/* =========================================================
   Auth
   PIN checking now happens server-side (see api/login.js). This file
   only talks to /api/login, /api/logout, and /api/session — it never
   stores or compares the PIN itself.
   ========================================================= */

function showLogin(){
  document.getElementById('login-screen').style.display = 'block';
  document.getElementById('admin-console').style.display = 'none';
}
function showConsole(){
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-console').style.display = 'block';
  populateForms();
  renderProjectList();
  renderPhotoPreviews();
}

async function checkSession(){
  try{
    const res = await fetch('/api/session');
    const data = await res.json();
    return !!data.authenticated;
  }catch(e){
    // If /api isn't available (e.g. opening the HTML file directly instead
    // of via `vercel dev`), fail closed and show the login screen.
    console.warn('Could not reach /api/session — is this running via vercel dev?', e);
    return false;
  }
}

async function attemptLogin(){
  const pinInput = document.getElementById('pin');
  const error = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  const entered = pinInput.value.trim();

  loginBtn.disabled = true;
  error.textContent = '';

  try{
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: entered })
    });
    if(res.ok){
      pinInput.value = '';
      showConsole();
    } else {
      const data = await res.json().catch(() => ({}));
      error.textContent = data.error || 'Incorrect PIN. Try again.';
      pinInput.value = '';
      pinInput.focus();
    }
  }catch(e){
    error.textContent = 'Could not reach the server. Try again in a moment.';
  }finally{
    loginBtn.disabled = false;
  }
}

async function logout(){
  try{ await fetch('/api/logout', { method: 'POST' }); }catch(e){ /* ignore */ }
  showLogin();
}

document.addEventListener('DOMContentLoaded', async () => {
  const authenticated = await checkSession();
  if(authenticated) showConsole(); else showLogin();

  document.getElementById('login-btn').addEventListener('click', attemptLogin);
  document.getElementById('pin').addEventListener('keydown', (e) => {
    if(e.key === 'Enter') attemptLogin();
  });
  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  document.getElementById('save-about').addEventListener('click', saveAboutForm);
  document.getElementById('save-facts').addEventListener('click', saveFactsForm);
  document.getElementById('save-footer').addEventListener('click', saveFooterForm);
  document.getElementById('add-project').addEventListener('click', addProjectFromForm);
  document.getElementById('new-project-image').addEventListener('change', handleProjectImageUpload);
  document.getElementById('upload-primary').addEventListener('change', (e) => handleProfilePhotoUpload(e, 'primary'));
  document.getElementById('upload-secondary').addEventListener('change', (e) => handleProfilePhotoUpload(e, 'secondary'));
  document.getElementById('remove-secondary').addEventListener('click', removeSecondaryPhoto);

  const consoleInput = document.getElementById('console-input');
  consoleInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){
      const command = consoleInput.value.trim();
      if(command){ runCommand(command); }
      consoleInput.value = '';
    }
  });
});

/* =========================================================
   Data helpers (STORAGE_KEY / loadData / renderContent / initProfilePhoto
   come from script.js)
   ========================================================= */
function saveData(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderContent();
  if(typeof initProfilePhoto === 'function') initProfilePhoto();
  flashSaved();
}

function flashSaved(){
  const badge = document.getElementById('saved-badge');
  if(!badge) return;
  badge.classList.add('show');
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(() => badge.classList.remove('show'), 1200);
}

function slugify(name){
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || ('project-' + Date.now());
}

/* =========================================================
   Form editors
   ========================================================= */
function populateForms(){
  const data = loadData();
  document.getElementById('input-about').value = data.about;
  document.getElementById('input-location').value = data.facts.location;
  document.getElementById('input-focus').value = data.facts.focus;
  document.getElementById('input-status').value = data.facts.status;
  document.getElementById('input-footer').value = data.footer;
}

function saveAboutForm(){
  const data = loadData();
  data.about = document.getElementById('input-about').value;
  saveData(data);
}

function saveFactsForm(){
  const data = loadData();
  data.facts = {
    location: document.getElementById('input-location').value,
    focus: document.getElementById('input-focus').value,
    status: document.getElementById('input-status').value
  };
  saveData(data);
}

function saveFooterForm(){
  const data = loadData();
  data.footer = document.getElementById('input-footer').value;
  saveData(data);
}

/* ---- Profile photos ---- */
function renderPhotoPreviews(){
  const data = loadData();
  const primary = document.getElementById('preview-primary');
  const secondary = document.getElementById('preview-secondary');
  primary.style.backgroundImage = data.profile?.primary ? `url("${data.profile.primary}")` : '';
  secondary.style.backgroundImage = data.profile?.secondary ? `url("${data.profile.secondary}")` : '';
}

async function handleProfilePhotoUpload(e, slot){
  const file = e.target.files[0];
  const status = document.getElementById(`status-${slot}`);
  if(!file) return;
  status.textContent = 'Uploading...';
  try{
    const url = await uploadFileToBlob(file);
    const data = loadData();
    data.profile = data.profile || { primary:'', secondary:'' };
    data.profile[slot] = url;
    saveData(data);
    renderPhotoPreviews();
    status.textContent = 'Uploaded ✓';
  }catch(err){
    console.error(err);
    status.textContent = err.message.includes('401') || /not logged in/i.test(err.message)
      ? 'Please log in again, then retry.'
      : 'Upload failed. Try again.';
  }
}

function removeSecondaryPhoto(){
  const data = loadData();
  data.profile = data.profile || { primary:'', secondary:'' };
  data.profile.secondary = '';
  saveData(data);
  renderPhotoPreviews();
  document.getElementById('status-secondary').textContent = '';
  document.getElementById('upload-secondary').value = '';
}

/* ---- Uploads (shared by profile photos + project images) ---- */
let pendingImageUrl = '';

async function handleProjectImageUpload(e){
  const file = e.target.files[0];
  const status = document.getElementById('upload-status');
  if(!file) return;
  status.textContent = 'Uploading...';
  try{
    const url = await uploadFileToBlob(file);
    pendingImageUrl = url;
    status.textContent = 'Uploaded ✓';
  }catch(err){
    console.error(err);
    status.textContent = 'Upload failed';
  }
}

async function uploadFileToBlob(file){
  // Loads Vercel Blob's small browser client at call time (no build step
  // needed for this plain HTML/JS site). This uploads the file directly to
  // Blob storage — not through our own function — so there's no ~4.5MB
  // size ceiling like a normal serverless function body would have.
  const { upload } = await import('https://esm.sh/@vercel/blob@0.27.0/client');
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
  });
  return blob.url;
}

/* ---- Projects ---- */
function addProjectFromForm(){
  const name = document.getElementById('new-project-name').value.trim();
  const desc = document.getElementById('new-project-desc').value.trim();
  const tagsRaw = document.getElementById('new-project-tags').value.trim();
  const link = document.getElementById('new-project-link').value.trim();
  if(!name){
    alert('Please give the project a name first.');
    return;
  }
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const data = loadData();
  data.projects.push({
    id: slugify(name),
    name, desc, tags, link,
    image: pendingImageUrl
  });
  saveData(data);
  renderProjectList();

  document.getElementById('new-project-name').value = '';
  document.getElementById('new-project-desc').value = '';
  document.getElementById('new-project-tags').value = '';
  document.getElementById('new-project-link').value = '';
  document.getElementById('new-project-image').value = '';
  document.getElementById('upload-status').textContent = '';
  pendingImageUrl = '';
}

function renderProjectList(){
  const list = document.getElementById('project-list');
  const data = loadData();
  if(!data.projects.length){
    list.innerHTML = `<div class="empty-state">No projects yet — add your first one below.</div>`;
    return;
  }
  list.innerHTML = data.projects.map(p => `
    <div class="project-row" data-id="${p.id}">
      <div class="meta">
        <div class="name">${p.name}</div>
        <div class="tags">${(p.tags||[]).join(' · ') || 'no tags'}</div>
      </div>
      <button data-remove="${p.id}">Remove</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-remove');
      const d = loadData();
      d.projects = d.projects.filter(p => p.id !== id);
      saveData(d);
      renderProjectList();
    });
  });
}

/* =========================================================
   Console commands (optional power-user shortcut)
   ========================================================= */
function logToConsole(message, type=''){
  const out = document.getElementById('console-output');
  const cls = type === 'ok' ? 'cmd-ok' : type === 'err' ? 'cmd-err' : '';
  const p = document.createElement('p');
  if(cls) p.className = cls;
  p.textContent = message;
  out.appendChild(p);
  out.scrollTop = out.scrollHeight;
}

function echoCommand(command){
  const out = document.getElementById('console-output');
  const p = document.createElement('p');
  p.className = 'cmd-echo';
  p.textContent = '$ ' + command;
  out.appendChild(p);
  out.scrollTop = out.scrollHeight;
}

function runCommand(command){
  echoCommand(command);
  const lower = command.toLowerCase();

  if(lower === 'help'){
    logToConsole('Commands: update about <text> · update footer <text> · add project <name> | <desc> | <tags> | <link> · remove project <name or id> · list projects · theme light|dark · clear');
    return;
  }
  if(lower === 'clear'){
    document.getElementById('console-output').innerHTML = '';
    return;
  }
  if(lower === 'list projects'){
    const data = loadData();
    if(!data.projects.length){ logToConsole('No projects yet.'); return; }
    data.projects.forEach(p => logToConsole(`- ${p.name} (${p.id}) [${(p.tags||[]).join(', ')}]`));
    return;
  }
  if(lower.startsWith('update about ')){
    const text = command.slice('update about '.length);
    const data = loadData();
    data.about = text;
    saveData(data);
    document.getElementById('input-about').value = text;
    logToConsole('About section updated.', 'ok');
    return;
  }
  if(lower.startsWith('update footer ')){
    const text = command.slice('update footer '.length);
    const data = loadData();
    data.footer = text;
    saveData(data);
    document.getElementById('input-footer').value = text;
    logToConsole('Footer updated.', 'ok');
    return;
  }
  if(lower.startsWith('add project ')){
    const rest = command.slice('add project '.length);
    const parts = rest.split('|').map(s => s.trim());
    const [name, desc = '', tagsRaw = '', link = ''] = parts;
    if(!name){ logToConsole('Usage: add project <name> | <description> | <tags> | <link>', 'err'); return; }
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const data = loadData();
    data.projects.push({ id: slugify(name), name, desc, tags, link, image: '' });
    saveData(data);
    renderProjectList();
    logToConsole(`Project "${name}" added.`, 'ok');
    return;
  }
  if(lower.startsWith('remove project ')){
    const target = command.slice('remove project '.length).trim().toLowerCase();
    const data = loadData();
    const before = data.projects.length;
    data.projects = data.projects.filter(p => p.id.toLowerCase() !== target && p.name.toLowerCase() !== target);
    if(data.projects.length === before){
      logToConsole(`No project matching "${target}".`, 'err');
      return;
    }
    saveData(data);
    renderProjectList();
    logToConsole(`Removed project "${target}".`, 'ok');
    return;
  }
  if(lower === 'theme light' || lower === 'theme dark'){
    const theme = lower.split(' ')[1];
    applyTheme(theme);
    logToConsole(`Theme set to ${theme}.`, 'ok');
    return;
  }
  logToConsole(`Unknown command: ${command}. Type "help" for a list.`, 'err');
}