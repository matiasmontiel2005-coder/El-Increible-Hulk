# Seguridad de Imperium

Este documento resume la cobertura de ciberseguridad de la app contra la lista de 20 puntos, qué se hizo en el código, qué **tenés que configurar vos** en Supabase y GitHub, y qué limitaciones quedan.

Leyenda: ✅ cubierto · ⚙️ cubierto en parte (con la limitación explicada) · 🔧 requiere una acción tuya · ➖ no aplica a esta app.

## Estado de los 20 puntos

| # | Punto | Estado | Qué se hizo |
|---|---|---|---|
| 1 | Ocultar API keys | ✅ | En el repositorio no hay ninguna clave secreta. La clave `sb_publishable_…` de `config.js` es **pública por diseño**: identifica a la app y está limitada por las reglas de la base. La clave *secret* / `service_role` jamás debe subirse. |
| 2 | Limpiar secretos de Git | ✅ 🔧 | Se escaneó el código actual y **todo el historial**: no hay secretos. Única excepción: un archivo de firma de pruebas del APK ya eliminado (ver "Limitaciones"). 🔧 Activá *Secret scanning* y *Push protection* en GitHub (abajo). |
| 3 | Key pública para la DB | ✅ | La app usa solo la clave pública. Además se **revocó todo acceso al rol sin sesión (`anon`)** sobre las tablas. |
| 4 | Row-Level Security | ✅ | RLS activada en todas las tablas; cada persona solo ve y modifica lo suyo. Se verifica con 29 pruebas contra un PostgreSQL real (`supabase/tests/rls.test.mjs`), incluido el ataque de "secuestrar la fila de otro con un upsert". |
| 5 | Encriptar datos sensibles | ✅ | El cifrado en tránsito (HTTPS) y en reposo lo da Supabase. La app **nunca publica** peso corporal, medidas, rutina ni notas: solo un resumen. Las contraseñas nunca pasan por tu código. |
| 6 | Forzar autenticación | ✅ 🔧 | Los datos en la nube exigen sesión. Al crear cuenta, la app pide 8+ caracteres con letras y números. 🔧 Subí también el mínimo en Supabase (abajo), porque el control del cliente solo es una ayuda. |
| 7 | Restringir acceso a registros | ✅ | Políticas solo para usuarios con sesión (`to authenticated`) y acceso `anon` revocado. Los perfiles de la Arena solo se ven si la persona eligió compartir. |
| 8 | Bloquear manipulación de campos | ⚙️ | El `user_id` queda atado a la sesión (no se puede escribir a nombre de otro), la hora de modificación la pone el servidor, los JSON tienen límites de tamaño y forma, y el cliente filtra y acota **todo** dato entrante (respaldo, nube, otra cuenta). Limitación: las estadísticas de la Arena son autodeclaradas (ver abajo). |
| 9 | Proteger session cookies | ➖ ⚙️ | La app no usa cookies: `supabase-js` guarda la sesión en `localStorage`. Por eso el riesgo es el XSS, que se mitiga con una política de contenido estricta, escapado de todo texto y filtro de datos. |
| 10 | Hashear contraseñas | ✅ | Lo hace Supabase Auth (bcrypt). La app nunca guarda ni registra la contraseña. |
| 11 | Rate limiting | ✅ 🔧 | Servidor: límites de Supabase Auth. Cliente: bloqueo de 1 minuto (creciente, hasta 10) tras 5 intentos fallidos, que sobrevive a recargar. 🔧 Revisá los límites en el panel. |
| 12 | Protección contra bots | ⚙️ | Cerrar el registro cuando ya estén las dos cuentas es la defensa más fuerte, junto con los límites de arriba. No se agregó CAPTCHA: exige una cuenta externa (Cloudflare Turnstile o hCaptcha) y con el registro cerrado no aporta. |
| 13 | Validar inputs | ✅ | Cliente: rangos, longitudes, formatos y fechas. Servidor: restricciones `CHECK` (forma y tamaño de los JSON, nombre sin `<` `>` ni caracteres de control). |
| 14 | Cerrar CORS | ➖ | No hay servidor propio que configurar: GitHub Pages y la API de Supabase no permiten restringir orígenes. La defensa son los tokens de sesión y RLS. Lo que sí se limitó es **a dónde puede conectarse la app** (`connect-src`: solo el mismo sitio y `*.supabase.co`), que impide que un script malicioso envíe datos a un servidor ajeno. |
| 15 | Headers de seguridad | ⚙️ | GitHub Pages no permite headers personalizados. Se aplicó por `<meta>`: Content-Security-Policy estricta (sin scripts en línea ni `eval`, sin terceros) y `referrer: no-referrer`; anti-clickjacking en JavaScript (`guard.js`); la tipografía ahora es propia (ya no se carga de Google). HTTPS/HSTS lo impone GitHub. |
| 16 | Backups automáticos | ⚙️ 🔧 | Los datos viven en tu dispositivo **y** en la nube. El plan gratuito de Supabase no incluye backups automáticos, así que la app **recuerda cada 30 días** descargar un respaldo (Ajustes → Respaldo). Con un plan Pro hay backups diarios. |
| 17 | Tope de gasto en APIs de IA | ➖ | La app no usa ninguna API de IA. |
| 18 | Auditar dependencias | ✅ | `npm audit` encontró 2 vulnerabilidades de severidad baja en `supabase-js` 2.45.0; se actualizó a la última versión (0 vulnerabilidades) y Chart.js a 4.6.1. La app ya no depende de ningún servidor externo para funcionar. |
| 19 | Errores sin datos internos | ✅ | Los mensajes de error son genéricos ("No se pudo completar…"); los detalles técnicos solo se ven si activás el modo depuración a propósito. Crear cuenta con un email existente no revela que ya existe. |
| 20 | Sacar admin y debug | ✅ | No existe panel de administración ni rutas ocultas. La consola está silenciosa por defecto. |

