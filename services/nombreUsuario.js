/**
 * nombreUsuario.js
 * Helper centralizado — importalo en cualquier pantalla.
 * 
 * Regla única para toda la app:
 *   1. usuario_empresa  (si existe y no está vacío)
 *   2. nombre           (nombre real)
 *   3. fallback         (lo que se le pase, por defecto "Usuario")
 */
export function getNombreMostrar(perfil, fallback = 'Usuario') {
  if (!perfil) return fallback;
  return perfil.usuario_empresa?.trim() || perfil.nombre?.trim() || fallback;
}
