/* IMPERIUM GLADIADOR — app de entrenamiento (PWA, sin build) */
(() => {
'use strict';

const CFG = window.IMPERIUM_CONFIG || {};
// Mensajes técnicos: solo se imprimen si activás la depuración a propósito (localStorage 'imperium.debug' = '1').
const DEBUG = (() => { try { return localStorage.getItem('imperium.debug') === '1'; } catch { return false; } })();
const dbg = (...a) => { if (DEBUG) console.warn(...a); };
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

// Puntos de gloria que suma cada hito (la mitad que antes: subir de nivel cuesta el doble).
const XP = { sesion: 10, serie: 0.5, km: 1.5, record: 15, campana: 50, partido: 8, gol: 2 };
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
// Íconos de línea para la barra inferior (el nombre queda como etiqueta accesible y como ayuda al mantener presionado).
const ICON = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const TABS = [
  ['foro', 'Foro', ICON('<path d="M3 9.5 12 4l9 5.5"/><path d="M6 11.5v6M10 11.5v6M14 11.5v6M18 11.5v6"/><path d="M3.5 17.5h17M4.5 20.5h15"/>')],
  ['rutina', 'Rutina', ICON('<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M8 14h3M13 14h3M8 17h3"/>')],
  ['entrenar', 'Entrenar', ICON('<path d="M7 12h10"/><rect x="4.2" y="8" width="2.8" height="8" rx="1"/><rect x="17" y="8" width="2.8" height="8" rx="1"/><path d="M2.4 10.5v3M21.6 10.5v3"/>')],
  ['arena', 'Arena', ICON('<path d="M14.5 17.5 3.5 6.5v-3h3l11 11"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 17.5 20.5 6.5v-3h-3l-11 11"/><path d="M11 19l-6-6M8 16l-4 4M5 21l-2-2"/>')],
  ['progreso', 'Progreso', ICON('<path d="M4 4v16h16"/><path d="M8 15l3.5-4 3 3L20 7.5"/><path d="M16 7.5h4v4"/>')],
  ['metas', 'Metas', ICON('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>')],
  ['correr', 'Correr', ICON('<circle cx="15" cy="4.6" r="1.8"/><path d="M13.3 8.2 11 13.2"/><path d="M12.9 8.6l3.6 1.1 1.7 2.4"/><path d="M12.6 9l-3.1.4-2 1.9"/><path d="M11 13.2l3.4 2.3-.5 4.7"/><path d="M11 13.2l-2.5 3.2-3.5 1"/>')]
];

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
  exercises: [], routine: {}, sessions: [], runs: [], matches: [], body: [], goals: [], profile: { name: '', share: true },
  active: null, settings: { rest: 90 }
});
let state = emptyState();
const ui = { routineDay: (new Date().getDay() + 6) % 7, progTab: 'fuerza', runTab: 'correr', exId: null, bodyType: 'peso', startDay: null, min: null };

