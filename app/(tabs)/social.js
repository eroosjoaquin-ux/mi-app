import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// IMPORTACIÓN DIRECTA
import { supabase } from '../../services/supabaseConfig';

export default function SocialScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const obtenerPosts = async () => {
    try {
      // CORRECCIÓN: Usamos '*' para traer todas las columnas y evitar errores de nombres
      const { data, error } = await supabase
        .from('posts') 
        .select('*') 
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      // Si el error persiste, esto te va a decir exactamente qué tabla o columna falla
      console.error("Error detallado Supabase:", error.message);
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
        <View style={styles.avatarPlaceholder}>
           <Text style={styles.avatarText}>{item.titulo?.charAt(0) || 'P'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{item.titulo || 'Sin título'}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.rubroBadge}>{item.rubro || 'General'}</Text>
            <Text style={styles.date}>
              {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Reciente'}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.content}>{item.descripcion}</Text>
      
      {item.zona && (
        <Text style={styles.zonaText}>📍 {item.zona}</Text>
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
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); obtenerPosts(); }} 
            colors={['#1976D2']}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay publicaciones todavía. ¡Sé el primero!</Text>
        }
        contentContainerStyle={{ paddingBottom: 100 }} 
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => alert("Próximamente: Crear publicación")}
      >
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
  avatarPlaceholder: { 
    width: 45, height: 45, borderRadius: 22.5, marginRight: 12, 
    backgroundColor: '#1976D2', justifyContent: 'center', alignItems: 'center' 
  },
  avatarText: { color: '#FFF', fontWeight: 'bold' },
  userName: { fontWeight: 'bold', fontSize: 16 },
  rubroBadge: { fontSize: 12, color: '#1976D2', fontWeight: '600' },
  date: { color: '#666', fontSize: 12 },
  content: { fontSize: 15, lineHeight: 22, color: '#1A1A1A', marginBottom: 10 },
  zonaText: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666' },
  fab: { 
    position: 'absolute', bottom: 20, right: 20, 
    backgroundColor: '#1976D2', width: 60, height: 60, 
    borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 
  }
});