## Lo que tenés que hacer vos

Todo esto se hace desde el navegador. Los nombres exactos de los menús pueden variar un poco según la versión del panel.

### En Supabase
1. **Volvé a ejecutar `supabase/schema.sql`** en *SQL Editor → New query → Run*. Es seguro repetirlo. Agrega los permisos más estrictos y los límites de datos.
2. **Authentication → Sign In / Providers → Email**:
   - **Minimum password length**: poné al menos 8 (mejor 10).
   - Si el panel ofrece **Password requirements**, elegí letras y números.
   - Dejá activado **Confirm email**: evita cuentas con emails mal escritos.
3. **Cuando vos y tu rival ya tengan cuenta**, desactivá **Allow new users to sign up**. Es la defensa más efectiva contra bots y curiosos.
4. **Authentication → URL Configuration**: *Site URL* debe ser exactamente la dirección de tu app, y en *Redirect URLs* solo esa misma dirección, **sin comodines (`*`)**.
5. **Authentication → Rate Limits**: dejá los valores por defecto o hacelos más estrictos, nunca más flojos.
6. **Database → Advisors → Security Advisor**: ejecutalo. No debería marcar tablas sin RLS.
7. **Activá la verificación en dos pasos (2FA) en tu cuenta de Supabase** y en tu cuenta de GitHub: quien controle esas cuentas controla todo.
8. Si algún día cambiás la dirección del proyecto de Supabase (por ejemplo, un dominio propio), actualizá `connect-src` en la política de seguridad de `index.html`, o la app no podrá conectarse.

### En GitHub (repositorio → Settings → Code security)
- Activá **Secret scanning** y **Push protection** (gratis en repositorios públicos): bloquea subir una clave por error.
- Activá **Dependabot alerts**.

## Limitaciones conocidas (para que no haya sorpresas)
- **Las estadísticas de la Arena se pueden falsear.** Cada persona publica su propio resumen (gloria, km, récords…), y alguien con conocimientos técnicos podría enviar números inventados directamente a la API. Entre dos amigos es un riesgo aceptable; se arreglaría calculando todo en el servidor, lo que obligaría a rediseñar cómo se guardan los datos.
- **La sesión vive en `localStorage`.** Es lo normal en una app web sin servidor propio, y por eso se reforzó tanto contra XSS.
- **La política de contenido permite estilos en línea** (atributos `style`), porque la interfaz los usa. Los **scripts** sí están totalmente restringidos (sin código en línea, sin `eval`, sin terceros), que es lo que importa contra XSS.
- **Los datos en tu dispositivo no están cifrados** (como en cualquier web app). Quien use tu celular desbloqueado puede verlos.
- **El historial de Git conserva un archivo viejo de firma de pruebas** (`android-signing/debug.keystore`), de cuando se probó una app de Android que luego se descartó. Es una clave de depuración con la contraseña estándar y sin ningún valor, pero sigue en el historial. Quitarla exigiría reescribir el historial con un *force push*, que es destructivo y no se hizo.
- **Si quedó publicado** el release "App Android (última versión)" en la sección *Releases* de GitHub, borralo: ya no se usa.
- **No hay CAPTCHA** (ver punto 12).

## Cómo se verificó
- **Base de datos**: `supabase/tests/rls.test.mjs` (29 pruebas en un PostgreSQL real): acceso sin sesión, lectura y escritura cruzadas entre usuarios, secuestro de filas por `upsert`, límites de tamaño, nombres con HTML, hora falsa y funciones internas.
- **Cliente** (probado en un navegador real con datos maliciosos): un respaldo con `<img onerror>`, identificadores con comillas y `__proto__` no ejecuta ni inserta nada; un rival con nombre, rango, ejercicios y carreras maliciosos tampoco; la política de contenido bloquea scripts inyectados y conexiones a servidores no permitidos; la app abre sin conexión; las contraseñas débiles, los errores internos y el bloqueo tras 5 intentos se comportan como se describe.
- **Librerías**: `npm audit` sin vulnerabilidades.

Para repetir la prueba de la base de datos:

```bash
npm i --no-save @electric-sql/pglite
node supabase/tests/rls.test.mjs
```
