import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Globe, Hammer, MessageSquare, PlusCircle, Search, UserCircle2, Users, Wrench } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import NotificacionesManager from '../../services/notificaciones';
import { supabase } from '../../services/supabaseConfig';
import ModalBusqueda from './ModalBusqueda';
import ModalNotificaciones from './ModalNotificaciones';
import PostCard from './PostCard';
import SocialScreen from './social';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#F0F2F5',
  white: '#FFFFFF',
  whiteTrans: 'rgba(255, 255, 255, 0.92)',
  blue: '#1976D2',
  textPrimary: '#050505',
  textSecondary: '#65676B',
  border: '#E4E6EB',
};

const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function HomeScreen({ onIrAPublicar }) {
  const router = useRouter();
  const [seccionActual, setSeccionActual] = useState('trabajos');
  const [modalNotifVisible, setModalNotifVisible] = useState(false);
  const [modalBusquedaVisible, setModalBusquedaVisible] = useState(false);
  const [posts, setPosts] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [user, setUser] = useState(null);
  const [cantidadNoLeidas, setCantidadNoLeidas] = useState(0);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        NotificacionesManager?.register?.(session.user.id);
        cargarNoLeidas(session.user.id);
      }
    };
    checkUser();
  }, []);

  const cargarNoLeidas = async (uid) => {
    const { count } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', uid)
      .eq('leida', false);
    setCantidadNoLeidas(count || 0);
  };

  const fetchPosts = async () => {
    try {
      setCargando(true);
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase
        .from('Usuarios')
        .select('latitud, longitud, radio_alcance_km')
        .eq('id', session?.user?.id)
        .single();

      const { data, error } = await supabase
        .from('posts')
        .select(`*, Usuarios:usuario_id (usuario_empresa, avatar_url, latitud, longitud, radio_alcance_km)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (userData && userData.latitud && data) {
        setPosts(data.filter(post => {
          const autor = post.Usuarios;
          if (!autor || !autor.latitud) return true;
          const distancia = calcularDistancia(userData.latitud, userData.longitud, autor.latitud, autor.longitud);
          return distancia <= (Number(userData.radio_alcance_km || 0) + Number(autor.radio_alcance_km || 0));
        }));
      } else {
        setPosts(data || []);
      }
    } catch (error) {
      console.error("Error rastreando posts:", error.message);
    } finally {
      setCargando(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPosts(); }, []));

  const postsFiltrados = posts.filter(post =>
    seccionActual === 'trabajos' ? post.tipo === 'oferta' : post.tipo === 'demanda'
  );

  const handleContactar = async (post) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { Alert.alert("Acceso denegado", "Iniciá sesión para contactar."); return; }
      const miId = session.user.id;
      const suId = post.usuario_id;
      if (miId === suId) { Alert.alert("Aviso", "No podés contactarte a vos mismo."); return; }

      let { data: existingChat } = await supabase
        .from('chats').select('id')
        .or(`and(user_1.eq.${miId},user_2.eq.${suId}),and(user_1.eq.${suId},user_2.eq.${miId})`)
        .single();

      let finalChatId;
      if (existingChat) {
        finalChatId = existingChat.id;
        await supabase.from('chats').update({ updated_at: new Date() }).eq('id', finalChatId);
      } else {
        const { data: newChat, error } = await supabase
          .from('chats').insert({ user_1: miId, user_2: suId, updated_at: new Date() }).select().single();
        if (error) throw error;
        finalChatId = newChat.id;
      }

      router.push({ pathname: '/chat/chats', params: { id: finalChatId, name: post.Usuarios?.usuario_empresa || "Usuario" } });
    } catch (err) {
      Alert.alert("Error", "No se pudo iniciar la conversación.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <ModalBusqueda
        visible={modalBusquedaVisible}
        onClose={() => setModalBusquedaVisible(false)}
      />

      <ModalNotificaciones
        visible={modalNotifVisible}
        onClose={() => {
          setModalNotifVisible(false);
          if (user) cargarNoLeidas(user.id);
        }}
      />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.logoText}>Brexel</Text>
          <View style={styles.headerRightIcons}>
            <TouchableOpacity style={styles.headerCircleBtn} onPress={() => setModalBusquedaVisible(true)}>
              <Search size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerCircleBtn} onPress={() => setModalNotifVisible(true)}>
              {cantidadNoLeidas > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}</Text>
                </View>
              )}
              <Bell size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerCircleBtn} onPress={() => router.push('/(tabs)/perfil')}>
              <UserCircle2 size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.iconNavBar, { marginTop: 30 }]}>
        <TouchableOpacity style={[styles.navIconContainer, seccionActual === 'trabajos' && styles.navIconActive]} onPress={() => setSeccionActual('trabajos')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Wrench size={18} color={seccionActual === 'trabajos' ? COLORS.blue : COLORS.textSecondary} style={{ transform: [{ rotate: '-15deg' }] }} />
            <Hammer size={18} color={seccionActual === 'trabajos' ? COLORS.blue : COLORS.textSecondary} style={{ marginLeft: -5, transform: [{ rotate: '15deg' }] }} />
          </View>
          <Text style={[styles.navIconLabel, { color: seccionActual === 'trabajos' ? COLORS.blue : COLORS.textSecondary }]}>Oferta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navIconContainer, seccionActual === 'empleados' && styles.navIconActive]} onPress={() => setSeccionActual('empleados')}>
          <Users size={24} color={seccionActual === 'empleados' ? COLORS.blue : COLORS.textSecondary} />
          <Text style={[styles.navIconLabel, { color: seccionActual === 'empleados' ? COLORS.blue : COLORS.textSecondary }]}>Demanda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navIconContainer, seccionActual === 'comunidad' && styles.navIconActive]} onPress={() => setSeccionActual('comunidad')}>
          <Globe size={24} color={seccionActual === 'comunidad' ? COLORS.blue : COLORS.textSecondary} />
          <Text style={[styles.navIconLabel, { color: seccionActual === 'comunidad' ? COLORS.blue : COLORS.textSecondary }]}>Comunidad</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navIconContainer} onPress={() => router.push('/chat/lista_chats')}>
          <MessageSquare size={24} color={COLORS.textSecondary} />
          <Text style={styles.navIconLabel}>Chats</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navIconContainer} onPress={() => router.push('/nuevo_post')}>
          <PlusCircle size={24} color={COLORS.textSecondary} />
          <Text style={styles.navIconLabel}>Publicar</Text>
        </TouchableOpacity>
      </View>

      {seccionActual === 'comunidad' ? (
        <View style={{ flex: 1, marginTop: 160 }}>
          <SocialScreen />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={fetchPosts} colors={[COLORS.blue]} />}
        >
          <View style={styles.seccionInfo}>
            <Text style={styles.seccionTitulo}>
              {seccionActual === 'trabajos' ? "Mano de Obra Disponible" : "Búsquedas Laborales"}
            </Text>
          </View>

          {cargando && posts.length === 0 ? (
            <ActivityIndicator size="large" color={COLORS.blue} style={{ marginTop: 50 }} />
          ) : (
            postsFiltrados.map(post => (
              <PostCard key={post.id} post={post} onContactar={handleContactar} />
            ))
          )}

          {!cargando && postsFiltrados.length === 0 && (
            <Text style={{ textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 }}>No hay anuncios en tu zona todavía.</Text>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingTop: Platform.OS === 'android' ? 190 : 180 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: Platform.OS === 'android' ? 100 : 90, backgroundColor: COLORS.whiteTrans, borderBottomWidth: 1, borderBottomColor: COLORS.border, zIndex: 1000, elevation: 5 },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 35 : 30 },
  logoText: { fontSize: 28, fontWeight: 'bold', color: COLORS.blue, letterSpacing: -1.5 },
  headerRightIcons: { flexDirection: 'row', gap: 10 },
  headerCircleBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  iconNavBar: { position: 'absolute', top: Platform.OS === 'android' ? 100 : 90, left: 0, right: 0, zIndex: 999, flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.5)', paddingVertical: 12, marginHorizontal: 15, borderRadius: 25, justifyContent: 'space-around' },
  navIconContainer: { alignItems: 'center', justifyContent: 'center', width: width / 5.5, paddingVertical: 5, borderRadius: 15 },
  navIconActive: { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
  navIconLabel: { fontSize: 9, marginTop: 3, fontWeight: '600' },
  seccionInfo: { paddingHorizontal: 20, marginTop: 20 },
  seccionTitulo: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#D32F2F', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
});