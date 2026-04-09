import { useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseConfig';
import HomeScreen from './HomeScreen';
import LoginScreen from './LoginScreen';
import RegistroScreen from './RegistroScreen';
import RegistroBiometrico from './registro_biometrico';

// CORRECCIÓN: Nombre de archivo exacto
import NuevoPostScreen from './nuevo_post';

let yaValidadoCache = false;

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

export default function MainApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [necesitaValidacion, setNecesitaValidacion] = useState(!yaValidadoCache);
  const [inicializado, setInicializado] = useState(false);
  
  // NUEVO ESTADO: Para controlar cuándo se ve la pantalla de publicar
  const [mostrandoPublicar, setMostrandoPublicar] = useState(false);

  useEffect(() => {
    const checkUserStatus = async (currentSession) => {
      if (currentSession) {
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

          if (data && data.esperando_verificacion === true) {
            yaValidadoCache = true; 
            setNecesitaValidacion(false);
          } else {
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
        (!necesitaValidacion || yaValidadoCache) ? (
          // Lógica de pantallas principales
          mostrandoPublicar ? (
            <NuevoPostScreen 
              onSuccess={() => {
                // Al ejecutarse esto desde el OK de la alerta en nuevo_post.js
                // el estado cambia y volvemos automáticamente al Home
                setMostrandoPublicar(false);
              }} 
            />
          ) : (
            <HomeScreen 
              onLogout={() => supabase.auth.signOut()} 
              onIrAPublicar={() => setMostrandoPublicar(true)} 
            />
          )
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