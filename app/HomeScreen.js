import { useRouter } from 'expo-router';
import {
  Bell, Hammer,
  Heart,
  MessageSquare, MoreHorizontal,
  PlusCircle, Search,
  ShieldCheck,
  UserCircle2, Users,
  Wrench,
  X
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
// FORMA CORRECTA: Importamos SafeAreaView desde el context
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const COLORS = {
  bg: '#F0F2F5', 
  white: '#FFFFFF',
  whiteTrans: 'rgba(255, 255, 255, 0.92)', 
  navTrans: 'rgba(255, 255, 255, 0.3)', 
  blue: '#1976D2', 
  blueLight: '#E3F2FD', 
  textPrimary: '#050505', 
  textSecondary: '#65676B', 
  border: '#E4E6EB',
  green: '#4CAF50',
  red: '#F44336',
  yellow: '#FFC107'
};

const CustomModal = ({ visible, onClose, title, content, hasSearch }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalSheet, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
              {hasSearch && (
                <View style={styles.searchBarContainer}>
                  <Search size={18} color={COLORS.textSecondary} style={styles.searchIconInput} />
                  <TextInput 
                    placeholder="Buscar..." 
                    style={styles.searchInput}
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
              )}
              <View style={styles.modalContent}>
                <Text style={styles.modalBodyText}>{content}</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

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
  const [seccionActual, setSeccionActual] = useState('trabajos');
  const [showSearchMenu, setShowSearchMenu] = useState(false);
  const [modalNotif, setModalNotif] = useState(false);
  const [modalBusqueda, setModalBusqueda] = useState({ visible: false, title: '', content: '' });

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

  const postsFiltrados = todosLosPosts.filter(post => post.tipo === seccionActual);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <CustomModal visible={modalNotif} onClose={() => setModalNotif(false)} title="Notificaciones" content="No hay notificaciones" hasSearch={false} />
      <CustomModal visible={modalBusqueda.visible} onClose={() => setModalBusqueda({ ...modalBusqueda, visible: false })} title={modalBusqueda.title} content={modalBusqueda.content} hasSearch={true} />

      {showSearchMenu && (
        <TouchableWithoutFeedback onPress={() => setShowSearchMenu(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.logoText}>Brexel</Text>
          <View style={styles.headerRightIcons}>
            <TouchableOpacity style={styles.headerCircleBtn} onPress={() => setShowSearchMenu(!showSearchMenu)}>
              <Search size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            {showSearchMenu && (
              <View style={styles.searchDropdown}>
                <TouchableOpacity style={styles.searchItem} onPress={() => { setShowSearchMenu(false); setModalBusqueda({ visible: true, title: 'Ofertas de Trabajo', content: 'Todas las ofertas disponibles para vos' }); }}>
                  <Text style={styles.searchText}>¿Buscas ofertas de trabajo?</Text>
                </TouchableOpacity>
                <View style={styles.searchDivider} />
                <TouchableOpacity style={styles.searchItem} onPress={() => { setShowSearchMenu(false); setModalBusqueda({ visible: true, title: 'Solicitar Trabajo', content: 'Buscas quien te realice un trabajo' }); }}>
                  <Text style={styles.searchText}>¿Buscas quien te realice un trabajo?</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.headerCircleBtn} onPress={() => setModalNotif(true)}>
              <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
              <Bell size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            
            {/* MODIFICADO: Ruta simplificada para Perfil */}
            <TouchableOpacity style={styles.headerCircleBtn} onPress={() => router.push('/perfil')}>
              <UserCircle2 size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.iconNavBar, { marginTop: 30 }]}>
        <TouchableOpacity style={[styles.navIconContainer, seccionActual === 'trabajos' && styles.navIconActive]} onPress={() => setSeccionActual('trabajos')}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
               <Wrench size={18} color={seccionActual === 'trabajos' ? COLORS.blue : COLORS.textSecondary} style={{transform: [{rotate: '-15deg'}]}} />
               <Hammer size={18} color={seccionActual === 'trabajos' ? COLORS.blue : COLORS.textSecondary} style={{marginLeft: -5, transform: [{rotate: '15deg'}]}} />
            </View>
            <Text style={[styles.navIconLabel, { color: seccionActual === 'trabajos' ? COLORS.blue : COLORS.textSecondary }]}>Oferta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navIconContainer, seccionActual === 'empleados' && styles.navIconActive]} onPress={() => setSeccionActual('empleados')}>
            <Users size={24} color={seccionActual === 'empleados' ? COLORS.blue : COLORS.textSecondary} />
            <Text style={[styles.navIconLabel, { color: seccionActual === 'empleados' ? COLORS.blue : COLORS.textSecondary }]}>Demanda</Text>
        </TouchableOpacity>

        {/* MODIFICADO: Ruta relativa para Chat */}
        <TouchableOpacity style={styles.navIconContainer} onPress={() => router.push('./chat/chats')}>
            <MessageSquare size={24} color={COLORS.textSecondary} />
            <Text style={styles.navIconLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navIconContainer} onPress={() => router.push('/nuevo_post')}>
            <PlusCircle size={24} color={COLORS.textSecondary} />
            <Text style={styles.navIconLabel}>Publicar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.seccionInfo}>
          <Text style={styles.seccionTitulo}>
            {seccionActual === 'trabajos' ? "Mano de Obra Disponible" : "Búsquedas Laborales"}
          </Text>
        </View>

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
                <MessageSquare size={20} color={COLORS.textSecondary} />
                <Text style={styles.actionButtonText}>Comentar</Text>
              </TouchableOpacity>
              
              {/* MODIFICADO: Ruta relativa para botón Contactar */}
              <TouchableOpacity style={[styles.actionButton, styles.contactBtnActive]} onPress={() => router.push('./chat/chats')}>
                <MessageSquare size={20} color="white" />
                <Text style={{color: 'white', fontWeight: 'bold'}}>Contactar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 },
  scrollContent: { paddingTop: Platform.OS === 'android' ? 190 : 180 },
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
  searchDropdown: {
    position: 'absolute', top: 45, right: 0, width: 220, backgroundColor: 'white',
    borderRadius: 15, paddingVertical: 5, zIndex: 1001, elevation: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchItem: { padding: 12 },
  searchText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
  searchDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 10 },
  iconNavBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 100 : 90,
    left: 0, right: 0,
    zIndex: 999,
    flexDirection: 'row', 
    backgroundColor: 'rgba(255, 255, 255, 0.5)', 
    paddingVertical: 12,
    marginHorizontal: 15, 
    borderRadius: 25,
    justifyContent: 'space-around', 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: height * 0.85,
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  closeBtn: { padding: 5 },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
    marginBottom: 20,
  },
  searchIconInput: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  modalContent: { flex: 1, alignItems: 'center', paddingTop: 20 },
  modalBodyText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center' },
  navIconContainer: { alignItems: 'center', justifyContent: 'center', width: width / 4.5, paddingVertical: 5, borderRadius: 15 },
  navIconActive: { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
  navIconLabel: { fontSize: 10, marginTop: 3, fontWeight: '600' },
  seccionInfo: { paddingHorizontal: 20, marginTop: 20 },
  seccionTitulo: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  postCard: { backgroundColor: COLORS.white, marginHorizontal: 15, marginTop: 15, borderRadius: 25, borderWidth: 1, borderColor: COLORS.border, padding: 15 },
  userPhoto: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: COLORS.blueLight },
  postHeaderText: { flex: 1, paddingHorizontal: 10 },
  userName: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary },
  postDescription: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 10 },
  postImage: { width: '100%', height: 220, borderRadius: 20, marginBottom: 12 },
  actionButtonsRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#F0F2F5', gap: 5 },
  contactBtnActive: { backgroundColor: COLORS.blue, flex: 1 },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#D32F2F', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  reputacionContenedor: { position: 'absolute', bottom: -5, left: 10, width: 30, alignItems: 'center' },
  barraFondo: { width: 30, height: 4, backgroundColor: '#E4E6EB', borderRadius: 2, overflow: 'hidden' },
  barraProgreso: { height: '100%' },
  reputacionTexto: { fontSize: 7, fontWeight: 'bold', marginTop: 1 },
  interactionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  likeIconCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center' },
  statText: { fontSize: 13, color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },
});