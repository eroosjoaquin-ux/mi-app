import { useRouter } from 'expo-router';
import {
    AlertCircle, Award,
    Briefcase, Camera,
    CheckCircle2,
    ChevronRight, DollarSign, MapPin,
    Navigation,
    Users, X
} from 'lucide-react-native';
import { useState } from 'react';
import {
    KeyboardAvoidingView, Platform,
    SafeAreaView, ScrollView,
    StyleSheet,
    Switch,
    Text, TextInput,
    TouchableOpacity, View
} from 'react-native';

const COLORS = {
  primary: '#1976D2',
  bg: '#F5F7F9',
  white: '#FFFFFF',
  border: '#E1E4E8',
  text: '#1A1A1A',
  textSec: '#666666',
  accent: '#E3F2FD',
  urgent: '#D32F2F',
  success: '#2E7D32'
};

const RUBROS = ['Plomería', 'Electricidad', 'Construcción', 'Fletes', 'Jardinería', 'Servicio Técnico', 'Limpieza'];

export default function NuevoPostScreen() {
  const router = useRouter();
  
  // ESTADOS DEL FORMULARIO
  const [tipo, setTipo] = useState('oferta'); 
  const [rubro, setRubro] = useState('');
  const [esUrgente, setEsUrgente] = useState(false);
  const [tieneMatricula, setTieneMatricula] = useState(false);
  const [opciones, setOpciones] = useState({ herramientas: false, garantia: false, factura: false });

  const toggleOpcion = (key) => setOpciones({...opciones, [key]: !opciones[key]});

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crear Anuncio Profesional</Text>
          <TouchableOpacity style={styles.btnPublicar} onPress={() => router.back()}>
            <Text style={styles.btnPublicarText}>Publicar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* 1. INTERRUPTOR DE URGENCIA (Novedad) */}
          <View style={[styles.urgentCard, esUrgente && styles.urgentCardActive]}>
            <View style={{flex: 1}}>
              <View style={styles.row}>
                <AlertCircle size={18} color={esUrgente ? COLORS.urgent : COLORS.textSec} />
                <Text style={[styles.urgentTitle, esUrgente && {color: COLORS.urgent}]}>Servicio Urgente</Text>
              </View>
              <Text style={styles.urgentSub}>Destaca tu post con una sirena y prioridad en el Home.</Text>
            </View>
            <Switch 
              value={esUrgente} 
              onValueChange={setEsUrgente} 
              trackColor={{ false: '#767577', true: COLORS.urgent }}
            />
          </View>

          {/* 2. TIPO DE ANUNCIO */}
          <View style={styles.section}>
            <Text style={styles.label}>Propósito del anuncio</Text>
            <View style={styles.tipoRow}>
              <TouchableOpacity 
                style={[styles.tipoBtn, tipo === 'oferta' && styles.tipoBtnActive]} 
                onPress={() => setTipo('oferta')}
              >
                <Briefcase size={18} color={tipo === 'oferta' ? COLORS.primary : COLORS.textSec} />
                <Text style={[styles.tipoLabel, tipo === 'oferta' && styles.tipoLabelActive]}>Ofrecer Trabajo</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tipoBtn, tipo === 'demanda' && styles.tipoBtnActive]} 
                onPress={() => setTipo('demanda')}
              >
                <Users size={18} color={tipo === 'demanda' ? COLORS.primary : COLORS.textSec} />
                <Text style={[styles.tipoLabel, tipo === 'demanda' && styles.tipoLabelActive]}>Buscar Empleado</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. DATOS TÉCNICOS */}
          <View style={styles.section}>
            <Text style={styles.label}>Título del Servicio</Text>
            <TextInput style={styles.input} placeholder="Ej: Electricista de obra y domiciliario" />

            <Text style={styles.label}>Rubro Especializado</Text>
            <TouchableOpacity style={styles.selectorBtn}>
              <Text style={styles.selectorText}>{rubro || "Seleccionar rubro..."}</Text>
              <ChevronRight size={18} color={COLORS.textSec} />
            </TouchableOpacity>
          </View>

          {/* 4. MATRÍCULA Y UBICACIÓN */}
          <View style={styles.rowInputs}>
            <View style={{flex: 1}}>
              <Text style={styles.label}>Zona de labor</Text>
              <View style={styles.inputIconContainer}>
                <MapPin size={16} color={COLORS.primary} />
                <TextInput style={styles.inputIcon} placeholder="Ej: A. Korn" />
                <TouchableOpacity><Navigation size={16} color={COLORS.primary} /></TouchableOpacity>
              </View>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.label}>Presupuesto</Text>
              <View style={styles.inputIconContainer}>
                <DollarSign size={16} color={COLORS.success} />
                <TextInput style={styles.inputIcon} placeholder="0.00" keyboardType="numeric" />
              </View>
            </View>
          </View>

          {/* 5. CHECKLIST PROFESIONAL (Sugerencia 6) */}
          <View style={styles.section}>
            <Text style={styles.label}>Información Adicional</Text>
            <View style={styles.checkGrid}>
              {[
                {id: 'herramientas', label: 'Tengo Herramientas', icon: Briefcase},
                {id: 'garantia', label: 'Doy Garantía', icon: Award},
                {id: 'factura', label: 'Emito Factura', icon: CheckCircle2},
              ].map(item => (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.checkItem, opciones[item.id] && styles.checkItemActive]}
                  onPress={() => toggleOpcion(item.id)}
                >
                  <item.icon size={14} color={opciones[item.id] ? COLORS.primary : COLORS.textSec} />
                  <Text style={[styles.checkText, opciones[item.id] && styles.checkTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 6. DESCRIPCIÓN Y FOTOS */}
          <View style={styles.section}>
            <Text style={styles.label}>Descripción del servicio</Text>
            <TextInput 
              style={[styles.input, styles.textArea]}
              placeholder="Detallá tu experiencia, horarios y materiales incluidos..."
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Evidencia Fotográfica (Máx 4)</Text>
            <View style={styles.fotoGrid}>
              <TouchableOpacity style={styles.addFotoBtn}>
                <Camera size={24} color={COLORS.primary} />
                <Text style={styles.addFotoText}>Cargar</Text>
              </TouchableOpacity>
              {[1, 2, 3].map(i => <View key={i} style={styles.fotoPlaceholder} />)}
            </View>
          </View>

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'ios' ? 50 : 20
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  closeBtn: { padding: 5 },
  btnPublicar: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  btnPublicarText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  scroll: { padding: 20 },
  section: { marginBottom: 22 },
  label: { fontSize: 11, fontWeight: '800', color: COLORS.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  
  urgentCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, 
    padding: 15, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: COLORS.border 
  },
  urgentCardActive: { borderColor: COLORS.urgent, backgroundColor: '#FFF5F5' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  urgentTitle: { fontWeight: '800', fontSize: 15, color: COLORS.text },
  urgentSub: { fontSize: 11, color: COLORS.textSec, lineHeight: 14 },

  tipoRow: { flexDirection: 'row', gap: 10 },
  tipoBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border 
  },
  tipoBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.accent },
  tipoLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSec },
  tipoLabelActive: { color: COLORS.primary },

  input: { 
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 16, 
    fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border 
  },
  selectorBtn: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border 
  },
  selectorText: { color: COLORS.textSec, fontSize: 15, fontWeight: '500' },
  
  rowInputs: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  inputIconContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, 
    borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border 
  },
  inputIcon: { flex: 1, paddingVertical: 14, marginLeft: 8, fontSize: 15, color: COLORS.text },
  
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkItem: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, 
    paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white
  },
  checkItemActive: { borderColor: COLORS.primary, backgroundColor: COLORS.accent },
  checkText: { fontSize: 11, fontWeight: '600', color: COLORS.textSec },
  checkTextActive: { color: COLORS.primary },

  textArea: { height: 110, textAlignVertical: 'top' },

  fotoGrid: { flexDirection: 'row', gap: 10 },
  addFotoBtn: { 
    width: 75, height: 75, borderRadius: 12, borderStyle: 'dashed', 
    borderWidth: 2, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent 
  },
  addFotoText: { fontSize: 10, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  fotoPlaceholder: { width: 75, height: 75, borderRadius: 12, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border }
});