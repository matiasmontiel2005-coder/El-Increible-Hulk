// Copia solo los archivos de la app web a www/ (lo que Capacitor empaqueta dentro del APK).
import { cpSync, rmSync, mkdirSync } from 'node:fs';
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of ['index.html', 'app.js', 'motion.js', 'styles.css', 'config.js', 'manifest.webmanifest']) cpSync(f, `www/${f}`);
for (const d of ['vendor', 'icons']) cpSync(d, `www/${d}`, { recursive: true });
console.log('www/ listo');
