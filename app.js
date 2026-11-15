/* IMPERIUM GLADIADOR — app de entrenamiento (PWA, sin build) */
(() => {
'use strict';

const CFG = window.IMPERIUM_CONFIG || {};
// Dentro del APK de Android (Capacitor) el GPS corre en segundo plano; en la web solo con la pantalla encendida.
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const APK_URL = 'https://github.com/matiasmontiel2005-coder/El-Increible-Hulk/releases/download/android-latest/imperium.apk';
const LS_STATE = 'imperium.state.v1';
const LS_LOCAL = 'imperium.localmode';

/* ---------- Constantes ---------- */
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_S = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const GROUPS = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Piernas', 'Glúteos', 'Core', 'Funcional'];
const CATALOG_RAW = {
  Pecho: ['Press de banca', 'Press inclinado con mancuernas', 'Press declinado', 'Aperturas con mancuernas', 'Fondos en paralelas', 'Flexiones', 'Cruces en polea', 'Press en máquina'],
  Espalda: ['Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo con mancuerna', 'Remo en polea baja', 'Peso muerto', 'Remo en T', 'Pull-over'],
  Hombros: ['Press militar', 'Press de hombros con mancuernas', 'Elevaciones laterales', 'Elevaciones frontales', 'Pájaros', 'Face pull', 'Encogimientos'],
  'Bíceps': ['Curl con barra', 'Curl con mancuernas', 'Curl martillo', 'Curl predicador', 'Curl en polea'],
  'Tríceps': ['Press francés', 'Extensión en polea', 'Fondos en banco', 'Patada de tríceps', 'Press cerrado'],
  Piernas: ['Sentadilla', 'Sentadilla frontal', 'Prensa', 'Zancadas', 'Peso muerto rumano', 'Extensión de cuádriceps', 'Curl femoral', 'Sentadilla búlgara', 'Elevación de gemelos'],
  'Glúteos': ['Hip thrust', 'Patada de glúteo', 'Abducción en máquina'],
  Core: ['Plancha (seg)', 'Abdominales en polea', 'Elevación de piernas', 'Rueda abdominal', 'Russian twist'],
  Funcional: ['Burpees', 'Kettlebell swing', 'Farmer walk', 'Battle ropes']
};
const CATALOG = [];
for (const g of GROUPS) for (const n of CATALOG_RAW[g]) CATALOG.push({ id: 'c:' + n, name: n, group: g });

const RANKS = [
  { min: 0, name: 'Recluta', icon: '🛡' },
  { min: 150, name: 'Legionario', icon: '⚔' },
  { min: 400, name: 'Optio', icon: '🔱' },
  { min: 900, name: 'Centurión', icon: '🏛' },
  { min: 1800, name: 'Tribuno', icon: '🦅' },
  { min: 3500, name: 'Legado', icon: '⚜' },
  { min: 7000, name: 'Emperador', icon: '👑' }
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MEASURES = {
  peso: { name: 'Peso corporal', unit: 'kg' }, brazo: { name: 'Brazo', unit: 'cm' }, pecho: { name: 'Pecho', unit: 'cm' },
  cintura: { name: 'Cintura', unit: 'cm' }, cadera: { name: 'Cadera', unit: 'cm' }, muslo: { name: 'Muslo', unit: 'cm' },
  hombros: { name: 'Hombros', unit: 'cm' }
};
const LATIN = ['Per aspera ad astra.', 'Fortes fortuna adiuvat.', 'Si vis pacem, para bellum.', 'Citius, altius, fortius.',
  'Veni, vidi, vici.', 'Ad victoriam.', 'Disciplina est victoria.', 'Audentes fortuna iuvat.', 'Vincit qui se vincit.'];
const TABS = [['foro', 'Foro'], ['rutina', 'Rutina'], ['entrenar', 'Entrenar'], ['progreso', 'Progreso'],
  ['metas', 'Metas'], ['correr', 'Correr'], ['arena', 'Arena']];

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
const dow = s => (pd(s).getDay() + 6) % 7;
const weekStart = s => addDays(s, -dow(s));
const diffDays = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const fmtD = s => { const d = pd(s); const o = { day: 'numeric', month: 'short' }; if (d.getFullYear() !== new Date().getFullYear()) o.year = '2-digit'; return d.toLocaleDateString('es-AR', o); };
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmtN = (n, dec = 1) => n == null ? '–' : (Math.round(n * 10 ** dec) / 10 ** dec).toString().replace('.', ',');
const fmtTime = min => { if (min == null) return '–'; const s = Math.round(min * 60); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return h ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`; };
const fmtPace = (min, km) => (!min || !km) ? '–' : fmtTime(min / km) + '/km';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/* ---------- Estado ---------- */
const emptyState = () => ({
  v: 1, owner: null, updated: 0,
  exercises: [], routine: {}, sessions: [], runs: [], body: [], goals: [], profile: { name: '', share: true, shareRoutes: true },
  active: null, settings: { rest: 90, hasToken: false }
});
let state = emptyState();
const ui = { routineDay: (new Date().getDay() + 6) % 7, progTab: 'fuerza', exId: null, bodyType: 'peso', startDay: null };

function loadState() {
  try { const raw = localStorage.getItem(LS_STATE); if (raw) state = Object.assign(emptyState(), JSON.parse(raw)); } catch { /* estado corrupto: se ignora */ }
}
let pushTimer = null;
function save(touch = true) {
  if (touch) state.updated = Date.now();
  try { localStorage.setItem(LS_STATE, JSON.stringify(state)); } catch { toast('No se pudo guardar en este dispositivo'); }
  if (sb && user && touch) { clearTimeout(pushTimer); pushTimer = setTimeout(pushRemote, 1500); setSyncBadge('pend'); }
}

/* ---------- Datos derivados ---------- */
const allEx = () => CATALOG.concat(state.exercises);
const exById = id => allEx().find(e => e.id === id);
const exName = id => exById(id)?.name || '(ejercicio eliminado)';
const sessionsSorted = () => state.sessions.slice().sort((a, b) => a.date.localeCompare(b.date) || (a.start || 0) - (b.start || 0));

function exHistory(exId) {
  const out = [];
  for (const s of sessionsSorted()) {
    for (const e of s.entries) {
      if (e.exId !== exId) continue;
      const sets = e.sets.filter(x => x.done && x.w != null && x.r != null);
      if (!sets.length) continue;
      out.push({
        date: s.date, sets,
        best: Math.max(...sets.map(x => x.w)),
        e1rm: Math.max(...sets.map(x => x.w * (1 + x.r / 30))),
        vol: sets.reduce((a, x) => a + x.w * x.r, 0)
      });
    }
  }
  return out;
}
const bestWeight = exId => { const h = exHistory(exId); return h.length ? Math.max(...h.map(x => x.best)) : 0; };
const lastSets = exId => { const h = exHistory(exId); return h.length ? h[h.length - 1].sets : null; };

function countPRs() {
  const max = {}; let n = 0;
  for (const s of sessionsSorted()) for (const e of s.entries) {
    const w = Math.max(0, ...e.sets.filter(x => x.done && x.w).map(x => x.w));
    if (!w) continue;
    if (max[e.exId] != null && w > max[e.exId]) n++;
    max[e.exId] = Math.max(max[e.exId] || 0, w);
  }
  return n;
}
function trainingDates() { return new Set([...state.sessions.map(s => s.date), ...state.runs.map(r => r.date)]); }
function sessionsInWeek(ws) { return state.sessions.filter(s => s.date >= ws && s.date <= addDays(ws, 6)); }

function xpInfo() {
  const sets = state.sessions.reduce((a, s) => a + s.entries.reduce((b, e) => b + e.sets.filter(x => x.done).length, 0), 0);
  const km = state.runs.reduce((a, r) => a + (r.km || 0), 0);
  const goalsDone = state.goals.filter(g => goalProgress(g).pct >= 1).length;
  const prs = countPRs();
  const xp = Math.round(state.sessions.length * 20 + sets + km * 3 + prs * 30 + goalsDone * 100);
  let i = RANKS.length - 1; while (i > 0 && xp < RANKS[i].min) i--;
  const cur = RANKS[i], nxt = RANKS[i + 1] || null;
  return { xp, rank: cur, roman: ROMAN[i], next: nxt, pct: nxt ? (xp - cur.min) / (nxt.min - cur.min) : 1, prs, km, sets };
}

function latestBody(type) { return state.body.filter(b => b.type === type).sort((a, b) => a.date.localeCompare(b.date)).pop() || null; }

function goalProgress(g) {
  const t = today();
  let cur = 0, base = g.base || 0, target = g.target, pct = 0, txt = '', unit = '';
  if (g.type === 'strength') {
    cur = bestWeight(g.exId); unit = 'kg';
    pct = target > base ? (cur - base) / (target - base) : (cur >= target ? 1 : 0);
    txt = `${fmtN(cur)} / ${fmtN(target)} kg`;
  } else if (g.type === 'body') {
    const m = MEASURES[g.measure]; unit = m.unit;
    cur = latestBody(g.measure)?.value ?? base;
    pct = target < base ? (base - cur) / (base - target) : (target > base ? (cur - base) / (target - base) : 1);
    txt = `${fmtN(cur)} → ${fmtN(target)} ${unit} (partías de ${fmtN(base)})`;
  } else if (g.type === 'run') {
    const runs = state.runs.filter(r => r.date >= g.start && r.date <= g.deadline);
    if (g.mode === 'total') { cur = runs.reduce((a, r) => a + r.km, 0); pct = cur / target; txt = `${fmtN(cur)} / ${fmtN(target)} km acumulados`; }
    else if (g.mode === 'longest') { cur = Math.max(0, ...runs.map(r => r.km)); pct = cur / target; txt = `Mejor salida: ${fmtN(cur)} / ${fmtN(target)} km`; }
    else {
      const c = runs.filter(r => r.km >= g.km && r.min > 0).map(r => r.min * g.km / r.km);
      cur = c.length ? Math.min(...c) : null;
      pct = cur == null ? 0 : Math.min(1, target / cur);
      txt = `${g.km} km: mejor ${cur == null ? 'sin marca' : fmtTime(cur)} · meta ${fmtTime(target)}`;
    }
  } else if (g.type === 'habit') {
    const weeks = Math.max(1, Math.ceil((diffDays(g.start, g.deadline) + 1) / 7));
    target = g.perWeek * weeks;
    const days = [...trainingDates()].filter(d => d >= g.start && d <= g.deadline);
    cur = days.length; pct = cur / target;
    const thisWeek = [...trainingDates()].filter(d => d >= weekStart(t) && d <= addDays(weekStart(t), 6)).length;
    txt = `${cur} / ${target} entrenos · esta semana ${thisWeek}/${g.perWeek}`;
  }
  pct = clamp(pct);
  const total = Math.max(1, diffDays(g.start, g.deadline));
  const elapsed = clamp(diffDays(g.start, t) / total);
  const left = diffDays(t, g.deadline);
  let status = 'ritmo';
  if (pct >= 1) status = 'cumplida'; else if (left < 0) status = 'vencida'; else if (pct < elapsed - 0.1) status = 'atrasada';
  return { pct, txt, status, left, elapsed, cur, target };
}
const STATUS_LABEL = { cumplida: ['Cumplida', 'ok-t'], vencida: ['Vencida', 'red-t'], atrasada: ['Atrasada', 'red-t'], ritmo: ['En ritmo', 'gold-t'] };

/* ---------- UI helpers ---------- */
function toast(msg, ms = 2600) {
  const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.add('hidden'), ms);
}
function openModal(html) {
  const m = $('#modal'), again = !m.classList.contains('hidden') && !m.classList.contains('closing');
  clearTimeout(closeModal.t);
  m.innerHTML = `<div class="sheet${again ? ' again' : ''}">${html}</div>`;
  [...m.firstElementChild.children].forEach((c, i) => c.style.setProperty('--n', Math.min(i, 10)));
  m.classList.remove('hidden', 'closing'); document.body.classList.add('sheet-open');
}
function closeModal() {
  const m = $('#modal'); if (m.classList.contains('hidden')) return;
  document.body.classList.remove('sheet-open'); m.classList.add('closing');
  clearTimeout(closeModal.t);
  closeModal.t = setTimeout(() => { m.classList.add('hidden'); m.classList.remove('closing'); m.innerHTML = ''; }, 320);
}
const mv = id => $('#' + id, $('#modal'))?.value;
const val = id => document.getElementById(id)?.value;

const charts = [];
function killCharts() { charts.splice(0).forEach(c => c.destroy()); }
function drawChart(id, cfg) {
  const el = document.getElementById(id); if (!el || !window.Chart) return;
  charts.push(new Chart(el, cfg));
}
function chartBase(extra = {}) {
  return Object.assign({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { color: '#24211c' }, ticks: { maxRotation: 0, autoSkip: true } }, y: { grid: { color: '#24211c' }, beginAtZero: false } }
  }, extra);
}
const GOLD = '#c8a45a', GOLDHI = '#e6cf94', RED = '#8e2b2b', REDHI = '#c24a4a';
function lineDs(label, data, color = GOLD, fill = true) {
  return { label, data, borderColor: color, backgroundColor: color + '33', pointBackgroundColor: color, tension: .25, fill, pointRadius: 3, borderWidth: 2 };
}

/* ---------- Supabase / sincronización ---------- */
let sb = null, user = null, syncing = false;
function setSyncBadge(s) { ui.sync = s; const el = $('#syncBadge'); if (el) el.textContent = syncText(); }
function syncText() {
  if (!sb) return 'Modo local · sin sincronización';
  if (!user) return 'Sin sesión';
  return { pend: 'Cambios pendientes…', ok: 'Sincronizado ✓', err: 'Error de sincronización', off: 'Sin conexión' }[ui.sync] || 'Conectado';
}
async function pushRemote() {
  if (!sb || !user) return;
  try {
    state.owner = user.id;
    const { error } = await sb.from('user_data').upsert({ user_id: user.id, data: state, updated_at: new Date().toISOString() });
    if (error) throw error;
    await pushProfile();
    setSyncBadge('ok');
  } catch (e) { console.warn('push', e); setSyncBadge(navigator.onLine ? 'err' : 'off'); }
}
async function pullRemote() {
  const { data, error } = await sb.from('user_data').select('data').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data?.data || null;
}
async function initialSync() {
  if (!sb || !user || syncing) return;
  syncing = true;
  try {
    if (state.owner && state.owner !== user.id) state = emptyState(); // datos locales de otra cuenta
    const remote = await pullRemote();
    if (remote && (remote.updated || 0) > (state.updated || 0)) {
      state = Object.assign(emptyState(), remote); state.owner = user.id; save(false);
      await pushProfile(); setSyncBadge('ok');
    } else { await pushRemote(); }
  } catch (e) { console.warn('sync', e); setSyncBadge(navigator.onLine ? 'err' : 'off'); }
  syncing = false;
}

/* ---------- Recorrido (GPS), bandeja de carreras y token ---------- */
const INGEST_URL = () => (CFG.SUPABASE_URL || '').replace(/\/$/, '') + '/functions/v1/ingest-run';
function hav(a, b, c, d) {
  const R = 6371000, r = Math.PI / 180, dLa = (c - a) * r, dLo = (d - b) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
// Polilínea comprimida (formato de Google): un recorrido de 400 puntos ocupa ~1,5 KB.
function encNum(v) { v = v < 0 ? ~(v << 1) : v << 1; let o = ''; while (v >= 0x20) { o += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return o + String.fromCharCode(v + 63); }
function encodePoly(pts) { let o = '', pa = 0, po = 0; for (const [la, lo] of pts) { const a = Math.round(la * 1e5), b = Math.round(lo * 1e5); o += encNum(a - pa) + encNum(b - po); pa = a; po = b; } return o; }
function decodePoly(str) {
  const out = []; let i = 0, la = 0, lo = 0;
  while (i < str.length) {
    let r = 0, sh = 0, b;
    do { b = str.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20 && i < str.length);
    la += (r & 1) ? ~(r >> 1) : (r >> 1);
    r = 0; sh = 0;
    do { b = str.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20 && i < str.length);
    lo += (r & 1) ? ~(r >> 1) : (r >> 1);
    out.push([la / 1e5, lo / 1e5]);
  }
  return out;
}
function thin(pts, max = 400) {
  if (pts.length <= max) return pts;
  return Array.from({ length: max }, (_, i) => pts[Math.round(i * (pts.length - 1) / (max - 1))]);
}
// Dibuja el recorrido como línea sobre una cuadrícula (sin mapas externos: funciona offline y no filtra tu ubicación).
function routeSvg(poly, { w = 340, h = 280, pad = 22, thumb = false } = {}) {
  const pts = poly ? decodePoly(poly) : []; if (pts.length < 2) return '';
  const lat0 = pts.reduce((a, p) => a + p[0], 0) / pts.length, k = Math.cos(lat0 * Math.PI / 180);
  const xy = pts.map(([la, lo]) => [lo * k, -la]);
  const xs = xy.map(p => p[0]), ys = xy.map(p => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const sc = Math.min((w - 2 * pad) / ((maxx - minx) || 1e-9), (h - 2 * pad) / ((maxy - miny) || 1e-9));
  const ox = (w - (maxx - minx) * sc) / 2 - minx * sc, oy = (h - (maxy - miny) * sc) / 2 - miny * sc;
  const P = xy.map(([x, y]) => [x * sc + ox, y * sc + oy]);
  const d = P.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const st = P[0], en = P[P.length - 1], r = thumb ? 2.5 : 5;
  return `<svg class="route${thumb ? ' thumb' : ''}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Recorrido"><path class="line" pathLength="1" d="${d}"/>
    <circle class="rs" cx="${st[0].toFixed(1)}" cy="${st[1].toFixed(1)}" r="${r}"/><circle class="re" cx="${en[0].toFixed(1)}" cy="${en[1].toFixed(1)}" r="${r}"/></svg>`;
}

// Datos que llegan de otra cuenta: se validan antes de usarlos.
function cleanRun(r) {
  if (!r || typeof r !== 'object') return null;
  const km = Number(r.km), min = Number(r.min), poly = String(r.poly || ''), date = String(r.date || '');
  if (!(km > 0 && km < 400) || !(min > 0 && min < 2000) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[\x3f-\x7e]{8,14000}$/.test(poly)) return null;
  return { km, min, date, poly };
}
function runModal(r, who = '') {
  openModal(`<h2 style="margin-top:0">${fmtN(r.km, 2)} km</h2><p class="sub">${who ? esc(who) + ' · ' : ''}${fmtD(r.date)} · ${fmtTime(r.min)} · ${fmtPace(r.min, r.km)}</p>
    <div class="map">${routeSvg(r.poly)}</div><p class="muted small center" style="margin:10px 0 0"><span class="me-dot"></span>Salida <span class="ri-dot" style="margin-left:12px"></span>Llegada</p>
    <button class="btn-ghost btn-block" style="margin-top:14px" data-act="modal-close">Cerrar</button>`);
}

// --- Bandeja: carreras que el celular envió a la nube mientras la app estaba cerrada ---
async function pullInbox(quiet = true) {
  if (!sb || !user) return 0;
  try {
    const { data, error } = await sb.from('incoming_runs').select('id,ext_id,data');
    if (error) throw error;
    if (!data?.length) { if (!quiet) toast('No hay carreras nuevas'); return 0; }
    let n = 0;
    for (const row of data) {
      const d = row.data || {};
      if (state.runs.some(r => r.extId === row.ext_id)) continue;
      state.runs.push({ id: uid(), extId: row.ext_id, date: String(d.date).slice(0, 10), km: d.km, min: d.min, note: d.note || '', source: 'bridge',
        poly: Array.isArray(d.route) && d.route.length > 1 ? encodePoly(thin(d.route)) : undefined });
      n++;
    }
    if (n) save();
    const { error: de } = await sb.from('incoming_runs').delete().in('id', data.map(r => r.id)); // ya guardadas: se vacía la bandeja
    if (de) console.warn('inbox delete', de);
    if (n) { toast(`${n} carrera${n === 1 ? '' : 's'} nueva${n === 1 ? '' : 's'} de Adidas Running`); render(true); }
    else if (!quiet) toast('No hay carreras nuevas');
    return n;
  } catch (e) { console.warn('inbox', e); if (!quiet) toast('No se pudo revisar la bandeja'); return 0; }
}
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function newToken() {
  const raw = crypto.getRandomValues(new Uint8Array(24));
  const token = 'imp_' + [...raw].map(b => b.toString(16).padStart(2, '0')).join('');
  const { error } = await sb.from('ingest_tokens').upsert({ user_id: user.id, token_hash: await sha256(token) });
  if (error) throw error;
  state.settings.hasToken = true; save();
  return token;
}

// --- Rastreador GPS dentro de la app (el recorrido queda guardado con la carrera) ---
const TRK_KEY = 'imperium.track';
let trk = null, trkTimer = null, wake = null, trkMapAt = 0;
function trkLoad() {
  try {
    const d = JSON.parse(localStorage.getItem(TRK_KEY) || 'null');
    if (d && Array.isArray(d.pts)) trk = { pts: d.pts, dist: d.dist || 0, t0: d.t0, pausedMs: d.pausedMs || 0, paused: true, pausedAt: d.savedAt || Date.now(), watch: null, acc: null };
  } catch { /* borrador ilegible */ }
}
function trkSave() {
  if (!trk) return;
  try { localStorage.setItem(TRK_KEY, JSON.stringify({ pts: trk.pts, dist: trk.dist, t0: trk.t0, pausedMs: trk.pausedMs, savedAt: Date.now() })); } catch { /* sin espacio */ }
}
const trkElapsed = () => trk ? ((trk.paused ? trk.pausedAt : Date.now()) - trk.t0 - trk.pausedMs) / 60000 : 0;
async function trkWake() { try { if (!NATIVE && 'wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch { /* sin wake lock */ } }
function trkRelease() { try { wake?.release(); } catch { /* nada */ } wake = null; }
function trkPos(p) {
  if (!trk || trk.paused) return;
  const { latitude: la, longitude: lo, accuracy: ac } = p.coords; trk.acc = ac;
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return; // punto inválido: se ignora
  if (ac > 35) return; // señal imprecisa: se descarta
  const last = trk.pts[trk.pts.length - 1];
  if (last) {
    const d = hav(last[0], last[1], la, lo), dt = (p.timestamp - last[2]) / 1000;
    if (d < 4) return;                       // quieto / ruido del GPS
    if (dt > 0 && d / dt > 11) return;       // salto imposible (>40 km/h)
    trk.dist += d;
  }
  trk.pts.push([la, lo, p.timestamp]);
  if (trk.pts.length % 8 === 0) trkSave();
}
function trkErr(e) {
  if (e.code === 1) { trkPause(); toast('Falta el permiso de ubicación: activalo en los ajustes del navegador'); }
  else if (trk) trk.acc = null;
}
const BG = NATIVE ? window.Capacitor.registerPlugin('BackgroundGeolocation') : null;
async function watchStart() {
  if (!NATIVE) return navigator.geolocation.watchPosition(trkPos, trkErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
  return BG.addWatcher({ backgroundTitle: 'Imperium', backgroundMessage: 'Registrando tu carrera', requestPermissions: true, stale: false, distanceFilter: 3 }, (loc, err) => {
    if (err) {
      if (err.code === 'NOT_AUTHORIZED') { toast('Falta el permiso de ubicación: activalo en los ajustes'); try { BG.openSettings(); } catch { /* nada */ } trkPause(); }
      return;
    }
    if (loc) trkPos({ coords: { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy }, timestamp: loc.time || Date.now() });
  });
}
function watchStop(id) { try { if (NATIVE) BG.removeWatcher({ id }); else navigator.geolocation.clearWatch(id); } catch { /* ya estaba detenido */ } }
async function trkStart() {
  if (!NATIVE && !navigator.geolocation) return toast('Este dispositivo no permite usar el GPS');
  if (!trk) trk = { pts: [], dist: 0, t0: Date.now(), pausedMs: 0, paused: false, pausedAt: 0, watch: null, acc: null };
  if (trk.paused && trk.pausedAt) { trk.pausedMs += Date.now() - trk.pausedAt; trk.pausedAt = 0; }
  trk.paused = false;
  trkWake(); clearInterval(trkTimer); trkTimer = setInterval(trkTick, 1000); trkSave(); trkTick();
  if (trk.watch == null && !trk.starting) {
    trk.starting = true;
    try {
      const id = await watchStart();
      if (!trk || trk.paused) watchStop(id); else trk.watch = id; // si se pausó mientras arrancaba, se cierra
    } catch (e) { console.warn(e); toast('No se pudo iniciar el GPS'); if (trk) { trk.paused = true; trk.pausedAt = Date.now(); } }
    finally { if (trk) trk.starting = false; }
  }
}
function trkHalt() { if (trk?.watch != null) watchStop(trk.watch); if (trk) trk.watch = null; clearInterval(trkTimer); trkTimer = null; trkRelease(); }
function trkPause() { if (!trk || trk.paused) return; trk.paused = true; trk.pausedAt = Date.now(); trkHalt(); trkSave(); if (route() === 'rastrear') render(true); }
function trkTick() {
  if (!trk) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const min = trkElapsed(), km = trk.dist / 1000;
  set('trk-dist', fmtN(km, 2)); set('trk-time', fmtTime(min)); set('trk-pace', km > 0.05 ? fmtPace(min, km) : '–');
  set('trk-acc', trk.paused ? 'En pausa' : trk.acc == null ? 'Buscando señal de GPS…' : `Precisión del GPS: ${Math.round(trk.acc)} m${trk.acc > 35 ? ' (débil: se ignoran estos puntos)' : ''}`);
  const map = document.getElementById('trk-map');
  if (map && trk.pts.length > 1 && Date.now() - trkMapAt > 4000) { trkMapAt = Date.now(); map.innerHTML = routeSvg(encodePoly(thin(trk.pts.map(q => [q[0], q[1]]))), { thumb: false }); }
}
function trkDiscard() { trkHalt(); trk = null; try { localStorage.removeItem(TRK_KEY); } catch { /* nada */ } }
function trkFinish() {
  if (!trk) return;
  const km = trk.dist / 1000, min = trkElapsed();
  if (km < 0.1) {
    if (!confirm('El recorrido es muy corto (menos de 100 m). ¿Descartarlo?')) return;
    trkDiscard(); render(true); return;
  }
  trkHalt();
  const line = trk.pts.length > 1 ? encodePoly(thin(trk.pts.map(q => [q[0], q[1]]))) : undefined;
  state.runs.push({ id: uid(), date: ymd(new Date(trk.t0)), km: Math.round(km * 100) / 100, min: Math.round(min * 10) / 10, note: '', source: 'gps', poly: line });
  trk = null; try { localStorage.removeItem(TRK_KEY); } catch { /* nada */ }
  save(); toast('Recorrido guardado'); location.hash = '#/correr'; render();
}

/* ---------- Temporizador de descanso ---------- */
let rest = null;
function startRest(sec) { rest = { end: Date.now() + sec * 1000 }; tickRest(); clearInterval(startRest.i); startRest.i = setInterval(tickRest, 250); }
function stopRest() { rest = null; clearInterval(startRest.i); $('#rest').classList.add('hidden'); }
function tickRest() {
  const el = $('#rest'); if (!rest) return;
  const left = Math.ceil((rest.end - Date.now()) / 1000);
  if (left <= 0) {
    stopRest(); try { navigator.vibrate?.([200, 100, 200]); beep(); } catch { /* sin vibración */ }
    toast('¡A la batalla! Descanso terminado'); return;
  }
  el.classList.remove('hidden');
  el.innerHTML = `<span class="t">${Math.floor(left / 60)}:${pad(left % 60)}</span><span class="grow muted small">Descanso</span>
    <button class="btn-sm" data-act="rest+">+15s</button><button class="btn-sm btn-ghost" data-act="rest-stop">Saltar</button>`;
}
function beep() {
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  const c = new C(), o = c.createOscillator(), g = c.createGain();
  o.frequency.value = 660; g.gain.value = .15; o.connect(g); g.connect(c.destination); o.start(); setTimeout(() => { o.stop(); c.close(); }, 350);
}

/* ---------- Vistas ---------- */
const V = {};

V.foro = () => {
  const x = xpInfo(), t = today(), ws = weekStart(t);
  const dIdx = dow(t), todayR = state.routine[dIdx];
  const trained = trainingDates();
  const week = DAYS.map((_, i) => {
    const d = addDays(ws, i), r = state.routine[i]?.items?.length;
    return `<div class="day ${d === t ? 'today' : ''} ${trained.has(d) ? 'done' : ''}">${DAY_S[i]}<small>${trained.has(d) ? '✔' : (r ? '⚔' : '·')}</small></div>`;
  }).join('');
  const monthStart = t.slice(0, 8) + '01';
  const monthSessions = state.sessions.filter(s => s.date >= monthStart).length;
  const monthKm = state.runs.filter(r => r.date >= monthStart).reduce((a, r) => a + r.km, 0);
  const goals = state.goals.map(g => ({ g, p: goalProgress(g) })).filter(o => o.p.status !== 'cumplida' && o.p.status !== 'vencida').slice(0, 3);
  const quote = LATIN[Math.floor(Date.now() / 864e5) % LATIN.length];
  const active = state.active;
  return `
  <div class="card gold hero">
    <div class="laurel">${x.roman}</div>
    <div class="rank-name">${x.rank.name}</div>
    <div class="muted small" style="margin:4px 0 10px">${x.xp} puntos de gloria${x.next ? ` · faltan ${x.next.min - x.xp} para ${x.next.name}` : ' · rango máximo'}</div>
    <div class="bar"><i style="width:${Math.round(x.pct * 100)}%"></i></div>
    <div class="muted small" style="margin-top:10px;font-style:italic">“${quote}”</div>
  </div>
  <h2>Esta semana</h2>
  <div class="week">${week}</div>
  <div class="card" style="margin-top:12px">
    ${active ? `<div class="row between"><div><h3>Batalla en curso</h3><div class="muted small">${esc(active.name)}</div></div><a href="#/entrenar" class="btn btn-primary" style="text-decoration:none">Continuar</a></div>`
      : (todayR?.items?.length ? `<div class="row between"><div><h3>Hoy: ${esc(todayR.name || DAYS[dIdx])}</h3><div class="muted small">${todayR.items.length} ejercicios en tu rutina</div></div><button class="btn-primary" data-act="start-day" data-day="${dIdx}">Entrenar</button></div>`
        : `<div class="row between"><div><h3>Hoy: ${DAYS[dIdx]}</h3><div class="muted small">${Object.values(state.routine).some(r => r.items?.length) ? 'Día de descanso. El guerrero también repone fuerzas.' : 'Todavía no armaste tu rutina.'}</div></div><a href="#/rutina" class="btn" style="text-decoration:none">${Object.values(state.routine).some(r => r.items?.length) ? 'Ver rutina' : 'Armar rutina'}</a></div>`)}
  </div>
  <div class="grid3">
    <div class="card stat"><b>${monthSessions}</b><span>Sesiones del mes</span></div>
    <div class="card stat"><b>${fmtN(monthKm)}</b><span>Km del mes</span></div>
    <div class="card stat"><b>${x.prs}</b><span>Récords</span></div>
  </div>
  <h2>Campañas</h2>
  ${goals.length ? goals.map(({ g, p }) => goalCard(g, p, true)).join('') : `<div class="card empty"><span class="big">···</span>Sin campañas activas.<br><a href="#/metas" class="gold-t">Fijá tu primer objetivo</a></div>`}`;
};

function goalTitle(g) {
  if (g.title) return g.title;
  if (g.type === 'strength') return `${exName(g.exId)}: ${fmtN(g.target)} kg`;
  if (g.type === 'body') return `${MEASURES[g.measure].name}: ${fmtN(g.target)} ${MEASURES[g.measure].unit}`;
  if (g.type === 'run') return g.mode === 'total' ? `Correr ${fmtN(g.target)} km en total` : g.mode === 'longest' ? `Una salida de ${fmtN(g.target)} km` : `${g.km} km en ${fmtTime(g.target)}`;
  return `${g.perWeek} entrenos por semana`;
}
const GOAL_ICON = { strength: '🏋', body: '📏', run: '👟', habit: '🔥' };
function goalCard(g, p, compact = false) {
  const [lab, cls] = STATUS_LABEL[p.status];
  return `<div class="card ${p.status === 'cumplida' ? 'gold' : ''}">
    <div class="row between"><h3>${esc(goalTitle(g))}</h3><span class="tag ${cls}">${lab}</span></div>
    <div class="muted small" style="margin:6px 0">${esc(p.txt)}</div>
    <div class="bar ${p.status === 'cumplida' ? 'done' : p.status === 'atrasada' || p.status === 'vencida' ? 'late' : ''}"><i style="width:${Math.round(p.pct * 100)}%"></i></div>
    <div class="row between small muted" style="margin-top:6px"><span>${Math.round(p.pct * 100)}% · tiempo ${Math.round(p.elapsed * 100)}%</span>
      <span>${p.left >= 0 ? `Quedan ${p.left} día${p.left === 1 ? '' : 's'} (${fmtD(g.deadline)})` : `Venció el ${fmtD(g.deadline)}`}</span></div>
    ${compact ? '' : `<div style="margin-top:8px;text-align:right"><button class="btn-sm btn-danger" data-act="goal-del" data-id="${g.id}">Eliminar</button></div>`}
  </div>`;
}

/* --- Rutina --- */
V.rutina = () => {
  const d = ui.routineDay, r = state.routine[d] || { name: '', items: [] };
  const chips = DAYS.map((n, i) => `<button class="chip ${i === d ? 'on' : ''}" data-act="rday" data-day="${i}">${DAY_S[i]}${state.routine[i]?.items?.length ? ' •' : ''}</button>`).join('');
  return `
  <h1>Rutina semanal</h1><p class="sub">Diseñá cada día de tu entrenamiento: ejercicios, series, repeticiones y peso objetivo.</p>
  <div class="chips" style="margin-bottom:12px">${chips}</div>
  <div class="card">
    <label style="margin-top:0">${DAYS[d]} — nombre del día (opcional)</label>
    <input data-in="rname" value="${esc(r.name || '')}" placeholder="Ej: Pecho y tríceps" maxlength="40">
  </div>
  ${r.items.length ? r.items.map((it, i) => `
  <div class="card">
    <div class="row between"><h3>${esc(exName(it.exId))}</h3>
      <div class="row"><button class="btn-sm icon-btn" data-act="rup" data-id="${it.id}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="btn-sm icon-btn" data-act="rdown" data-id="${it.id}" ${i === r.items.length - 1 ? 'disabled' : ''}>↓</button>
      <button class="btn-sm icon-btn btn-danger" data-act="rdel" data-id="${it.id}">✕</button></div></div>
    <div class="grid3">
      <div><label>Series</label><input type="number" inputmode="numeric" min="1" data-in="rt" data-id="${it.id}" data-f="sets" value="${it.sets ?? ''}"></div>
      <div><label>Reps</label><input type="number" inputmode="numeric" min="1" data-in="rt" data-id="${it.id}" data-f="reps" value="${it.reps ?? ''}"></div>
      <div><label>Peso (kg)</label><input type="number" inputmode="decimal" min="0" step="0.5" data-in="rt" data-id="${it.id}" data-f="weight" value="${it.weight ?? ''}"></div>
    </div>
  </div>`).join('') : `<div class="card empty"><span class="big">···</span>${DAYS[d]} está vacío.<br>Agregá ejercicios o dejalo como día de descanso.</div>`}
  <button class="btn-primary btn-block" data-act="radd">+ Añadir ejercicio</button>
  ${r.items.length ? `<button class="btn-block" style="margin-top:10px" data-act="start-day" data-day="${d}">Entrenar este día ahora</button>
  <button class="btn-block btn-ghost" style="margin-top:10px" data-act="rcopy">Copiar este día a otro…</button>` : ''}`;
};

/* --- Entrenar --- */
V.entrenar = () => state.active ? liveView() : startView();
function startView() {
  const d = ui.startDay ?? dow(today());
  const opts = DAYS.map((n, i) => `<option value="${i}" ${i === d ? 'selected' : ''}>${n}${state.routine[i]?.name ? ' — ' + esc(state.routine[i].name) : ''}${state.routine[i]?.items?.length ? '' : ' (vacío)'}</option>`).join('');
  const recent = sessionsSorted().reverse().slice(0, 12);
  return `
  <h1>Entrenar</h1><p class="sub">Registrá cada serie en vivo, con descanso cronometrado.</p>
  <div class="card gold">
    <label style="margin-top:0">¿Qué día de tu rutina?</label>
    <select data-in="startday">${opts}</select>
    <button class="btn-primary btn-block" style="margin-top:12px" data-act="start-day" data-day="${d}">Comenzar batalla</button>
    <button class="btn-block btn-ghost" style="margin-top:8px" data-act="start-free">Entrenamiento libre</button>
  </div>
  <h2>Historial</h2>
  ${recent.length ? `<div class="card">${recent.map(s => {
    const sets = s.entries.reduce((a, e) => a + e.sets.length, 0);
    const vol = s.entries.reduce((a, e) => a + e.sets.reduce((b, x) => b + (x.w || 0) * (x.r || 0), 0), 0);
    return `<div class="list-item"><div class="grow"><b>${esc(s.name)}</b>${s.prs?.length ? `<span class="pr">${s.prs.length} PR</span>` : ''}
      <div class="muted small">${fmtD(s.date)} · ${s.entries.length} ejercicios · ${sets} series · ${Math.round(vol)} kg volumen${s.dur ? ' · ' + s.dur + ' min' : ''}</div></div>
      <button class="btn-sm icon-btn" data-act="sess-view" data-id="${s.id}">Ver</button>
      <button class="btn-sm icon-btn btn-danger" data-act="sess-del" data-id="${s.id}">✕</button></div>`;
  }).join('')}</div>` : `<div class="card empty"><span class="big">···</span>Aún no hay batallas registradas.</div>`}`;
}
function liveView() {
  const a = state.active;
  return `
  <div class="row between"><div><h1>${esc(a.name)}</h1><p class="sub" style="margin:0">${fmtD(a.date)} · empezó ${new Date(a.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p></div></div>
  <div style="height:12px"></div>
  ${a.entries.map((e, ei) => {
    const last = lastSets(e.exId);
    return `<div class="card ex-card">
      <div class="row between"><h3>${esc(exName(e.exId))}</h3><button class="btn-sm icon-btn btn-danger" data-act="live-exdel" data-e="${ei}">✕</button></div>
      <p class="hint">${last ? 'Última vez: ' + last.map(s => `${fmtN(s.w)}kg×${s.r}`).join(' · ') : 'Primera vez con este ejercicio'}</p>
      <div class="set-head"><span>#</span><span>Kg</span><span>Reps</span><span></span></div>
      ${e.sets.map((s, si) => `<div class="set ${s.done ? 'done' : ''}">
        <span class="n">${si + 1}</span>
        <input type="number" inputmode="decimal" step="0.5" min="0" data-in="live" data-e="${ei}" data-s="${si}" data-f="w" value="${s.w ?? ''}" placeholder="kg">
        <input type="number" inputmode="numeric" min="0" data-in="live" data-e="${ei}" data-s="${si}" data-f="r" value="${s.r ?? ''}" placeholder="reps">
        <button class="ok" data-act="live-done" data-e="${ei}" data-s="${si}" aria-label="Serie hecha">✔</button></div>`).join('')}
      <div class="row" style="margin-top:8px"><button class="btn-sm" data-act="live-addset" data-e="${ei}">+ Serie</button>
      <button class="btn-sm btn-ghost" data-act="live-delset" data-e="${ei}">− Serie</button></div>
    </div>`;
  }).join('')}
  <button class="btn-block" data-act="live-addex">+ Añadir ejercicio</button>
  <button class="btn-primary btn-block" style="margin-top:12px" data-act="live-finish">Terminar entrenamiento</button>
  <button class="btn-block btn-danger" style="margin-top:10px" data-act="live-cancel">Descartar</button>`;
}

/* --- Progreso --- */
V.progreso = () => {
  const seg = [['fuerza', 'Fuerza'], ['cuerpo', 'Cuerpo'], ['constancia', 'Constancia']]
    .map(([k, n]) => `<button class="${ui.progTab === k ? 'on' : ''}" data-act="ptab" data-t="${k}">${n}</button>`).join('');
  return `<h1>Progreso</h1><p class="sub">Tus gráficos se actualizan solos con cada registro.</p><div class="seg" style="margin-bottom:14px">${seg}</div>${V['prog_' + ui.progTab]()}`;
};
V.prog_fuerza = () => {
  const withHist = allEx().filter(e => exHistory(e.id).length);
  if (!withHist.length) return `<div class="card empty"><span class="big">···</span>Todavía no hay datos de fuerza.<br>Completá series en <a class="gold-t" href="#/entrenar">Entrenar</a> y acá aparecerá tu evolución.</div>`;
  if (!ui.exId || !withHist.some(e => e.id === ui.exId)) ui.exId = withHist[0].id;
  const h = exHistory(ui.exId);
  const best = Math.max(...h.map(x => x.best));
  const first = h[0].best;
  return `
  <select data-in="progex">${withHist.map(e => `<option value="${e.id}" ${e.id === ui.exId ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>
  <div class="grid3" style="margin-top:12px">
    <div class="card stat"><b>${fmtN(best)}</b><span>Mejor kg</span></div>
    <div class="card stat"><b>${h.length}</b><span>Sesiones</span></div>
    <div class="card stat"><b class="${best >= first ? 'ok-t' : ''}">${best - first >= 0 ? '+' : ''}${fmtN(best - first)}</b><span>Desde el inicio</span></div>
  </div>
  <div class="card"><h3>Peso máximo y 1RM estimado</h3><div class="chart-box"><canvas id="ch1"></canvas></div></div>
  <div class="card"><h3>Volumen por sesión (kg × reps)</h3><div class="chart-box"><canvas id="ch2"></canvas></div></div>
  <div class="card"><h3>Registro</h3>${h.slice().reverse().slice(0, 10).map(x => `<div class="list-item"><div class="grow"><b>${fmtD(x.date)}</b>
    <div class="muted small">${x.sets.map(s => `${fmtN(s.w)}×${s.r}`).join(' · ')}</div></div><span class="tag gold">${fmtN(x.best)} kg</span></div>`).join('')}</div>`;
};
V.prog_cuerpo = () => {
  const chips = Object.entries(MEASURES).map(([k, m]) => `<button class="chip ${ui.bodyType === k ? 'on' : ''}" data-act="btype" data-t="${k}">${m.name}</button>`).join('');
  const m = MEASURES[ui.bodyType];
  const list = state.body.filter(b => b.type === ui.bodyType).sort((a, b) => a.date.localeCompare(b.date));
  return `
  <div class="chips" style="margin-bottom:12px">${chips}</div>
  <div class="card gold">
    <div class="grid2"><div><label style="margin-top:0">Fecha</label><input type="date" id="bd" value="${today()}"></div>
    <div><label style="margin-top:0">${m.name} (${m.unit})</label><input type="number" inputmode="decimal" step="0.1" id="bv" placeholder="${list.length ? fmtN(list[list.length - 1].value) : ''}"></div></div>
    <button class="btn-primary btn-block" style="margin-top:12px" data-act="body-add">Registrar medida</button>
  </div>
  ${list.length ? `<div class="card"><h3>${m.name}</h3><div class="chart-box"><canvas id="ch1"></canvas></div></div>
  <div class="card">${list.slice().reverse().slice(0, 12).map(b => `<div class="list-item"><div class="grow"><b>${fmtN(b.value)} ${m.unit}</b><div class="muted small">${fmtD(b.date)}</div></div>
    <button class="btn-sm icon-btn btn-danger" data-act="body-del" data-id="${b.id}">✕</button></div>`).join('')}</div>`
    : `<div class="card empty"><span class="big">···</span>Sin registros de ${m.name.toLowerCase()}.</div>`}`;
};
V.prog_constancia = () => {
  const t = today(), ws = weekStart(t);
  const streak = streakWeeks();
  const total = state.sessions.length;
  const vol = state.sessions.reduce((a, s) => a + s.entries.reduce((b, e) => b + e.sets.filter(x => x.done || true).reduce((c, x) => c + (x.w || 0) * (x.r || 0), 0), 0), 0);
  return `<div class="grid3"><div class="card stat"><b>${total}</b><span>Sesiones</span></div>
  <div class="card stat"><b>${streak}</b><span>Semanas seguidas</span></div>
  <div class="card stat"><b>${vol >= 1000 ? fmtN(vol / 1000) + 't' : Math.round(vol)}</b><span>Volumen total${vol >= 1000 ? '' : ' kg'}</span></div></div>
  <div class="card"><h3>Entrenos por semana (12 semanas)</h3><div class="chart-box"><canvas id="ch1"></canvas></div></div>
  <div class="card"><h3>Volumen semanal (kg)</h3><div class="chart-box"><canvas id="ch2"></canvas></div></div>`;
};
function afterProgreso() {
  if (ui.progTab === 'fuerza' && ui.exId) {
    const h = exHistory(ui.exId); if (!h.length) return;
    const labels = h.map(x => fmtD(x.date));
    drawChart('ch1', { type: 'line', data: { labels, datasets: [lineDs('Peso máx (kg)', h.map(x => x.best), GOLD), lineDs('1RM estimado', h.map(x => Math.round(x.e1rm * 10) / 10), REDHI, false)] }, options: chartBase({ plugins: { legend: { display: true, labels: { boxWidth: 12 } } } }) });
    drawChart('ch2', { type: 'bar', data: { labels, datasets: [{ data: h.map(x => Math.round(x.vol)), backgroundColor: RED, borderColor: GOLD, borderWidth: 1, borderRadius: 4 }] }, options: chartBase({ scales: { x: { grid: { color: '#24211c' } }, y: { grid: { color: '#24211c' }, beginAtZero: true } } }) });
  } else if (ui.progTab === 'cuerpo') {
    const list = state.body.filter(b => b.type === ui.bodyType).sort((a, b) => a.date.localeCompare(b.date));
    if (list.length) drawChart('ch1', { type: 'line', data: { labels: list.map(b => fmtD(b.date)), datasets: [lineDs(MEASURES[ui.bodyType].name, list.map(b => b.value))] }, options: chartBase() });
  } else if (ui.progTab === 'constancia') {
    const ws = weekStart(today()), labels = [], gym = [], run = [], vol = [];
    for (let w = 11; w >= 0; w--) {
      const s = addDays(ws, -7 * w), e = addDays(s, 6); labels.push(fmtD(s));
      const ss = state.sessions.filter(x => x.date >= s && x.date <= e);
      gym.push(ss.length); run.push(state.runs.filter(x => x.date >= s && x.date <= e).length);
      vol.push(Math.round(ss.reduce((a, x) => a + x.entries.reduce((b, en) => b + en.sets.reduce((c, y) => c + (y.w || 0) * (y.r || 0), 0), 0), 0)));
    }
    const opt = chartBase({ plugins: { legend: { display: true, labels: { boxWidth: 12 } } }, scales: { x: { stacked: true, grid: { color: '#24211c' } }, y: { stacked: true, grid: { color: '#24211c' }, ticks: { precision: 0 }, beginAtZero: true } } });
    drawChart('ch1', { type: 'bar', data: { labels, datasets: [{ label: 'Gimnasio', data: gym, backgroundColor: RED, borderRadius: 4 }, { label: 'Running', data: run, backgroundColor: GOLD, borderRadius: 4 }] }, options: opt });
    drawChart('ch2', { type: 'line', data: { labels, datasets: [lineDs('Volumen', vol)] }, options: chartBase({ scales: { x: { grid: { color: '#24211c' } }, y: { grid: { color: '#24211c' }, beginAtZero: true } } }) });
  }
}

/* --- Metas --- */
V.metas = () => {
  const items = state.goals.map(g => ({ g, p: goalProgress(g) }));
  const order = { atrasada: 0, ritmo: 1, vencida: 2, cumplida: 3 };
  items.sort((a, b) => order[a.p.status] - order[b.p.status] || a.g.deadline.localeCompare(b.g.deadline));
  return `<h1>Campañas</h1><p class="sub">Objetivos con meta y fecha límite. El progreso se calcula solo con tus entrenos.</p>
  <button class="btn-primary btn-block" data-act="goal-new" style="margin-bottom:14px">+ Nueva campaña</button>
  ${items.length ? items.map(({ g, p }) => goalCard(g, p)).join('') : `<div class="card empty"><span class="big">···</span>No hay campañas. Un guerrero sin objetivo es un turista.</div>`}`;
};
function goalForm(type = 'strength') {
  const tabs = [['strength', 'Fuerza'], ['body', 'Cuerpo'], ['run', 'Running'], ['habit', 'Constancia']]
    .map(([k, n]) => `<button class="${k === type ? 'on' : ''}" data-act="goal-type" data-t="${k}">${n}</button>`).join('');
  let f = '';
  if (type === 'strength') f = `<label>Ejercicio</label><select id="g_ex">${allEx().map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select>
    <label>Peso objetivo (kg)</label><input id="g_t" type="number" inputmode="decimal" step="0.5">`;
  else if (type === 'body') {
    const first = Object.keys(MEASURES)[0], l = latestBody(first);
    f = `<label>Medida</label><select id="g_m" data-in="gmeasure">${Object.entries(MEASURES).map(([k, m]) => `<option value="${k}">${m.name} (${m.unit})</option>`).join('')}</select>
    <div class="grid2"><div><label>Valor actual</label><input id="g_b" type="number" inputmode="decimal" step="0.1" value="${l ? l.value : ''}"></div>
    <div><label>Valor objetivo</label><input id="g_t" type="number" inputmode="decimal" step="0.1"></div></div>`;
  } else if (type === 'run') f = `<label>Tipo de meta</label><select id="g_mode" data-in="gmode"><option value="total">Acumular kilómetros</option><option value="longest">Correr una distancia en una salida</option><option value="time">Hacer una distancia en menos de X tiempo</option></select>
    <div id="g_runf"><label>Kilómetros</label><input id="g_t" type="number" inputmode="decimal" step="0.1"></div>`;
  else f = `<label>Entrenos por semana (gym o running)</label><input id="g_pw" type="number" inputmode="numeric" min="1" max="7" value="4">`;
  return `<h2 style="margin-top:0">Nueva campaña</h2><div class="seg">${tabs}</div>${f}
    <label>Fecha límite</label><input id="g_d" type="date" value="${addDays(today(), 90)}" min="${addDays(today(), 1)}">
    <label>Nombre (opcional)</label><input id="g_n" maxlength="60" placeholder="Ej: Conquistar los 100 kg">
    <div class="row" style="margin-top:16px"><button class="btn-ghost grow" data-act="modal-close">Cancelar</button><button class="btn-primary grow" data-act="goal-save" data-t="${type}">Guardar</button></div>`;
}

/* --- Correr --- */
V.correr = () => {
  const runs = state.runs.slice().sort((a, b) => b.date.localeCompare(a.date));
  const t = today(), since = addDays(t, -30);
  const m = runs.filter(r => r.date >= since);
  const km = m.reduce((a, r) => a + r.km, 0), min = m.reduce((a, r) => a + r.min, 0);
  const auto = !sb ? `<div class="card"><h3>Carreras automáticas</h3><p class="muted small">Se activan con la cuenta en la nube (ver README).</p></div>`
    : !user ? `<div class="card"><h3>Carreras automáticas</h3><p class="muted small">Iniciá sesión con tu cuenta para recibir tus carreras de Adidas Running.</p></div>`
    : `<div class="card gold"><div class="row between"><div><h3>Carreras automáticas</h3><div class="muted small">Adidas Running → Salud / Health Connect → tu cuenta</div></div><button data-act="inbox-pull">Revisar</button></div>
        <p class="muted small" style="margin:10px 0 0">${state.settings.hasToken ? 'Token creado. Las carreras nuevas llegan solas al abrir la app.' : 'Primera vez: Ajustes → Carreras automáticas para crear tu token.'}</p></div>`;
  const draft = trk ? `<div class="card red"><div class="row between"><div><h3>Recorrido ${trk.paused ? 'en pausa' : 'en curso'}</h3><div class="muted small">${fmtN(trk.dist / 1000, 2)} km · ${fmtTime(trkElapsed())}</div></div><button class="btn-primary" data-act="goto-track">Continuar</button></div></div>` : '';
  return `<h1>Correr</h1><p class="sub">Tus carreras de Adidas Running, rastreadas con el GPS de la app, o cargadas a mano. Cada una guarda su recorrido cuando es posible.</p>${draft}${auto}
  <div class="grid2" style="margin-bottom:12px"><button class="btn-primary" data-act="goto-track">Rastrear con GPS</button><button data-act="run-new">+ Cargar a mano</button></div>
  <div class="grid3"><div class="card stat"><b>${fmtN(km)}</b><span>Km (30 días)</span></div><div class="card stat"><b>${m.length}</b><span>Salidas</span></div><div class="card stat"><b>${fmtPace(min, km)}</b><span>Ritmo medio</span></div></div>
  ${runs.length ? `<div class="card"><h3>Kilómetros por semana</h3><div class="chart-box"><canvas id="ch1"></canvas></div></div>
  <div class="card"><h3>Ritmo por salida (min/km)</h3><div class="chart-box"><canvas id="ch2"></canvas></div></div>` : ''}
  ${runs.length ? `<div class="card">${runs.slice(0, 30).map(r => `<div class="list-item">
    ${r.poly ? `<button class="thumbbtn" data-act="run-view" data-id="${r.id}" aria-label="Ver recorrido">${routeSvg(r.poly, { w: 64, h: 64, pad: 6, thumb: true })}</button>` : ''}
    <div class="grow"><b>${fmtN(r.km, 2)} km</b> · ${fmtTime(r.min)} · ${fmtPace(r.min, r.km)}
    <div class="muted small">${fmtD(r.date)}${r.note ? ' · ' + esc(r.note) : ''}${r.source === 'gps' ? ' · <span class="gold-t">GPS</span>' : r.source === 'bridge' ? ' · <span class="gold-t">Adidas</span>' : ''}</div></div>
    <button class="btn-sm icon-btn btn-danger" data-act="run-del" data-id="${r.id}">✕</button></div>`).join('')}</div>` : `<div class="card empty"><span class="big">···</span>Sin carreras registradas.</div>`}`;
};
function afterCorrer() {
  const runs = state.runs.slice().sort((a, b) => a.date.localeCompare(b.date)); if (!runs.length) return;
  const ws = weekStart(today()), labels = [], kms = [];
  for (let w = 11; w >= 0; w--) { const s = addDays(ws, -7 * w); labels.push(fmtD(s)); kms.push(Math.round(state.runs.filter(r => r.date >= s && r.date <= addDays(s, 6)).reduce((a, r) => a + r.km, 0) * 10) / 10); }
  drawChart('ch1', { type: 'bar', data: { labels, datasets: [{ data: kms, backgroundColor: GOLD, borderRadius: 4 }] }, options: chartBase({ scales: { x: { grid: { color: '#24211c' } }, y: { grid: { color: '#24211c' }, beginAtZero: true } } }) });
  const last = runs.filter(r => r.min > 0 && r.km > 0).slice(-15);
  drawChart('ch2', { type: 'line', data: { labels: last.map(r => fmtD(r.date)), datasets: [lineDs('Ritmo', last.map(r => Math.round(r.min / r.km * 100) / 100), REDHI)] }, options: chartBase({ scales: { x: { grid: { color: '#24211c' } }, y: { reverse: true, grid: { color: '#24211c' } } } }) });
}

/* --- Rastrear (GPS) --- */
V.rastrear = () => {
  const has = !!trk, running = has && !trk.paused, km = trk ? trk.dist / 1000 : 0;
  const line = trk && trk.pts.length > 1 ? routeSvg(encodePoly(thin(trk.pts.map(q => [q[0], q[1]])))) : '';
  const hint = NATIVE ? 'Tocá “Iniciar” y empezá a correr. Podés bloquear la pantalla o usar otras apps: el recorrido se sigue registrando (verás una notificación mientras tanto). Terminá con el botón “Terminar”.'
    : 'Guarda tu recorrido con el GPS del celular. Mantené la app abierta y la pantalla encendida mientras corrés: si la bloqueás o cambiás de app, el GPS se detiene.';
  const apk = !NATIVE && !has && /Android/i.test(navigator.userAgent) ? `<div class="card gold"><h3>App para Android</h3><p class="muted small">Para registrar con la pantalla apagada instalá la app de Android.</p><a class="btn btn-block" href="${APK_URL}" style="text-decoration:none">Descargar APK</a></div>` : '';
  return `<h1>Rastrear carrera</h1><p class="sub">${hint}</p>${apk}
  <div class="card gold"><div class="stat" style="padding-top:0"><b id="trk-dist" style="font-size:46px">${fmtN(km, 2)}</b><span>Kilómetros</span></div>
    <div class="grid2"><div class="stat"><b id="trk-time">${fmtTime(trkElapsed())}</b><span>Tiempo</span></div><div class="stat"><b id="trk-pace">${km > 0.05 ? fmtPace(trkElapsed(), km) : '–'}</b><span>Ritmo medio</span></div></div></div>
  <div class="card"><div class="map" id="trk-map">${line}</div><p class="muted small center" id="trk-acc" style="margin:10px 0 0">${has ? '' : 'Tocá “Iniciar” y permití el acceso a la ubicación.'}</p></div>
  ${!has ? `<button class="btn-primary btn-block" data-act="trk-start">Iniciar recorrido</button>`
    : running ? `<div class="grid2"><button data-act="trk-pause">Pausar</button><button class="btn-primary" data-act="trk-finish">Terminar</button></div>`
    : `<button class="btn-primary btn-block" data-act="trk-start">Reanudar</button>
       <div class="grid2" style="margin-top:10px"><button data-act="trk-finish">Terminar y guardar</button><button class="btn-danger" data-act="trk-discard">Descartar</button></div>`}`;
};
function afterRastrear() { trkTick(); if (trk && !trk.paused && trk.watch == null) trkStart(); }

/* --- Ajustes --- */
V.ajustes = () => `
  <h1>Ajustes</h1><p class="sub">Cuenta, sincronización y respaldo.</p>
  <div class="card"><h3>Cuenta</h3>
    ${sb ? (user ? `<p class="muted small">Sesión: ${esc(user.email)}</p><p class="small" id="syncBadge">${syncText()}</p>
      <div class="row wrap"><button data-act="sync-now">Sincronizar ahora</button><button class="btn-danger" data-act="logout">Cerrar sesión</button></div>`
      : `<p class="muted small">Estás usando la app sin cuenta: tus datos viven solo en este dispositivo.</p><button class="btn-primary" data-act="goto-auth">Iniciar sesión / crear cuenta</button>`)
      : `<p class="muted small" id="syncBadge">${syncText()}. Configurá Supabase en <code>config.js</code> para activar cuentas y sincronización (ver README).</p>`}
  </div>
  ${sb && user ? `<div class="card"><h3>Arena</h3><p class="muted small">Tu nombre y un resumen (gloria, sesiones, km, récords y cargas máximas) quedan visibles para otros gladiadores. Tu peso corporal, medidas, rutina y notas nunca se comparten. Tus recorridos (con su mapa completo, de punta a punta) se comparten solo si dejás activada la opción de abajo.</p>
    <label>Nombre de gladiador</label><input data-in="pname" maxlength="24" value="${esc(profileName())}">
    <label class="switch"><input type="checkbox" data-in="pshare" ${state.profile?.share !== false ? 'checked' : ''}> Compartir mi progreso con otros</label>
    <label class="switch"><input type="checkbox" data-in="proutes" ${state.profile?.shareRoutes !== false ? 'checked' : ''}> Compartir mis recorridos (mapa) con otros</label></div>` : ''}
  <div class="card"><h3>Descanso entre series</h3><label>Segundos</label><input type="number" inputmode="numeric" min="10" max="600" step="5" data-in="rest" value="${state.settings.rest}"></div>
  ${sb && user ? `<div class="card"><h3>Carreras automáticas</h3>
    <p class="muted small">Adidas Running pasa tus carreras a Salud (iPhone) o Health Connect (Android). Un “puente” en tu celular las envía a tu cuenta con un token personal. Guía paso a paso: <b>docs/CARRERAS.md</b> en el repositorio.</p>
    <label>Dirección de envío</label><input readonly value="${esc(INGEST_URL())}" onfocus="this.select()">
    <div class="row wrap" style="margin-top:12px"><button data-act="copy" data-v="${esc(INGEST_URL())}">Copiar dirección</button>
    <button data-act="token-new">${state.settings.hasToken ? 'Generar token nuevo' : 'Generar token'}</button><button data-act="inbox-pull">Revisar carreras</button></div>
    ${state.settings.hasToken ? '<p class="muted small" style="margin:10px 0 0">Un token nuevo reemplaza al anterior: tendrás que actualizarlo en el puente.</p>' : ''}</div>` : ''}
  <div class="card"><h3>Respaldo</h3><p class="muted small">Descargá todos tus datos o restaurá un respaldo.</p>
    <div class="row wrap"><button data-act="export">Exportar JSON</button><button data-act="import">Importar JSON</button></div>
    <input type="file" id="impfile" accept="application/json" class="hidden"></div>
  <div class="card red"><h3 class="red-t">Zona de peligro</h3><p class="muted small">Borra todos los datos de este dispositivo${user ? ' y de tu cuenta' : ''}. No se puede deshacer.</p>
    <button class="btn-danger" data-act="wipe">Borrar todo</button></div>
  <p class="muted small center" style="margin-top:20px">Imperium Gladiador · v1</p>`;

/* --- Auth --- */
V.auth = () => `<div class="auth"><div class="crest">⚔</div><h1>IMPERIUM</h1><p class="sub">Entrá al Coliseo. Tu legión te espera.</p>
  <div class="card gold"><form id="authform" autocomplete="on">
    <label style="margin-top:0">Email</label><input id="a_e" type="email" autocomplete="email" required>
    <label>Contraseña</label><input id="a_p" type="password" autocomplete="current-password" minlength="6" required>
    <label>Nombre de gladiador (al crear cuenta)</label><input id="a_n" maxlength="24" autocomplete="nickname" placeholder="Cómo te verán en la Arena">
    <div class="err" id="a_err"></div>
    <button class="btn-primary btn-block" type="submit" data-act="login" style="margin-top:6px">Entrar</button>
    <button class="btn-block" type="button" data-act="signup" style="margin-top:8px">Crear cuenta</button>
  </form></div>
  <button class="btn-ghost btn-block" data-act="local-mode">Usar sin cuenta (solo este dispositivo)</button></div>`;


/* --- Arena: comparar progreso entre cuentas independientes --- */
function streakWeeks() {
  const ws = weekStart(today()), td = trainingDates(); let streak = 0;
  for (let w = 0; w < 200; w++) { const a = addDays(ws, -7 * w); const n = [...td].filter(d => d >= a && d <= addDays(a, 6)).length; if (n) streak++; else if (w > 0) break; }
  return streak;
}
const profileName = () => (state.profile?.name || user?.user_metadata?.name || (user?.email || 'Gladiador').split('@')[0]).slice(0, 24);
// Últimos recorridos que se publican en la Arena (solo si la persona lo permite).
function sharedRuns() {
  const p = state.profile || {}; if (p.shareRoutes === false) return [];
  return state.runs.filter(r => r.poly).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
    .map(r => ({ date: r.date, km: r.km, min: r.min, poly: r.poly }));
}
function buildStats() {
  const t = today(), ws = weekStart(t), since = addDays(t, -30), x = xpInfo(), td = [...trainingDates()];
  const weeks = [], wkm = [];
  for (let w = 7; w >= 0; w--) {
    const a = addDays(ws, -7 * w), b = addDays(a, 6);
    weeks.push(td.filter(d => d >= a && d <= b).length);
    wkm.push(Math.round(state.runs.filter(r => r.date >= a && r.date <= b).reduce((q, r) => q + r.km, 0) * 10) / 10);
  }
  const lifts = {};
  for (const e of allEx()) { const b = bestWeight(e.id); if (b > 0) lifts[e.name] = b; }
  return {
    v: 2, rank: x.rank.name, tier: x.roman, xp: x.xp, prs: x.prs, streak: streakWeeks(),
    sessions30: td.filter(d => d >= since).length,
    km30: Math.round(state.runs.filter(r => r.date >= since).reduce((q, r) => q + r.km, 0) * 10) / 10,
    goalsDone: state.goals.filter(g => goalProgress(g).pct >= 1).length,
    weeks, wkm, lifts, runs: sharedRuns()
  };
}
async function pushProfile() {
  if (!sb || !user) return;
  try {
    const { error } = await sb.from('profiles').upsert({ user_id: user.id, name: profileName(), share: state.profile?.share !== false, stats: buildStats(), updated_at: new Date().toISOString() });
    if (error) throw error;
  } catch (e) { console.warn('profile', e); }
}
V.arena = () => `<h1>Arena</h1><p class="sub">Medite tu fuerza contra la de otro gladiador. Cada uno tiene su cuenta y sus datos privados; solo se comparte un resumen.</p>
  <div id="arena"><div class="card empty"><span class="big">···</span>Cargando la arena…</div></div>`;
const arenaMsg = (t, btn = '') => `<div class="card empty"><span class="big">···</span>${t}${btn}</div>`;
async function afterArena() {
  const box = $('#arena'); if (!box) return;
  if (!sb) { box.innerHTML = arenaMsg('Para competir hace falta activar las cuentas (ver README).'); return; }
  if (!user) { box.innerHTML = arenaMsg('Iniciá sesión para entrar a la arena.', '<br><br><button class="btn-primary" data-act="goto-auth">Entrar</button>'); return; }
  if (state.profile?.share === false) { box.innerHTML = arenaMsg('Para ver a otros gladiadores tenés que compartir tu progreso.', '<br><br><button data-act="goto-settings">Ir a Ajustes</button>'); return; }
  try {
    await pushProfile();
    const { data, error } = await sb.from('profiles').select('user_id,name,stats,updated_at').neq('user_id', user.id).eq('share', true);
    if (error) throw error;
    ui.rivals = data || [];
    if (!ui.rivals.some(r => r.user_id === ui.rivalId)) ui.rivalId = ui.rivals[0]?.user_id || null;
    renderArena();
  } catch (e) { console.warn(e); const b = $('#arena'); if (b) b.innerHTML = arenaMsg('No se pudo cargar la arena. Revisá tu conexión.', '<br><br><button data-act="arena-refresh">Reintentar</button>'); }
}
function rrunsHtml(rv) {
  ui.rivalRuns = (Array.isArray(rv.stats?.runs) ? rv.stats.runs : []).map(cleanRun).filter(Boolean);
  if (!ui.rivalRuns.length) return `<h2>Recorridos de ${esc(rv.name)}</h2><div class="card empty" style="padding:18px"><span class="big">···</span>${esc(rv.name)} todavía no compartió recorridos.</div>`;
  return `<h2>Recorridos de ${esc(rv.name)}</h2><div class="card">${ui.rivalRuns.map((r, i) => `<div class="list-item">
    <button class="thumbbtn" data-act="arena-run" data-i="${i}" aria-label="Ver recorrido">${routeSvg(r.poly, { w: 64, h: 64, pad: 6, thumb: true })}</button>
    <div class="grow"><b>${fmtN(r.km, 2)} km</b> · ${fmtTime(r.min)} · ${fmtPace(r.min, r.km)}<div class="muted small">${fmtD(r.date)}</div></div></div>`).join('')}</div>`;
}
function duelRow(label, a, b, fmt = v => fmtN(v, 0)) {
  const tot = a + b, pa = tot ? a / tot * 100 : 50, pb = tot ? b / tot * 100 : 50;
  const lead = a > b ? 'a' : b > a ? 'b' : '';
  return `<div class="duel"><div class="duel-h"><span class="${lead === 'a' ? 'gold-t' : ''}">${fmt(a)}</span><span class="muted">${label}</span><span class="${lead === 'b' ? 'red-t' : ''}">${fmt(b)}</span></div>
    <div class="duel-bar"><i style="width:${pa}%"></i><i class="r" style="width:${pb}%"></i></div></div>`;
}
function renderArena() {
  const box = $('#arena'); if (!box || route() !== 'arena') return;
  killCharts();
  const me = buildStats(), rivals = ui.rivals || [], N = v => Number(v) || 0;
  const ranking = rivals.map(r => ({ name: r.name, xp: N(r.stats?.xp), tier: r.stats?.rank || '', me: false }))
    .concat([{ name: 'Tú', xp: me.xp, tier: me.rank, me: true }]).sort((a, b) => b.xp - a.xp);
  const rankCard = `<h2>Clasificación</h2><div class="card">${ranking.map((r, i) => `<div class="list-item rank-row"><span class="pos">${i + 1}</span>
    <div class="grow"><b class="${r.me ? 'gold-t' : ''}">${esc(r.name)}</b><div class="muted small">${esc(r.tier)}</div></div><span class="tag ${r.me ? 'gold' : ''}">${r.xp} xp</span></div>`).join('')}</div>`;
  if (!rivals.length) { box.innerHTML = arenaMsg('Todavía no hay otros gladiadores.<br>Pedile a tu rival que cree su cuenta y active “Compartir mi progreso”.', '<br><br><button data-act="arena-refresh">Actualizar</button>') + rankCard; return; }
  const rv = rivals.find(r => r.user_id === ui.rivalId) || rivals[0], s = rv.stats || {};
  const rows = [['Gloria', me.xp, N(s.xp)], ['Sesiones · 30 días', me.sessions30, N(s.sessions30)], ['Km · 30 días', me.km30, N(s.km30), v => fmtN(v)],
    ['Récords', me.prs, N(s.prs)], ['Semanas seguidas', me.streak, N(s.streak)], ['Campañas cumplidas', me.goalsDone, N(s.goalsDone)]];
  const wa = rows.filter(r => r[1] > r[2]).length, wb = rows.filter(r => r[2] > r[1]).length;
  const lifts = Object.keys(me.lifts).filter(n => s.lifts && s.lifts[n]).sort((a, b) => (me.lifts[b] + s.lifts[b]) - (me.lifts[a] + s.lifts[a])).slice(0, 10);
  const chips = rivals.length > 1 ? `<div class="chips" style="margin-bottom:14px">${rivals.map(r => `<button class="chip ${r.user_id === rv.user_id ? 'on' : ''}" data-act="arena-rival" data-id="${r.user_id}">${esc(r.name)}</button>`).join('')}</div>` : '';
  box.innerHTML = `${chips}
  <div class="card gold"><div class="vs"><b class="gold-t">Tú</b><span class="x">VS</span><b class="red-t">${esc(rv.name)}</b></div>
    <div class="score" style="margin-top:14px">${wa} — ${wb}<small>Marcador del duelo</small></div></div>
  <div class="card">${rows.map(r => duelRow(...r)).join('')}</div>
  <div class="card"><h3><span class="me-dot"></span>Tú <span class="ri-dot" style="margin-left:14px"></span>${esc(rv.name)}</h3><p class="muted small" style="margin:6px 0 0">Entrenos por semana · últimas 8 semanas</p><div class="chart-box"><canvas id="ch1"></canvas></div></div>
  <div class="card"><p class="muted small" style="margin:0">Kilómetros por semana</p><div class="chart-box"><canvas id="ch2"></canvas></div></div>
  ${rrunsHtml(rv)}
  <h2>Cargas máximas</h2>
  <div class="card">${lifts.length ? `<div class="lift head"><span>Ejercicio</span><span class="v">Tú</span><span class="v">${esc(rv.name).slice(0, 8)}</span></div>` + lifts.map(n => `<div class="lift"><span>${esc(n)}</span>
    <span class="v ${me.lifts[n] > s.lifts[n] ? 'win' : ''}">${fmtN(me.lifts[n])}</span><span class="v ${s.lifts[n] > me.lifts[n] ? 'win' : ''}">${fmtN(s.lifts[n])}</span></div>`).join('')
    : '<p class="muted small center" style="margin:0">Todavía no comparten ejercicios en común.</p>'}</div>
  ${rankCard}
  <p class="muted small center">Actualizado ${rv.updated_at ? new Date(rv.updated_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '–'} · <a href="#" class="gold-t" data-act="arena-refresh">Actualizar</a></p>`;
  const labels = Array.from({ length: 8 }, (_, i) => fmtD(addDays(weekStart(today()), -7 * (7 - i))));
  const opt = chartBase({ scales: { x: { grid: { display: false } }, y: { grid: { color: '#24211c' }, beginAtZero: true, ticks: { precision: 0 } } } });
  const ds = (a, b) => [{ label: 'Tú', data: a, backgroundColor: GOLD, borderRadius: 3 }, { label: rv.name, data: Array.isArray(b) ? b : [], backgroundColor: REDHI, borderRadius: 3 }];
  drawChart('ch1', { type: 'bar', data: { labels, datasets: ds(me.weeks, s.weeks) }, options: opt });
  drawChart('ch2', { type: 'bar', data: { labels, datasets: ds(me.wkm, s.wkm) }, options: chartBase({ scales: { x: { grid: { display: false } }, y: { grid: { color: '#24211c' }, beginAtZero: true } } }) });
}

/* ---------- Render / ruteo ---------- */
function route() { return (location.hash.replace(/^#\/?/, '') || 'foro').split('?')[0]; }
function needAuth() { return sb && !user && !localStorage.getItem(LS_LOCAL); }

function render(keepScroll = false) {
  const y = window.scrollY;
  const r = route();
  const navKey = k => k === 'rastrear' ? 'correr' : k;
  const tabIdx = k => TABS.findIndex(t => t[0] === navKey(k));
  const target = V[r] && !r.startsWith('prog_') ? r : 'foro';
  const slide = !keepScroll && !!ui.lastRoute && ui.lastRoute !== target && r !== 'auth' && !needAuth();
  const ghost = slide ? Motion.ghost($('#view')) : null; // captura la pantalla actual antes de reemplazarla
  killCharts();
  const authMode = needAuth() || r === 'auth';
  $('.top').classList.toggle('hidden', authMode); $('#tabs').classList.toggle('hidden', authMode);
  const view = $('#view');
  if (authMode) { view.innerHTML = V.auth(); return; }
  const name = V[r] && !r.startsWith('prog_') ? r : 'foro';
  view.innerHTML = V[name]();
  window.scrollTo(0, keepScroll ? y : 0);
  const dir = tabIdx(name) >= tabIdx(ui.lastRoute) ? 1 : -1;
  Motion.setNav(navKey(name), TABS); Motion.enter(view, !keepScroll, { dir, slide });
  if (ghost) Motion.leave(ghost, dir);
  if (!keepScroll && ui.lastRoute !== name) { Motion.sweep(); ui.lastRoute = name; }
  const x = xpInfo(); $('#rankChip').textContent = `${x.roman} · ${x.rank.name}`;
  if (name === 'progreso') afterProgreso();
  if (name === 'correr') afterCorrer();
  if (name === 'rastrear') afterRastrear();
  if (name === 'arena') afterArena();
}

/* ---------- Acciones ---------- */
function ensureDay(d) { return state.routine[d] || (state.routine[d] = { name: '', items: [] }); }
function sessionFromDay(d) {
  const r = state.routine[d];
  const entries = (r?.items || []).map(it => {
    const last = lastSets(it.exId);
    const n = Math.max(1, it.sets || 3);
    return { exId: it.exId, sets: Array.from({ length: n }, (_, i) => ({ w: it.weight || last?.[i]?.w || last?.[0]?.w || null, r: it.reps || last?.[i]?.r || null, done: false })) };
  });
  return { id: uid(), date: today(), start: Date.now(), name: r?.name || DAYS[d], entries };
}
function pickExercise(cb) {
  ui.pick = { cb, q: '', g: 'Todos' };
  openModal(`<h2 style="margin-top:0">Elegí un ejercicio</h2>
    <input id="pq" placeholder="Buscar…" data-in="pickq">
    <div class="chips" style="margin:10px 0">${['Todos', ...GROUPS].map(g => `<button class="chip ${g === 'Todos' ? 'on' : ''}" data-act="pickg" data-g="${g}">${g}</button>`).join('')}</div>
    <div id="plist"></div>
    <hr class="divider"><h3 style="margin:12px 0 4px">Crear ejercicio propio</h3>
    <div class="grid2"><input id="cn" placeholder="Nombre" maxlength="50"><select id="cg">${GROUPS.map(g => `<option>${g}</option>`).join('')}</select></div>
    <button class="btn-block" style="margin-top:8px" data-act="pick-create">Crear y usar</button>
    <button class="btn-ghost btn-block" style="margin-top:8px" data-act="modal-close">Cerrar</button>`);
  renderPickList();
}
function renderPickList() {
  const p = ui.pick, q = p.q.toLowerCase();
  const list = allEx().filter(e => (p.g === 'Todos' || e.group === p.g) && e.name.toLowerCase().includes(q));
  $('#plist').innerHTML = list.length ? list.map(e => `<div class="list-item" data-act="pick" data-id="${esc(e.id)}" style="cursor:pointer"><div class="grow"><b>${esc(e.name)}</b></div><span class="tag">${e.group}</span></div>`).join('')
    : `<p class="muted center">Sin resultados. Creá uno propio abajo.</p>`;
}

async function finishSession() {
  const a = state.active;
  const entries = a.entries.map(e => ({ exId: e.exId, sets: e.sets.filter(s => s.done).map(s => ({ w: s.w, r: s.r, done: true })) })).filter(e => e.sets.length);
  if (!entries.length) return toast('Marcá al menos una serie como hecha (✔)');
  const prs = [];
  for (const e of entries) {
    const w = Math.max(0, ...e.sets.map(s => s.w || 0));
    const prev = bestWeight(e.exId);
    if (w > 0 && prev > 0 && w > prev) prs.push(e.exId);
  }
  state.sessions.push({ id: a.id, date: a.date, start: a.start, name: a.name, entries, prs, dur: Math.max(1, Math.round((Date.now() - a.start) / 60000)) });
  state.active = null; stopRest(); save();
  location.hash = '#/progreso'; ui.progTab = 'fuerza'; if (entries[0]) ui.exId = entries[0].exId;
  render();
  toast(prs.length ? `¡Nuevo récord en ${prs.map(exName).join(', ')}!` : 'Entrenamiento registrado. ¡Ave!', 4000);
}

const ACTIONS = {
  'modal-close': closeModal,
  'rest+': () => { if (rest) rest.end += 15000; tickRest(); },
  'rest-stop': stopRest,

  // rutina
  rday: el => { ui.routineDay = +el.dataset.day; render(true); },
  radd: () => pickExercise(id => { const r = ensureDay(ui.routineDay); const last = lastSets(id)?.[0]; r.items.push({ id: uid(), exId: id, sets: 3, reps: 10, weight: last?.w || null }); save(); render(true); }),
  rdel: el => { const r = ensureDay(ui.routineDay); r.items = r.items.filter(i => i.id !== el.dataset.id); save(); render(true); },
  rup: el => moveItem(el.dataset.id, -1), rdown: el => moveItem(el.dataset.id, 1),
  rcopy: () => openModal(`<h2 style="margin-top:0">Copiar ${DAYS[ui.routineDay]} a…</h2><div class="chips" style="flex-wrap:wrap">${DAYS.map((n, i) => i === ui.routineDay ? '' : `<button class="chip" data-act="rcopy-to" data-day="${i}">${n}</button>`).join('')}</div><p class="muted small">Reemplaza el contenido del día elegido.</p>`),
  'rcopy-to': el => { const src = ensureDay(ui.routineDay); state.routine[+el.dataset.day] = { name: src.name, items: src.items.map(i => ({ ...i, id: uid() })) }; save(); closeModal(); toast('Día copiado'); render(true); },

  // entrenar
  'start-day': el => {
    if (state.active && !confirm('Ya tenés un entrenamiento en curso. ¿Reemplazarlo?')) return;
    const d = +el.dataset.day; state.active = sessionFromDay(d); save();
    if (!state.active.entries.length) toast('Ese día no tiene ejercicios: agregalos sobre la marcha');
    location.hash = '#/entrenar'; render();
  },
  'start-free': () => { state.active = { id: uid(), date: today(), start: Date.now(), name: 'Entrenamiento libre', entries: [] }; save(); render(); },
  'live-done': el => {
    const s = state.active.entries[+el.dataset.e].sets[+el.dataset.s];
    if (!s.done && (s.w == null || s.r == null)) return toast('Completá kg y reps antes de marcar la serie');
    const { e: ei, s: si } = el.dataset;
    s.done = !s.done; save(); render(true);
    if (s.done) { startRest(state.settings.rest || 90); Motion.pop(document.querySelector(`[data-act=live-done][data-e="${ei}"][data-s="${si}"]`)); }
  },
  'live-addset': el => { const e = state.active.entries[+el.dataset.e]; const l = e.sets[e.sets.length - 1]; e.sets.push({ w: l?.w ?? null, r: l?.r ?? null, done: false }); save(); render(true); },
  'live-delset': el => { const e = state.active.entries[+el.dataset.e]; if (e.sets.length > 1) { e.sets.pop(); save(); render(true); } },
  'live-exdel': el => { if (confirm('¿Quitar este ejercicio de la sesión?')) { state.active.entries.splice(+el.dataset.e, 1); save(); render(true); } },
  'live-addex': () => pickExercise(id => { const l = lastSets(id); state.active.entries.push({ exId: id, sets: Array.from({ length: 3 }, (_, i) => ({ w: l?.[i]?.w ?? l?.[0]?.w ?? null, r: l?.[i]?.r ?? null, done: false })) }); save(); render(true); }),
  'live-finish': finishSession,
  'live-cancel': () => { if (confirm('¿Descartar el entrenamiento en curso?')) { state.active = null; stopRest(); save(); render(); } },
  'sess-del': el => { if (confirm('¿Eliminar esta sesión del historial?')) { state.sessions = state.sessions.filter(s => s.id !== el.dataset.id); save(); render(true); } },
  'sess-view': el => {
    const s = state.sessions.find(x => x.id === el.dataset.id); if (!s) return;
    openModal(`<h2 style="margin-top:0">${esc(s.name)}</h2><p class="sub">${fmtD(s.date)}${s.dur ? ' · ' + s.dur + ' min' : ''}</p>
      ${s.entries.map(e => `<div class="list-item"><div class="grow"><b>${esc(exName(e.exId))}</b>${s.prs?.includes(e.exId) ? '<span class="pr">PR</span>' : ''}<div class="muted small">${e.sets.map(x => `${fmtN(x.w)}kg×${x.r}`).join(' · ')}</div></div></div>`).join('')}
      <button class="btn-ghost btn-block" style="margin-top:12px" data-act="modal-close">Cerrar</button>`);
  },

  // selector ejercicios
  pickg: el => { ui.pick.g = el.dataset.g; document.querySelectorAll('#modal [data-act=pickg]').forEach(b => b.classList.toggle('on', b === el)); renderPickList(); },
  pick: el => { const cb = ui.pick.cb; closeModal(); cb(el.dataset.id); },
  'pick-create': () => {
    const n = (mv('cn') || '').trim(); if (!n) return toast('Poné un nombre');
    const ex = { id: 'u:' + uid(), name: n, group: mv('cg'), custom: true }; state.exercises.push(ex); save();
    const cb = ui.pick.cb; closeModal(); cb(ex.id);
  },

  // progreso
  ptab: el => { ui.progTab = el.dataset.t; render(true); },
  btype: el => { ui.bodyType = el.dataset.t; render(true); },
  'body-add': () => {
    const v = num(val('bv')), d = val('bd'); if (v == null || !d) return toast('Completá fecha y valor');
    state.body.push({ id: uid(), date: d, type: ui.bodyType, value: v }); save(); toast('Medida registrada'); render(true);
  },
  'body-del': el => { state.body = state.body.filter(b => b.id !== el.dataset.id); save(); render(true); },

  // metas
  'goal-new': () => openModal(goalForm('strength')),
  'goal-type': el => openModal(goalForm(el.dataset.t)),
  'goal-del': el => { if (confirm('¿Eliminar esta campaña?')) { state.goals = state.goals.filter(g => g.id !== el.dataset.id); save(); render(true); } },
  'goal-save': el => {
    const type = el.dataset.t, deadline = mv('g_d'), start = today();
    if (!deadline || deadline <= start) return toast('Elegí una fecha límite futura');
    const g = { id: uid(), type, start, deadline, title: (mv('g_n') || '').trim() };
    if (type === 'strength') { g.exId = mv('g_ex'); g.target = num(mv('g_t')); g.base = bestWeight(g.exId); }
    else if (type === 'body') { g.measure = mv('g_m'); g.target = num(mv('g_t')); g.base = num(mv('g_b')); if (g.base == null) return toast('Indicá tu valor actual'); }
    else if (type === 'run') {
      g.mode = mv('g_mode');
      if (g.mode === 'time') { g.km = num(mv('g_km')); const m = num(mv('g_min')) || 0, s = num(mv('g_sec')) || 0; g.target = m + s / 60; if (!g.km || g.target <= 0) return toast('Completá distancia y tiempo'); }
      else g.target = num(mv('g_t'));
    } else { g.perWeek = Math.round(num(mv('g_pw')) || 0); if (g.perWeek < 1 || g.perWeek > 7) return toast('Entre 1 y 7 entrenos por semana'); g.target = g.perWeek; }
    if (type !== 'habit' && !(g.target > 0)) return toast('Indicá una meta válida');
    state.goals.push(g); save(); closeModal(); toast('Campaña fijada. ¡A conquistar!'); render(true);
  },

  // correr
  'run-new': () => openModal(`<h2 style="margin-top:0">Nueva carrera</h2>
    <label>Fecha</label><input id="r_d" type="date" value="${today()}">
    <div class="grid2"><div><label>Distancia (km)</label><input id="r_k" type="number" inputmode="decimal" step="0.01"></div>
    <div><label>Tiempo (min:seg)</label><div class="grid2"><input id="r_m" type="number" inputmode="numeric" placeholder="min"><input id="r_s" type="number" inputmode="numeric" placeholder="seg" max="59"></div></div></div>
    <label>Nota (opcional)</label><input id="r_n" maxlength="60">
    <div class="row" style="margin-top:16px"><button class="btn-ghost grow" data-act="modal-close">Cancelar</button><button class="btn-primary grow" data-act="run-save">Guardar</button></div>`),
  'run-save': () => {
    const km = num(mv('r_k')), min = (num(mv('r_m')) || 0) + (num(mv('r_s')) || 0) / 60;
    if (!km || km <= 0 || min <= 0) return toast('Completá distancia y tiempo');
    state.runs.push({ id: uid(), date: mv('r_d') || today(), km, min: Math.round(min * 100) / 100, note: (mv('r_n') || '').trim(), source: 'manual' });
    save(); closeModal(); toast('Carrera registrada'); render(true);
  },
  'run-del': el => { if (confirm('¿Eliminar esta carrera?')) { state.runs = state.runs.filter(r => r.id !== el.dataset.id); save(); render(true); } },
  'goto-track': () => { location.hash = '#/rastrear'; },
  'trk-start': () => { trkStart(); render(true); },
  'trk-pause': () => trkPause(),
  'trk-finish': () => trkFinish(),
  'trk-discard': () => { if (confirm('¿Descartar este recorrido? No se puede deshacer.')) { trkDiscard(); render(true); } },
  'run-view': el => { const r = state.runs.find(x => x.id === el.dataset.id); if (r?.poly) runModal(r); },
  'inbox-pull': () => pullInbox(false),
  'token-new': async () => {
    if (state.settings.hasToken && !confirm('El token anterior dejará de funcionar. ¿Generar uno nuevo?')) return;
    try {
      const t = await newToken();
      openModal(`<h2 style="margin-top:0">Tu token personal</h2><p class="sub">Copialo ahora y pegalo en el puente de tu celular. <b>No se vuelve a mostrar.</b> Quien lo tenga puede enviarte carreras, así que no lo compartas.</p>
        <div class="tokenbox">${t}</div>
        <div class="row" style="margin-top:14px"><button class="btn-primary grow" data-act="copy" data-v="${t}">Copiar token</button><button class="btn-ghost grow" data-act="modal-close">Listo</button></div>`);
      render(true);
    } catch (e) { console.warn(e); toast('No se pudo crear el token. ¿Ejecutaste el esquema SQL actualizado?'); }
  },
  copy: async el => { try { await navigator.clipboard.writeText(el.dataset.v); toast('Copiado'); } catch { toast('No se pudo copiar: seleccionalo y copialo a mano'); } },

  // ajustes / auth
  'sync-now': async () => { setSyncBadge('pend'); await pushRemote(); toast(ui.sync === 'ok' ? 'Sincronizado' : 'No se pudo sincronizar'); },
  logout: async () => { await sb.auth.signOut(); user = null; localStorage.removeItem(LS_LOCAL); state = emptyState(); save(false); location.hash = '#/foro'; render(); },
  'goto-auth': () => { location.hash = '#/auth'; render(); },
  'local-mode': () => { localStorage.setItem(LS_LOCAL, '1'); location.hash = '#/foro'; render(); },
  export: () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    a.download = `imperium-respaldo-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  import: () => $('#impfile').click(),
  wipe: async () => {
    if (!confirm('¿Borrar TODOS tus datos? No se puede deshacer.')) return;
    if (prompt('Escribí BORRAR para confirmar') !== 'BORRAR') return;
    const owner = state.owner; state = emptyState(); state.owner = owner; save();
    toast('Datos borrados'); render();
  },
  'arena-run': el => { const r = ui.rivalRuns?.[+el.dataset.i]; const rv = (ui.rivals || []).find(x => x.user_id === ui.rivalId); if (r) runModal(r, rv?.name); },
  'arena-rival': el => { ui.rivalId = el.dataset.id; renderArena(); },
  'arena-refresh': (el, ev) => { ev?.preventDefault(); afterArena(); },
  'goto-settings': () => { location.hash = '#/ajustes'; },
  login: () => authSubmit(false), signup: () => authSubmit(true)
};
function moveItem(id, dir) {
  const r = ensureDay(ui.routineDay), i = r.items.findIndex(x => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= r.items.length) return;
  [r.items[i], r.items[j]] = [r.items[j], r.items[i]]; save(); render(true);
}
async function authSubmit(isSignup) {
  const e = val('a_e'), p = val('a_p'), err = $('#a_err');
  if (!e || !p || p.length < 6) { err.textContent = 'Ingresá un email válido y una contraseña de al menos 6 caracteres.'; return; }
  err.textContent = 'Un momento…';
  try {
    const nm = (val('a_n') || '').trim().slice(0, 24);
    if (isSignup && nm) state.profile = { ...state.profile, name: nm };
    const { data, error } = isSignup ? await sb.auth.signUp({ email: e, password: p, options: { data: { name: nm } } }) : await sb.auth.signInWithPassword({ email: e, password: p });
    if (error) throw error;
    if (!data.session) { err.style.color = 'var(--gold-hi)'; err.textContent = 'Cuenta creada. Revisá tu email para confirmarla y luego iniciá sesión.'; return; }
    user = data.session.user; localStorage.removeItem(LS_LOCAL);
    await initialSync(); location.hash = '#/foro'; render(); pullInbox(true);
  } catch (ex) {
    err.style.color = ''; const m = String(ex.message || ex);
    err.textContent = /Invalid login/i.test(m) ? 'Email o contraseña incorrectos.' : /already/i.test(m) ? 'Ese email ya tiene cuenta. Iniciá sesión.' : 'Error: ' + m;
  }
}

/* ---------- Eventos ---------- */
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (el) { if (el.type === 'submit') ev.preventDefault(); ACTIONS[el.dataset.act]?.(el, ev); return; }
  if (ev.target.id === 'modal') closeModal();
});
document.addEventListener('submit', ev => { if (ev.target.id === 'authform') ev.preventDefault(); });
document.addEventListener('input', ev => {
  const el = ev.target, k = el.dataset?.in; if (!k) return;
  if (k === 'live') {
    const s = state.active.entries[+el.dataset.e].sets[+el.dataset.s]; s[el.dataset.f] = num(el.value); save();
  } else if (k === 'rt') {
    const it = ensureDay(ui.routineDay).items.find(i => i.id === el.dataset.id); if (it) { it[el.dataset.f] = num(el.value); save(); }
  } else if (k === 'rname') { ensureDay(ui.routineDay).name = el.value.slice(0, 40); save(); }
  else if (k === 'pname') { state.profile = { ...state.profile, name: el.value.slice(0, 24) }; save(); }
  else if (k === 'rest') { const v = num(el.value); if (v >= 10 && v <= 600) { state.settings.rest = Math.round(v); save(); } }
  else if (k === 'pickq') { ui.pick.q = el.value; renderPickList(); }
});
document.addEventListener('change', ev => {
  const el = ev.target, k = el.dataset?.in; if (!k) return;
  if (k === 'proutes') { state.profile = { ...state.profile, shareRoutes: el.checked }; save(); toast(el.checked ? 'Tus recorridos serán visibles en la Arena' : 'Tus recorridos ya no se comparten'); }
  else if (k === 'pshare') { state.profile = { ...state.profile, share: el.checked }; save(); toast(el.checked ? 'Tu progreso es visible en la Arena' : 'Tu progreso ya no es visible'); }
  else if (k === 'startday') { ui.startDay = +el.value; render(true); }
  else if (k === 'progex') { ui.exId = el.value; render(true); }
  else if (k === 'gmeasure') { const l = latestBody(el.value); const b = $('#g_b', $('#modal')); if (b) b.value = l ? l.value : ''; }
  else if (k === 'gmode') {
    const m = el.value, box = $('#g_runf', $('#modal'));
    box.innerHTML = m === 'time'
      ? `<div class="grid2"><div><label>Distancia (km)</label><input id="g_km" type="number" inputmode="decimal" step="0.1" value="5"></div><div><label>Tiempo máx (min:seg)</label><div class="grid2"><input id="g_min" type="number" placeholder="min"><input id="g_sec" type="number" placeholder="seg" max="59"></div></div></div>`
      : `<label>Kilómetros</label><input id="g_t" type="number" inputmode="decimal" step="0.1">`;
  }
  if (el.id === 'impfile') {
    const f = el.files[0]; if (!f) return;
    f.text().then(t => {
      const d = JSON.parse(t); if (!d || typeof d !== 'object' || !Array.isArray(d.sessions)) throw new Error('formato');
      if (!confirm('Esto reemplaza tus datos actuales por el respaldo. ¿Continuar?')) return;
      const owner = state.owner; state = Object.assign(emptyState(), d); state.owner = owner; save(); toast('Respaldo restaurado'); render();
    }).catch(() => toast('Archivo de respaldo inválido'));
  }
});
window.addEventListener('hashchange', () => render());
$('#rankChip').addEventListener('click', () => { location.hash = '#/foro'; });
$('#gear').addEventListener('click', () => { location.hash = '#/ajustes'; });
window.addEventListener('online', () => { if (sb && user) pushRemote(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { trkSave(); return; }
  if (trk && !trk.paused) trkWake();
  if (sb && user) pullInbox(true);
});

/* ---------- Arranque ---------- */
async function boot() {
  if (!NATIVE && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  loadState(); trkLoad();
  Motion.buildNav(TABS);
  if (window.Chart) { Chart.defaults.color = '#8a8478'; Chart.defaults.font.family = 'system-ui, sans-serif'; }
  if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    try { const { data } = await sb.auth.getSession(); user = data.session?.user || null; } catch { user = null; }
    sb.auth.onAuthStateChange((_e, s) => { user = s?.user || null; });
  }
  render();
  if (user) { await initialSync(); render(true); await pullInbox(true); }
  else if (sb) { history.replaceState({}, '', location.pathname + location.hash); }
  if (state.active) { /* sesión en curso restaurada */ }
}
boot();
})();
