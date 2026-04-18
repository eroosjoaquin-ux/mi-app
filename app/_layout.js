import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../services/supabaseConfig';

// --- IMPORTACIÓN CORREGIDA ---
import * as Notifications from 'expo-notifications';
// Quitamos las llaves y usamos el nombre exacto del archivo/export
import NotificacionesManager from '../services/notificaciones';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  
  const [session, setSession] = useState(null);
  const [isVerificado, setIsVerificado] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. ESCUCHAR NOTIFICACIONES (PUENTE DE REDIRECCIÓN)
  useEffect(() => {
    // Verificamos que el manager exista para evitar el error de "undefined"
    if (!NotificacionesManager) return;

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      // Usamos el manager para decidir a dónde ir
      if (NotificacionesManager.handleRedirect) {
        NotificacionesManager.handleRedirect(response, router);
      }
    });

    return () => subscription.remove();
  }, []);

  // 2. REGISTRAR TOKEN CUANDO EL USUARIO ESTÁ LISTO
  useEffect(() => {
    // Agregamos chequeo de seguridad para NotificacionesManager
    if (session?.user && isVerificado && NotificacionesManager?.register) {
      NotificacionesManager.register(session.user.id);
    }
  }, [session, isVerificado]);

  useEffect(() => {
    // ESCUCHAR ESTADO DE LA SESIÓN
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🕵️ LAYOUT: Evento de Auth:", event);
      setSession(session);
      
      if (session?.user) {
        const { data } = await supabase
          .from('Usuarios')
          .select('esperando_verificacion') 
          .eq('id', session.user.id)
          .single();

        if (data) {
          console.log("🕵️ LAYOUT: Valor en DB:", data.esperando_verificacion);
          // Si esperando_verificacion es FALSE, significa que ya pasó la biometría
          setIsVerificado(!data.esperando_verificacion); 
        }
      } else {
        setIsVerificado(false);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const isLoginPage = segments[0] === 'LoginScreen';
    const isBiometricPage = segments[0] === 'registro_biometrico';

    if (!session && !isLoginPage && segments[0] !== 'RegistroScreen') {
      router.replace('/LoginScreen');
    } 
    else if (session && !isVerificado && inTabsGroup) {
      console.log("🕵️ LAYOUT: Bloqueado. Redirigiendo a biometría.");
      router.replace('/registro_biometrico');
    } 
    else if (session && isVerificado && (isLoginPage || isBiometricPage)) {
      console.log("🕵️ LAYOUT: Todo OK. Liberando a la Home.");
      router.replace('/(tabs)/social'); 
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} /> 
      <Stack.Screen name="LoginScreen" options={{ title: 'Ingreso' }} />
      <Stack.Screen name="RegistroScreen" options={{ title: 'Crear Cuenta', headerShown: true }} />
      <Stack.Screen 
        name="registro_biometrico" 
        options={{ 
          headerShown: true, 
          title: 'Verificación de Identidad',
          headerLeft: () => null 
        }} 
      />
    </Stack>
  );
}