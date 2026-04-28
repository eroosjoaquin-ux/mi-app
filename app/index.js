import { Redirect } from 'expo-router';

/**
 * INDEX - PUNTO DE ENTRADA
 * Este archivo ya no toma decisiones de seguridad.
 * Simplemente redirige al LoginScreen por defecto.
 * El archivo _layout.js se encarga de interceptar esta redirección
 * y mandar al usuario al /HomeScreen si detecta una sesión activa.
 */
export default function Index() {
  return <Redirect href="/LoginScreen" />;
}