# ⚔ Imperium Gladiador

App web instalable (PWA) de entrenamiento con estética de imperio romano: rutinas semanales, registro de series en vivo, gráficos de progreso, carreras con registro manual y objetivos con meta y fecha límite. Solo modo oscuro, en español, kg y km.

## Qué incluye
- **Rutina**: días de la semana, catálogo de ejercicios por grupo muscular (+ ejercicios propios), series, reps y peso objetivo.
- **Entrenar**: registro en vivo serie a serie, referencia de la última vez, temporizador de descanso, detección de récords (PR).
- **Progreso**: peso máximo y 1RM estimado por ejercicio, volumen, medidas corporales, constancia semanal.
- **Correr**: cada carrera se registra a mano con tres datos: **kilómetros, duración y ritmo promedio por km**. Gráficos de km por semana y de ritmo. Es igual en Android y iPhone.
- **Metas**: fuerza, cuerpo, running y constancia, con barra de progreso y estado (en ritmo / atrasada / cumplida).
- **Arena**: cada persona tiene su propia cuenta y sus datos privados; la Arena muestra un duelo cara a cara (gloria, sesiones, km, récords, constancia, campañas), gráficos semanales, las últimas carreras del rival (kilómetros, duración y ritmo), cargas máximas en común y una clasificación.
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
3. **Authentication → Sign In / Providers → Email**. Recomendado: dejá activado "Confirm email" y poné un largo mínimo de contraseña de 8 o más.
4. **Authentication → URL Configuration**: poné la URL de tu GitHub Pages como *Site URL*.
5. **Project Settings → API**: copiá la *Project URL* y la clave **anon** en `config.js`. **Nunca uses la `service_role` en `config.js`.**

## Varios usuarios y la Arena
- Cada usuario crea **su propia cuenta** (email + contraseña) y tiene datos completamente separados (protegidos por Row Level Security).
- Lo único compartido es un **resumen** que cada uno publica en la tabla `profiles`: nombre, rango, gloria, sesiones y km de 30 días, récords, constancia, campañas cumplidas, entrenos/km de las últimas 8 semanas, la carga máxima por ejercicio y tus **últimas 10 carreras** (kilómetros, duración y ritmo). **Nunca** se comparte peso corporal, medidas, rutina ni notas.
- Cada uno puede dejar de compartir desde **Ajustes → Arena** (y deja de ver a los demás).
- Si ya habías ejecutado una versión anterior del esquema, volvé a ejecutarlo: borra las tablas que ya no se usan. Para que solo entren ustedes dos: cuando ambos hayan creado su cuenta, en Supabase desactivá **Authentication → Sign In / Providers → "Allow new users to sign up"**. Así nadie más puede registrarse ni aparecer en la Arena.

## Seguridad
La app cubre los 20 puntos de una lista de ciberseguridad (claves, RLS, validación de datos, política de contenido, dependencias, errores, etc.). El estado de cada punto, **lo que tenés que configurar en Supabase y GitHub** y las limitaciones conocidas están en **[docs/SEGURIDAD.md](docs/SEGURIDAD.md)**. La base de datos se puede verificar con `supabase/tests/rls.test.mjs`.

## Datos y privacidad
- Todo se guarda primero en tu dispositivo; con cuenta, también en tu fila de Supabase (protegida por Row Level Security: solo vos la leés).
- Tus carreras (kilómetros, duración y ritmo) se publican en la Arena para que tu rival las vea. Si dejás de compartir tu progreso en **Ajustes → Arena**, dejan de verse.
- Podés exportar/importar un respaldo JSON desde **Ajustes**.
- Sincronización: gana la versión más reciente (si editás en dos dispositivos sin conexión, se conserva la última que se guardó).

## Estructura
`index.html` · `app.js` · `motion.js` · `guard.js` · `styles.css` · `config.js` · `sw.js` (offline) · `manifest.webmanifest` · `vendor/` (Chart.js, supabase-js y la tipografía Cinzel, todo local) · `icons/` · `supabase/` (esquema SQL y pruebas de la base) · `docs/` (guía de seguridad)
