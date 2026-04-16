import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, ChevronLeft, Clock, Plus, Send, ShieldAlert, XCircle } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- CONFIGURACIÓN SUPABASE ---
import { supabase } from '../../../services/supabaseConfig';

const COLORS = {
  primary: '#1976D2',
  bg: '#F0F2F5',
  white: '#FFFFFF',
  text: '#1A1A1A',
  textSec: '#65676B',
  border: '#E4E6EB',
  success: '#2E7D32',
  danger: '#D32F2F',
  warning: '#ED6C02',
};

export default function ChatScreen({ chat, onBack, session }) {
  const router = useRouter(); 
  const insets = useSafeAreaInsets();
  const flatListRef = useRef();
  
  const params = useLocalSearchParams();
  const chatIdRaw = chat?.id || params.id; 
  const chatName = chat?.name || params.name;

  const [mensaje, setMensaje] = useState('');
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(session?.user || null); 
  const [activeChatId, setActiveChatId] = useState(null);

  const contieneTelefono = (texto) => /\b\d{7,}\b/.test(texto);
  const contieneRedSocial = (texto) => /(instagram|facebook|whatsapp|t.me|@)/i.test(texto);
  const contieneLink = (texto) => /(http|www\.)/i.test(texto);

  const mensajeValido = (texto) => {
    if (contieneTelefono(texto)) return false;
    if (contieneRedSocial(texto)) return false;
    if (contieneLink(texto) && !texto.includes("google.com/maps")) return false;
    return true;
  };

  const esUUIDValido = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  useEffect(() => {
    inicializarChat();

    const backAction = () => { 
      if (onBack) { onBack(); } else { router.back(); }
      return true; 
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => {
      backHandler.remove();
      supabase.removeAllChannels();
    };
  }, [chatIdRaw]);

  const inicializarChat = async () => {
    let currentUser = user;
    if (!currentUser) {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      currentUser = currentSession?.user;
      if (currentUser) setUser(currentUser);
    }

    if (!currentUser || !chatIdRaw) return;

    if (!esUUIDValido(chatIdRaw)) {
      console.warn("⚠️ Advertencia: chatIdRaw no es un UUID válido:", chatIdRaw);
    }

    // Cerramos canales anteriores antes de abrir uno nuevo para evitar duplicados
    await supabase.removeAllChannels();
    setActiveChatId(chatIdRaw);

    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*') 
      .eq('chat_id', chatIdRaw)
      .order('created_at', { ascending: true });
    
    if (error) {
        console.error("🔴 Error al cargar mensajes:", error.message);
        return;
    }

    const msgsConPerfil = await Promise.all((msgs || []).map(async (m) => {
        const { data: profile } = await supabase
            .from('Usuarios')
            .select('usuario_empresa, avatar_url')
            .eq('id', m.sender_id)
            .single();
        return { ...m, Usuarios: profile };
    }));
    
    setMessages(msgsConPerfil);

    // CONFIGURACIÓN REALTIME OPTIMIZADA
    supabase
      .channel(`room:${chatIdRaw}`)
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `chat_id=eq.${chatIdRaw}` 
      }, async (payload) => {
        console.log("📩 Nuevo mensaje recibido en tiempo real:", payload.new.text);

        // Buscamos los datos del remitente para el nuevo mensaje
        const { data: userData } = await supabase
          .from('Usuarios')
          .select('usuario_empresa, avatar_url')
          .eq('id', payload.new.sender_id)
          .single();
        
        const mensajeConPerfil = { ...payload.new, Usuarios: userData };
        
        // Actualizamos el estado asegurando que React note el cambio de referencia del array
        setMessages((prev) => {
          const exists = prev.find(m => m.id === payload.new.id);
          if (exists) return prev;
          return [...prev, mensajeConPerfil];
        });
      })
      .subscribe((status) => {
        console.log(`📡 Estado suscripción canal ${chatIdRaw}:`, status);
      });
  };

  const enviarMensaje = async (textoInput, tipo = 'text', metadata = {}) => {
    const textoFinal = textoInput || mensaje;
    
    if (!textoFinal.trim() || !activeChatId || !esUUIDValido(activeChatId)) {
      console.error("DEBUG: ID de chat no válido", activeChatId);
      Alert.alert("Error de chat", "El identificador del chat no es válido.");
      return;
    }

    if (!mensajeValido(textoFinal)) {
      Alert.alert("Mensaje bloqueado", "No podés enviar datos de contacto.");
      return;
    }

    const { error } = await supabase.from('messages').insert({
      chat_id: activeChatId,
      sender_id: user.id,
      text: textoFinal,
      type: tipo,
      amount: metadata.amount ? parseFloat(metadata.amount) : null,
      description: metadata.description || null,
      status: 'pending'
    });

    if (error) {
      console.error("🔴 ERROR AL ENVIAR:", JSON.stringify(error, null, 2));
      Alert.alert("Error", `No se pudo enviar: ${error.message}`);
    } else {
      setMensaje('');
    }
  };

  const crearPresupuestoRapido = () => {
    Alert.prompt(
      "Nuevo Presupuesto", "Ingresá el monto total:",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar",
          onPress: (monto) => {
            if (!monto) return;
            enviarMensaje("Presupuesto enviado", 'quote', {
              amount: monto,
              description: 'Presupuesto por servicio técnico solicitado.'
            });
          }
        }
      ],
      "plain-text", "", "number-pad"
    );
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender_id === user?.id;
    const time = item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    const nombreRemitente = item.Usuarios?.usuario_empresa || "Usuario";
    const avatarRemitente = item.Usuarios?.avatar_url;

    return (
      <View style={[styles.msgWrapper, isMe ? styles.myMsg : styles.otherMsg]}>
        {!isMe && (
          <View style={styles.otherHeader}>
            {avatarRemitente && <Image source={{ uri: avatarRemitente }} style={styles.miniAvatar} />}
            <Text style={styles.senderName}>{nombreRemitente}</Text>
          </View>
        )}
        
        {item.type === 'quote' ? (
          <View style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <ShieldAlert size={14} color={COLORS.primary} />
              <Text style={styles.quoteTitle}>Presupuesto Oficial</Text>
            </View>
            <Text style={styles.quoteAmount}>${item.amount}</Text>
            <Text style={styles.quoteDesc}>{item.description}</Text>
            <View style={styles.quoteDivider} />
            {!isMe && item.status === 'pending' ? (
              <View style={styles.quoteActionsRow}>
                <TouchableOpacity style={[styles.btnAction, {backgroundColor: COLORS.success}]}>
                  <CheckCircle size={16} color="white" />
                  <Text style={styles.btnActionText}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnAction, {backgroundColor: COLORS.danger}]}>
                  <XCircle size={16} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.quoteStatus}>
                <Clock size={12} color={COLORS.warning} />
                <Text style={styles.pendingText}>
                    {isMe ? "Esperando respuesta" : "Presupuesto recibido"}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.msgBubble, isMe ? styles.myBubble : styles.otherBubble]}>
            <Text style={[styles.msgText, isMe && {color: '#fff'}]}>{item.text}</Text>
            <Text style={[styles.msgTime, isMe && {color: 'rgba(255,255,255,0.7)'}]}>{time}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onBack ? onBack() : router.back()}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{chatName || "Chat"}</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>En línea - Chat Protegido</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
          contentContainerStyle={styles.chatScroll}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn} onPress={crearPresupuestoRapido}>
            <Plus size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TextInput 
            style={styles.input} 
            placeholder="Escribí un mensaje..."
            value={mensaje}
            onChangeText={setMensaje}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => enviarMensaje()}>
            <Send size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 15, paddingTop: 10, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerInfo: { marginLeft: 15 },
  headerName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  statusText: { fontSize: 11, color: COLORS.textSec },
  chatScroll: { padding: 15, paddingBottom: 30 },
  msgWrapper: { marginBottom: 15, maxWidth: '85%' },
  myMsg: { alignSelf: 'flex-end' },
  otherMsg: { alignSelf: 'flex-start' },
  otherHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 5 },
  miniAvatar: { width: 20, height: 20, borderRadius: 10, marginRight: 6 },
  senderName: { fontSize: 11, color: COLORS.textSec, fontWeight: '600' },
  msgBubble: { padding: 12, borderRadius: 18 },
  myBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  msgText: { fontSize: 15, color: COLORS.text, lineHeight: 20 },
  msgTime: { fontSize: 10, color: COLORS.textSec, marginTop: 4, alignSelf: 'flex-end' },
  quoteCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 15, borderWidth: 2, borderColor: COLORS.primary, width: 260, elevation: 3 },
  quoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  quoteTitle: { fontSize: 11, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' },
  quoteAmount: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  quoteDesc: { fontSize: 13, color: COLORS.textSec, marginTop: 5 },
  quoteDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  quoteActionsRow: { flexDirection: 'row', gap: 10 },
  btnAction: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
  btnActionText: { color: 'white', fontWeight: '800', fontSize: 13 },
  quoteStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pendingText: { fontSize: 11, color: COLORS.warning, fontWeight: '700' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 20, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  attachBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: 42, backgroundColor: COLORS.bg, borderRadius: 21, paddingHorizontal: 15, marginHorizontal: 10 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }
});