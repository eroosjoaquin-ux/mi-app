import { Bell, BellOff, Check, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../services/supabaseConfig';

const COLORS = {
  primary: '#1976D2',
  bg: '#F0F2F5',
  white: '#FFFFFF',
  border: '#E4E6EB',
  text: '#050505',
  textSec: '#65676B',
  success: '#2E7D32',
  danger: '#D32F2F',
};

export default function ModalNotificaciones({ visible, onClose }) {
  const [tab, setTab] = useState('notificaciones');
  const [notificaciones, setNotificaciones] = useState([]);
  const [preferencias, setPreferencias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (visible) cargarDatos();
  }, [visible]);

  const cargarDatos = async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);

    const [notifRes, prefRes] = await Promise.all([
      supabase.from('notificaciones').select('*').eq('usuario_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('preferencias_alertas').select('*').eq('usuario_id', session.user.id)
    ]);

    if (notifRes.data) setNotificaciones(notifRes.data);
    if (prefRes.data) setPreferencias(prefRes.data);
    setCargando(false);
  };

  const marcarLeida = async (id) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const eliminarNotificacion = async (id) => {
    await supabase.from('notificaciones').delete().eq('id', id);
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  };

  const marcarTodasLeidas = async () => {
    await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', userId);
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const eliminarPreferencia = async (id) => {
    await supabase.from('preferencias_alertas').delete().eq('id', id);
    setPreferencias(prev => prev.filter(p => p.id !== id));
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const renderNotificacion = ({ item }) => (
    <TouchableOpacity
      style={[styles.notifCard, !item.leida && styles.notifNoLeida]}
      onPress={() => marcarLeida(item.id)}
    >
      <View style={styles.notifIcono}>
        <Bell size={20} color={item.leida ? COLORS.textSec : COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.notifTitulo, !item.leida && { color: COLORS.primary }]}>{item.titulo}</Text>
        <Text style={styles.notifMensaje}>{item.mensaje}</Text>
        <Text style={styles.notifFecha}>{new Date(item.created_at).toLocaleDateString('es-AR')}</Text>
      </View>
      <TouchableOpacity onPress={() => eliminarNotificacion(item.id)} style={styles.deleteBtn}>
        <Trash2 size={16} color={COLORS.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Notificaciones {noLeidas > 0 && `(${noLeidas})`}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'notificaciones' && styles.tabActive]}
            onPress={() => setTab('notificaciones')}
          >
            <Text style={[styles.tabText, tab === 'notificaciones' && styles.tabTextActive]}>
              Alertas {noLeidas > 0 && `(${noLeidas})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'preferencias' && styles.tabActive]}
            onPress={() => setTab('preferencias')}
          >
            <Text style={[styles.tabText, tab === 'preferencias' && styles.tabTextActive]}>
              Mis Alertas
            </Text>
          </TouchableOpacity>
        </View>

        {cargando ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : tab === 'notificaciones' ? (
          <>
            {noLeidas > 0 && (
              <TouchableOpacity style={styles.marcarTodasBtn} onPress={marcarTodasLeidas}>
                <Check size={16} color={COLORS.primary} />
                <Text style={styles.marcarTodasText}>Marcar todas como leídas</Text>
              </TouchableOpacity>
            )}
            <FlatList
              data={notificaciones}
              keyExtractor={item => item.id}
              renderItem={renderNotificacion}
              contentContainerStyle={styles.lista}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <BellOff size={50} color={COLORS.border} />
                  <Text style={styles.emptyText}>No tenés notificaciones todavía.</Text>
                  <Text style={styles.emptySubText}>Seguí rubros desde Buscar para recibir alertas</Text>
                </View>
              }
            />
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.lista}>
            <Text style={styles.prefTitulo}>Rubros que seguís</Text>
            <Text style={styles.prefSub}>Te notificamos cuando hay actividad en estos rubros</Text>

            {preferencias.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Bell size={50} color={COLORS.border} />
                <Text style={styles.emptyText}>No seguís ningún rubro todavía.</Text>
                <Text style={styles.emptySubText}>Usá el buscador para seguir rubros</Text>
              </View>
            ) : (
              preferencias.map(pref => (
                <View key={pref.id} style={styles.prefCard}>
                  <View>
                    <Text style={styles.prefRubro}>{pref.rubro}</Text>
                    <Text style={styles.prefTipo}>
                      {pref.tipo === 'oferta' ? '🔨 Ofertas' : pref.tipo === 'demanda' ? '🔍 Demandas' : '🔨🔍 Ambos'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => eliminarPreferencia(pref.id)}>
                    <Trash2 size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingTop: 50 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: COLORS.textSec },
  tabTextActive: { color: COLORS.primary },
  marcarTodasBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingHorizontal: 20 },
  marcarTodasText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  lista: { padding: 15 },
  notifCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  notifNoLeida: { borderColor: COLORS.primary, backgroundColor: '#F0F7FF' },
  notifIcono: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  notifTitulo: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 3 },
  notifMensaje: { fontSize: 13, color: COLORS.textSec, lineHeight: 18 },
  notifFecha: { fontSize: 11, color: COLORS.textSec, marginTop: 5 },
  deleteBtn: { padding: 5 },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 16, color: COLORS.textSec, fontWeight: '600' },
  emptySubText: { fontSize: 13, color: COLORS.textSec },
  prefTitulo: { fontSize: 18, fontWeight: '900', color: COLORS.text, marginBottom: 5 },
  prefSub: { fontSize: 13, color: COLORS.textSec, marginBottom: 20 },
  prefCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  prefRubro: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  prefTipo: { fontSize: 12, color: COLORS.textSec, marginTop: 3 },
});