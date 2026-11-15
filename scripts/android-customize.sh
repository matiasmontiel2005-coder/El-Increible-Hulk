#!/usr/bin/env bash
# Personaliza el proyecto Android generado por Capacitor: ícono, pantalla de arranque y versión.
set -euo pipefail
RES=android/app/src/main/res
VC="${VERSION_CODE:-1}"

# Ícono: PNG en todas las densidades (se quitan los íconos adaptativos de la plantilla).
rm -rf "$RES/mipmap-anydpi-v26"
for pair in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  d="${pair%%:*}"; px="${pair##*:}"
  for n in ic_launcher ic_launcher_round ic_launcher_foreground; do
    convert icons/icon-512.png -resize "${px}x${px}" "$RES/mipmap-$d/$n.png"
  done
done

# Pantalla de arranque: fondo oscuro con el emblema al centro.
find "$RES" -name 'splash.png' | while read -r f; do
  size="$(identify -format '%wx%h' "$f")"
  convert -size "$size" xc:'#0b0a09' \( icons/icon-512.png -resize 220x220 \) -gravity center -composite "$f"
done

# Número de versión creciente: así cada APK nuevo se instala encima del anterior.
sed -i "s/versionCode 1\$/versionCode ${VC}/; s/versionName \"1.0\"/versionName \"1.${VC}\"/" android/app/build.gradle
grep -n "versionCode\|versionName" android/app/build.gradle
