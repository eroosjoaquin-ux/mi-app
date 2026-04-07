import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
// Importamos la configuración de Supabase
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
      setSession(session);
      
      if (session?.user) {
        // 2. SI HAY USUARIO, BUSCAMOS EN LA TABLA SI ESTÁ VERIFICADO
        const { data, error } = await supabase
          .from('Usuarios')
          .select('verificado') // Asegurate que tu columna se llame así en Supabase
          .eq('id', session.user.id)
          .single();

        if (data) setIsVerificado(data.verificado);
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

    // LÓGICA DE NAVEGACIÓN PROTEGIDA
    if (!session && inTabsGroup) {
      // Si no hay sesión y quiere entrar a la app -> Al Login
      router.replace('/LoginScreen');
    } 
    else if (session && !isVerificado && inTabsGroup) {
      // Si hay sesión pero NO está verificado -> A la Selfie
      router.replace('/registro_biometrico');
    } 
    else if (session && isVerificado && isLoginPage) {
      // Si ya está todo OK y está en el login -> Al Home
      router.replace('/(tabs)/home');
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
      {/* Pantallas principales */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* Pantalla de Login y Registro */}
      <Stack.Screen name="LoginScreen" options={{ title: 'Ingreso' }} />
      <Stack.Screen name="RegistroScreen" options={{ title: 'Crear Cuenta', headerShown: true }} />

      {/* Pantalla Biométrica (Selfie) */}
      <Stack.Screen 
        name="registro_biometrico" 
        options={{ 
          headerShown: true, 
          title: 'Verificación de Identidad',
          headerLeft: () => null // Bloqueamos el "volver atrás"
        }} 
      />
    </Stack>
  );
}