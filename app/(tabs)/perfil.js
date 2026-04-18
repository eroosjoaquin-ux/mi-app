import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  Briefcase,
  Camera,
  ChevronLeft,
  Edit3, LogOut, MapPin,
  ShieldAlert,
  Star
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert, Dimensions, Image,
  Modal,
  ScrollView, StyleSheet, Text,
  TextInput,
  TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const supabaseUrl = 'https://kqittlmnkvdaaualuswr.supabase.co';
const supabaseAnonKey = 'sb_publishable_2Z4BPTVd0qIu4npa-sNjWw_IJ5QqqD_';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const NEUTRAL = { white: '#FFFFFF', dark: '#1A1A1A', gray: '#666666', lightGray: '#F5F7F9', border: '#E1E4E8' };
const BRAND = { primary: '#1976D2', success: '#2E7D32', warning: '#ED6C02', danger: '#D32F2F' };

export default function PerfilScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [fotoPerfil, setFotoPerfil] = useState('https://randomuser.me/api/portraits/men/32.jpg');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMetricasVisible, setModalMetricasVisible] = useState(false); 
  const [nuevoNombre, setNuevoNombre] = useState('');

  // ESTADO PARA EL RADIO DE COBERTURA
  const [radioCobertura, setRadioCobertura] = useState(0);

  const [stats, setStats] = useState({
    trabajos: 0,
    rating: 0,
    reputacion: 0 
  });

  const perfilInfo = {
    especialidad: 'Técnico en Mantenimiento Integrado',
    bio: 'Comprometido con la calidad y la puntualidad. Especialista en soluciones técnicas para el hogar y comercio.',
    verificado: false,
    antiguedad: 'Nuevo',
    zonaNombre: 'San Vicente', // Nombre base
  };

  useEffect(() => {
    cargarDatosUsuario();
  }, []);

  const cargarDatosUsuario = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const nombreRespaldo = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
      setUserData({ nombre: nombreRespaldo });
      setNuevoNombre(nombreRespaldo);

      try {
        // AGREGAMOS 'radio' A LA CONSULTA SELECT
        const { data, error } = await supabase
          .from('Usuarios')
          .select('nombre, avatar_url, puntos_calificacion, trabajos_completados, radio')
          .eq('id', session.user.id)
          .single();
        
        if (data) {
          if (data.nombre) {
            setUserData(data);
            setNuevoNombre(data.nombre);
          }
          if (data.avatar_url) setFotoPerfil(data.avatar_url);
          
          // GUARDAMOS EL RADIO DEL REGISTRO
          if (data.radio) setRadioCobertura(data.radio);
          
          const ratingReal = data.puntos_calificacion || 0;
          setStats({
            trabajos: data.trabajos_completados || 0,
            rating: ratingReal.toFixed(1),
            reputacion: Math.round(ratingReal * 20)
          });
        }
      } catch (e) {
        console.error("Error cargando perfil:", e);
      }
    }
  };

  const actualizarNombre = async () => {
    if (!nuevoNombre || nuevoNombre.trim().length < 3) {
      return Alert.alert("Error", "El nombre debe tener al menos 3 caracteres.");
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('Usuarios')
        .update({ nombre: nuevoNombre.trim() })
        .eq('id', session.user.id);

      if (error) throw error;

      setUserData(prev => ({ ...prev, nombre: nuevoNombre.trim() }));
      setModalVisible(false);
      Alert.alert("¡Éxito!", "Nombre actualizado correctamente.");
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el nombre.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserData(null);
      router.replace('/'); 
    } catch (error) {
      Alert.alert("Error", "No se pudo cerrar la sesión correctamente.");
    }
  };

  const cambiarFotoPerfil = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Permisos", "Necesitamos acceso a tus fotos.");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setLoading(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session.user.id;
        const fileName = `${userId}/avatar_${Date.now()}.jpg`;

        const formData = new FormData();
        formData.append('file', {
          uri: uri,
          name: fileName,
          type: 'image/jpeg',
        });

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, formData, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        const { error: updateError } = await supabase
          .from('Usuarios')
          .update({ avatar_url: publicUrl })
          .eq('id', userId);

        if (updateError) throw updateError;

        setFotoPerfil(publicUrl);
        Alert.alert("¡Éxito!", "Tu foto de perfil ha sido actualizada.");
      } catch (error) {
        Alert.alert("Error", "No se pudo subir la imagen.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      
      {/* --- MODAL DE EDICIÓN NOMBRE --- */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Nombre</Text>
            <TextInput
              style={styles.input}
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              placeholderTextColor={NEUTRAL.gray}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={actualizarNombre} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DE MÉTRICAS --- */}
      <Modal visible={modalMetricasVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Briefcase size={40} color={BRAND.primary} />
              <Text style={[styles.modalTitle, { marginTop: 10 }]}>Historial de Trabajo</Text>
            </View>
            
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Trabajos Terminados:</Text>
              <Text style={styles.metricValue}>{stats.trabajos}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Puntuación General:</Text>
              <Text style={styles.metricValue}>{stats.rating} ★</Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, { width: '100%', marginTop: 20 }]} 
              onPress={() => setModalMetricasVisible(false)}
            >
              <Text style={styles.saveBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.header}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1581094288338-2314dddb7e8b?w=800' }} 
            style={styles.coverImage} 
          />
          <View style={styles.overlay} />
          <SafeAreaView style={styles.navBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
              <ChevronLeft size={24} color="#FFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: fotoPerfil }} style={styles.mainAvatar} />
            <TouchableOpacity style={styles.cameraIcon} onPress={cambiarFotoPerfil} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Camera size={18} color="#FFF" />}
            </TouchableOpacity>
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.userName}>{userData?.nombre || "Cargando..."}</Text>
            <Text style={styles.userSpec}>{perfilInfo.especialidad}</Text>
            
            {/* BADGE DE UBICACIÓN ACTUALIZADO CON RADIO */}
            <View style={styles.locationBadge}>
              <MapPin size={14} color={BRAND.primary} />
              <Text style={styles.locationBadgeText}>
                Área de trabajo: {radioCobertura}km ({perfilInfo.zonaNombre})
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.trustSection} 
            onPress={() => setModalMetricasVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.trustHeader}>
              <Text style={styles.trustLabel}>Nivel de Confianza</Text>
              <Text style={[styles.trustValue, { color: stats.reputacion > 50 ? BRAND.success : BRAND.warning }]}>
                {stats.reputacion}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${stats.reputacion}%`, backgroundColor: stats.reputacion > 50 ? BRAND.success : BRAND.warning }]} />
            </View>
            <Text style={{ fontSize: 10, color: NEUTRAL.gray, marginTop: 5, textAlign: 'center' }}>
              Toca para ver detalles de trabajos
            </Text>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.trabajos}</Text>
              <Text style={styles.statLabel}>Servicios</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.rating}</Text>
              <div style={styles.ratingRow}>
                <Star size={10} color={BRAND.warning} fill={BRAND.warning} />
                <Text style={styles.statLabel}>Rating</Text>
              </div>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{perfilInfo.antiguedad}</Text>
              <Text style={styles.statLabel}>En Brexel</Text>
            </View>
          </View>
        </View>

        {!perfilInfo.verificado && (
          <View style={styles.warningContainer}>
            <View style={styles.warningCard}>
              <ShieldAlert size={20} color={BRAND.danger} />
              <View style={styles.warningInfo}>
                <Text style={styles.warningTitle}>Identidad en Proceso</Text>
                <Text style={styles.warningText}>Tu selfie y DNI están siendo auditados.</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Sobre mí</Text>
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>{perfilInfo.bio}</Text>
          </View>
          
          <TouchableOpacity style={styles.editBtn} onPress={() => setModalVisible(true)} disabled={loading}>
            <Edit3 size={18} color={BRAND.primary} />
            <Text style={styles.editBtnText}>Editar Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={16} color={NEUTRAL.gray} />
            <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NEUTRAL.lightGray },
  header: { height: height * 0.22, width: '100%' },
  coverImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  navBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  profileCard: { backgroundColor: NEUTRAL.white, marginHorizontal: 16, marginTop: -(height * 0.07), borderRadius: 28, padding: 20, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  avatarWrapper: { marginTop: -75, marginBottom: 12 },
  mainAvatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: NEUTRAL.white },
  cameraIcon: { position: 'absolute', bottom: 5, right: 0, backgroundColor: BRAND.primary, padding: 8, borderRadius: 20, borderWidth: 3, borderColor: NEUTRAL.white, justifyContent: 'center', alignItems: 'center', minWidth: 35, minHeight: 35 },
  nameSection: { alignItems: 'center', marginBottom: 20 },
  userName: { fontSize: 24, fontWeight: '800', color: NEUTRAL.dark },
  userSpec: { fontSize: 15, color: BRAND.primary, marginTop: 2, fontWeight: '600' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: NEUTRAL.lightGray, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  locationBadgeText: { fontSize: 13, color: NEUTRAL.gray, fontWeight: '600' },
  trustSection: { width: '100%', marginBottom: 24, padding: 15, backgroundColor: '#F8F9FA', borderRadius: 20, borderWidth: 1, borderColor: NEUTRAL.border },
  trustHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-end' },
  trustLabel: { fontSize: 13, fontWeight: '700', color: NEUTRAL.gray },
  trustValue: { fontSize: 13, fontWeight: '800' },
  progressBarBg: { width: '100%', height: 10, backgroundColor: NEUTRAL.border, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  statsRow: { flexDirection: 'row', width: '100%', paddingTop: 20, borderTopWidth: 1, borderTopColor: NEUTRAL.border },
  statBox: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: NEUTRAL.border, height: 25, alignSelf: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: NEUTRAL.dark },
  statLabel: { fontSize: 11, color: NEUTRAL.gray, textTransform: 'uppercase', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  warningContainer: { paddingHorizontal: 16, marginTop: 16 },
  warningCard: { backgroundColor: '#FFF5F5', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: BRAND.danger, gap: 12 },
  warningInfo: { flex: 1 },
  warningTitle: { fontSize: 14, fontWeight: '800', color: BRAND.danger },
  warningText: { fontSize: 12, color: NEUTRAL.gray, marginTop: 2 },
  contentSection: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: NEUTRAL.dark, marginBottom: 12 },
  bioCard: { backgroundColor: NEUTRAL.white, padding: 18, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  bioText: { fontSize: 15, color: NEUTRAL.gray, lineHeight: 22 },
  editBtn: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: BRAND.primary },
  editBtnText: { color: BRAND.primary, fontWeight: '700', fontSize: 16 },
  logoutBtn: { marginTop: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 },
  logoutBtnText: { color: NEUTRAL.gray, fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 28, padding: 25, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 15, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: NEUTRAL.dark, textAlign: 'center' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: NEUTRAL.border },
  metricLabel: { fontSize: 15, color: NEUTRAL.gray, fontWeight: '600' },
  metricValue: { fontSize: 16, color: BRAND.primary, fontWeight: '800' },
  input: { width: '100%', borderWidth: 1, borderColor: NEUTRAL.border, borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 16, color: NEUTRAL.dark },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: NEUTRAL.gray, fontWeight: '600' },
  saveBtn: { backgroundColor: BRAND.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700' }
});