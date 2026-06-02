# Changelog

## Unreleased

### Fixed
- Mejor contraste del encabezado global para garantizar legibilidad sobre fondos claros y oscuros.
  - Archivo: `src/app/app.component.scss`
- Restaurado logo en la pantalla de login mediante fallback SVG inline para evitar dependencias a assets externos.
  - Archivos: `src/app/pages/login/login.page.html`, `src/app/pages/login/login.page.scss`
- Asegurado color/visibilidad de los iconos rápidos (Supervisor/Transportista/Cliente) en el login.
  - Archivo: `src/app/pages/login/login.page.scss`
- Implementado y activado soporte real de modo oscuro (toggle funcional + tokens de tema).
  - Archivo: `src/global.scss`, `src/app/app.component.ts`

### Notes
- Preferencia de tema guardada en `localStorage` bajo la clave `theme_preference` ('dark'|'light').
- El servidor de desarrollo está en watch mode — abre http://localhost:4200/ para revisar visualmente.

---

Si quieres, hago un `git push` después del commit o ajusto los tonos del tema oscuro (más cálido/frío).