// Prueba de seguridad de la base de datos: ejecuta schema.sql en un PostgreSQL real (PGlite, en Node),
// simula los roles de Supabase y ataca las tablas como lo haría otra persona.
//
//   npm i --no-save @electric-sql/pglite
//   node supabase/tests/rls.test.mjs
import { PGlite } from '@electric-sql/pglite'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const db = new PGlite(); const schema = fs.readFileSync(fileURLToPath(new URL('../schema.sql', import.meta.url)),'utf8');
const A='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', B='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create schema auth; create table auth.users (id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
 grant usage on schema public, auth to anon, authenticated, service_role;
 alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
 grant execute on function auth.uid() to anon, authenticated;
 insert into auth.users values ('${A}'), ('${B}');`);
let ok=0, fail=0;
const as = async (role, uid) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid||''}', false); set role ${role};`); };
const expect = async (name, fn, shouldFail, match) => {
  let err=null, res=null; try { res = await fn(); } catch(e){ err=e.message; }
  const pass = shouldFail ? (err && (!match || new RegExp(match,'i').test(err))) : !err;
  console.log((pass?'✔':'✘'), name, pass?'':` → ${shouldFail?'NO falló':'falló: '+err}`, shouldFail&&err?`(${err.slice(0,70)})`:''); pass?ok++:fail++; return res; };

// 1) el esquema corre dos veces sin errores
await db.exec(schema); await expect('esquema se puede ejecutar de nuevo (idempotente)', ()=>db.exec(schema), false);
await db.exec('reset role');
// 2) sin sesión (anon)
await as('anon'); await expect('anon NO puede leer user_data', ()=>db.query('select * from public.user_data'), true, 'permission denied');
await expect('anon NO puede leer profiles', ()=>db.query('select * from public.profiles'), true, 'permission denied');
await expect('anon NO puede insertar en profiles', ()=>db.query(`insert into public.profiles(user_id,name) values ('${A}','x')`), true, 'permission denied');
// 3) usuario A
await as('authenticated', A);
await expect('A inserta su documento', ()=>db.query(`insert into public.user_data(user_id,data) values ('${A}','{"sessions":[]}')`), false);
await expect('A NO puede insertar un documento a nombre de B', ()=>db.query(`insert into public.user_data(user_id,data) values ('${B}','{}')`), true, 'row-level security');
await expect('A NO puede pasarse su fila a B (cambiar user_id)', ()=>db.query(`update public.user_data set user_id='${B}' where user_id='${A}'`), true, 'row-level security');
await expect('documento que no es objeto (lista) rechazado', ()=>db.query(`update public.user_data set data='[1,2]' where user_id='${A}'`), true, 'user_data_forma');
await expect('documento gigante (>3 MB) rechazado', ()=>db.query(`update public.user_data set data=jsonb_build_object('x', repeat('a', 3100000)) where user_id='${A}'`), true, 'user_data_forma');
await expect('A inserta su perfil compartido', ()=>db.query(`insert into public.profiles(user_id,name,share,stats) values ('${A}','Maximus',true,'{"xp":10}')`), false);
for (const [n,v] of [['nombre con <script>', "<script>alert(1)</script>"], ['nombre vacío',''], ['nombre de 25 letras','x'.repeat(25)], ['nombre con salto de línea', 'a\nb']])
  await expect(`perfil con ${n} rechazado`, ()=>db.query(`update public.profiles set name=$1 where user_id='${A}'`,[v]), true, 'check|profiles_');
await expect('resumen gigante (>60 KB) rechazado', ()=>db.query(`update public.profiles set stats=jsonb_build_object('x', repeat('a', 61000)) where user_id='${A}'`), true, 'profiles_forma');
await expect('resumen que no es objeto rechazado', ()=>db.query(`update public.profiles set stats='"hola"' where user_id='${A}'`), true, 'profiles_forma');
await expect('A NO puede ejecutar la función interna del trigger', ()=>db.query('select public.set_updated_at()'), true, 'permission denied');
// 4) hora del servidor
await expect('updated_at falsa (año 2000) → la pone el servidor', async()=>{ await db.query(`update public.user_data set updated_at='2000-01-01', data='{}' where user_id='${A}'`); const r=await db.query(`select extract(year from updated_at) y from public.user_data where user_id='${A}'`); if(+r.rows[0].y<2024) throw new Error('quedó '+r.rows[0].y); }, false);
// 5) usuario B: perfil NO compartido
await as('authenticated', B);
await expect('B inserta su perfil NO compartido', ()=>db.query(`insert into public.profiles(user_id,name,share,stats) values ('${B}','Spartacus',false,'{}')`), false);
const rB = await db.query('select name from public.profiles order by name'); console.log((rB.rows.length===2?'✔':'✘'),'B ve a A (compartido) y a sí mismo:',rB.rows.map(r=>r.name).join(', ')); rB.rows.length===2?ok++:fail++;
const dB = await db.query('select user_id from public.user_data'); console.log((dB.rows.length===0?'✔':'✘'),'B NO ve ningún documento privado de A (filas visibles:',dB.rows.length+')'); dB.rows.length===0?ok++:fail++;
const uB = await db.query(`update public.profiles set name='Hackeado' where user_id='${A}'`); console.log((uB.affectedRows===0?'✔':'✘'),'B NO puede editar el perfil de A (filas afectadas:',uB.affectedRows+')'); uB.affectedRows===0?ok++:fail++;
const xB = await db.query(`delete from public.user_data where user_id='${A}'`); console.log((xB.affectedRows===0?'✔':'✘'),'B NO puede borrar los datos de A (filas afectadas:',xB.affectedRows+')'); xB.affectedRows===0?ok++:fail++;
// 6) A no ve el perfil no compartido de B
await as('authenticated', A);
const rA = await db.query('select name from public.profiles order by name'); console.log((rA.rows.length===1&&rA.rows[0].name==='Maximus'?'✔':'✘'),'A NO ve el perfil de B porque B dejó de compartir:',rA.rows.map(r=>r.name).join(', ')); (rA.rows.length===1)?ok++:fail++;

