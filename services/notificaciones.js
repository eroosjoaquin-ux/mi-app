import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabaseConfig';

// 1. CONFIGURACIÓN DE COMPORTAMIENTO (Fundamental para que suene con la app abierta)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // <--- HACE QUE SUENE SI LA APP ESTÁ ABIERTA
    shouldSetBadge: true,
  }),
});

export const NotificacionesManager = {
  
  // 2. INICIALIZADOR: Configura el escucha de clicks y los canales de sonido
  init: (router) => {
    // Escuchar cuando el usuario toca la notificación
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      NotificacionesManager.handleRedirect(response, router);
    });

    // Configura el canal de sonido para Android inmediatamente
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX, // <--- IMPORTANCIA MÁXIMA PARA SONAR
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1976D2',
        sound: 'default', // Usa el sonido por defecto del sistema
      });
    }

    return subscription;
  },

  // 3. REGISTRO: Pide permisos y guarda el token en Supabase
  register: async (userId) => {
    if (!Device.isDevice) return;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log("Permisos de notificación rechazados");
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'afb6d4fc-012d-4d4a-9c12-e241fd18e90e',
      })).data;

      if (userId && token) {
        await supabase.from('Usuarios').update({ push_token: token }).eq('id', userId);
      }

      // Reforzamos el canal en el registro por si acaso
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });
      }

      return token;

    } catch (error) {
      // Usamos catch para que si falla Firebase (FCM), la app no se cierre
      console.warn("⚠️ Error en registro de notificaciones (FCM):", error.message);
      return null;
    }
  },

  // 4. REDIRECCIÓN: El "puente" para llevar al usuario al chat
  handleRedirect: (response, router) => {
    const data = response.notification.request.content.data;
    
    if (data?.type === 'chat' && data?.chat_id) {
      // Redirige a la pantalla de chat específica
      router.push({ pathname: '/chat/chats', params: { id: data.chat_id } });
    } else if (data?.type === 'new_job') {
      console.log("Notificación de trabajo recibida:", data.job_id);
    }
  }
};

export default NotificacionesManager;