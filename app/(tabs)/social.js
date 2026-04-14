import * as ImagePicker from 'expo-image-picker';
import { Heart, Image as ImageIcon, MessageCircle, Plus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// IMPORTACIÓN DIRECTA
import { supabase } from '../../services/supabaseConfig';

export default function SocialScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Para guardar el nombre del usuario actual

  // ESTADOS PARA LA NUEVA PUBLICACIÓN
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoPost, setNuevoPost] = useState({ descripcion: '', imagen: null });
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Traemos el usuario_empresa del que está logueado para usarlo al publicar
        const { data } = await supabase
          .from('Usuarios')
          .select('usuario_empresa')
          .eq('id', session.user.id)
          .single();
        setUserData(data);
      }
    };
    getSession();
    obtenerPosts();
  }, []);

  const obtenerPosts = async () => {
    try {
      // MODIFICACIÓN: Buscamos en la tabla 'Usuarios' el usuario_empresa y avatar_url
      const { data, error } = await supabase
        .from('posts') 
        .select(`
          *,
          Usuarios:usuario_id (
            usuario_empresa,
            nombre,
            avatar_url
          )
        `) 
        .eq('categoria', 'social') 
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error detallado Supabase:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const seleccionarImagen = async () => {
    let resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!resultado.canceled) {
      setNuevoPost({ ...nuevoPost, imagen: resultado.assets[0].uri });
    }
  };

  const manejarPublicar = async () => {
    if (!user) return Alert.alert("Error", "Debes estar logueado.");
    if (!nuevoPost.descripcion.trim()) return Alert.alert("Error", "Escribe algo primero.");

    setSubiendo(true);
    try {
      let imagenUrl = null;

      if (nuevoPost.imagen) {
        const fileName = `${Date.now()}-${user.id}.jpg`;
        const formData = new FormData();
        formData.append('file', {
          uri: nuevoPost.imagen,
          name: fileName,
          type: 'image/jpeg',
        });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('imagenes_posts')
          .upload(fileName, formData);
        
        if (uploadError) throw uploadError;

        if (uploadData) {
          const { data: urlData } = supabase.storage.from('imagenes_posts').getPublicUrl(fileName);
          imagenUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase
        .from('posts')
        .insert([
          { 
            // Usamos usuario_empresa si existe, sino el nombre, sino el email
            titulo: userData?.usuario_empresa || userData?.nombre || user.email.split('@')[0], 
            descripcion: nuevoPost.descripcion,
            imagen_url: imagenUrl,
            categoria: 'social',
            tipo: 'social',
            usuario_id: user.id, 
            rubro: 'Comunidad',
            zona: 'San Vicente'
          }
        ]);

      if (error) throw error;
      
      setModalVisible(false);
      setNuevoPost({ descripcion: '', imagen: null });
      obtenerPosts();
      Alert.alert("¡Éxito!", "Publicación compartida.");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSubiendo(false);
    }
  };

  const renderPost = ({ item }) => {
    // MODIFICACIÓN: Priorizamos usuario_empresa que es lo que pide tu Registro
    const autorNombre = item.Usuarios?.usuario_empresa || item.Usuarios?.nombre || item.titulo || 'Usuario';
    const autorAvatar = item.Usuarios?.avatar_url;

    return (
      <View style={styles.postCard}>
        <View style={styles.userInfo}>
          {autorAvatar ? (
            <Image source={{ uri: autorAvatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{autorNombre.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{autorNombre}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.rubroBadge}>{item.rubro || 'General'}</Text>
              <Text style={styles.date}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Reciente'}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.content}>{item.descripcion}</Text>
        
        {item.imagen_url && (
          <Image source={{ uri: item.imagen_url }} style={styles.postImagen} resizeMode="cover" />
        )}

        {item.zona && <Text style={styles.zonaText}>📍 {item.zona}</Text>}

        <View style={styles.interactionBar}>
          <TouchableOpacity style={styles.interactionButton} onPress={() => alert("Le diste Like")}>
            <Heart size={20} color="#65676B" />
            <Text style={styles.interactionText}>Me gusta</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.interactionButton} onPress={() => alert("Abrir comentarios")}>
            <MessageCircle size={20} color="#65676B" />
            <Text style={styles.interactionText}>Comentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderPost}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); obtenerPosts(); }} colors={['#1976D2']} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay publicaciones todavía.</Text>}
        contentContainerStyle={{ paddingBottom: 100 }} 
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear Publicación</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X color="#000" size={24} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="¿Qué estás pensando?"
                  placeholderTextColor="#888"
                  multiline
                  value={nuevoPost.descripcion}
                  onChangeText={(t) => setNuevoPost({ ...nuevoPost, descripcion: t })}
                />
              </View>
              {nuevoPost.imagen && <Image source={{ uri: nuevoPost.imagen }} style={styles.previewImagen} />}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnImagen} onPress={seleccionarImagen}>
                <ImageIcon color="#1976D2" size={24} />
                <Text style={{ color: '#1976D2', marginLeft: 8, fontWeight: '600' }}>Agregar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnPublicar} onPress={manejarPublicar} disabled={subiendo}>
                {subiendo ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPublicarText}>Publicar</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
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
  avatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12, backgroundColor: '#1976D2', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12 }, 
  avatarText: { color: '#FFF', fontWeight: 'bold' },
  userName: { fontWeight: 'bold', fontSize: 16 },
  rubroBadge: { fontSize: 12, color: '#1976D2', fontWeight: '600' },
  date: { color: '#666', fontSize: 12 },
  content: { fontSize: 15, lineHeight: 22, color: '#1A1A1A', marginBottom: 10 },
  postImagen: { width: '100%', height: 250, borderRadius: 8, marginVertical: 10 },
  zonaText: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 10 },
  interactionBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10, marginTop: 5 },
  interactionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  interactionText: { marginLeft: 5, color: '#65676B', fontSize: 13, fontWeight: '500' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#1976D2', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  modalContainer: { backgroundColor: '#FFF', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, maxHeight: '85%', padding: 20, marginHorizontal: 10, borderRadius: 15, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  inputWrapper: { backgroundColor: '#F2F3F5', borderRadius: 12, borderWidth: 1.5, borderColor: '#E4E6EB', padding: 12, minHeight: 120 },
  input: { fontSize: 16, color: '#050505', textAlignVertical: 'top' },
  previewImagen: { width: '100%', height: 200, borderRadius: 10, marginTop: 15 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15, marginTop: 10 },
  btnImagen: { flexDirection: 'row', alignItems: 'center' },
  btnPublicar: { backgroundColor: '#1976D2', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20 },
  btnPublicarText: { color: '#FFF', fontWeight: 'bold' }
});