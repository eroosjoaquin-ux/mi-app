import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import NotificacionesManager from '../services/notificaciones';
import { supabase } from '../services/supabaseConfig';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // BLOQUEO DEL BOTÓN ATRÁS EN PANTALLAS PROTEGIDAS
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const rootSegment = segments[0];
      if (rootSegment === 'HomeScreen' || rootSegment === '(tabs)') {
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [segments]);

  // 1. EL DESPERTADOR (Notificaciones)
  useEffect(() => {
    if (NotificacionesManager?.init) {
      const subscription = NotificacionesManager.init(router);
      return () => subscription?.remove();
    }
  }, []);

  // 2. REGISTRAR PUSH TOKEN (Solo cuando hay sesión activa)
  useEffect(() => {
    if (session?.user && NotificacionesManager?.register) {
      NotificacionesManager.register(session.user.id);
    }
  }, [session]);

  // 3. INICIALIZACIÓN DE SESIÓN
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          setSession(null);
          return;
        }
        setSession(initialSession);
      } catch (error) {
        setSession(null);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  // 4. MONITOR DE AUTENTICACIÓN EN TIEMPO REAL
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
    });
    return () => authListener?.subscription.unsubscribe();
  }, []);

  // 5. LÓGICA DE NAVEGACIÓN Y PROTECCIÓN DE RUTAS
  useEffect(() => {
    if (loading) return;
    
    const rootSegment = segments[0];
    const isLoginPage = rootSegment === 'LoginScreen';
    const isRegistroPage = rootSegment === 'RegistroScreen';
    const isBiometricPage = rootSegment === 'registro_biometrico';
    const isMapaPage = rootSegment === 'components' && segments[1] === 'Mapas';

    // CASO A: No hay sesión -> Mandar a Login
    if (!session) {
      if (!isLoginPage && !isRegistroPage && !isBiometricPage && !isMapaPage) {
        router.replace('/LoginScreen');
      }
    }
    // CASO B: Hay sesión -> Mandar a Home (si intenta volver a login/registro/raíz)
    else {
      if (isLoginPage || isRegistroPage || isBiometricPage || rootSegment === 'index' || !rootSegment) {
        router.replace('/HomeScreen');
      }
    }
  }, [session, segments, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" /> 
      <Stack.Screen name="HomeScreen/index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="LoginScreen" options={{ gestureEnabled: false }} />
      <Stack.Screen name="RegistroScreen" options={{ headerShown: true, title: 'Crear Cuenta' }} />
      <Stack.Screen name="components/Mapas" options={{ title: 'Seleccionar Zona' }} />
      <Stack.Screen name="registro_biometrico" options={{ headerShown: true, title: 'Verificación' }} />
    </Stack>
  );
}