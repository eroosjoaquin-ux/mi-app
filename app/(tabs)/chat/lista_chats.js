import { useRouter } from 'expo-router';
import { ChevronLeft, MessageCircle, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../services/supabaseConfig';

export default function ListaChats({ onSeleccionarChat, onBack }) {
  const insets = useSafeAreaInsets();
  const router = useRouter(); 
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarListaChats();
    const backAction = () => {
      if (onBack) { onBack(); } else { router.replace('/'); }
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [onBack]);

  const cargarListaChats = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Traemos mensajes con la info de Usuarios vinculada
      const { data, error } = await supabase
        .from('messages')
        .select(`
          chat_id,
          text,
          created_at,
          sender_id,
          Usuarios!messages_sender_id_fkey (
            id,
            usuario_empresa,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const conversacionesMap = {};
      
      // LÓGICA CLAVE: Identificar a la otra persona
      for (const msg of data) {
        if (!conversacionesMap[msg.chat_id]) {
          let perfilMostrar = msg.Usuarios;
          let esMio = msg.sender_id === user.id;

          // Si el mensaje que encontré es MÍO, tengo que buscar quién es el OTRO en ese chat
          if (esMio) {
            // Buscamos en la misma lista de mensajes alguien que NO sea yo para ese chat_id
            const otroMensaje = data.find(m => m.chat_id === msg.chat_id && m.sender_id !== user.id);
            if (otroMensaje) {
              perfilMostrar = otroMensaje.Usuarios;
            }
          }

          conversacionesMap[msg.chat_id] = {
            id: msg.chat_id,
            name: perfilMostrar?.usuario_empresa || 'Chat',
            lastMsg: esMio ? `Tú: ${msg.text}` : msg.text,
            time: formatTime(msg.created_at),
            avatar: perfilMostrar?.avatar_url || `https://ui-avatars.com/api/?name=${msg.chat_id}&background=random`,
            unread: !esMio // Podrías implementar lógica de visto aquí
          };
        }
      }

      setChats(Object.values(conversacionesMap));
    } catch (e) {
      console.log("Error lista:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 86400 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800) {
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return dias[date.getDay()];
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const manejarSeleccion = (item) => {
    if (onSeleccionarChat) {
      onSeleccionarChat(item);
    } else {
      router.push({
        pathname: '/chat/chats', 
        params: { id: item.id, name: item.name }
      });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.chatCard} onPress={() => manejarSeleccion(item)}>
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.onlineBadge} />
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.name, item.unread && styles.nameUnread]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={[styles.lastMsg, item.unread && styles.lastMsgUnread]} numberOfLines={1}>
          {item.lastMsg}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#0084FF" /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => onBack ? onBack() : router.replace('/')}>
            <ChevronLeft size={28} color="black" />
          </TouchableOpacity>
          <Text style={styles.title}>Chats</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <MessageCircle size={22} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color="#8E8E93" />
        <TextInput placeholder="Buscar" style={styles.searchInput} placeholderTextColor="#8E8E93" />
      </View>

      <FlatList
        data={chats}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay conversaciones aún</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 10 
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 26, fontWeight: '900', color: '#000', letterSpacing: -0.5 },
  iconBtn: { backgroundColor: '#F0F2F5', padding: 8, borderRadius: 50 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F0F2F5', 
    marginHorizontal: 16, 
    marginVertical: 10, 
    paddingHorizontal: 12, 
    borderRadius: 12, 
    height: 40 
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#000' },
  list: { paddingHorizontal: 16 },
  chatCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0F2F5' },
  onlineBadge: { 
    position: 'absolute', 
    bottom: 1, 
    right: 1, 
    width: 15, 
    height: 15, 
    borderRadius: 7.5, 
    backgroundColor: '#44B700', 
    borderWidth: 2, 
    borderColor: '#FFF' 
  },
  chatInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  name: { fontSize: 16, fontWeight: '500', color: '#000' },
  nameUnread: { fontWeight: '800' },
  time: { fontSize: 13, color: '#8E8E93' },
  lastMsg: { fontSize: 14, color: '#8E8E93', maxWidth: '85%' },
  lastMsgUnread: { color: '#000', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#8E8E93', fontSize: 16 }
});