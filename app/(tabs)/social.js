import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList, Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../services/supabaseConfig';

export default function SocialScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const obtenerPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('Posts')
        .select(`
          id, 
          contenido, 
          imagen_url, 
          created_at,
          Usuarios ( nombre, apellido, foto_perfil )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error al cargar posts:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    obtenerPosts();
  }, []);

  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.userInfo}>
        <Image 
          source={{ uri: item.Usuarios?.foto_perfil || 'https://via.placeholder.com/50' }} 
          style={styles.avatar} 
        />
        <View>
          <Text style={styles.userName}>{item.Usuarios?.nombre} {item.Usuarios?.apellido}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>
      
      <Text style={styles.content}>{item.contenido}</Text>
      
      {item.imagen_url && (
        <Image source={{ uri: item.imagen_url }} style={styles.postImage} resizeMode="cover" />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); obtenerPosts(); }} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay publicaciones todavía. ¡Sé el primero!</Text>
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* Botón Flotante para crear Post */}
      <TouchableOpacity style={styles.fab} onPress={() => alert("Próximamente: Crear publicación")}>
        <Plus color="#FFF" size={30} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  postCard: { backgroundColor: '#FFF', marginVertical: 8, padding: 15, elevation: 2 },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12, backgroundColor: '#DDD' },
  userName: { fontWeight: 'bold', fontSize: 16 },
  date: { color: '#666', fontSize: 12 },
  content: { fontSize: 15, lineHeight: 22, color: '#1A1A1A', marginBottom: 10 },
  postImage: { width: '100%', height: 250, borderRadius: 8 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666' },
  fab: { 
    position: 'absolute', bottom: 20, right: 20, 
    backgroundColor: '#1976D2', width: 60, height: 60, 
    borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 
  }
});