// 7) el "upsert" que usa la app, y el ataque de secuestro por upsert
await as('authenticated', A);
await expect('upsert propio de la app (user_data) funciona', ()=>db.query(`insert into public.user_data(user_id,data,updated_at) values ('${A}','{"v":2}', now()) on conflict (user_id) do update set data=excluded.data, updated_at=excluded.updated_at, user_id=excluded.user_id`), false);
await expect('upsert propio de la app (profiles) funciona', ()=>db.query(`insert into public.profiles(user_id,name,share,stats,updated_at) values ('${A}','Maximus',true,'{"xp":99}', now()) on conflict (user_id) do update set name=excluded.name, share=excluded.share, stats=excluded.stats, updated_at=excluded.updated_at, user_id=excluded.user_id`), false);
await as('authenticated', B);
await expect('B NO puede secuestrar la fila de A con un upsert (user_data)', ()=>db.query(`insert into public.user_data(user_id,data) values ('${A}','{"hackeado":true}') on conflict (user_id) do update set data=excluded.data`), true, 'row-level security');
await expect('B NO puede secuestrar el perfil de A con un upsert', ()=>db.query(`insert into public.profiles(user_id,name) values ('${A}','Hackeado') on conflict (user_id) do update set name=excluded.name`), true, 'row-level security');
await as('authenticated', A);
const fin = await db.query(`select data->>'hackeado' h, data->>'v' v from public.user_data where user_id='${A}'`); console.log((fin.rows[0].h===null&&fin.rows[0].v==='2'?'✔':'✘'),'los datos de A siguen intactos tras los ataques:',JSON.stringify(fin.rows[0])); fin.rows[0].h===null?ok++:fail++;
// 6) grupos (ligas privadas)
const C='cccccccc-cccc-cccc-cccc-cccccccccccc';
await db.exec(`reset role; insert into auth.users values ('${C}') on conflict do nothing;
 update public.profiles set share=true, grupo=null where user_id in ('${A}','${B}');
 insert into public.profiles(user_id,name,share,grupo) values ('${C}','Crixus',true,'ABCD1234') on conflict (user_id) do update set grupo='ABCD1234', share=true;`);
const ve = async (uid) => { await as('authenticated', uid); return (await db.query('select name from public.profiles order by name')).rows.map(r=>r.name).join(','); };
const chk = (cond, name, x) => { console.log((cond?'✔':'✘'), name, x); cond?ok++:fail++; };
let v = await ve(A); chk(v==='Maximus,Spartacus', 'sin grupo: A ve a B (también sin grupo) y no a C', v);
v = await ve(C); chk(v==='Crixus', 'C (grupo ABCD1234) no ve a los que no están en su grupo', v);
await as('authenticated', B); await expect('B se une al grupo con el código', ()=>db.query(`update public.profiles set grupo='ABCD1234' where user_id='${B}'`), false);
v = await ve(B); chk(v==='Crixus,Spartacus', 'B ahora ve a C (mismo grupo)', v);
v = await ve(A); chk(v==='Maximus', 'A ya no ve a B (B está en otro grupo)', v);
await as('authenticated', A);
await expect('código con formato inválido rechazado', ()=>db.query(`update public.profiles set grupo='abc' where user_id='${A}'`), true, 'profiles_grupo');
const gB = await db.query(`update public.profiles set grupo=null where user_id='${B}'`); chk(gB.affectedRows===0, 'A NO puede sacar a B de su grupo', gB.affectedRows);
await as('anon'); await expect('anon NO puede consultar el grupo', ()=>db.query('select public.mi_grupo()'), true, 'permission denied');
console.log(`\n${ok} pruebas correctas, ${fail} con problemas`); process.exit(fail?1:0);
