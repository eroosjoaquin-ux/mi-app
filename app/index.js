import { useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseConfig';
import HomeScreen from './HomeScreen';
import LoginScreen from './LoginScreen';
import RegistroScreen from './RegistroScreen';
import RegistroBiometrico from './registro_biometrico';

// VARIABLE GLOBAL: Mantiene el estado aunque navegues al chat
let yaValidadoCache = false;

// Ocultamos el warning del SafeAreaView para limpiar la consola
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

export default function MainApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [necesitaValidacion, setNecesitaValidacion] = useState(!yaValidadoCache);
  const [inicializado, setInicializado] = useState(false);

  useEffect(() => {
    const checkUserStatus = async (currentSession) => {
      if (currentSession) {
        // 1. Si el cache dice que ya entramos, no preguntamos más
        if (yaValidadoCache) {
          setNecesitaValidacion(false);
          setSession(currentSession);
          setLoading(false);
          setInicializado(true);
          return;
        }

        try {
          const { data, error } = await supabase
            .from('Usuarios')
            .select('esperando_verificacion')
            .eq('id', currentSession.user.id)
            .maybeSingle(); 

          // LÓGICA CORREGIDA SEGÚN TUS LOGS:
          // Si la DB devuelve TRUE, el usuario YA ESTÁ verificado.
          if (data && data.esperando_verificacion === true) {
            yaValidadoCache = true; 
            setNecesitaValidacion(false);
          } else {
            // Si es false o null, necesita pasar por la cámara
            setNecesitaValidacion(true);
          }
        } catch (err) {
          setNecesitaValidacion(true);
        }
      }
      setSession(currentSession);
      setLoading(false);
      setInicializado(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUserStatus(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_OUT') {
        yaValidadoCache = false; 
      }
      checkUserStatus(session);
    });

    return () => {
      if (authListener?.subscription) authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading || !inicializado) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {session ? (
        // Si necesitaValidacion es FALSE o yaValidadoCache es TRUE, vas al Home.
        (!necesitaValidacion || yaValidadoCache) ? (
          <HomeScreen onLogout={() => supabase.auth.signOut()} />
        ) : (
          <RegistroBiometrico onComplete={() => {
            yaValidadoCache = true;
            setNecesitaValidacion(false);
          }} />
        )
      ) : (
        isRegistering ? (
          <RegistroScreen onBack={() => setIsRegistering(false)} />
        ) : (
          <LoginScreen onGoToRegister={() => setIsRegistering(true)} />
        )
      )}
    </SafeAreaProvider>
  );
}