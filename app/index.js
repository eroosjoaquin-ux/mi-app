import { useRouter, useSegments } from 'expo-router'; // Importante para detectar la ruta
import { useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseConfig';

// Importaciones de pantallas
import DetalleChat from './(tabs)/chat';
import ChatScreen from './(tabs)/chat/lista_chats';
import HomeScreen from './HomeScreen';
import LoginScreen from './LoginScreen';
import RegistroScreen from './RegistroScreen';
import NuevoPostScreen from './nuevo_post';
import RegistroBiometrico from './registro_biometrico';

let yaValidadoCache = false;
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

export default function MainApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [necesitaValidacion, setNecesitaValidacion] = useState(!yaValidadoCache);
  const [inicializado, setInicializado] = useState(false);
  
  // Estados de navegación interna
  const [mostrandoPublicar, setMostrandoPublicar] = useState(false);
  const [mostrandoChat, setMostrandoChat] = useState(false);
  const [chatSeleccionado, setChatSeleccionado] = useState(null);

  const segments = useSegments(); // Detecta en qué "página" de archivo estamos
  const router = useRouter();

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
          const { data } = await supabase
            .from('Usuarios')
            .select('esperando_verificacion')
            .eq('id', currentSession.user.id)
            .maybeSingle(); 

          if (data && data.esperando_verificacion === false) { // Cambio: false significa que YA se validó
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

  // --- LÓGICA DE RENDERIZADO COMPATIBLE CON EXPO ROUTER ---

  // 1. Si el usuario está intentando ver el archivo RegistroScreen, se lo permitimos
  if (segments.includes('RegistroScreen')) {
    return <RegistroScreen onBack={() => router.back()} onNextStep={() => setNecesitaValidacion(true)} />;
  }

  // 2. SI NO HAY SESIÓN: Mostramos Login por defecto
  if (!session) {
    return (
      <SafeAreaProvider>
        <LoginScreen />
      </SafeAreaProvider>
    );
  }

  // 3. SI HAY SESIÓN: Lógica de Home, Validación Biométrica, etc.
  return (
    <SafeAreaProvider>
      {(!necesitaValidacion || yaValidadoCache) ? (
        mostrandoPublicar ? (
          <NuevoPostScreen onSuccess={() => setMostrandoPublicar(false)} />
        ) : chatSeleccionado ? (
          <DetalleChat 
            chat={chatSeleccionado}
            session={session} 
            onBack={() => setChatSeleccionado(null)} 
          />
        ) : mostrandoChat ? (
          <ChatScreen 
            onBack={() => setMostrandoChat(false)}
            onSeleccionarChat={(chat) => setChatSeleccionado(chat)}
          />
        ) : (
          <HomeScreen 
            onLogout={() => supabase.auth.signOut()} 
            onIrAPublicar={() => setMostrandoPublicar(true)} 
            onIrAlChat={() => setMostrandoChat(true)} 
          />
        )
      ) : (
        <RegistroBiometrico onComplete={() => {
          yaValidadoCache = true;
          setNecesitaValidacion(false);
        }} />
      )}
    </SafeAreaProvider>
  );
}