import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabaseConfig';

// Variable global que indica qué chat está abierto actualmente
export let chatActivoId = null;
export const setChatActivo = (id) => { chatActivoId = id; };
export const clearChatActivo = () => { chatActivoId = null; };

// 1. CONFIGURACIÓN DE COMPORTAMIENTO
// Si el mensaje es del chat que tenés abierto, no suena ni molesta
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const esChatActual = data?.chat_id && data.chat_id === chatActivoId;

    return {
      shouldShowAlert: !esChatActual,
      shouldPlaySound: !esChatActual,
      shouldSetBadge: !esChatActual,
    };
  },
});

export const NotificacionesManager = {

  // 2. INICIALIZADOR
  init: (router) => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('mensajes', {
        name: 'Mensajes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        enableVibration: true,
        lightColor: '#1976D2',
        showBadge: true,
        sound: 'default',
        bypassDnd: true,
      });
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      NotificacionesManager.handleRedirect(response, router);
    });

    return subscription;
  },

  // 3. REGISTRO
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
        console.warn("⚠️ Permisos de notificación denegados");
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'afb6d4fc-012d-4d4a-9c12-e241fd18e90e',
      })).data;

      if (userId && token) {
        await supabase.from('Usuarios').update({ push_token: token }).eq('id', userId);
      }

      return token;

    } catch (error) {
      console.warn("⚠️ Error en registro:", error.message);
      return null;
    }
  },

  // 4. REDIRECCIÓN
  handleRedirect: (response, router) => {
    const data = response.notification.request.content.data;
    if (data?.type === 'chat' && data?.chat_id) {
      router.push({ pathname: '/chat', params: { id: data.chat_id, name: data.chat_name || '' } });
    }
  }
};

export default NotificacionesManager;