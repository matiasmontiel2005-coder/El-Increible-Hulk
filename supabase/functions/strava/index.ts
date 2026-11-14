// Edge Function "strava": intercambia el código OAuth, guarda tokens y devuelve actividades.
// El Client Secret de Strava vive SOLO acá (secrets de Supabase), nunca en el navegador.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u.user) return json({ error: "No autenticado" }, 401);
    const uid = u.user.id;

    const body = await req.json();
    const cid = Deno.env.get("STRAVA_CLIENT_ID")!, secret = Deno.env.get("STRAVA_CLIENT_SECRET")!;

    const save = async (t: any) => {
      const { error } = await admin.from("strava_tokens").upsert({
        user_id: uid, athlete_id: t.athlete?.id ?? null, access_token: t.access_token,
        refresh_token: t.refresh_token, expires_at: t.expires_at, updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    };

    if (body.action === "exchange") {
      const r = await fetch("https://www.strava.com/oauth/token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: cid, client_secret: secret, code: String(body.code), grant_type: "authorization_code" }),
      });
      if (!r.ok) return json({ error: "Strava rechazó el código" }, 400);
      await save(await r.json());
      return json({ ok: true });
    }

    if (body.action === "disconnect") {
      await admin.from("strava_tokens").delete().eq("user_id", uid);
      return json({ ok: true });
    }

    if (body.action === "sync") {
      const { data: row } = await admin.from("strava_tokens").select("*").eq("user_id", uid).maybeSingle();
      if (!row) return json({ disconnected: true, activities: [] });
      let access = row.access_token;
      if (row.expires_at < Math.floor(Date.now() / 1000) + 60) {
        const r = await fetch("https://www.strava.com/oauth/token", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: cid, client_secret: secret, grant_type: "refresh_token", refresh_token: row.refresh_token }),
        });
        if (!r.ok) { await admin.from("strava_tokens").delete().eq("user_id", uid); return json({ disconnected: true, activities: [] }); }
        const t = await r.json(); await save({ ...t, athlete: { id: row.athlete_id } }); access = t.access_token;
      }
      const after = Math.max(0, Number(body.after) || 0);
      const out: any[] = [];
      for (let page = 1; page <= 5; page++) { // hasta 1000 actividades por sincronización
        const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}&after=${after}`,
          { headers: { Authorization: `Bearer ${access}` } });
        if (!r.ok) return json({ error: "Strava API " + r.status }, 502);
        const list = await r.json();
        for (const a of list) {
          out.push({ id: a.id, name: a.name, type: a.type, sport_type: a.sport_type, start_date_local: a.start_date_local,
            distance: a.distance, moving_time: a.moving_time, total_elevation_gain: a.total_elevation_gain });
        }
        if (list.length < 200) break;
      }
      return json({ activities: out });
    }
    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Error interno" }, 500);
  }
});
