import { useRouter } from 'expo-router';
import {
  Bell, Briefcase, Heart,
  MessageSquare, MoreHorizontal,
  PlusCircle, Search,
  ShieldCheck,
  UserCircle2, Users
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#F0F2F5', 
  white: '#FFFFFF',
  whiteTrans: 'rgba(255, 255, 255, 0.92)', 
  blue: '#1976D2', 
  blueLight: '#E3F2FD', 
  textPrimary: '#050505', 
  textSecondary: '#65676B', 
  border: '#E4E6EB',
  green: '#4CAF50',
  red: '#F44336',
  yellow: '#FFC107'
};

// COMPONENTE PARA LA BARRA DE REPUTACIÓN
const BarraReputacion = ({ puntos }) => {
  const colorBarra = puntos > 75 ? COLORS.green : puntos > 40 ? COLORS.yellow : COLORS.red;
  return (
    <View style={styles.reputacionContenedor}>
      <View style={styles.barraFondo}>
        <View style={[styles.barraProgreso, { width: `${puntos}%`, backgroundColor: colorBarra }]} />
      </View>
      <Text style={[styles.reputacionTexto, { color: colorBarra }]}>{puntos}%</Text>
    </View>
  );
};

export default function HomeScreen({ onLogout }) {
  const router = useRouter();
  
  // seccionActual: 'trabajos' (Mano de Obra) o 'empleados' (Busco Empleado)
  const [seccionActual, setSeccionActual] = useState('trabajos');

  const todosLosPosts = [
    {
      id: 1,
      userName: 'Eros Joaquín',
      userEmpresa: 'Brexel Admin',
      userPhoto: 'https://randomuser.me/api/portraits/men/32.jpg',
      verificado: true,
      reputacion: 98,
      time: '10 min',
      postText: '¡Estructura de reputación bilateral activada! Ahora podés ver quién es confiable.',
      postPhoto: 'https://images.unsplash.com/photo-1541976844346-f18aeac57b06?w=600', 
      likes: 124,
      comments: 8,
      tipo: 'trabajos'
    },
    {
      id: 2,
      userName: 'Juan Perez',
      userEmpresa: 'Particular',
      userPhoto: 'https://randomuser.me/api/portraits/men/45.jpg',
      verificado: false,
      reputacion: 45,
      time: '1 hora',
      postText: 'Busco alguien para limpiar un terreno de 20x50 en Alejandro Korn.',
      postPhoto: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500',
      likes: 12,
      comments: 3,
      tipo: 'empleados'
    }
  ];

  // FILTRO ESTRICTO: No se mezclan las secciones
  const postsFiltrados = todosLosPosts.filter(post => post.tipo === seccionActual);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER SUPERIOR */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.logoText}>Brexel</Text>
          <View style={styles.headerRightIcons}>
            <TouchableOpacity style={styles.headerCircleBtn}>
              <Search size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerCircleBtn} onPress={() => router.push('/(tabs)/chat')}>
              <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
              <Bell size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerCircleBtn} onPress={onLogout}>
              <UserCircle2 size={20} color="#D32F2F" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BARRA DE NAVEGACIÓN PRINCIPAL (5 BOTONES) */}
        <View style={styles.iconNavBar}>
          <TouchableOpacity style={[styles.navIconContainer, seccionActual === 'trabajos' && styles.navIconActive]} onPress={() => setSeccionActual('trabajos')}>
             <Briefcase size={24} color={seccionActual === 'trabajos' ? COLORS.blue : COLORS.textSecondary} />
             <Text style={[styles.navIconLabel, { color: seccionActual === 'trabajos' ? COLORS.blue : COLORS.textSecondary }]}>Servicios</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.navIconContainer, seccionActual === 'empleados' && styles.navIconActive]} onPress={() => setSeccionActual('empleados')}>
             <Users size={24} color={seccionActual === 'empleados' ? COLORS.blue : COLORS.textSecondary} />
             <Text style={[styles.navIconLabel, { color: seccionActual === 'empleados' ? COLORS.blue : COLORS.textSecondary }]}>Pedidos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navIconContainer} onPress={() => router.push('/(tabs)/chat')}>
             <MessageSquare size={24} color={COLORS.textSecondary} />
             <Text style={styles.navIconLabel}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navIconContainer} onPress={() => router.push('/perfil')}>
             <UserCircle2 size={24} color={COLORS.textSecondary} />
             <Text style={styles.navIconLabel}>Perfil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.seccionInfo}>
          <Text style={styles.seccionTitulo}>
            {seccionActual === 'trabajos' ? "Mano de Obra Disponible" : "Búsquedas Laborales"}
          </Text>
        </View>

        {/* FEED DE POSTS FILTRADOS */}
        {postsFiltrados.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.contenedorAvatar}>
                <Image source={{ uri: post.userPhoto }} style={styles.userPhoto} />
                <BarraReputacion puntos={post.reputacion} />
              </View>
              
              <View style={styles.postHeaderText}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={styles.userName}>{post.userName}</Text>
                  {post.verificado && <ShieldCheck size={16} color={COLORS.blue} style={{marginLeft: 4}} />}
                </View>
                <Text style={styles.userSubtext}>{post.userEmpresa} • {post.time}</Text>
              </View>
              <TouchableOpacity><MoreHorizontal size={20} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>

            <Text style={styles.postDescription}>{post.postText}</Text>
            <Image source={{ uri: post.postPhoto }} style={styles.postImage} resizeMode="cover" />

            <View style={styles.interactionBar}>
              <View style={styles.statGroup}>
                <View style={styles.likeIconCircle}><Heart size={10} color="white" fill="white" /></View>
                <Text style={styles.statText}>{post.likes}</Text>
              </View>
              <Text style={styles.statText}>{post.comments} comentarios</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.actionButton}>
                <Heart size={20} color={COLORS.textSecondary} />
                <Text style={styles.actionButtonText}>Like</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.contactBtnActive]} onPress={() => router.push('/(tabs)/chat')}>
                <MessageSquare size={20} color="white" />
                <Text style={{color: 'white', fontWeight: 'bold'}}>Contactar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{height: 100}} />
      </ScrollView>

      {/* BOTÓN FLOTANTE PARA NUEVA PUBLICACIÓN */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/nuevo_post')}>
        <PlusCircle size={30} color="white" />
        <Text style={styles.fabText}>Publicar</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingTop: Platform.OS === 'android' ? 100 : 90 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: Platform.OS === 'android' ? 100 : 90,
    backgroundColor: COLORS.whiteTrans,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    zIndex: 1000, elevation: 5,
  },
  headerContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 35 : 30,
  },
  logoText: { fontSize: 28, fontWeight: 'bold', color: COLORS.blue, letterSpacing: -1.5 },
  headerRightIcons: { flexDirection: 'row', gap: 10 },
  headerCircleBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#F0F2F5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  badge: {
    position: 'absolute', top: -4, right: -4, backgroundColor: '#D32F2F',
    width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  iconNavBar: {
    flexDirection: 'row', backgroundColor: COLORS.white, paddingVertical: 12,
    marginHorizontal: 15, marginTop: 15, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, justifyContent: 'space-around', elevation: 2,
  },
  navIconContainer: { alignItems: 'center', justifyContent: 'center', width: width / 5, paddingVertical: 5, borderRadius: 15 },
  navIconActive: { backgroundColor: COLORS.blueLight },
  navIconLabel: { fontSize: 10, marginTop: 3, fontWeight: '600' },
  
  seccionInfo: { paddingHorizontal: 20, marginTop: 20 },
  seccionTitulo: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },

  postCard: {
    backgroundColor: COLORS.white, marginHorizontal: 15, marginTop: 15,
    borderRadius: 25, borderWidth: 1, borderColor: COLORS.border, padding: 15,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  contenedorAvatar: { alignItems: 'center', gap: 4 },
  userPhoto: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: COLORS.blueLight },
  
  // ESTILOS REPUTACIÓN
  reputacionContenedor: { alignItems: 'center' },
  barraFondo: { width: 45, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden' },
  barraProgreso: { height: '100%' },
  reputacionTexto: { fontSize: 9, fontWeight: 'bold' },

  postHeaderText: { flex: 1, paddingHorizontal: 10 },
  userName: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary },
  userSubtext: { fontSize: 11, color: COLORS.textSecondary },
  postDescription: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 10, lineHeight: 20 },
  postImage: { width: '100%', height: 220, borderRadius: 20, marginBottom: 12 },
  interactionBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 5 },
  statGroup: { flexDirection: 'row', alignItems: 'center' },
  likeIconCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
  statText: { fontSize: 12, color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 10 },
  actionButtonsRow: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12, backgroundColor: '#F0F2F5', gap: 5,
  },
  actionButtonText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  contactBtnActive: { backgroundColor: COLORS.blue, flex: 2 },

  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: COLORS.blue, flexDirection: 'row', 
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 30, elevation: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5
  },
  fabText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 16 }
});