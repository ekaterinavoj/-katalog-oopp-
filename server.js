const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME    = process.env.ADMIN_USERNAME    || 'Gematex';
const ADMIN_PASSWORD_ENV = process.env.ADMIN_PASSWORD  || 'Gematex 123';
const ADMIN_RESET_CODE   = process.env.ADMIN_RESET_CODE || 'Gematex-obnova';
const DATA_FILE    = path.join(__dirname, 'data', 'products.json');
const DEFAULT_FILE = path.join(__dirname, 'data', 'default.json');
const AUTH_FILE    = path.join(__dirname, 'data', 'auth.json');
const UPLOADS_DIR  = path.join(__dirname, 'public', 'uploads');

function getPassword() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const a = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
      if (a.password) return a.password;
    }
  } catch(_) {}
  return ADMIN_PASSWORD_ENV;
}

// Ensure folders exist
[path.join(__dirname,'data'), UPLOADS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Multer – image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|png|gif|webp|svg\+xml)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Povoleny jsou pouze obrázky (jpg, png, gif, webp, svg).'));
  }
});

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Simple session (in-memory token, resets on restart) ──────────────────────
const sessions = new Set();
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) out[k.trim()] = v.join('=').trim();
  });
  return out;
}
function isAdmin(req) {
  return sessions.has(parseCookies(req).adminToken);
}
function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.redirect('/admin/login');
}

// ── Data helpers ─────────────────────────────────────────────────────────────
function loadData() {
  const file = fs.existsSync(DATA_FILE) ? DATA_FILE : DEFAULT_FILE;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Admin login ──────────────────────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
  if (isAdmin(req)) return res.redirect('/admin');
  res.send(`<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Přihlášení – Správa katalogu</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Calibri,Arial,sans-serif;background:#e8f4fb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .box{background:#fff;border-radius:16px;border:2px solid #007bc2;padding:36px 32px;max-width:380px;width:100%;box-shadow:0 6px 32px rgba(0,0,0,.12)}
  .logo{text-align:center;margin-bottom:18px;color:#007bc2;font-size:1.4em;font-weight:700}
  h2{margin:0 0 20px;color:#333;font-size:1.05em;text-align:center;font-weight:600}
  .field{margin-bottom:12px}
  label{display:block;font-size:.82em;font-weight:700;color:#005090;margin-bottom:5px}
  input{width:100%;padding:10px 12px;border:1.5px solid rgba(0,123,194,.4);border-radius:8px;font-size:1em;font-family:inherit;outline:none}
  input:focus{border-color:#007bc2;box-shadow:0 0 0 3px rgba(0,123,194,.15)}
  .btn-main{width:100%;margin-top:8px;background:#007bc2;color:#fff;border:none;border-radius:8px;padding:12px;font-size:1em;font-weight:700;font-family:inherit;cursor:pointer}
  .btn-main:hover{background:#005f9a}
  .btn-sec{width:100%;margin-top:6px;background:none;color:#007bc2;border:1.5px solid #007bc2;border-radius:8px;padding:10px;font-size:.92em;font-weight:600;font-family:inherit;cursor:pointer}
  .btn-sec:hover{background:#e8f4fb}
  .err{background:#fff0f0;border:1.5px solid #fcc;color:#c00;font-size:.86em;padding:10px 14px;border-radius:8px;margin-top:12px}
  .ok{background:#f0fff4;border:1.5px solid #6c6;color:#050;font-size:.86em;padding:10px 14px;border-radius:8px;margin-top:12px}
  .divider{border:0;border-top:1.5px solid #dde5ef;margin:20px 0}
  .reset-box{background:#f5f9fd;border:1.5px solid rgba(0,123,194,.25);border-radius:10px;padding:18px 16px;margin-top:4px}
  .reset-title{font-weight:700;color:#005090;font-size:.95em;margin-bottom:14px}
  .hint{font-size:.78em;color:#888;margin-top:4px;line-height:1.4}
</style></head><body>
<div class="box">
  <div class="logo">🔐 Správa katalogu</div>

  <!-- LOGIN FORM -->
  <div id="login-section">
    <h2>Přihlaste se pro přístup do admin panelu</h2>
    <form method="POST" action="/admin/login">
      <div class="field">
        <label>Uživatelské jméno</label>
        <input type="text" name="username" autofocus placeholder="Uživatelské jméno" autocomplete="username">
      </div>
      <div class="field">
        <label>Heslo</label>
        <input type="password" name="password" placeholder="Heslo" autocomplete="current-password">
      </div>
      <button class="btn-main" type="submit">Přihlásit se →</button>
      ${req.query.err ? '<div class="err">⚠️ Nesprávné uživatelské jméno nebo heslo.</div>' : ''}
    </form>
    <hr class="divider">
    <button class="btn-sec" onclick="document.getElementById('login-section').style.display='none';document.getElementById('reset-section').style.display='block'">
      🔑 Zapomenuté heslo?
    </button>
  </div>

  <!-- RESET FORM -->
  <div id="reset-section" style="display:none">
    <h2>Obnovení hesla</h2>
    <div class="reset-box">
      <div class="reset-title">📋 Zadejte záchranný kód</div>
      <div class="field">
        <label>Záchranný kód</label>
        <input type="password" id="rc" placeholder="Záchranný kód (viz zápisník / papír)">
        <div class="hint">Záchranný kód je uložen u správce systému nebo zapsán na bezpečném místě. Není to stejné heslo jako přihlašovací.</div>
      </div>
      <div class="field">
        <label>Nové heslo</label>
        <input type="password" id="np" placeholder="Nové heslo">
      </div>
      <div class="field">
        <label>Nové heslo znovu</label>
        <input type="password" id="nc" placeholder="Zopakujte nové heslo">
      </div>
      <button class="btn-main" onclick="doReset()">Nastavit nové heslo</button>
      <div id="reset-msg"></div>
    </div>
    <hr class="divider">
    <button class="btn-sec" onclick="document.getElementById('reset-section').style.display='none';document.getElementById('login-section').style.display='block'">
      ← Zpět na přihlášení
    </button>
  </div>
</div>
<script>
async function doReset() {
  const rc = document.getElementById('rc').value;
  const np = document.getElementById('np').value;
  const nc = document.getElementById('nc').value;
  const msg = document.getElementById('reset-msg');
  if (!rc || !np || !nc) { msg.className='err'; msg.textContent='Vyplňte všechna pole.'; return; }
  if (np !== nc) { msg.className='err'; msg.textContent='Nová hesla se neshodují.'; return; }
  if (np.length < 4) { msg.className='err'; msg.textContent='Heslo musí mít alespoň 4 znaky.'; return; }
  const r = await fetch('/admin/reset-password', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resetCode:rc,newPassword:np})});
  const j = await r.json();
  if (j.ok) {
    msg.className='ok'; msg.textContent='✓ Heslo bylo změněno! Nyní se přihlaste.';
    setTimeout(()=>{ document.getElementById('reset-section').style.display='none'; document.getElementById('login-section').style.display='block'; },2000);
  } else {
    msg.className='err'; msg.textContent='⚠️ '+j.error;
  }
}
</script>
</body></html>`);
});

