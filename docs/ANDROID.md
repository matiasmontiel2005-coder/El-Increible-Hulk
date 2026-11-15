# App de Android (APK)

La app de Android es la **misma app**, empaquetada para que pueda registrar tu carrera con el **GPS en segundo plano**: podés bloquear la pantalla o usar otras apps y el recorrido sigue guardándose (mientras tanto Android muestra una notificación "Registrando tu carrera").

> En **iPhone** se usa la versión web instalada desde Safari. Registra lo mismo (distancia, tiempo, ritmo, trazado y mapa), pero **solo con la app abierta y la pantalla encendida**: iOS detiene el GPS de las páginas web al bloquear la pantalla o cambiar de app.

## Descargar e instalar

1. Desde el celular Android abrí este enlace (baja el archivo directamente):
   `https://github.com/matiasmontiel2005-coder/El-Increible-Hulk/releases/download/android-latest/imperium.apk`
   Si no existe todavía, la compilación no terminó: mirá la pestaña **Actions** del repositorio (tarda unos 10 minutos).
2. Abrí el archivo descargado. Android pedirá permiso para **instalar apps desconocidas** para tu navegador (o el gestor de archivos): activalo.
3. Si aparece la advertencia de Play Protect ("app no verificada"), tocá **Instalar de todos modos**. Es normal: la app no está en Google Play.
4. Abrila e iniciá sesión con tu cuenta (la misma que usás en la web: tus datos viven en la nube).

## Registrar una carrera

**Correr → Rastrear con GPS → Iniciar recorrido.** Corré. Cuando termines, volvé a la app y tocá **Terminar**. Se guardan distancia, tiempo, ritmo y el trazado, y el mapa queda disponible en tu lista de carreras y en la Arena.

La primera vez, Android pide permisos:
- **Ubicación:** elegí *Permitir siempre* o *Permitir solo mientras se usa la app*.
- **Notificaciones:** permitilas (es el aviso de que se está registrando).

## Que no se corte a mitad de carrera (importante)

Muchos fabricantes (Xiaomi, Samsung, Huawei, Oppo…) frenan las apps en segundo plano para ahorrar batería. Para evitarlo:

**Ajustes → Apps → Imperium → Batería → Sin restricciones** (el nombre exacto cambia según la marca).

Si aun así se corta, la app guarda un borrador cada pocos puntos: al volver a abrirla vas a ver el recorrido pendiente para continuarlo o terminarlo.

## Actualizaciones

Cada vez que cambia el código se compila un APK nuevo en el mismo enlace. Descargalo e instalalo **encima** del anterior: mantiene tu sesión, y tus datos están en la nube.

## Cómo se compila (para quien administra el repositorio)

El archivo `.github/workflows/android-apk.yml` usa GitHub Actions (gratis) para: instalar dependencias → empaquetar la web con [Capacitor](https://capacitorjs.com) → agregar el plugin de GPS en segundo plano ([`@capacitor-community/background-geolocation`](https://github.com/capacitor-community/background-geolocation)) → compilar → publicar `imperium.apk` en **Releases** (etiqueta `android-latest`). Se ejecuta en cada cambio a `main` y también a mano desde **Actions → APK Android → Run workflow**.

El APK se firma con una clave de depuración incluida en `android-signing/`. Sirve para instalar en tus propios celulares; no es apta para publicar en Google Play.
