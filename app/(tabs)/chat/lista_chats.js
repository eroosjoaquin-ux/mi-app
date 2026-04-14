import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { ChevronLeft, MessageCircle, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const supabase = createClient('https://kqittlmnkvdaaualuswr.supabase.co', 'sb_publishable_2Z4BPTVd0qIu4npa-sNjWw_IJ5QqqD_');

export default function ListaChats({ onSeleccionarChat, onBack }) {
  const insets = useSafeAreaInsets();
  const router = useRouter(); 
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarListaChats();

    const backAction = () => {
      if (onBack) {
        onBack();
      } else {
        // CAMBIO: Te manda directo a la Home (raiz)
        router.replace('/'); 
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => backHandler.remove();
  }, [onBack]);

  const cargarListaChats = async () => {
    try {
      await supabase.auth.getUser();
      const dataPrueba = [
        { id: '1', name: 'Juan Carpintero', lastMsg: '¿A qué hora venís?', time: '10:30', avatar: 'https://i.pravatar.cc/150?u=1' },
        { id: '2', name: 'Marta Electricista', lastMsg: 'Presupuesto enviado', time: 'Ayer', avatar: 'https://i.pravatar.cc/150?u=2' },
        { id: '3', name: 'Pedro Gasista', lastMsg: 'Listo el arreglo', time: 'Lunes', avatar: 'https://i.pravatar.cc/150?u=3' },
      ];
      setChats(dataPrueba);
    } catch (e) {
      console.log("Error:", e);
    } finally {
      setLoading(false);
    }
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
    <TouchableOpacity 
      style={styles.chatCard}
      onPress={() => manejarSeleccion(item)}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMsg}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#1976D2" /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            // CAMBIO: También en el botón de la pantalla
            onPress={() => onBack ? onBack() : router.replace('/')} 
            style={{ marginRight: 10 }}
          >
            <ChevronLeft size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Mensajes</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}><MessageCircle size={24} color="#1A1A1A" /></TouchableOpacity>
      </View>
      <View style={styles.searchBar}>
        <Search size={20} color="#65676B" />
        <TextInput placeholder="Buscar chat..." style={styles.searchInput} placeholderTextColor="#65676B" />
      </View>
      <FlatList
        data={chats}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  iconBtn: { backgroundColor: '#F0F2F5', padding: 10, borderRadius: 50 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 15, borderRadius: 12, height: 45 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#000' },
  list: { paddingHorizontal: 20 },
  chatCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E4E6EB' },
  chatInfo: { flex: 1, marginLeft: 15, borderBottomWidth: 1, borderBottomColor: '#F0F2F5', paddingBottom: 15 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  name: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  time: { fontSize: 13, color: '#65676B' },
  lastMsg: { fontSize: 15, color: '#65676B' }
});