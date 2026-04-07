import { useRouter } from 'expo-router';
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Edit3,
  MapPin, Navigation,
  ShieldAlert,
  ShieldCheck, Star
} from 'lucide-react-native';
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet, Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

const NEUTRAL = {
  white: '#FFFFFF',
  dark: '#1A1A1A',
  gray: '#666666',
  lightGray: '#F5F7F9',
  border: '#E1E4E8'
};

const BRAND = {
  primary: '#1976D2', 
  success: '#2E7D32', 
  warning: '#ED6C02',
  danger: '#D32F2F',
  info: '#0288D1'
};

export default function PerfilScreen() {
  const router = useRouter();

  // --- CONFIGURACIÓN DE PRUEBA ---
  // Cambiá 'verificado' a true para ver cómo queda el perfil aprobado
  const perfil = {
    nombre: 'Eros Joaquín Bravo',
    especialidad: 'Técnico en Mantenimiento Integrado',
    bio: 'Comprometido con la calidad y la puntualidad. Especialista en soluciones técnicas para el hogar y comercio con amplia trayectoria en la zona.',
    reputacion: 98,
    verificado: false, // ESTADO INICIAL
    metricas: { trabajos: 142, rating: 4.9, antiguedad: '2 años' },
    zonaNombre: 'San Vicente',
    radioCobertura: '15 km'
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER CON OVERLAY */}
        <View style={styles.coverContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1581094288338-2314dddb7e8b?w=800' }} 
            style={styles.coverImage} 
          />
          <View style={styles.overlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* TARJETA DE PERFIL PRINCIPAL */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
              style={styles.mainAvatar} 
            />
            <TouchableOpacity style={styles.cameraIcon}>
              <Camera size={16} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{perfil.nombre}</Text>
              {perfil.verificado ? (
                <ShieldCheck size={22} color={BRAND.primary} fill={BRAND.primary + '20'} />
              ) : (
                <Clock size={22} color={BRAND.warning} />
              )}
            </View>
            <Text style={styles.userSpec}>{perfil.especialidad}</Text>
            
            <View style={styles.locationBadge}>
              <MapPin size={14} color={BRAND.primary} />
              <Text style={styles.locationBadgeText}>{perfil.zonaNombre}</Text>
            </View>
          </View>

          {/* MÓDULO DE BLOQUEO / AUDITORÍA (Solo se ve si no está verificado) */}
          {!perfil.verificado && (
            <View style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <ShieldAlert size={20} color={BRAND.danger} />
                <Text style={styles.warningTitle}>Identidad en Proceso</Text>
              </View>
              <Text style={styles.warningText}>
                Tu selfie y DNI están siendo auditados por seguridad. Recibirás una notificación cuando puedas aceptar trabajos.
              </Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{perfil.metricas.trabajos}</Text>
              <Text style={styles.statLabel}>Servicios</Text>
            </View>
            <View style={[styles.statBox, styles.statDivider]}>
              <Text style={styles.statValue}>{perfil.metricas.rating}</Text>
              <View style={styles.ratingRow}>
                <Star size={10} color={BRAND.warning} fill={BRAND.warning} />
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{perfil.metricas.antiguedad}</Text>
              <Text style={styles.statLabel}>En Brexel</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentSection}>
          {/* INDICADOR DE CONFIANZA */}
          <Text style={styles.sectionTitle}>Indicador de Confianza</Text>
          <View style={styles.trustCard}>
            <View style={styles.trustHeader}>
              <Text style={styles.trustText}>Cumplimiento: <Text style={{fontWeight:'800', color: BRAND.success}}>{perfil.reputacion}%</Text></Text>
              <CheckCircle2 size={18} color={BRAND.success} />
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${perfil.reputacion}%` }]} />
            </View>
            <Text style={styles.trustSub}>Este puntaje se basa en la validación de tus clientes reales.</Text>
          </View>

          {/* ZONA DE COBERTURA */}
          <Text style={[styles.sectionTitle, {marginTop: 25}]}>Zona de Trabajo</Text>
          <View style={styles.mapCard}>
            <View style={styles.mapIconCircle}>
              <Navigation size={22} color={BRAND.primary} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.mapTitle}>Área de Servicio</Text>
              <Text style={styles.mapSub}>{perfil.zonaNombre} y alrededores ({perfil.radioCobertura})</Text>
            </View>
          </View>

          {/* BIO */}
          <Text style={[styles.sectionTitle, {marginTop: 25}]}>Sobre mí</Text>
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>{perfil.bio}</Text>
          </View>

          {/* BOTÓN EDITAR */}
          <TouchableOpacity style={styles.editBtn}>
            <Edit3 size={18} color={BRAND.primary} />
            <Text style={styles.editBtnText}>Editar Información Profesional</Text>
          </TouchableOpacity>
        </View>

        <View style={{height: 60}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NEUTRAL.lightGray },
  coverContainer: { height: 180, width: '100%' },
  coverImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  backBtn: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  
  profileCard: { 
    backgroundColor: NEUTRAL.white, marginHorizontal: 20, marginTop: -60, borderRadius: 24, padding: 20,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 
  },
  avatarWrapper: { marginTop: -70, marginBottom: 15 },
  mainAvatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: NEUTRAL.white },
  cameraIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: BRAND.primary, padding: 8, borderRadius: 20, borderWidth: 2, borderColor: NEUTRAL.white },
  
  nameSection: { alignItems: 'center', marginBottom: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 22, fontWeight: '900', color: NEUTRAL.dark },
  userSpec: { fontSize: 14, color: BRAND.primary, fontWeight: '700', marginTop: 4 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: NEUTRAL.lightGray, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 10 },
  locationBadgeText: { fontSize: 12, fontWeight: '700', color: NEUTRAL.gray },

  // TARJETA DE AVISO DE AUDITORÍA
  warningCard: { backgroundColor: '#FFF5F5', width: '100%', padding: 15, borderRadius: 16, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: BRAND.danger },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  warningTitle: { fontSize: 14, fontWeight: '800', color: BRAND.danger },
  warningText: { fontSize: 12, color: '#666', lineHeight: 18 },

  statsRow: { flexDirection: 'row', width: '100%', paddingTop: 15, borderTopWidth: 1, borderTopColor: NEUTRAL.border },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: NEUTRAL.border },
  statValue: { fontSize: 16, fontWeight: '800', color: NEUTRAL.dark },
  statLabel: { fontSize: 10, color: NEUTRAL.gray, textTransform: 'uppercase', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  contentSection: { padding: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: NEUTRAL.dark, marginBottom: 15 },
  
  trustCard: { backgroundColor: NEUTRAL.white, padding: 18, borderRadius: 20, elevation: 2 },
  trustHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  trustText: { fontSize: 14, color: NEUTRAL.dark },
  progressBarBg: { width: '100%', height: 10, backgroundColor: NEUTRAL.lightGray, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: BRAND.success },
  trustSub: { fontSize: 11, color: NEUTRAL.gray, marginTop: 12, fontStyle: 'italic' },

  mapCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: NEUTRAL.white, padding: 15, borderRadius: 20, gap: 15, elevation: 2 },
  mapIconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: BRAND.primary + '10', alignItems: 'center', justifyContent: 'center' },
  mapTitle: { fontSize: 15, fontWeight: '800', color: NEUTRAL.dark },
  mapSub: { fontSize: 13, color: NEUTRAL.gray, marginTop: 2 },

  bioCard: { backgroundColor: NEUTRAL.white, padding: 20, borderRadius: 20, elevation: 1 },
  bioText: { fontSize: 14, color: NEUTRAL.gray, lineHeight: 22 },
  
  editBtn: { 
    marginTop: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    gap: 10, padding: 18, borderRadius: 16, borderWidth: 2, borderColor: BRAND.primary 
  },
  editBtnText: { color: BRAND.primary, fontWeight: '800', fontSize: 15 }
});