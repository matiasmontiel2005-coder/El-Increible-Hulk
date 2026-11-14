# ⚔ Imperium Gladiador

App web instalable (PWA) de entrenamiento con estética de imperio romano: rutinas semanales, registro de series en vivo, gráficos de progreso, running vía Strava y objetivos con meta y fecha límite. Solo modo oscuro, en español, kg y km.

## Qué incluye
- **Rutina**: días de la semana, catálogo de ejercicios por grupo muscular (+ ejercicios propios), series, reps y peso objetivo.
- **Entrenar**: registro en vivo serie a serie, referencia de la última vez, temporizador de descanso, detección de récords (PR).
- **Progreso**: peso máximo y 1RM estimado por ejercicio, volumen, medidas corporales, constancia semanal.
- **Correr**: carreras manuales o importadas desde Strava; km por semana y ritmo.
- **Metas**: fuerza, cuerpo, running y constancia, con barra de progreso y estado (en ritmo / atrasada / cumplida).
- **Rangos**: Recluta → Legionario → Optio → Centurión → Tribuno → Legado → Emperador, según tu gloria acumulada.
- **Nube** (opcional): cuenta y sincronización con Supabase. Sin configurarla, la app funciona 100 % local.

## Probar en local
```bash
python3 -m http.server 8000   # y abrí http://localhost:8000
```

## Publicar como app instalable (GitHub Pages)
1. Mergeá esta rama a `main`.
2. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
3. Abrí `https://<tu-usuario>.github.io/El-Increible-Hulk/` en el celular y elegí **Instalar app / Agregar a pantalla de inicio**.

## Activar cuenta y sincronización (Supabase)
1. Creá un proyecto gratis en https://supabase.com.
2. **SQL Editor** → pegá y ejecutá `supabase/schema.sql`.
3. **Authentication → Sign In / Providers → Email**. Si no querés confirmar por email, desactivá "Confirm email".
4. **Authentication → URL Configuration**: poné la URL de tu GitHub Pages como *Site URL*.
5. **Project Settings → API**: copiá la *Project URL* y la clave **anon** en `config.js`. **Nunca uses la `service_role` en `config.js`.**

## Carreras automáticas: Adidas Running → Strava → Imperium
Adidas Running no tiene API pública, así que el puente es Strava.
1. En Adidas Running: **Ajustes → Apps conectadas → Strava** (una sola vez).
2. Creá una app en https://www.strava.com/settings/api. En *Authorization Callback Domain* poné tu dominio (`<tu-usuario>.github.io`; para pruebas locales, `localhost`).
3. Poné el **Client ID** (número) en `config.js` → `STRAVA_CLIENT_ID`.
4. Instalá la CLI de Supabase y desplegá la función con el secreto (que nunca va al navegador):
   ```bash
   supabase login
   supabase link --project-ref <tu-project-ref>
   supabase secrets set STRAVA_CLIENT_ID=<id> STRAVA_CLIENT_SECRET=<secreto>
   supabase functions deploy strava
   ```
5. En la app: **Correr → Conectar con Strava**. Las carreras nuevas se importan solas cada vez que abrís la app.

## Datos y privacidad
- Todo se guarda primero en tu dispositivo; con cuenta, también en tu fila de Supabase (protegida por Row Level Security: solo vos la leés).
- Los tokens de Strava quedan en una tabla sin acceso desde el cliente.
- Podés exportar/importar un respaldo JSON desde **Ajustes**.
- Sincronización: gana la versión más reciente (si editás en dos dispositivos sin conexión, se conserva la última que se guardó).

## Estructura
`index.html` · `app.js` · `styles.css` · `config.js` · `sw.js` (offline) · `manifest.webmanifest` · `vendor/` (Chart.js y supabase-js locales) · `supabase/` (SQL y Edge Function)
