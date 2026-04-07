import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, ChevronLeft, Clock, Plus, Send, ShieldAlert, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

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

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  const [mensaje, setMensaje] = useState('');
  
  const [messages, setMessages] = useState([
    { id: 1, text: "Hola! Te escribo por el arreglo del baño.", sender: 'other', time: '10:00' },
    { id: 2, text: "Hola, te paso el presupuesto por acá para que quede protegido.", sender: 'me', time: '10:05' },
    { 
      id: 3, 
      type: 'quote', 
      amount: '18.500', 
      description: 'Cambio de grifería completa y sellado de bacha.',
      status: 'pending', 
      sender: 'me',
      time: '10:15'
    }
  ]);

  // --- TENAZA 1: FILTRO ANTI-GARCAS ---
  const validarMensaje = (texto) => {
    // Detecta números de 8 a 11 dígitos y palabras clave
    const regexTelefono = /(\d{2,4}[ -]?\d{6,8})|(\d{8,11})/;
    const palabrasProhibidas = ["whatsapp", "wsp", "celu", "telefono", "cbu", "alias", "transferencia", "pago fuera"];
    
    const tieneTelefono = regexTelefono.test(texto);
    const tienePalabra = palabrasProhibidas.some(p => texto.toLowerCase().includes(p));

    if (tieneTelefono || tienePalabra) {
      Alert.alert(
        "Acción Bloqueada",
        "Por seguridad de ambos, no se permite enviar datos de contacto o pagos externos. Usá el sistema de presupuestos oficial de Brexel."
      );
      return false;
    }
    return true;
  };

  const enviarMensaje = () => {
    if (!mensaje.trim()) return;
    if (!validarMensaje(mensaje)) return;

    const nuevoMsg = {
      id: Date.now(),
      text: mensaje,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([...messages, nuevoMsg]);
    setMensaje('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{name || "Profesional de Brexel"}</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>En línea - Chat Protegido</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.chatScroll} showsVerticalScrollIndicator={false}>
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.msgWrapper, msg.sender === 'me' ? styles.myMsg : styles.otherMsg]}>
            
            {msg.type === 'quote' ? (
              /* --- TENAZA 2: PRESUPUESTO VINCULANTE --- */
              <View style={styles.quoteCard}>
                <View style={styles.quoteHeader}>
                  <ShieldAlert size={14} color={COLORS.primary} />
                  <Text style={styles.quoteTitle}>Presupuesto Oficial</Text>
                </View>
                <Text style={styles.quoteAmount}>${msg.amount}</Text>
                <Text style={styles.quoteDesc}>{msg.description}</Text>
                
                <View style={styles.quoteDivider} />
                
                {msg.sender === 'other' && msg.status === 'pending' ? (
                  /* ACCIONES PARA EL CLIENTE */
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
                    <Text style={styles.pendingText}>Esperando confirmación...</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.msgBubble, msg.sender === 'me' ? styles.myBubble : styles.otherBubble]}>
                <Text style={[styles.msgText, msg.sender === 'me' && {color: '#fff'}]}>{msg.text}</Text>
                <Text style={[styles.msgTime, msg.sender === 'me' && {color: 'rgba(255,255,255,0.7)'}]}>{msg.time}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.attachBtn} 
            onPress={() => Alert.alert("Crear Presupuesto", "Aquí se abre el formulario para poner monto y descripción.")}
          >
            <Plus size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TextInput 
            style={styles.input} 
            placeholder="Escribí un mensaje..."
            value={mensaje}
            onChangeText={setMensaje}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={enviarMensaje}>
            <Send size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { 
    flexDirection: 'row', alignItems: 'center', padding: 15, 
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'ios' ? 50 : 20
  },
  headerInfo: { marginLeft: 15 },
  headerName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  statusText: { fontSize: 11, color: COLORS.textSec },

  chatScroll: { padding: 15 },
  msgWrapper: { marginBottom: 15, maxWidth: '85%' },
  myMsg: { alignSelf: 'flex-end' },
  otherMsg: { alignSelf: 'flex-start' },

  msgBubble: { padding: 12, borderRadius: 18 },
  myBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  msgText: { fontSize: 15, color: COLORS.text, lineHeight: 20 },
  msgTime: { fontSize: 10, color: COLORS.textSec, marginTop: 4, alignSelf: 'flex-end' },

  quoteCard: { 
    backgroundColor: COLORS.white, borderRadius: 16, padding: 15, 
    borderWidth: 2, borderColor: COLORS.primary, width: 260, elevation: 3
  },
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

  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', padding: 12, 
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12
  },
  attachBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: 42, backgroundColor: COLORS.bg, borderRadius: 21, paddingHorizontal: 15, marginHorizontal: 10 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }
});