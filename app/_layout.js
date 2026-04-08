import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../services/supabaseConfig';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  
  const [session, setSession] = useState(null);
  const [isVerificado, setIsVerificado] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. ESCUCHAR ESTADO DE LA SESIÓN
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🕵️ LAYOUT: Evento de Auth:", event);
      setSession(session);
      
      if (session?.user) {
        // CORRECCIÓN: Usamos 'esperando_verificacion' que es la que existe en tu tabla
        const { data } = await supabase
          .from('Usuarios')
          .select('esperando_verificacion') 
          .eq('id', session.user.id)
          .single();

        if (data) {
          console.log("🕵️ LAYOUT: Valor en DB:", data.esperando_verificacion);
          // Si es TRUE, el usuario ya pasó por la cámara
          setIsVerificado(data.esperando_verificacion);
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

    // --- LÓGICA DE PROTECCIÓN TOTAL ---
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