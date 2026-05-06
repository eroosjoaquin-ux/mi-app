import { Bell, MapPin, Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../services/supabaseConfig';

const RUBROS = [
  'Albañilería', 'Carpintería', 'Cerrajería', 'Climatización y Refrigeración',
  'Construcción Seco/Tradicional', 'Electricidad Domiciliaria e Industrial',
  'Fletes y Mudanzas', 'Gasista y Plomería', 'Herrería y Soldadura',
  'Jardinería y Paisajismo', 'Limpieza y Mantenimiento', 'Mecánica (Autos/Motos)',
  'Pintura y Revestimientos', 'Programación y Tecnología', 'Seguridad (Cámaras/Alarmas)',
  'Servicio Técnico Electrodomésticos', 'Tapicería y Restauración',
  'Techista e Impermeabilización', 'Vidriería y Aberturas'
].sort();

const COLORS = {
  primary: '#1976D2',
  bg: '#F0F2F5',
  white: '#FFFFFF',
  border: '#E4E6EB',
  text: '#050505',
  textSec: '#65676B',
  red: '#F44336',
  success: '#2E7D32',
};

const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

export default function ModalBusqueda({ visible, onClose }) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaGeneral, setBusquedaGeneral] = useState('');
  const [posts, setPosts] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [miUbicacion, setMiUbicacion] = useState(null);
  const [userId, setUserId] = useState(null);
  const [modalSeguirVisible, setModalSeguirVisible] = useState(false);
  const [preferencias, setPreferencias] = useState([]);

  useEffect(() => {
    if (visible) {
      cargarDatos();
      setTipoSeleccionado(null);
      setBusqueda('');
      setBusquedaGeneral('');
    }
  }, [visible]);

  useEffect(() => {
    if (tipoSeleccionado) fetchPosts();
  }, [tipoSeleccionado, busqueda]);

  const cargarDatos = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);
    const { data } = await supabase
      .from('Usuarios')
      .select('latitud, longitud, radio_alcance_km')
      .eq('id', session.user.id)
      .single();
    if (data) setMiUbicacion(data);

    const { data: prefs } = await supabase
      .from('preferencias_alertas')
      .select('rubro, tipo')
      .eq('usuario_id', session.user.id);
    if (prefs) setPreferencias(prefs);
  };

  const fetchPosts = async () => {
    setCargando(true);
    try {
      let query = supabase
        .from('posts')
        .select(`*, Usuarios:usuario_id (usuario_empresa, avatar_url, latitud, longitud, radio_alcance_km)`)
        .eq('tipo', tipoSeleccionado)
        .order('created_at', { ascending: false });

      if (busqueda.trim()) {
        query = query.ilike('rubro', `%${busqueda}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (miUbicacion?.latitud && data) {
        const conDistancia = data.map(post => ({
          ...post,
          distancia: post.Usuarios?.latitud
            ? calcularDistancia(miUbicacion.latitud, miUbicacion.longitud, post.Usuarios.latitud, post.Usuarios.longitud)
            : 999
        })).sort((a, b) => a.distancia - b.distancia);
        setPosts(conDistancia);
      } else {
        setPosts(data || []);
      }
    } catch (e) {
      console.error(e.message);
    } finally {
      setCargando(false);
    }
  };

  const seguirRubro = async (rubro) => {
    const yaExiste = preferencias.find(p => p.rubro === rubro && p.tipo === tipoSeleccionado);
    if (yaExiste) return;
    const { data, error } = await supabase
      .from('preferencias_alertas')
      .insert({ usuario_id: userId, rubro, tipo: tipoSeleccionado })
      .select().single();
    if (!error && data) {
      setPreferencias(prev => [...prev, { rubro, tipo: tipoSeleccionado }]);
    }
  };

  const esSeguido = (rubro) => {
    return preferencias.some(p => p.rubro === rubro && p.tipo === tipoSeleccionado);
  };

  const renderPost = ({ item }) => {
    const userName = item.Usuarios?.usuario_empresa || 'Usuario';
    const avatar = item.Usuarios?.avatar_url;
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>{userName.charAt(0)}</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.postUser}>{userName}</Text>
            <Text style={styles.postRubro}>{item.rubro}</Text>
          </View>
          {item.distancia && item.distancia !== 999 && (
            <View style={styles.distanciaBadge}>
              <MapPin size={12} color={COLORS.primary} />
              <Text style={styles.distanciaText}>{item.distancia} km</Text>
            </View>
          )}
        </View>
        <Text style={styles.postTitulo}>{item.titulo}</Text>
        <Text style={styles.postDesc} numberOfLines={2}>{item.descripcion}</Text>
        {item.es_urgente && <Text style={styles.urgente}>🚨 URGENTE</Text>}
      </View>
    );
  };

  // Filtro de búsqueda general para la pantalla inicial
  const tiposBusqueda = [
    { tipo: 'oferta', emoji: '🔨', titulo: 'Ofertas de Trabajo', sub: 'Encontrá profesionales cerca tuyo' },
    { tipo: 'demanda', emoji: '🔍', titulo: 'Demandas de Trabajo', sub: 'Encontrá quién necesita tus servicios' },
  ].filter(t =>
    busquedaGeneral.trim() === '' ||
    t.titulo.toLowerCase().includes(busquedaGeneral.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {tipoSeleccionado ? (tipoSeleccionado === 'oferta' ? 'Ofertas de Trabajo' : 'Demandas de Trabajo') : 'Buscar'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {!tipoSeleccionado ? (
          <View style={styles.seleccionContainer}>
            {/* BUSCADOR GENERAL */}
            <View style={styles.searchBarGeneral}>
              <Search size={18} color={COLORS.textSec} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar en todo Brexel..."
                placeholderTextColor={COLORS.textSec}
                value={busquedaGeneral}
                onChangeText={setBusquedaGeneral}
              />
              {busquedaGeneral.length > 0 && (
                <TouchableOpacity onPress={() => setBusquedaGeneral('')}>
                  <X size={18} color={COLORS.textSec} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.seleccionTitulo}>¿Qué estás buscando?</Text>
            {tiposBusqueda.map(t => (
              <TouchableOpacity key={t.tipo} style={styles.tipoBtn} onPress={() => setTipoSeleccionado(t.tipo)}>
                <Text style={styles.tipoBtnEmoji}>{t.emoji}</Text>
                <View>
                  <Text style={styles.tipoBtnTitulo}>{t.titulo}</Text>
                  <Text style={styles.tipoBtnSub}>{t.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <>
            {/* BUSCADOR FILTRADO */}
            <View style={styles.searchBar}>
              <Search size={18} color={COLORS.textSec} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por rubro... ej: Carpintería"
                placeholderTextColor={COLORS.textSec}
                value={busqueda}
                onChangeText={setBusqueda}
                autoFocus
              />
              {busqueda.length > 0 && (
                <TouchableOpacity onPress={() => setBusqueda('')}>
                  <X size={18} color={COLORS.textSec} />
                </TouchableOpacity>
              )}
            </View>

            {/* BOTON SEGUIR */}
            <TouchableOpacity style={styles.btnSeguir} onPress={() => setModalSeguirVisible(true)}>
              <Bell size={16} color={COLORS.primary} />
              <Text style={styles.btnSeguirText}>
                Seguir {tipoSeleccionado === 'oferta' ? 'Ofertas' : 'Demandas'} por Rubro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setTipoSeleccionado(null)} style={styles.cambiarTipo}>
              <Text style={styles.cambiarTipoText}>← Cambiar tipo de búsqueda</Text>
            </TouchableOpacity>

            {cargando ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={posts}
                keyExtractor={item => item.id.toString()}
                renderItem={renderPost}
                contentContainerStyle={styles.lista}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No hay resultados para tu búsqueda.</Text>
                }
              />
            )}
          </>
        )}
      </View>

      {/* MODAL DE SEGUIR RUBROS */}
      <Modal visible={modalSeguirVisible} animationType="slide" transparent={true}>
        <View style={styles.modalSeguirOverlay}>
          <View style={styles.modalSeguirContainer}>
            <View style={styles.modalSeguirHeader}>
              <Text style={styles.modalSeguirTitulo}>
                Seguir {tipoSeleccionado === 'oferta' ? 'Ofertas' : 'Demandas'}
              </Text>
              <TouchableOpacity onPress={() => setModalSeguirVisible(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSeguirSub}>
              Te notificamos cuando haya actividad en los rubros que seguís
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {RUBROS.map(rubro => (
                <View key={rubro} style={styles.rubroRow}>
                  <Text style={styles.rubroNombre}>{rubro}</Text>
                  <TouchableOpacity
                    style={[styles.btnSeguirRubro, esSeguido(rubro) && styles.btnSeguirRubroActivo]}
                    onPress={() => seguirRubro(rubro)}
                    disabled={esSeguido(rubro)}
                  >
                    <Text style={[styles.btnSeguirRubroText, esSeguido(rubro) && styles.btnSeguirRubroTextActivo]}>
                      {esSeguido(rubro) ? '✓ Siguiendo' : 'Seguir'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingTop: 50 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  seleccionContainer: { flex: 1, padding: 25 },
  searchBarGeneral: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 15, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border, gap: 10, marginBottom: 25 },
  seleccionTitulo: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginBottom: 15 },
  tipoBtn: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: COLORS.white, padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border, elevation: 2 },
  tipoBtnEmoji: { fontSize: 32 },
  tipoBtnTitulo: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  tipoBtnSub: { fontSize: 12, color: COLORS.textSec, marginTop: 3 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, margin: 15, marginBottom: 8, borderRadius: 15, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  btnSeguir: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 15, marginBottom: 5, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#E3F2FD', borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary },
  btnSeguirText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  cambiarTipo: { paddingHorizontal: 15, marginBottom: 5 },
  cambiarTipoText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  lista: { padding: 15 },
  postCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  postUser: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  postRubro: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  distanciaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  distanciaText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  postTitulo: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 5 },
  postDesc: { fontSize: 13, color: COLORS.textSec, lineHeight: 18 },
  urgente: { color: COLORS.red, fontSize: 11, fontWeight: '800', marginTop: 8 },
  emptyText: { textAlign: 'center', color: COLORS.textSec, marginTop: 40, fontSize: 15 },
  modalSeguirOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSeguirContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '80%' },
  modalSeguirHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalSeguirTitulo: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  modalSeguirSub: { fontSize: 13, color: COLORS.textSec, marginBottom: 20 },
  rubroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rubroNombre: { fontSize: 15, color: COLORS.text, fontWeight: '500', flex: 1 },
  btnSeguirRubro: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary },
  btnSeguirRubroActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  btnSeguirRubroText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  btnSeguirRubroTextActivo: { color: COLORS.white },
});