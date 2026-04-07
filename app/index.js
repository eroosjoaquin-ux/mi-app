import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
// CORRECCIÓN: La ruta correcta para entrar a services
import { supabase } from '../services/supabaseConfig';
import HomeScreen from './HomeScreen';
import LoginScreen from './LoginScreen';
import RegistroScreen from './RegistroScreen';

export default function MainApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // 1. Verificamos la sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchamos cambios (Login/Logout) en tiempo real
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => { 
      if (authListener?.subscription) authListener.subscription.unsubscribe(); 
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  // Si hay sesión, vamos directo al Home
  if (session) {
    return <HomeScreen onLogout={() => supabase.auth.signOut()} />;
  }

  // Si no hay sesión, alternamos entre Login y Registro
  return isRegistering ? (
    <RegistroScreen onBack={() => setIsRegistering(false)} />
  ) : (
    <LoginScreen onGoToRegister={() => setIsRegistering(true)} />
  );
}