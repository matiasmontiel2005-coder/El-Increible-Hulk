# Carreras automáticas y recorrido

Adidas Running no tiene API pública, así que no se puede conectar directo. Lo que sí hace es guardar tus carreras en **Salud (iPhone)** o **Health Connect (Android)**. Un "puente" en el celular las manda a tu cuenta de Imperium con un **token personal**, y la app las recoge sola al abrirse.

> **Importante sobre el recorrido (el mapa):** los puentes gratuitos que encontré **no** envían el trazado GPS, solo fecha, distancia y duración. Para que cada carrera quede con su recorrido, usá **Correr → Rastrear con GPS** dentro de la app. Si algún puente llegara a enviar la ruta, la función ya la acepta. En **Android** se recomienda instalar la **app (APK)**, que registra el recorrido con la pantalla apagada: ver [ANDROID.md](ANDROID.md).

## Preparación (una sola vez, quien administra el proyecto)

1. **Actualizar el esquema SQL.** En Supabase: *SQL Editor → New query*, pegá todo `supabase/schema.sql` y tocá **Run**. Se puede ejecutar de nuevo sin problema; crea las tablas nuevas (`ingest_tokens`, `incoming_runs`).
2. **Publicar la función.** *Edge Functions → Deploy a new function → Via Editor*. Nombre exacto: `ingest-run`. Pegá el contenido de `supabase/functions/ingest-run/index.ts` y desplegá. Luego, en la configuración de la función, **desactivá "Verify JWT"** (se autentica con el token personal).

## Cada persona: crear su token

En Imperium: **Ajustes → Carreras automáticas → Generar token**. Copiá el token (no se vuelve a mostrar) y también la **dirección de envío** (botón "Copiar dirección"). Cada cuenta tiene su propio token.

## iPhone (Atajos)

**1. Conectar Adidas Running con Salud.** En Adidas Running: *Perfil → Ajustes → Ajustes de la app → Cuentas de socios → Apple Health* y permití escribir entrenamientos.

**2. Crear el atajo.** App **Atajos** → **+** → nombre: *Enviar carreras a Imperium*. Agregá estas acciones en orden:

1. **Buscar muestras de Salud** → Tipo: **Entrenamientos**; filtro *Fecha de inicio* · *está en los últimos* · **2 días**; ordenar por fecha de inicio. Si podés, agregá el filtro *Tipo de entrenamiento = Correr*.
2. **Repetir con cada elemento** (de la lista anterior). Dentro:
   1. **Dar formato a la fecha** → fecha: *Fecha de inicio* del entrenamiento → formato **ISO 8601**.
   2. **Dar formato a la fecha** → fecha: *Fecha de finalización* → formato **ISO 8601**.
   3. **Obtener contenido de URL**:
      - **URL:** la dirección de envío que copiaste.
      - **Método:** `POST`.
      - **Cuerpo de la solicitud:** **Formulario**, con estos campos de tipo *Texto*:
        - `token` → tu token (`imp_…`)
        - `start` → el primer resultado de formato de fecha
        - `end` → el segundo resultado de formato de fecha
        - `km` → la **Distancia** del entrenamiento (en kilómetros)

**3. Automatizarlo.** *Atajos → Automatización → + → Hora del día* → por ejemplo 22:00, *Diariamente* → **Ejecutar inmediatamente** → elegí el atajo. Cada noche se envían las carreras de los últimos 2 días; las repetidas se descartan solas.

**4. Probar.** Con una carrera ya guardada en Adidas Running, tocá ▶ en el atajo y después abrí Imperium → **Correr → Revisar**.

> No pude probar este atajo en un iPhone. Los nombres de las acciones pueden variar según la versión de iOS. Si una acción o un filtro no aparece, avisá cuál falta y se ajusta. La app Atajos hoy no parece poder leer el recorrido GPS de un entrenamiento.

## Android (Health Connect)

**1. Conectar Adidas Running con Health Connect.** En Adidas Running: *Perfil → Ajustes → Ajustes de la app → Cuentas de socios → Health Connect*, y dale permiso para escribir entrenamientos.

**2. Un puente que envíe Health Connect a una dirección web.** La opción gratuita que encontré es **Life Dashboard Companion** (F-Droid). Configurala con:
- **Dirección (webhook):** la dirección de envío de Imperium.
- **Encabezado personalizado:** `x-imperium-token` = tu token. (Si la app no permite encabezados, probá enviar el token como campo `token`.)

> No verifiqué que esa app envíe los entrenamientos en un formato compatible. La función acepta varios nombres para fecha (`start`, `startTime`, `date`), distancia (`km`, `distanceMeters`, `distance`) y duración (`min`, `seconds`, o `start` + `end`). Si no funciona, copiá un ejemplo del contenido que envía y se adapta.

**Alternativa sin puente:** usá **Correr → Rastrear con GPS** en la app, o cargá la carrera a mano.

## Rastrear con GPS dentro de la app (iPhone y Android)

**Correr → Rastrear con GPS → Iniciar recorrido.** La app guarda distancia, tiempo, ritmo y el trazado. En iPhone mantené la app abierta y la pantalla encendida: si bloqueás la pantalla o cambiás de app, el GPS se detiene. En la app de Android no hace falta. Si se cierra sin querer, queda un borrador que podés continuar o descartar.

## Privacidad
- Tus **últimos 8 recorridos** se muestran en la Arena a tu rival, completos y con su mapa. Se puede apagar en **Ajustes → Arena**.
- El mapa se dibuja en el propio dispositivo; no se usa ningún servicio de mapas externo.
- El token solo permite **enviar** carreras a tu bandeja; no permite leer tus datos. Si lo perdés o lo compartiste, generá uno nuevo y el anterior deja de funcionar.