app.post('/admin/login', (req, res) => {
  if (req.body.username === ADMIN_USERNAME && req.body.password === getPassword()) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.add(token);
    res.setHeader('Set-Cookie', `adminToken=${token}; Path=/; HttpOnly; SameSite=Lax`);
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?err=1');
});

app.get('/admin/logout', (req, res) => {
  sessions.delete(parseCookies(req).adminToken);
  res.redirect('/admin/login');
});

// ── Admin page ────────────────────────────────────────────────────────────────
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ── API ───────────────────────────────────────────────────────────────────────
app.get('/api/data', (req, res) => {
  try { res.json(loadData()); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/data', requireAdmin, (req, res) => {
  try { saveData(req.body); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Žádný soubor' });
  res.json({ url: '/uploads/' + req.file.filename });
});

app.post('/admin/reset-password', (req, res) => {
  const { resetCode, newPassword } = req.body;
  if (!resetCode || !newPassword) return res.status(400).json({ error: 'Chybí údaje.' });
  if (resetCode !== ADMIN_RESET_CODE) return res.status(403).json({ error: 'Záchranný kód není správný.' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Heslo musí mít alespoň 4 znaky.' });
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ password: newPassword }, null, 2), 'utf8');
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Chybí údaje.' });
  if (currentPassword !== getPassword()) return res.status(403).json({ error: 'Současné heslo není správné.' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Nové heslo musí mít alespoň 4 znaky.' });
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ password: newPassword }, null, 2), 'utf8');
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/upload/:filename', requireAdmin, (req, res) => {
  const safe = path.basename(req.params.filename);
  const file = path.join(UPLOADS_DIR, safe);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅  Katalog OOPP spuštěn`);
  console.log(`   Katalog : http://localhost:${PORT}`);
  console.log(`   Admin   : http://localhost:${PORT}/admin  (heslo: ${getPassword()})\n`);
});