/* ---------- Saneado de datos: todo lo que viene de afuera (respaldo, nube, otra cuenta) se valida y se acota ---------- */
const SAN = {
  id: v => (typeof v === 'string' && v.length >= 1 && v.length <= 100 && !/[<>"'`&\\\u0000-\u001f]/.test(v)) ? v : null,
  str: (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, max) : '',
  num: (v, min, max, dflt = null) => { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt; },
  // range: si el dato obligatorio está fuera de rango se descarta (en vez de inventar un valor recortado)
  range: (v, min, max) => { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) && n >= min && n <= max ? n : null; },
  date: v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? v : null,
  arr: (v, max) => Array.isArray(v) ? v.slice(0, max) : []
};
function sanSession(x) {
  const id = SAN.id(x?.id), date = SAN.date(x?.date); if (!id || !date) return null;
  const o = {
    id, date, start: SAN.num(x.start, 0, 4e12, 0), name: SAN.str(x.name, 60) || 'Entrenamiento', dur: SAN.num(x.dur, 0, 2000, 0),
    prs: SAN.arr(x.prs, 40).map(SAN.id).filter(Boolean),
    entries: SAN.arr(x.entries, 80).map(e => {
      const exId = SAN.id(e?.exId); if (!exId) return null;
      const en = {
        exId, sets: SAN.arr(e.sets, 100).map(q => {
          const st = { w: SAN.num(q?.w, 0, 1000), r: SAN.num(q?.r, 0, 1000), done: q?.done === true };
          // n = posición de la serie; tw/tr = meta que tenía la serie al empezar (solo en el entrenamiento en curso)
          for (const k of ['n', 'tw', 'tr']) { const v = SAN.num(q?.[k], 0, k === 'n' ? 200 : 1000); if (v != null) st[k] = k === 'n' ? Math.round(v) : v; }
          return st;
        })
      };
      const rid = SAN.id(e.rid); if (rid) en.rid = rid; // ejercicio de la rutina del que viene
      return en;
    }).filter(Boolean)
  };
  const day = SAN.num(x.day, 0, 6); if (day != null) o.day = Math.round(day);
  return o;
}
// Series de un ejercicio de la rutina: [{ r: repeticiones, w: peso }]. Convierte el formato viejo (mismo valor en todas).
function sanSets(it) {
  if (Array.isArray(it?.sets)) {
    const out = it.sets.slice(0, 30).map(q => ({ r: SAN.num(q?.r, 1, 1000), w: SAN.num(q?.w, 0, 1000) }));
    return out.length ? out : [{ r: 10, w: null }];
  }
  const n = Math.round(SAN.num(it?.sets, 1, 30, 3)), r = SAN.num(it?.reps, 1, 1000, 10), w = SAN.num(it?.weight, 0, 1000);
  return Array.from({ length: n }, () => ({ r, w }));
}
function sanitizeState(raw) {
  const d = emptyState(); if (!raw || typeof raw !== 'object') return d;
  d.owner = SAN.id(raw.owner); d.updated = SAN.num(raw.updated, 0, 4e12, 0);
  d.exercises = SAN.arr(raw.exercises, 300).map(e => {
    const id = SAN.id(e?.id), name = SAN.str(e?.name, 50).trim(); if (!id || !name) return null;
    return { id, name, group: GROUPS.includes(e.group) ? e.group : 'Funcional', custom: true };
  }).filter(Boolean);
  for (let i = 0; i < 7; i++) {
    const r = raw.routine?.[i]; if (!r || typeof r !== 'object') continue;
    d.routine[i] = {
      name: SAN.str(r.name, 40),
      items: SAN.arr(r.items, 80).map(it => {
        const id = SAN.id(it?.id), exId = SAN.id(it?.exId); if (!id || !exId) return null;
        return { id, exId, sets: sanSets(it) };
      }).filter(Boolean)
    };
  }
  d.sessions = SAN.arr(raw.sessions, 3000).map(sanSession).filter(Boolean);
  d.runs = SAN.arr(raw.runs, 5000).map(r => {
    const id = SAN.id(r?.id), date = SAN.date(r?.date), km = SAN.range(r?.km, 0.01, 400), min = SAN.range(r?.min, 0.1, 2000);
    if (!id || !date || km == null || min == null) return null;
    return { id, date, km, min, pace: SAN.num(r.pace, 0.1, 59), source: 'manual' };
  }).filter(Boolean);
  d.matches = SAN.arr(raw.matches, 5000).map(m => {
    const id = SAN.id(m?.id), date = SAN.date(m?.date), goals = SAN.range(m?.goals, 0, 99), min = SAN.range(m?.min, 1, 300);
    if (!id || !date || goals == null || min == null) return null;
    return { id, date, goals: Math.round(goals), min: Math.round(min) };
  }).filter(Boolean);
  d.body = SAN.arr(raw.body, 5000).map(b => {
    const id = SAN.id(b?.id), date = SAN.date(b?.date), value = SAN.range(b?.value, 0, 1000);
    if (!id || !date || value == null || typeof b.type !== 'string' || !Object.hasOwn(MEASURES, b.type)) return null;
    return { id, date, type: b.type, value };
  }).filter(Boolean);
  d.goals = SAN.arr(raw.goals, 200).map(g => {
    const id = SAN.id(g?.id), start = SAN.date(g?.start), deadline = SAN.date(g?.deadline);
    const type = ['strength', 'body', 'run', 'habit'].includes(g?.type) ? g.type : null; if (!id || !type || !start || !deadline) return null;
    const o = { id, type, start, deadline, title: SAN.str(g.title, 60) };
    if (type === 'strength') { o.exId = SAN.id(g.exId); o.target = SAN.range(g.target, 0.1, 10000); o.base = SAN.num(g.base, 0, 10000, 0); if (!o.exId || o.target == null) return null; }
    else if (type === 'body') { o.measure = (typeof g.measure === 'string' && Object.hasOwn(MEASURES, g.measure)) ? g.measure : null; o.target = SAN.range(g.target, 0, 10000); o.base = SAN.range(g.base, 0, 10000); if (!o.measure || o.target == null || o.base == null) return null; }
    else if (type === 'run') { o.mode = ['total', 'longest', 'time'].includes(g.mode) ? g.mode : null; o.target = SAN.range(g.target, 0.01, 100000); if (!o.mode || o.target == null) return null; if (o.mode === 'time') { o.km = SAN.range(g.km, 0.1, 1000); if (o.km == null) return null; } }
    else { o.perWeek = Math.round(SAN.num(g.perWeek, 1, 7, 0)); if (!o.perWeek) return null; o.target = o.perWeek; }
    return o;
  }).filter(Boolean);
  d.active = raw.active ? sanSession(raw.active) : null;
  d.settings = { rest: Math.round(SAN.num(raw.settings?.rest, 10, 600, 90)), lastBackup: SAN.num(raw.settings?.lastBackup, 0, 4e12, 0) };
  d.profile = { name: SAN.str(raw.profile?.name, 24), share: raw.profile?.share !== false };
  return d;
}
// Datos públicos de otra persona (Arena): solo números acotados y textos cortos.
function cleanStats(s) {
  s = s && typeof s === 'object' ? s : {};
  const n = (v, max = 1e7) => SAN.num(v, 0, max, 0), a8 = v => SAN.arr(v, 8).map(x => SAN.num(x, 0, 1e5, 0));
  const lifts = Object.create(null); let c = 0;
  if (s.lifts && typeof s.lifts === 'object' && !Array.isArray(s.lifts)) for (const [k, v] of Object.entries(s.lifts)) {
    if (c++ >= 60) break; const name = SAN.str(k, 50), w = SAN.num(v, 0, 1000); if (name && w != null && name !== '__proto__') lifts[name] = w;
  }
  return { rank: SAN.str(s.rank, 20), tier: SAN.str(s.tier, 6), xp: n(s.xp), prs: n(s.prs, 1e5), streak: n(s.streak, 1e4), sessions30: n(s.sessions30, 1e3), km30: n(s.km30, 1e5),
    goalsDone: n(s.goalsDone, 1e4), matches30: n(s.matches30, 1e3), goals30: n(s.goals30, 1e4), weeks: a8(s.weeks), wkm: a8(s.wkm), lifts,
    runs: SAN.arr(s.runs, 10).map(cleanRun).filter(Boolean), matches: SAN.arr(s.matches, 10).map(cleanMatch).filter(Boolean) };
}

function loadState() {
  try { const raw = localStorage.getItem(LS_STATE); if (raw) state = sanitizeState(JSON.parse(raw)); } catch { /* estado corrupto: se ignora */ }
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
        bestReps: Math.max(...sets.filter(x => x.w === Math.max(...sets.map(y => y.w))).map(x => x.r)), // repeticiones con ese peso
        e1rm: Math.max(...sets.map(x => x.w * (1 + x.r / 30))),
        vol: sets.reduce((a, x) => a + x.w * x.r, 0)
      });
    }
  }
  return out;
}
const bestWeight = exId => { const h = exHistory(exId); return h.length ? Math.max(...h.map(x => x.best)) : 0; };
const lastEntry = exId => { const h = exHistory(exId); return h.length ? h[h.length - 1] : null; };   // último entrenamiento del ejercicio
const lastSets = exId => lastEntry(exId)?.sets || null;
// Marca de la vez anterior para la serie número i (usa la posición guardada; en datos viejos, el orden)
function prevSet(le, i) {
  if (!le) return null;
  const byN = le.sets.find(q => q.n === i); if (byN) return byN;
  return le.sets.every(q => q.n == null) ? (le.sets[i] || null) : null;
}

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
  const goals = state.matches.reduce((a, m) => a + m.goals, 0);
  const xp = Math.round(state.sessions.length * XP.sesion + sets * XP.serie + km * XP.km + prs * XP.record + goalsDone * XP.campana + state.matches.length * XP.partido + goals * XP.gol);
  let i = RANKS.length - 1; while (i > 0 && xp < RANKS[i].min) i--;
  const cur = RANKS[i], nxt = RANKS[i + 1] || null;
  return { xp, rank: cur, roman: ROMAN[i], nextRoman: ROMAN[i + 1], next: nxt, pct: nxt ? (xp - cur.min) / (nxt.min - cur.min) : 1, prs, km, sets };
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
    scales: { x: { grid: { color: '#2e2e2e' }, ticks: { maxRotation: 0, autoSkip: true } }, y: { grid: { color: '#2e2e2e' }, beginAtZero: false } }
  }, extra);
}
// Paleta de los gráficos (la misma de la interfaz)
const ORANGE = '#FF5C22', RUST = '#A74B2E', LGRAY = '#D3D3D3';
function lineDs(label, data, color = ORANGE, fill = true) {
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
  } catch (e) { dbg('push', e); setSyncBadge(navigator.onLine ? 'err' : 'off'); }
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
    if (remote && SAN.num(remote.updated, 0, 4e12, 0) > (state.updated || 0)) {
      state = sanitizeState(remote); state.owner = user.id; save(false);
      await pushProfile(); setSyncBadge('ok');
    } else { await pushRemote(); }
  } catch (e) { dbg('sync', e); setSyncBadge(navigator.onLine ? 'err' : 'off'); }
  syncing = false;
}

