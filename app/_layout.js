import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import NotificacionesManager from '../services/notificaciones';
import { supabase } from '../services/supabaseConfig';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  
  const [session, setSession] = useState(null);
  const [isVerificado, setIsVerificado] = useState(false);
  const [loading, setLoading] = useState(true);

  // NUEVO: BLOQUEO DEL BOTÓN ATRÁS EN PANTALLAS PROTEGIDAS
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const rootSegment = segments[0];
      // Si está en Home o en tabs, bloqueamos el botón atrás
      if (rootSegment === 'HomeScreen' || rootSegment === '(tabs)') {
        return true; // true = bloquea, no hace nada
      }
      return false; // false = comportamiento normal
    });
    return () => backHandler.remove();
  }, [segments]);

  // 1. EL DESPERTADOR
  useEffect(() => {
    if (NotificacionesManager?.init) {
      const subscription = NotificacionesManager.init(router);
      return () => subscription?.remove();
    }
  }, []);

  // 2. REGISTRAR PUSH TOKEN
  useEffect(() => {
    if (session?.user && isVerificado && NotificacionesManager?.register) {
      NotificacionesManager.register(session.user.id);
    }
  }, [session, isVerificado]);

  // 3. INICIALIZACIÓN DE SESIÓN
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          setSession(null);
          setIsVerificado(false);
          return;
        }
        setSession(initialSession);
        if (initialSession?.user) {
          const { data } = await supabase.from('Usuarios').select('verificado_biometria').eq('id', initialSession.user.id).maybeSingle();
          if (data) setIsVerificado(!!data.verificado_biometria);
        }
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
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        const { data } = await supabase.from('Usuarios').select('verificado_biometria').eq('id', currentSession.user.id).maybeSingle();
        setIsVerificado(!!data?.verificado_biometria);
      } else {
        setIsVerificado(false);
      }
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

    if (!session) {
      if (!isLoginPage && !isRegistroPage && !isBiometricPage && !isMapaPage) {
        router.replace('/LoginScreen');
      }
    } 
    else if (session && isVerificado) {
      if (isLoginPage || isRegistroPage || isBiometricPage || rootSegment === 'index') {
        router.replace('/HomeScreen');
      }
    }
  }, [session, isVerificado, segments, loading]);

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