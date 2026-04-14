import { useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseConfig';
import HomeScreen from './HomeScreen';
import LoginScreen from './LoginScreen';
import RegistroScreen from './RegistroScreen';
import NuevoPostScreen from './nuevo_post';
import RegistroBiometrico from './registro_biometrico';

// IMPORTACIONES DE CHAT
import DetalleChat from './(tabs)/chat';
import ChatScreen from './(tabs)/chat/lista_chats';

let yaValidadoCache = false;

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

export default function MainApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false); 
  const [necesitaValidacion, setNecesitaValidacion] = useState(!yaValidadoCache);
  const [inicializado, setInicializado] = useState(false);
  
  const [mostrandoPublicar, setMostrandoPublicar] = useState(false);
  const [mostrandoChat, setMostrandoChat] = useState(false);
  const [chatSeleccionado, setChatSeleccionado] = useState(null);

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
        setIsRegistering(false); 
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

  // --- LÓGICA DE RENDERIZADO ---
  
  // 1. SI NO HAY SESIÓN: Bloque para Login y Registro
  if (!session) {
    return (
      <SafeAreaProvider>
        {isRegistering ? (
          <RegistroScreen onBack={() => setIsRegistering(false)} />
        ) : (
          <LoginScreen onGoToRegister={() => setIsRegistering(true)} />
        )}
      </SafeAreaProvider>
    );
  }

  // 2. SI HAY SESIÓN: Tu lógica de Home, Post y Chat intacta
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