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
      setSession(session);
      
      if (session?.user) {
        const { data } = await supabase
          .from('Usuarios')
          .select('verificado')
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
      router.replace('/LoginScreen');
    } 
    else if (session && !isVerificado && inTabsGroup) {
      router.replace('/registro_biometrico');
    } 
    else if (session && isVerificado && isLoginPage) {
      // CORRECCIÓN AQUÍ: Mandamos a /social que es el archivo que existe
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