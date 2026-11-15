// Edge Function "ingest-run": recibe carreras desde un "puente" del celular
// (Atajos de iPhone, una app de Health Connect en Android, etc.) y las deja en una bandeja
// que la app vacía al abrirse. Se identifica a la persona con un token personal (no con login).
// Sin dependencias externas: usa solo fetch contra la API REST de Supabase.
// Despliegue: nombre "ingest-run" y "Verify JWT" DESACTIVADO (la autenticación es el token).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-imperium-token, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const num = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function parseRoute(r: any): number[][] | null {
  if (typeof r === "string") { try { r = JSON.parse(r); } catch { return null; } }
  if (!Array.isArray(r)) return null;
  const out: number[][] = [];
  for (const p of r.slice(0, 5000)) {
    let la: any, lo: any;
    if (Array.isArray(p)) { la = p[0]; lo = p[1]; }
    else if (p && typeof p === "object") { la = p.lat ?? p.latitude; lo = p.lon ?? p.lng ?? p.longitude; }
    la = num(la); lo = num(lo);
    if (la == null || lo == null || Math.abs(la) > 90 || Math.abs(lo) > 180) continue;
    out.push([la, lo]);
  }
  return out.length >= 2 ? out : null;
}

export function normalize(o: any): { ok: true; ext_id: string; data: any } | { ok: false; reason: string } {
  if (!o || typeof o !== "object") return { ok: false, reason: "elemento inválido" };
  const startRaw = o.start ?? o.startTime ?? o.start_time ?? o.startDate ?? o.date;
  const endRaw = o.end ?? o.endTime ?? o.end_time ?? o.endDate;
  if (!startRaw) return { ok: false, reason: "falta la fecha de inicio (start)" };
  const s = String(startRaw);
  // La fecha local es lo que viene escrito antes de la "T" (así no se corre por zona horaria).
  const date = /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : (() => { const d = new Date(s); return isNaN(+d) ? "" : d.toISOString().slice(0, 10); })();
  if (!date) return { ok: false, reason: "fecha ilegible: " + s.slice(0, 30) };

  let km = num(o.km ?? o.distance_km ?? o.distanceKm);
  if (km == null) {
    const m = num(o.distance_m ?? o.distanceMeters ?? o.meters);
    if (m != null) km = m / 1000;
    else { const d = num(o.distance); if (d != null) km = d >= 1000 ? d / 1000 : d; }
  }
  if (km == null || km < 0.05 || km > 300) return { ok: false, reason: "distancia inválida" };

  let min = num(o.min ?? o.minutes);
  if (min == null) { const sec = num(o.seconds ?? o.duration_s ?? o.durationSeconds); if (sec != null) min = sec / 60; }
  if (min == null && endRaw) {
    const a = +new Date(s), b = +new Date(String(endRaw));
    if (!isNaN(a) && !isNaN(b) && b > a) min = (b - a) / 60000;
  }
  if (min == null || min < 1 || min > 1440) return { ok: false, reason: "duración inválida (mandá end, min o seconds)" };

  const data: any = { date, km: Math.round(km * 100) / 100, min: Math.round(min * 10) / 10 };
  const route = parseRoute(o.route);
  if (route) data.route = route;
  if (o.note) data.note = String(o.note).slice(0, 60);
  return { ok: true, ext_id: String(o.id ?? o.ext_id ?? s).slice(0, 80), data };
}

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Usá POST" }, 405);
  if (Number(req.headers.get("content-length") || 0) > 2_000_000) return json({ error: "Demasiado grande" }, 413);

  let body: any = {};
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) body = await req.json();
    else body = Object.fromEntries((await req.formData()).entries());
  } catch { return json({ error: "Cuerpo inválido" }, 400); }

  const token = req.headers.get("x-imperium-token") || (body && !Array.isArray(body) ? body.token : "");
  if (body && !Array.isArray(body)) delete body.token;
  if (!/^imp_[0-9a-f]{48}$/.test(String(token || ""))) return json({ error: "Token inválido" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const hash = await sha256(String(token));
  const who = await fetch(`${url}/rest/v1/ingest_tokens?token_hash=eq.${hash}&select=user_id`, { headers: h });
  if (!who.ok) return json({ error: "No se pudo verificar el token" }, 502);
  const found = await who.json();
  if (!found.length) return json({ error: "Token inválido" }, 401);
  const user_id = found[0].user_id;

  const list: any[] = Array.isArray(body) ? body : Array.isArray(body?.runs) ? body.runs : [body];
  const rows: any[] = [], errors: string[] = [];
  for (const item of list.slice(0, 50)) {
    const n = normalize(item);
    if (n.ok) rows.push({ user_id, ext_id: n.ext_id, data: n.data }); else errors.push(n.reason);
  }
  if (rows.length) {
    const ins = await fetch(`${url}/rest/v1/incoming_runs?on_conflict=user_id,ext_id`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
    if (!ins.ok) { console.error("insert", ins.status, await ins.text()); return json({ error: "No se pudo guardar" }, 502); }
  }
  return json({ ok: true, received: list.length, accepted: rows.length, errors });
}

Deno.serve(handler);
