import { useRouter } from 'expo-router';
import { Archive, ChevronLeft, MessageCircle, Search, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, BackHandler, FlatList, Image,
  Modal, StyleSheet, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getNombreMostrar } from '../../../services/nombreUsuario';
import { supabase } from '../../../services/supabaseConfig';

export default function ListaChats({ onSeleccionarChat, onBack }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  // Modal long-press
  const [modalVisible, setModalVisible] = useState(false);
  const [chatSeleccionado, setChatSeleccionado] = useState(null);
  const [accionLoading, setAccionLoading] = useState(false);

  useEffect(() => {
    cargarListaChats();
    const backAction = () => { if (onBack) onBack(); else router.replace('/'); return true; };
    const bh = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => bh.remove();
  }, [onBack]);

  const cargarListaChats = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      // ── PASO 1: mis chats donde no fui eliminado (RLS ya lo filtra) ────
      // La política SELECT de chats ya excluye los que están en eliminado_por
      const { data: misChats, error: chatsError } = await supabase
        .from('chats')
        .select('id, user_1, user_2, updated_at, archivado_por')
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (chatsError) throw chatsError;
      if (!misChats || misChats.length === 0) { setChats([]); return; }

      const misChatIds = misChats.map((c) => c.id);

      // ── PASO 2: último mensaje de cada uno de mis chats ────────────────
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('chat_id, text, created_at, sender_id')
        .in('chat_id', misChatIds)
        .order('created_at', { ascending: false });

      if (msgsError) throw msgsError;

      // ── PASO 3: perfiles del OTRO participante ─────────────────────────
      const otrosIds = [...new Set(
        misChats.map((c) => c.user_1 === user.id ? c.user_2 : c.user_1).filter(Boolean)
      )];

      let perfilesMap = {};
      if (otrosIds.length > 0) {
        const { data: perfiles } = await supabase
          .from('Usuarios')
          .select('id, nombre, usuario_empresa, avatar_url')
          .in('id', otrosIds);
        (perfiles || []).forEach((p) => { perfilesMap[p.id] = p; });
      }

      // ── PASO 4: armar lista ────────────────────────────────────────────
      const lista = misChats.map((c) => {
        const otroId = c.user_1 === user.id ? c.user_2 : c.user_1;
        const perfil = perfilesMap[otroId] || null;
        const nombre = getNombreMostrar(perfil, 'Usuario desconocido');
        const avatar =
          perfil?.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=1976D2&color=fff`;

        const ultimoMsg = (msgs || []).find((m) => m.chat_id === c.id);
        const esMio = ultimoMsg?.sender_id === user.id;

        // ¿Está archivado para mí?
        const archivado = Array.isArray(c.archivado_por) && c.archivado_por.includes(user.id);

        return {
          id: c.id,
          name: nombre,
          avatar,
          lastMsg: ultimoMsg ? (esMio ? `Tú: ${ultimoMsg.text}` : ultimoMsg.text) : 'Sin mensajes aún',
          time: ultimoMsg ? formatTime(ultimoMsg.created_at) : '',
          unread: ultimoMsg ? !esMio : false,
          archivado,
        };
      });

      setChats(lista);
    } catch (e) {
      console.log('Error lista chats:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 86400 && date.getDate() === now.getDate())
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800) return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const abrirModal = (item) => {
    setChatSeleccionado(item);
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setChatSeleccionado(null);
  };

  // ── Archivar: llama la función SQL y actualiza estado local ───────────
  const archivarChat = async () => {
    if (!chatSeleccionado || accionLoading) return;
    setAccionLoading(true);
    try {
      if (chatSeleccionado.archivado) {
        await supabase.rpc('desarchivar_chat', { p_chat_id: chatSeleccionado.id });
        setChats((prev) => prev.map((c) =>
          c.id === chatSeleccionado.id ? { ...c, archivado: false } : c
        ));
      } else {
        await supabase.rpc('archivar_chat', { p_chat_id: chatSeleccionado.id });
        setChats((prev) => prev.map((c) =>
          c.id === chatSeleccionado.id ? { ...c, archivado: true } : c
        ));
      }
    } catch (e) {
      console.log('Error archivar:', e.message);
    } finally {
      setAccionLoading(false);
      cerrarModal();
    }
  };

  // ── Eliminar: llama la función SQL, desaparece de la lista ────────────
  const eliminarChat = async () => {
    if (!chatSeleccionado || accionLoading) return;
    setAccionLoading(true);
    try {
      await supabase.rpc('eliminar_chat_usuario', { p_chat_id: chatSeleccionado.id });
      setChats((prev) => prev.filter((c) => c.id !== chatSeleccionado.id));
    } catch (e) {
      console.log('Error eliminar:', e.message);
    } finally {
      setAccionLoading(false);
      cerrarModal();
    }
  };

  const manejarSeleccion = (item) => {
    if (onSeleccionarChat) onSeleccionarChat(item);
    else router.push({ pathname: '/chat/chats', params: { id: item.id, name: item.name } });
  };

  const chatsActivos    = chats.filter((c) => !c.archivado && c.name.toLowerCase().includes(busqueda.toLowerCase()));
  const chatsArchivados = chats.filter((c) => c.archivado);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => manejarSeleccion(item)}
      onLongPress={() => abrirModal(item)}
      delayLongPress={400}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.unread && <View style={styles.unreadDot} />}
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

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#1976D2" /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Modal long-press ─────────────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={cerrarModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalNombre} numberOfLines={1}>
                  {chatSeleccionado?.name}
                </Text>
                <Text style={styles.modalSubtitulo}>¿Qué querés hacer con esta conversación?</Text>

                <TouchableOpacity
                  style={[styles.modalBtn, accionLoading && { opacity: 0.5 }]}
                  onPress={archivarChat}
                  disabled={accionLoading}
                >
                  <View style={[styles.modalBtnIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Archive size={20} color="#1976D2" />
                  </View>
                  <View style={styles.modalBtnTexts}>
                    <Text style={styles.modalBtnLabel}>
                      {chatSeleccionado?.archivado ? 'Desarchivar conversación' : 'Archivar conversación'}
                    </Text>
                    <Text style={styles.modalBtnDesc}>
                      {chatSeleccionado?.archivado
                        ? 'La volvés a mostrar en la lista principal'
                        : 'La ocultás de la lista principal — se guarda en la nube'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, accionLoading && { opacity: 0.5 }]}
                  onPress={eliminarChat}
                  disabled={accionLoading}
                >
                  <View style={[styles.modalBtnIcon, { backgroundColor: '#FFEBEE' }]}>
                    <Trash2 size={20} color="#D32F2F" />
                  </View>
                  <View style={styles.modalBtnTexts}>
                    <Text style={[styles.modalBtnLabel, { color: '#D32F2F' }]}>Eliminar de mi lista</Text>
                    <Text style={styles.modalBtnDesc}>Solo desaparece de tu vista, no del otro usuario</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancelar} onPress={cerrarModal}>
                  <Text style={styles.modalCancelarText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => (onBack ? onBack() : router.replace('/'))}>
            <ChevronLeft size={28} color="black" />
          </TouchableOpacity>
          <Text style={styles.title}>Chats</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <MessageCircle size={22} color="black" />
        </TouchableOpacity>
      </View>

      {/* ── Búsqueda ─────────────────────────────────────────────────────── */}
      <View style={styles.searchBar}>
        <Search size={18} color="#8E8E93" />
        <TextInput
          placeholder="Buscar"
          style={styles.searchInput}
          placeholderTextColor="#8E8E93"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* ── Lista ────────────────────────────────────────────────────────── */}
      <FlatList
        data={mostrarArchivados ? chatsArchivados : chatsActivos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {mostrarArchivados ? 'No hay conversaciones archivadas' : 'No hay conversaciones aún'}
            </Text>
          </View>
        }
        ListFooterComponent={
          chatsArchivados.length > 0 ? (
            <TouchableOpacity
              style={styles.archivedRow}
              onPress={() => setMostrarArchivados((v) => !v)}
            >
              <Archive size={15} color="#8E8E93" />
              <Text style={styles.archivedText}>
                {mostrarArchivados
                  ? 'Volver a conversaciones activas'
                  : `${chatsArchivados.length} archivada${chatsArchivados.length > 1 ? 's' : ''} — toca para ver`}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 26, fontWeight: '900', color: '#000', letterSpacing: -0.5 },
  iconBtn: { backgroundColor: '#F0F2F5', padding: 8, borderRadius: 50 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 12, borderRadius: 12, height: 40 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#000' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  chatCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F2F5' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0F2F5' },
  unreadDot: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: '#1976D2', borderWidth: 2, borderColor: '#FFF' },
  chatInfo: { flex: 1, marginLeft: 12 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  name: { fontSize: 16, fontWeight: '500', color: '#000', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '800' },
  time: { fontSize: 12, color: '#8E8E93' },
  lastMsg: { fontSize: 14, color: '#8E8E93' },
  lastMsgUnread: { color: '#000', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#8E8E93', fontSize: 16 },
  archivedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, marginTop: 4 },
  archivedText: { color: '#8E8E93', fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  modalNombre: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  modalSubtitulo: { fontSize: 13, color: '#8E8E93', marginBottom: 20 },
  modalBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F0F2F5' },
  modalBtnIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  modalBtnTexts: { flex: 1 },
  modalBtnLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  modalBtnDesc: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  modalCancelar: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  modalCancelarText: { fontSize: 15, color: '#8E8E93', fontWeight: '600' },
});