/* ---------- Carreras (se registran a mano: km, duración y ritmo) ---------- */
// Ritmo en minutos por km. Si una carrera vieja no lo tiene, se calcula.
const runPace = r => r.pace > 0 ? r.pace : (r.min > 0 && r.km > 0 ? r.min / r.km : 0);
const run3 = r => `<div class="run3"><div><b>${fmtN(r.km, 2)}</b><span>Kilómetros</span></div><div><b>${fmtTime(r.min)}</b><span>Duración</span></div><div><b>${fmtTime(runPace(r))}</b><span>Ritmo por km</span></div></div>`;
// Datos que llegan de otra cuenta: se validan antes de usarlos.
function cleanRun(r) {
  if (!r || typeof r !== 'object') return null;
  const km = Number(r.km), min = Number(r.min), pace = Number(r.pace), date = String(r.date || '');
  if (!(km > 0 && km < 400) || !(min > 0 && min < 2000) || !(pace > 0 && pace < 60) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { km, min, pace, date };
}

function cleanMatch(m) {
  if (!m || typeof m !== 'object') return null;
  const goals = Number(m.goals), min = Number(m.min), date = String(m.date || '');
  if (!Number.isInteger(goals) || goals < 0 || goals > 99 || !Number.isInteger(min) || min < 1 || min > 300 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { goals, min, date };
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
  const hasData = state.sessions.length + state.runs.length + state.body.length + state.goals.length > 0;
  const lb = state.settings.lastBackup || 0, bdays = lb ? Math.floor((Date.now() - lb) / 864e5) : null;
  const backupCard = hasData && (bdays === null || bdays >= 30) ? `<div class="card"><div class="row between"><div class="grow"><h3>Respaldo</h3><div class="muted small">${bdays === null ? 'Todavía no descargaste un respaldo de tus datos.' : `Hace ${bdays} días que no descargás un respaldo.`}</div></div><button data-act="export">Descargar</button></div></div>` : '';
  return `
  <div class="card gold hero">
    <div class="lvls">
      <div class="lvl"><span class="k">Nivel actual</span><div class="laurel">${x.roman}</div><div class="rank-name">${x.rank.name}</div></div>
      <div class="lvl nxt"><span class="k">Siguiente nivel</span><div class="laurel">${x.next ? x.nextRoman : '✦'}</div><div class="rank-name">${x.next ? x.next.name : 'Máximo'}</div></div>
    </div>
    <div class="bar"><i style="width:${Math.round(x.pct * 100)}%"></i></div>
    <div class="glory"><span>${x.xp} pts</span>${x.next ? `<span class="falta">Faltan <b>${x.next.min - x.xp}</b> puntos</span><span>${x.next.min} pts</span>` : '<span class="falta">Alcanzaste el nivel máximo</span><span></span>'}</div>
    <p class="how">${x.next ? `Sumás gloria con cada entreno (+${fmtN(XP.sesion)}), serie (+${fmtN(XP.serie)}), kilómetro corrido (+${fmtN(XP.km)}), partido de fútbol (+${fmtN(XP.partido)}), gol (+${fmtN(XP.gol)}), récord (+${fmtN(XP.record)}) y campaña cumplida (+${fmtN(XP.campana)}).` : 'Sos un Emperador. Mantené el ritmo.'}</p>
    <div class="muted small" style="margin-top:12px;font-style:italic">“${quote}”</div>
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
  ${goals.length ? goals.map(({ g, p }) => goalCard(g, p, true)).join('') : `<div class="card empty"><span class="big">···</span>Sin campañas activas.<br><a href="#/metas" class="gold-t">Fijá tu primer objetivo</a></div>`}
  ${backupCard}`;
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
    <div class="sets-head"><span>Serie</span><span>Reps</span><span>Peso (kg)</span></div>
    ${it.sets.map((t, si) => `<div class="srow"><span class="n">${si + 1}</span>
      <input type="number" inputmode="numeric" min="1" max="1000" data-in="rt" data-id="${it.id}" data-s="${si}" data-f="r" value="${t.r ?? ''}" placeholder="reps" aria-label="Repeticiones de la serie ${si + 1}">
      <input type="number" inputmode="decimal" min="0" max="1000" step="0.5" data-in="rt" data-id="${it.id}" data-s="${si}" data-f="w" value="${t.w ?? ''}" placeholder="kg" aria-label="Peso de la serie ${si + 1}"></div>`).join('')}
    <div class="row" style="margin-top:4px"><button class="btn-sm" data-act="rset-add" data-id="${it.id}" ${it.sets.length >= 20 ? 'disabled' : ''}>+ Serie</button>
      <button class="btn-sm btn-ghost" data-act="rset-del" data-id="${it.id}" ${it.sets.length <= 1 ? 'disabled' : ''}>− Serie</button></div>
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
// Ejercicios minimizados en la sesión en curso: por defecto queda abierto solo el primero sin terminar.
function liveMin(a) {
  if (!ui.min || ui.minId !== a.id) {
    const open = a.entries.findIndex(e => !e.sets.every(s => s.done));
    ui.min = {}; ui.minId = a.id;
    a.entries.forEach((_, i) => { if (i !== Math.max(0, open)) ui.min[i] = true; });
  }
  return ui.min;
}
const fmtRest = n => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
function paintMin() {
  const m = ui.min || {}, a = state.active; if (!a) return;
  document.querySelectorAll('.ex-card[data-ei]').forEach(c => {
    const mi = !!m[+c.dataset.ei]; c.classList.toggle('min', mi);
    const t = c.querySelector('.ex-toggle'); if (t) t.setAttribute('aria-expanded', String(!mi));
    const ch = c.querySelector('.chev'); if (ch) ch.classList.toggle('open', !mi);
  });
  const ta = document.querySelector('[data-act=live-toggleall]'); if (ta) ta.textContent = a.entries.every((_, i) => m[i]) ? 'Expandir todos' : 'Minimizar todos';
}
function liveView() {
  const a = state.active, mn = liveMin(a);
  return `
  <div class="row between"><div><h1>${esc(a.name)}</h1><p class="sub" style="margin:0">${fmtD(a.date)} · empezó ${new Date(a.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p></div></div>
  <div style="height:12px"></div>
  ${a.entries.length > 1 ? `<div class="row" style="justify-content:flex-end;margin:-4px 0 10px"><button class="btn-sm btn-ghost" data-act="live-toggleall">${a.entries.every((_, i) => mn[i]) ? 'Expandir todos' : 'Minimizar todos'}</button></div>` : ''}
  ${a.entries.map((e, ei) => {
    const le = lastEntry(e.exId), min = !!mn[ei], dn = e.sets.filter(s => s.done).length;
    return `<div class="card ex-card ${min ? 'min' : ''} ${dn === e.sets.length ? 'all' : ''}" data-ei="${ei}">
      <div class="row between ex-head"><button class="ex-toggle" data-act="live-toggle" data-e="${ei}" aria-expanded="${!min}"><h3>${esc(exName(e.exId))}</h3><span class="prog">${dn}/${e.sets.length}</span><i class="chev ${min ? '' : 'open'}" aria-hidden="true"></i></button><button class="btn-sm icon-btn btn-danger ex-del" data-act="live-exdel" data-e="${ei}" aria-label="Quitar ejercicio">✕</button></div>
      <div class="ex-body"><div class="ex-in">
      <p class="hint">${le ? 'Última vez: ' + fmtD(le.date) : 'Primera vez con este ejercicio'}${e.rid ? ' · la meta sube sola cuando la superás' : ''}</p>
      <div class="set-head"><span>Serie</span><span>Anterior</span><span>Kg</span><span>Reps</span><span></span></div>
      ${e.sets.map((s, si) => {
        const pv = prevSet(le, si);
        const meta = s.tw != null ? `Meta <b>${s.tr != null ? fmtN(s.tr) + ' × ' : ''}${fmtN(s.tw)} kg</b>` : '';
        const ant = pv ? `${fmtN(pv.w)} kg × ${fmtN(pv.r)}` : '—';
        const beat = s.done && s.w != null && s.r != null && s.tw != null && (s.w > s.tw || (s.w === s.tw && s.r > (s.tr ?? 0)));
        return `<div class="setwrap ${s.done ? 'done' : ''}"><div class="set ${s.done ? 'done' : ''}">
        <span class="n">${si + 1}</span>
        <span class="prev">${ant}</span>
        <input type="number" inputmode="decimal" step="0.5" min="0" max="1000" data-in="live" data-e="${ei}" data-s="${si}" data-f="w" value="${s.w ?? ''}" placeholder="kg" aria-label="Peso realizado, serie ${si + 1}">
        <input type="number" inputmode="numeric" min="0" max="1000" data-in="live" data-e="${ei}" data-s="${si}" data-f="r" value="${s.r ?? ''}" placeholder="reps" aria-label="Repeticiones realizadas, serie ${si + 1}">
        <button class="ok" data-act="live-done" data-e="${ei}" data-s="${si}" aria-label="Serie hecha">✔</button></div>
        ${meta || beat ? `<div class="sethint">${meta ? `<span class="meta">${meta}</span>` : ''}${beat ? '<span class="up">↑ Superaste la meta</span>' : ''}</div>` : ''}
        <div class="restline" aria-hidden="true"><i></i><span>${fmtRest(state.settings.rest || 90)}</span><i></i></div></div>`;
      }).join('')}
      <div class="addrow"><button class="addset" data-act="live-addset" data-e="${ei}">+ Añadir serie (${fmtRest(state.settings.rest || 90)})</button>
      <button class="btn-sm btn-ghost" data-act="live-delset" data-e="${ei}" aria-label="Quitar la última serie">− Serie</button></div>
      </div></div>
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
  const bestRepsAtMax = Math.max(...h.filter(x => x.best === best).map(x => x.bestReps)); // repeticiones con el peso máximo
  const first = h[0].best;
  return `
  <select data-in="progex">${withHist.map(e => `<option value="${e.id}" ${e.id === ui.exId ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>
  <div class="grid2" style="margin-top:12px">
    <div class="card stat"><b>${fmtN(best)}</b><span>Peso máximo (kg)</span></div>
    <div class="card stat"><b>${bestRepsAtMax}</b><span>Reps con ese peso</span></div>
    <div class="card stat"><b>${h.length}</b><span>Sesiones</span></div>
    <div class="card stat"><b class="${best >= first ? 'ok-t' : ''}">${best - first >= 0 ? '+' : ''}${fmtN(best - first)}</b><span>Desde el inicio</span></div>
  </div>
  <div class="card"><h3>Peso máximo, repeticiones con ese peso y 1RM estimado</h3><div class="chart-box"><canvas id="ch1"></canvas></div></div>
  <div class="card"><h3>Volumen por sesión (kg × reps)</h3><div class="chart-box"><canvas id="ch2"></canvas></div></div>
  <div class="card"><h3>Registro</h3>${h.slice().reverse().slice(0, 10).map(x => `<div class="list-item"><div class="grow"><b>${fmtD(x.date)}</b>
    <div class="muted small">${x.sets.map(s => `${s.r} × ${fmtN(s.w)} kg`).join(' · ')}</div></div><span class="tag gold">${x.bestReps} × ${fmtN(x.best)} kg</span></div>`).join('')}</div>`;
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
    drawChart('ch1', { type: 'line', data: { labels, datasets: [lineDs('Peso máx (kg)', h.map(x => x.best), ORANGE), { ...lineDs('Reps con ese peso', h.map(x => x.bestReps), '#FFFFFF', false), yAxisID: 'y2', borderDash: [5, 4] }, lineDs('1RM estimado', h.map(x => Math.round(x.e1rm * 10) / 10), LGRAY, false)] }, options: chartBase({ plugins: { legend: { display: true, labels: { boxWidth: 12 } } }, scales: { x: { grid: { color: '#2e2e2e' }, ticks: { maxRotation: 0, autoSkip: true } }, y: { grid: { color: '#2e2e2e' }, beginAtZero: false }, y2: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { precision: 0 } } } }) });
    drawChart('ch2', { type: 'bar', data: { labels, datasets: [{ data: h.map(x => Math.round(x.vol)), backgroundColor: RUST, borderColor: ORANGE, borderWidth: 1, borderRadius: 4 }] }, options: chartBase({ scales: { x: { grid: { color: '#2e2e2e' } }, y: { grid: { color: '#2e2e2e' }, beginAtZero: true } } }) });
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
    const opt = chartBase({ plugins: { legend: { display: true, labels: { boxWidth: 12 } } }, scales: { x: { stacked: true, grid: { color: '#2e2e2e' } }, y: { stacked: true, grid: { color: '#2e2e2e' }, ticks: { precision: 0 }, beginAtZero: true } } });
    drawChart('ch1', { type: 'bar', data: { labels, datasets: [{ label: 'Gimnasio', data: gym, backgroundColor: RUST, borderRadius: 4 }, { label: 'Running', data: run, backgroundColor: ORANGE, borderRadius: 4 }] }, options: opt });
    drawChart('ch2', { type: 'line', data: { labels, datasets: [lineDs('Volumen', vol)] }, options: chartBase({ scales: { x: { grid: { color: '#2e2e2e' } }, y: { grid: { color: '#2e2e2e' }, beginAtZero: true } } }) });
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
const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + m % 60 + ' min' : ''}` : `${m} min`;
V.correr = () => {
  const fut = ui.runTab === 'futbol';
  const seg = [['correr', 'Correr'], ['futbol', 'Fútbol']].map(([k, n]) => `<button class="${ui.runTab === k ? 'on' : ''}" data-act="rtab" data-t="${k}">${n}</button>`).join('');
  return `<h1>${fut ? 'Fútbol' : 'Correr'}</h1><div class="seg" style="margin:0 0 14px">${seg}</div>` + (fut ? futbolView() : runView());
};
function futbolView() {
  const ms = state.matches.slice().sort((a, b) => b.date.localeCompare(a.date) || 0);
  const goals = ms.reduce((a, m) => a + m.goals, 0), mins = ms.reduce((a, m) => a + m.min, 0);
  return `<p class="sub">Cargá cada partido: los goles que hiciste y los minutos que jugaste. Suman gloria y tu rival los ve en la Arena.</p>
  <button class="btn-primary btn-block" data-act="match-new" style="margin-bottom:12px">+ Registrar partido</button>
  <div class="grid3"><div class="card stat"><b>${ms.length}</b><span>Partidos</span></div><div class="card stat"><b>${goals}</b><span>Goles</span></div><div class="card stat"><b>${mins}</b><span>Minutos</span></div></div>
  ${ms.length ? `<div class="card"><h3>Goles por partido</h3><div class="chart-box"><canvas id="chf"></canvas></div><p class="hint" style="margin-bottom:0">Promedio: ${fmtN(goals / ms.length)} por partido · ${fmtN(goals / mins * 90)} cada 90 min</p></div>
  <div class="card">${ms.slice(0, 50).map(m => `<div class="list-item"><div class="grow"><b>${m.goals} ${m.goals === 1 ? 'gol' : 'goles'}</b><div class="muted small">${fmtD(m.date)} · ${fmtMin(m.min)} jugados</div></div>
    <button class="btn-sm icon-btn btn-danger" data-act="match-del" data-id="${m.id}" aria-label="Eliminar partido">✕</button></div>`).join('')}</div>` : `<div class="card empty"><span class="big">···</span>Sin partidos registrados.</div>`}`;
}
function runView() {
  const runs = state.runs.slice().sort((a, b) => b.date.localeCompare(a.date));
  const since = addDays(today(), -30), m = runs.filter(r => r.date >= since);
  const km = m.reduce((a, r) => a + r.km, 0), paceW = km ? m.reduce((a, r) => a + runPace(r) * r.km, 0) / km : 0;
  return `<p class="sub">Registrá cada carrera con tres datos: kilómetros, duración y ritmo promedio por kilómetro. Tu rival puede verlos en la Arena.</p>
  <button class="btn-primary btn-block" data-act="run-new" style="margin-bottom:12px">+ Registrar carrera</button>
  <div class="grid3"><div class="card stat"><b>${fmtN(km)}</b><span>Km (30 días)</span></div><div class="card stat"><b>${m.length}</b><span>Salidas</span></div><div class="card stat"><b>${paceW ? fmtTime(paceW) : '–'}</b><span>Ritmo medio</span></div></div>
  ${runs.length ? `<div class="card"><h3>Kilómetros por semana</h3><div class="chart-box"><canvas id="ch1"></canvas></div></div>
  <div class="card"><h3>Ritmo por salida (min/km)</h3><div class="chart-box"><canvas id="ch2"></canvas></div></div>` : ''}
  ${runs.length ? `<div class="card">${runs.slice(0, 30).map(r => `<div class="list-item" style="align-items:flex-start"><div class="grow"><div class="muted small" style="margin-bottom:6px">${fmtD(r.date)}</div>${run3(r)}</div>
    <button class="btn-sm icon-btn btn-danger" data-act="run-del" data-id="${r.id}">✕</button></div>`).join('')}</div>` : `<div class="card empty"><span class="big">···</span>Sin carreras registradas.</div>`}`;
}
function afterCorrer() {
  if (ui.runTab === 'futbol') {
    const ms = state.matches.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-15); if (!ms.length) return;
    drawChart('chf', { type: 'bar', data: { labels: ms.map(m => fmtD(m.date)), datasets: [{ data: ms.map(m => m.goals), backgroundColor: ORANGE, borderRadius: 4 }] }, options: chartBase({ scales: { x: { grid: { color: '#2e2e2e' } }, y: { grid: { color: '#2e2e2e' }, beginAtZero: true, ticks: { precision: 0 } } } }) });
    return;
  }
  const runs = state.runs.slice().sort((a, b) => a.date.localeCompare(b.date)); if (!runs.length) return;
  const ws = weekStart(today()), labels = [], kms = [];
  for (let w = 11; w >= 0; w--) { const s = addDays(ws, -7 * w); labels.push(fmtD(s)); kms.push(Math.round(state.runs.filter(r => r.date >= s && r.date <= addDays(s, 6)).reduce((a, r) => a + r.km, 0) * 10) / 10); }
  drawChart('ch1', { type: 'bar', data: { labels, datasets: [{ data: kms, backgroundColor: ORANGE, borderRadius: 4 }] }, options: chartBase({ scales: { x: { grid: { color: '#2e2e2e' } }, y: { grid: { color: '#2e2e2e' }, beginAtZero: true } } }) });
  const last = runs.filter(r => runPace(r) > 0).slice(-15);
  drawChart('ch2', { type: 'line', data: { labels: last.map(r => fmtD(r.date)), datasets: [lineDs('Ritmo', last.map(r => Math.round(runPace(r) * 100) / 100), LGRAY)] }, options: chartBase({ scales: { x: { grid: { color: '#2e2e2e' } }, y: { reverse: true, grid: { color: '#2e2e2e' } } } }) });
}

/* --- Ajustes --- */
V.ajustes = () => `
  <h1>Ajustes</h1><p class="sub">Cuenta, sincronización y respaldo.</p>
  <div class="card"><h3>Cuenta</h3>
    ${sb ? (user ? `<p class="muted small">Sesión: ${esc(user.email)}</p><p class="small" id="syncBadge">${syncText()}</p>
      <div class="row wrap"><button data-act="sync-now">Sincronizar ahora</button><button class="btn-danger" data-act="logout">Cerrar sesión</button></div>`
      : `<p class="muted small">Estás usando la app sin cuenta: tus datos viven solo en este dispositivo.</p><button class="btn-primary" data-act="goto-auth">Iniciar sesión / crear cuenta</button>`)
      : `<p class="muted small" id="syncBadge">${syncText()}. Configurá Supabase en <code>config.js</code> para activar cuentas y sincronización (ver README).</p>`}
  </div>
  ${sb && user ? `<div class="card"><h3>Arena</h3><p class="muted small">Tu nombre y un resumen (gloria, sesiones, km, récords, cargas máximas y tus últimas carreras con kilómetros, duración y ritmo) quedan visibles para otros gladiadores. Tu peso corporal, medidas, rutina y notas nunca se comparten.</p>
    <label>Nombre de gladiador</label><input data-in="pname" maxlength="24" value="${esc(profileName())}">
    <label class="switch"><input type="checkbox" data-in="pshare" ${state.profile?.share !== false ? 'checked' : ''}> Compartir mi progreso con otros</label></div>` : ''}
  <div class="card"><h3>Descanso entre series</h3><label>Segundos</label><input type="number" inputmode="numeric" min="10" max="600" step="5" data-in="rest" value="${state.settings.rest}"></div>
  <div class="card"><h3>Respaldo</h3><p class="muted small">Descargá todos tus datos o restaurá un respaldo. ${state.settings.lastBackup ? 'Último respaldo: ' + new Date(state.settings.lastBackup).toLocaleDateString('es-AR') + '.' : 'Todavía no descargaste ninguno.'}</p>
    <div class="row wrap"><button data-act="export">Exportar JSON</button><button data-act="import">Importar JSON</button></div>
    <input type="file" id="impfile" accept="application/json" class="hidden"></div>
  <div class="card red"><h3 class="red-t">Zona de peligro</h3><p class="muted small">Borra todos los datos de este dispositivo${user ? ' y de tu cuenta' : ''}. No se puede deshacer.</p>
    <button class="btn-danger" data-act="wipe">Borrar todo</button></div>
  <p class="muted small center" style="margin-top:20px">Imperium Gladiador · v1</p>`;

/* --- Auth --- */
V.auth = () => `<div class="auth"><img class="crest-img" src="icons/icon-192.png" alt="Imperium" width="88" height="88"><h1>IMPERIUM</h1><p class="sub">Entrá al Coliseo. Tu legión te espera.</p>
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
// Últimas carreras que se publican en la Arena (kilómetros, duración y ritmo).
function sharedRuns() {
  return state.runs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
    .map(r => ({ date: r.date, km: r.km, min: r.min, pace: Math.round(runPace(r) * 1000) / 1000 }));
}
// Últimos partidos que se publican en la Arena (goles y minutos jugados).
const sharedMatches = () => state.matches.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(m => ({ date: m.date, goals: m.goals, min: m.min }));
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
    v: 4, rank: x.rank.name, tier: x.roman, xp: x.xp, prs: x.prs, streak: streakWeeks(),
    sessions30: td.filter(d => d >= since).length,
    km30: Math.round(state.runs.filter(r => r.date >= since).reduce((q, r) => q + r.km, 0) * 10) / 10,
    goalsDone: state.goals.filter(g => goalProgress(g).pct >= 1).length,
    matches30: state.matches.filter(m => m.date >= since).length, goals30: state.matches.filter(m => m.date >= since).reduce((q, m) => q + m.goals, 0),
    weeks, wkm, lifts, runs: sharedRuns(), matches: sharedMatches()
  };
}
async function pushProfile() {
  if (!sb || !user) return;
  try {
    const { error } = await sb.from('profiles').upsert({ user_id: user.id, name: profileName(), share: state.profile?.share !== false, stats: buildStats(), updated_at: new Date().toISOString() });
    if (error) throw error;
  } catch (e) { dbg('profile', e); }
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
    ui.rivals = (data || []).map(r => ({ user_id: /^[0-9a-f-]{36}$/i.test(String(r?.user_id)) ? r.user_id : null, name: SAN.str(r?.name, 24) || 'Gladiador',
      updated_at: typeof r?.updated_at === 'string' ? r.updated_at.slice(0, 40) : '', stats: cleanStats(r?.stats) })).filter(r => r.user_id);
    if (!ui.rivals.some(r => r.user_id === ui.rivalId)) ui.rivalId = ui.rivals[0]?.user_id || null;
    renderArena();
  } catch (e) { dbg(e); const b = $('#arena'); if (b) b.innerHTML = arenaMsg('No se pudo cargar la arena. Revisá tu conexión.', '<br><br><button data-act="arena-refresh">Reintentar</button>'); }
}
function rrunsHtml(rv) {
  const runs = (Array.isArray(rv.stats?.runs) ? rv.stats.runs : []).map(cleanRun).filter(Boolean);
  if (!runs.length) return `<h2>Carreras de ${esc(rv.name)}</h2><div class="card empty" style="padding:18px"><span class="big">···</span>${esc(rv.name)} todavía no registró carreras.</div>`;
  return `<h2>Carreras de ${esc(rv.name)}</h2><div class="card">${runs.map(r => `<div class="list-item" style="display:block"><div class="muted small" style="margin-bottom:6px">${fmtD(r.date)}</div>${run3(r)}</div>`).join('')}</div>`;
}
function rmatchesHtml(rv) {
  const ms = (Array.isArray(rv.stats?.matches) ? rv.stats.matches : []).map(cleanMatch).filter(Boolean);
  if (!ms.length) return `<h2>Partidos de ${esc(rv.name)}</h2><div class="card empty" style="padding:18px"><span class="big">···</span>${esc(rv.name)} todavía no registró partidos.</div>`;
  return `<h2>Partidos de ${esc(rv.name)}</h2><div class="card">${ms.map(m => `<div class="list-item"><div class="grow"><b>${m.goals} ${m.goals === 1 ? 'gol' : 'goles'}</b><div class="muted small">${fmtD(m.date)} · ${fmtMin(m.min)} jugados</div></div></div>`).join('')}</div>`;
}
function duelRow(label, a, b, fmt = v => fmtN(v, 0)) {
  const tot = a + b, pa = tot ? a / tot * 100 : 50, pb = tot ? b / tot * 100 : 50;
  const lead = a > b ? 'a' : b > a ? 'b' : '';
  return `<div class="duel"><div class="duel-h"><span class="${lead === 'a' ? 'gold-t' : ''}">${fmt(a)}</span><span class="muted">${label}</span><span class="${lead === 'b' ? 'rival-t' : ''}">${fmt(b)}</span></div>
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
  const rows = [['Gloria', me.xp, N(s.xp)], ['Sesiones · 30 días', me.sessions30, N(s.sessions30)], ['Km · 30 días', me.km30, N(s.km30), v => fmtN(v)], ['Partidos · 30 días', me.matches30, N(s.matches30)], ['Goles · 30 días', me.goals30, N(s.goals30)],
    ['Récords', me.prs, N(s.prs)], ['Semanas seguidas', me.streak, N(s.streak)], ['Campañas cumplidas', me.goalsDone, N(s.goalsDone)]];
  const wa = rows.filter(r => r[1] > r[2]).length, wb = rows.filter(r => r[2] > r[1]).length;
  const lifts = Object.keys(me.lifts).filter(n => s.lifts && s.lifts[n]).sort((a, b) => (me.lifts[b] + s.lifts[b]) - (me.lifts[a] + s.lifts[a])).slice(0, 10);
  const chips = rivals.length > 1 ? `<div class="chips" style="margin-bottom:14px">${rivals.map(r => `<button class="chip ${r.user_id === rv.user_id ? 'on' : ''}" data-act="arena-rival" data-id="${r.user_id}">${esc(r.name)}</button>`).join('')}</div>` : '';
  box.innerHTML = `${chips}
  <div class="card gold"><div class="vs"><b class="gold-t">Tú</b><span class="x">VS</span><b class="rival-t">${esc(rv.name)}</b></div>
    <div class="score" style="margin-top:14px">${wa} — ${wb}<small>Marcador del duelo</small></div></div>
  <div class="card">${rows.map(r => duelRow(...r)).join('')}</div>
  <div class="card"><h3><span class="me-dot"></span>Tú <span class="ri-dot" style="margin-left:14px"></span>${esc(rv.name)}</h3><p class="muted small" style="margin:6px 0 0">Entrenos por semana · últimas 8 semanas</p><div class="chart-box"><canvas id="ch1"></canvas></div></div>
  <div class="card"><p class="muted small" style="margin:0">Kilómetros por semana</p><div class="chart-box"><canvas id="ch2"></canvas></div></div>
  ${rrunsHtml(rv)}
  ${rmatchesHtml(rv)}
  <h2>Cargas máximas</h2>
  <div class="card">${lifts.length ? `<div class="lift head"><span>Ejercicio</span><span class="v">Tú</span><span class="v">${esc(rv.name).slice(0, 8)}</span></div>` + lifts.map(n => `<div class="lift"><span>${esc(n)}</span>
    <span class="v ${me.lifts[n] > s.lifts[n] ? 'win' : ''}">${fmtN(me.lifts[n])}</span><span class="v ${s.lifts[n] > me.lifts[n] ? 'win' : ''}">${fmtN(s.lifts[n])}</span></div>`).join('')
    : '<p class="muted small center" style="margin:0">Todavía no comparten ejercicios en común.</p>'}</div>
  ${rankCard}
  <p class="muted small center">Actualizado ${rv.updated_at ? new Date(rv.updated_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '–'} · <a href="#" class="gold-t" data-act="arena-refresh">Actualizar</a></p>`;
  const labels = Array.from({ length: 8 }, (_, i) => fmtD(addDays(weekStart(today()), -7 * (7 - i))));
  const opt = chartBase({ scales: { x: { grid: { display: false } }, y: { grid: { color: '#2e2e2e' }, beginAtZero: true, ticks: { precision: 0 } } } });
  const ds = (a, b) => [{ label: 'Tú', data: a, backgroundColor: ORANGE, borderRadius: 3 }, { label: rv.name, data: Array.isArray(b) ? b : [], backgroundColor: LGRAY, borderRadius: 3 }];
  drawChart('ch1', { type: 'bar', data: { labels, datasets: ds(me.weeks, s.weeks) }, options: opt });
  drawChart('ch2', { type: 'bar', data: { labels, datasets: ds(me.wkm, s.wkm) }, options: chartBase({ scales: { x: { grid: { display: false } }, y: { grid: { color: '#2e2e2e' }, beginAtZero: true } } }) });
}

/* ---------- Render / ruteo ---------- */
function route() { return (location.hash.replace(/^#\/?/, '') || 'foro').split('?')[0]; }
function needAuth() { return sb && !user && !localStorage.getItem(LS_LOCAL); }

function render(keepScroll = false) {
  const y = window.scrollY;
  const r = route();
  const tabIdx = k => TABS.findIndex(t => t[0] === k);
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
  Motion.setNav(name, TABS); Motion.enter(view, !keepScroll, { dir, slide });
  if (ghost) Motion.leave(ghost, dir);
  if (!keepScroll && ui.lastRoute !== name) { Motion.sweep(); ui.lastRoute = name; }
  const x = xpInfo(); $('#rankChip').textContent = `${x.roman} · ${x.rank.name}`;
  if (name === 'progreso') afterProgreso();
  if (name === 'correr') afterCorrer();
  if (name === 'arena') afterArena();
}

/* ---------- Acciones ---------- */
function ensureDay(d) { return state.routine[d] || (state.routine[d] = { name: '', items: [] }); }
function sessionFromDay(d) {
  const r = state.routine[d];
  const entries = (r?.items || []).map(it => {
    const le = lastEntry(it.exId);
    return {
      exId: it.exId, rid: it.id,
      sets: it.sets.map((t, i) => {
        const pv = prevSet(le, i);   // si la meta no tiene un dato, se completa con lo de la vez anterior
        return { r: t.r ?? pv?.r ?? null, w: t.w ?? pv?.w ?? null, done: false, tr: t.r ?? undefined, tw: t.w ?? undefined };
      }).map(q => { Object.keys(q).forEach(k => q[k] === undefined && delete q[k]); return q; })
    };
  });
  return { id: uid(), date: today(), start: Date.now(), name: r?.name || DAYS[d], day: d, entries };
}
// Al terminar: las metas de la rutina SUBEN donde superaste la marca (más peso, o el mismo peso con más reps). Nunca bajan solas.
function applyRoutineProgress(a) {
  const items = Object.values(state.routine).flatMap(r => r.items || []); let n = 0;
  for (const e of a.entries) {
    const item = e.rid && items.find(i => i.id === e.rid); if (!item) continue;
    e.sets.forEach((q, i) => {
      const t = item.sets[i]; if (!t || !q.done || q.w == null || q.r == null) return;
      const mejor = t.w == null || q.w > t.w || (q.w === t.w && (t.r == null || q.r > t.r));
      if (mejor && (t.w !== q.w || t.r !== q.r)) { t.w = q.w; t.r = q.r; n++; }
    });
  }
  return n;
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
  const entries = a.entries.map(e => ({ exId: e.exId, sets: e.sets.map((s, n) => ({ s, n })).filter(o => o.s.done).map(o => ({ w: o.s.w, r: o.s.r, done: true, n: o.n })) })).filter(e => e.sets.length);
  if (!entries.length) return toast('Marcá al menos una serie como hecha (✔)');
  const prs = [];
  for (const e of entries) {
    const w = Math.max(0, ...e.sets.map(s => s.w || 0));
    const prev = bestWeight(e.exId);
    if (w > 0 && prev > 0 && w > prev) prs.push(e.exId);
  }
  state.sessions.push({ id: a.id, date: a.date, start: a.start, name: a.name, entries, prs, dur: Math.max(1, Math.round((Date.now() - a.start) / 60000)) });
  const subidas = applyRoutineProgress(a);
  state.active = null; stopRest(); save();
  location.hash = '#/progreso'; ui.progTab = 'fuerza'; if (entries[0]) ui.exId = entries[0].exId;
  render();
  const msg = prs.length ? `¡Nuevo récord en ${prs.map(exName).join(', ')}!` : 'Entrenamiento registrado. ¡Ave!';
  toast(subidas ? `${msg} Subieron las metas de ${subidas} serie${subidas === 1 ? '' : 's'} en tu rutina.` : msg, 5200);
}

const ACTIONS = {
  'modal-close': closeModal,
  'rest+': () => { if (rest) rest.end += 15000; tickRest(); },
  'rest-stop': stopRest,

  // rutina
  rday: el => { ui.routineDay = +el.dataset.day; render(true); },
  radd: () => pickExercise(id => {
    const r = ensureDay(ui.routineDay), le = lastEntry(id);
    const sets = le ? le.sets.slice(0, 10).map(q => ({ r: q.r, w: q.w })) : [{ r: 10, w: null }, { r: 10, w: null }, { r: 10, w: null }];
    r.items.push({ id: uid(), exId: id, sets }); save(); render(true);
  }),
  'rset-add': el => { const it = ensureDay(ui.routineDay).items.find(i => i.id === el.dataset.id); if (!it || it.sets.length >= 20) return; const l = it.sets[it.sets.length - 1]; it.sets.push({ r: l?.r ?? 10, w: l?.w ?? null }); save(); render(true); },
  'rset-del': el => { const it = ensureDay(ui.routineDay).items.find(i => i.id === el.dataset.id); if (!it || it.sets.length <= 1) return; it.sets.pop(); save(); render(true); },
  rdel: el => { const r = ensureDay(ui.routineDay); r.items = r.items.filter(i => i.id !== el.dataset.id); save(); render(true); },
  rup: el => moveItem(el.dataset.id, -1), rdown: el => moveItem(el.dataset.id, 1),
  rcopy: () => openModal(`<h2 style="margin-top:0">Copiar ${DAYS[ui.routineDay]} a…</h2><div class="chips" style="flex-wrap:wrap">${DAYS.map((n, i) => i === ui.routineDay ? '' : `<button class="chip" data-act="rcopy-to" data-day="${i}">${n}</button>`).join('')}</div><p class="muted small">Reemplaza el contenido del día elegido.</p>`),
  'rcopy-to': el => { const src = ensureDay(ui.routineDay); state.routine[+el.dataset.day] = { name: src.name, items: src.items.map(i => ({ ...i, id: uid(), sets: i.sets.map(t => ({ ...t })) })) }; save(); closeModal(); toast('Día copiado'); render(true); },

  // entrenar
  'start-day': el => {
    if (state.active && !confirm('Ya tenés un entrenamiento en curso. ¿Reemplazarlo?')) return;
    const d = +el.dataset.day; state.active = sessionFromDay(d); ui.min = null; save();
    if (!state.active.entries.length) toast('Ese día no tiene ejercicios: agregalos sobre la marcha');
    location.hash = '#/entrenar'; render();
  },
  'start-free': () => { state.active = { id: uid(), date: today(), start: Date.now(), name: 'Entrenamiento libre', entries: [] }; ui.min = null; save(); render(); },
  'live-done': el => {
    const s = state.active.entries[+el.dataset.e].sets[+el.dataset.s];
    if (!s.done && (s.w == null || s.r == null)) return toast('Completá kg y reps antes de marcar la serie');
    const { e: ei, s: si } = el.dataset;
    s.done = !s.done; save(); render(true);
    if (s.done) { startRest(state.settings.rest || 90); Motion.pop(document.querySelector(`[data-act=live-done][data-e="${ei}"][data-s="${si}"]`)); }
  },
  'live-addset': el => { const e = state.active.entries[+el.dataset.e]; const l = e.sets[e.sets.length - 1]; e.sets.push({ w: l?.w ?? null, r: l?.r ?? null, done: false }); save(); render(true); },
  'live-delset': el => { const e = state.active.entries[+el.dataset.e]; if (e.sets.length > 1) { e.sets.pop(); save(); render(true); } },
  // Se anima en el lugar (sin volver a dibujar la pantalla): la altura y el desenfoque transicionan.
  'live-toggle': el => { const m = liveMin(state.active), i = +el.dataset.e; m[i] = !m[i]; paintMin(); },
  'live-toggleall': () => { const a = state.active, m = liveMin(a), all = a.entries.every((_, i) => m[i]); a.entries.forEach((_, i) => { m[i] = !all; }); paintMin(); },
  'live-exdel': el => { if (confirm('¿Quitar este ejercicio de la sesión?')) { const i = +el.dataset.e, m = liveMin(state.active), n = {}; Object.keys(m).forEach(k => { k = +k; if (k < i) n[k] = m[k]; else if (k > i) n[k - 1] = m[k]; }); ui.min = n; state.active.entries.splice(i, 1); save(); render(true); } },
  'live-addex': () => pickExercise(id => { const l = lastSets(id); state.active.entries.push({ exId: id, sets: Array.from({ length: 3 }, (_, i) => ({ w: l?.[i]?.w ?? l?.[0]?.w ?? null, r: l?.[i]?.r ?? null, done: false })) }); ui.min && (ui.min[state.active.entries.length - 1] = false); save(); render(true); }),
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
  rtab: el => { ui.runTab = el.dataset.t === 'futbol' ? 'futbol' : 'correr'; render(true); },
  'match-new': () => openModal(`<h2 style="margin-top:0">Registrar partido</h2>
    <label>Fecha</label><input id="m_d" type="date" value="${today()}">
    <label>Goles que hiciste</label><input id="m_g" type="number" inputmode="numeric" min="0" max="99" step="1" placeholder="Ej: 2">
    <label>Minutos jugados</label><input id="m_m" type="number" inputmode="numeric" min="1" max="300" step="1" placeholder="Ej: 90">
    <div class="row" style="margin-top:16px"><button class="btn-ghost grow" data-act="modal-close">Cancelar</button><button class="btn-primary grow" data-act="match-save">Guardar</button></div>`),
  'match-save': () => {
    const g = mv('m_g'), m = mv('m_m'), goals = SAN.range(g === '' ? NaN : g, 0, 99), min = SAN.range(m === '' ? NaN : m, 1, 300);
    if (goals == null || min == null || !Number.isInteger(goals) || !Number.isInteger(min)) return toast('Completá goles (0 a 99) y minutos jugados (1 a 300)');
    state.matches.push({ id: uid(), date: SAN.date(mv('m_d')) || today(), goals, min });
    save(); closeModal(); toast('Partido registrado'); render(true);
  },
  'match-del': el => { if (confirm('¿Eliminar este partido?')) { state.matches = state.matches.filter(m => m.id !== el.dataset.id); save(); render(true); } },
  ptab: el => { ui.progTab = el.dataset.t; render(true); },
  btype: el => { ui.bodyType = el.dataset.t; render(true); },
  'body-add': () => {
    const v = num(val('bv')), d = SAN.date(val('bd')); if (v == null || !d) return toast('Completá fecha y valor'); if (v <= 0 || v > 1000) return toast('Revisá el valor: parece incorrecto');
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
    if (type !== 'habit' && !(g.target > 0 && g.target <= 100000)) return toast('Indicá una meta válida');
    state.goals.push(g); save(); closeModal(); toast('Campaña fijada. ¡A conquistar!'); render(true);
  },

  // correr
  'run-new': () => openModal(`<h2 style="margin-top:0">Registrar carrera</h2>
    <label>Fecha</label><input id="r_d" type="date" value="${today()}">
    <label>Kilómetros</label><input id="r_k" type="number" inputmode="decimal" step="0.01" min="0" placeholder="Ej: 5,2">
    <label>Duración (min : seg)</label><div class="grid2"><input id="r_m" type="number" inputmode="numeric" min="0" placeholder="min"><input id="r_s" type="number" inputmode="numeric" min="0" max="59" placeholder="seg"></div>
    <label>Ritmo promedio por km (min : seg)</label><div class="grid2"><input id="r_pm" type="number" inputmode="numeric" min="0" placeholder="min"><input id="r_ps" type="number" inputmode="numeric" min="0" max="59" placeholder="seg"></div>
    <div class="row" style="margin-top:16px"><button class="btn-ghost grow" data-act="modal-close">Cancelar</button><button class="btn-primary grow" data-act="run-save">Guardar</button></div>`),
  'run-save': () => {
    const km = num(mv('r_k')), min = (num(mv('r_m')) || 0) + (num(mv('r_s')) || 0) / 60, pace = (num(mv('r_pm')) || 0) + (num(mv('r_ps')) || 0) / 60;
    if (!(km > 0) || !(min > 0) || !(pace > 0)) return toast('Completá los 3 datos: kilómetros, duración y ritmo');
    if (km >= 400 || min >= 2000 || pace >= 60 || (num(mv('r_s')) || 0) > 59 || (num(mv('r_ps')) || 0) > 59) return toast('Revisá los valores: parecen incorrectos');
    state.runs.push({ id: uid(), date: SAN.date(mv('r_d')) || today(), km, min: Math.round(min * 100) / 100, pace: Math.round(pace * 1000) / 1000, source: 'manual' });
    save(); closeModal(); toast('Carrera registrada'); render(true);
  },
  'run-del': el => { if (confirm('¿Eliminar esta carrera?')) { state.runs = state.runs.filter(r => r.id !== el.dataset.id); save(); render(true); } },
  'sync-now': async () => { setSyncBadge('pend'); await pushRemote(); toast(ui.sync === 'ok' ? 'Sincronizado' : 'No se pudo sincronizar'); },
  logout: async () => { await sb.auth.signOut(); user = null; localStorage.removeItem(LS_LOCAL); state = emptyState(); save(false); location.hash = '#/foro'; render(); },
  'goto-auth': () => { location.hash = '#/auth'; render(); },
  'local-mode': () => { localStorage.setItem(LS_LOCAL, '1'); location.hash = '#/foro'; render(); },
  export: () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    a.download = `imperium-respaldo-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    state.settings.lastBackup = Date.now(); save(); toast('Respaldo descargado'); render(true);
  },
  import: () => $('#impfile').click(),
  wipe: async () => {
    if (!confirm('¿Borrar TODOS tus datos? No se puede deshacer.')) return;
    if (prompt('Escribí BORRAR para confirmar') !== 'BORRAR') return;
    const owner = state.owner; state = emptyState(); state.owner = owner; save();
    toast('Datos borrados'); render();
  },
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
const AUTH_LOCK = 'imperium.authlock';
let authFails = 0;
function authLockLeft() { try { return Math.max(0, Math.ceil(((+localStorage.getItem(AUTH_LOCK) || 0) - Date.now()) / 1000)); } catch { return 0; } }
function authFail() { authFails++; if (authFails >= 5) { try { localStorage.setItem(AUTH_LOCK, String(Date.now() + 60000 * Math.min(10, 2 ** (authFails - 5)))); } catch { /* nada */ } } }
async function authSubmit(isSignup) {
  const e = (val('a_e') || '').trim(), p = val('a_p') || '', err = $('#a_err'); err.style.color = '';
  const left = authLockLeft(); if (left) { err.textContent = `Demasiados intentos. Esperá ${left} segundos.`; return; }
  if (e.length > 254 || !/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e)) { err.textContent = 'Ingresá un email válido.'; return; }
  if (!p || p.length > 128) { err.textContent = 'Ingresá tu contraseña.'; return; }
  if (isSignup && !(p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p))) { err.textContent = 'La contraseña debe tener al menos 8 caracteres, con letras y números.'; return; }
  err.textContent = 'Un momento…';
  try {
    const nm = SAN.str(val('a_n') || '', 24).trim();
    if (isSignup && nm) state.profile = { ...state.profile, name: nm };
    const { data, error } = isSignup ? await sb.auth.signUp({ email: e, password: p, options: { data: { name: nm } } }) : await sb.auth.signInWithPassword({ email: e, password: p });
    if (error) throw error;
    authFails = 0; try { localStorage.removeItem(AUTH_LOCK); } catch { /* nada */ }
    if (!data.session) { err.style.color = 'var(--accent)'; err.textContent = 'Cuenta creada. Revisá tu email para confirmarla y luego iniciá sesión.'; return; }
    user = data.session.user; localStorage.removeItem(LS_LOCAL);
    await initialSync(); location.hash = '#/foro'; render();
  } catch (ex) {
    authFail(); dbg('auth', ex);
    const m = String(ex?.message || ex);
    err.textContent = (ex?.status === 429 || /rate limit|too many/i.test(m)) ? 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.'
      : /signups? (not allowed|disabled)|not allowed/i.test(m) ? 'El registro está cerrado. Pedile al administrador que cree tu cuenta.'
      : isSignup ? 'No se pudo crear la cuenta. Si ya tenés una, iniciá sesión.'
      : /invalid login|credentials/i.test(m) ? 'Email o contraseña incorrectos.' : 'No se pudo completar. Revisá tus datos e intentá de nuevo.';
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
    const s = state.active.entries[+el.dataset.e].sets[+el.dataset.s], f = el.dataset.f; if (f === 'w' || f === 'r') { s[f] = SAN.num(el.value, 0, 1000); save(); }
  } else if (k === 'rt') {
    const it = ensureDay(ui.routineDay).items.find(i => i.id === el.dataset.id), t = it?.sets?.[+el.dataset.s], f = el.dataset.f;
    if (t && (f === 'r' || f === 'w')) { t[f] = f === 'r' ? SAN.num(el.value, 1, 1000) : SAN.num(el.value, 0, 1000); save(); }
  } else if (k === 'rname') { ensureDay(ui.routineDay).name = el.value.slice(0, 40); save(); }
  else if (k === 'pname') { state.profile = { ...state.profile, name: el.value.slice(0, 24) }; save(); }
  else if (k === 'rest') { const v = num(el.value); if (v >= 10 && v <= 600) { state.settings.rest = Math.round(v); save(); } }
  else if (k === 'pickq') { ui.pick.q = el.value; renderPickList(); }
});
document.addEventListener('change', ev => {
  const el = ev.target, k = el.dataset?.in; if (!k && el.id !== 'impfile') return; // (el selector de archivo no usa data-in)
  if (k === 'pshare') { state.profile = { ...state.profile, share: el.checked }; save(); toast(el.checked ? 'Tu progreso es visible en la Arena' : 'Tu progreso ya no es visible'); }
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
    if (f.size > 5e6) { el.value = ''; return toast('El archivo es demasiado grande para ser un respaldo'); }
    f.text().then(t => {
      const d = JSON.parse(t); if (!d || typeof d !== 'object' || !Array.isArray(d.sessions)) throw new Error('formato');
      const clean = sanitizeState(d);
      if (!confirm(`El respaldo tiene ${clean.sessions.length} entrenamientos, ${clean.runs.length} carreras, ${clean.matches.length} partidos y ${clean.goals.length} campañas. Esto reemplaza tus datos actuales. ¿Continuar?`)) return;
      const owner = state.owner; state = clean; state.owner = owner; save(); toast('Respaldo restaurado'); render();
    }).catch(() => toast('Archivo de respaldo inválido')).finally(() => { el.value = ''; });
  }
});
window.addEventListener('hashchange', () => render());
$('#rankChip').addEventListener('click', () => { location.hash = '#/foro'; });
$('#gear').addEventListener('click', () => { location.hash = '#/ajustes'; });
window.addEventListener('online', () => { if (sb && user) pushRemote(); });

window.addEventListener('error', ev => { dbg('error', ev.message); });
window.addEventListener('unhandledrejection', ev => { dbg('rechazo', ev.reason); ev.preventDefault(); });

/* ---------- Arranque ---------- */
async function boot() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').catch(() => { });
    // Cuando hay una versión nueva, la app se recarga sola (salvo que estés cargando algo).
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || ui.reloading) return;
      if (!$('#modal').classList.contains('hidden') || state.active) return toast('Hay una versión nueva: cerrá y abrí la app para actualizar', 6000);
      ui.reloading = true; location.reload();
    });
  }
  loadState();
  Motion.buildNav(TABS);
  if (window.Chart) { Chart.defaults.color = '#A1A1A1'; Chart.defaults.font.family = 'system-ui, sans-serif'; }
  if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    try { const { data } = await sb.auth.getSession(); user = data.session?.user || null; } catch { user = null; }
    sb.auth.onAuthStateChange((_e, s) => { user = s?.user || null; });
  }
  render();
  if (user) { await initialSync(); render(true); }
  else if (sb) { history.replaceState({}, '', location.pathname + location.hash); }
  if (state.active) { /* sesión en curso restaurada */ }
}
boot();
})();
