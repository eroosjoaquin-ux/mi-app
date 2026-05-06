import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
    AlertCircle, Award,
    Briefcase, Camera,
    CheckCircle2,
    ChevronRight,
    Coffee, Coins,
    DollarSign,
    Truck,
    Users, X
} from 'lucide-react-native';
import { useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text, TextInput,
    TouchableOpacity, View
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseConfig';

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

const RUBROS = [
  'Albañilería', 'Carpintería', 'Cerrajería', 'Climatización y Refrigeración',
  'Construcción Seco/Tradicional', 'Electricidad Domiciliaria',
  'Fletes y Mudanzas', 'Gasista y Plomería', 'Herrería y Soldadura',
  'Jardinería y Paisajismo', 'Limpieza y Mantenimiento', 'Mecánica (Autos/Motos)',
  'Pintura y Revestimientos', 'Programación y Tecnología', 'Seguridad (Cámaras/Alarmas)',
  'Servicio Técnico Electrodomésticos', 'Tapicería y Restauración',
  'Techista e Impermeabilización', 'Vidriería y Aberturas'
].sort();

export default function nuevo_post({ onSuccess }) {
    const router = useRouter();
    
    const [tipo, setTipo] = useState('oferta'); 
    const [titulo, setTitulo] = useState('');
    const [rubro, setRubro] = useState('');
    const [presupuesto, setPresupuesto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [esUrgente, setEsUrgente] = useState(false);
    const [opciones, setOpciones] = useState({});
    const [modalVisible, setModalVisible] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [imagenes, setImagenes] = useState([]);

    const pickImage = async () => {
        if (imagenes.length >= 4) {
            Alert.alert("Límite alcanzado", "Puedes subir un máximo de 4 fotos.");
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], 
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });
        if (!result.canceled) {
            setImagenes([...imagenes, result.assets[0].uri]);
        }
    };

    const eliminarFoto = (index) => {
        const nuevasFotos = [...imagenes];
        nuevasFotos.splice(index, 1);
        setImagenes(nuevasFotos);
    };

    const toggleOpcion = (key) => setOpciones({...opciones, [key]: !opciones[key]});

    const seleccionarRubro = (item) => {
        setRubro(item);
        setModalVisible(false);
    };

    const handlePublicar = async () => {
        if (!titulo || !rubro || !descripcion) {
            Alert.alert("Faltan datos", "Por favor completa el título, rubro y descripción.");
            return;
        }

        setCargando(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error("Debes estar iniciado sesión para publicar.");

            // Traer ubicación y zona del perfil del usuario
            const { data: perfil } = await supabase
                .from('Usuarios')
                .select('latitud, longitud, zona_residencial, radio_alcance_km, usuario_empresa, nombre')
                .eq('id', user.id)
                .single();

            const { error } = await supabase
                .from('posts')
                .insert([{
                    usuario_id: user.id,
                    tipo: tipo,
                    titulo: titulo,
                    rubro: rubro,
                    zona: perfil?.zona_residencial || 'Sin zona',
                    latitud: perfil?.latitud || null,
                    longitud: perfil?.longitud || null,
                    radio_alcance_km: perfil?.radio_alcance_km || 5,
                    presupuesto: presupuesto ? parseFloat(presupuesto) : null,
                    es_urgente: esUrgente,
                    descripcion: descripcion,
                    opciones: opciones,
                    postPhoto: imagenes.length > 0 ? imagenes[0] : null,
                    reputacion: 100,
                    verificado: true,
                    likes: 0,
                    comments: 0
                }]);

            if (error) throw error;

            Alert.alert(
                "¡Éxito!", 
                "Tu anuncio ha sido publicado correctamente.",
                [{ 
                    text: "OK", 
                    onPress: () => {
                        if (onSuccess) {
                            onSuccess();
                        } else {
                            router.replace('/HomeScreen');
                        }
                    } 
                }],
                { cancelable: false }
            );
            
        } catch (error) {
            Alert.alert("Error", error.message);
        } finally {
            setCargando(false);
        }
    };

    const opcionesDinamicas = tipo === 'oferta' 
        ? [
            {id: 'herramientas', label: 'Tengo Herramientas', icon: Briefcase},
            {id: 'garantia', label: 'Doy Garantía', icon: Award},
            {id: 'factura', label: 'Emito Factura', icon: CheckCircle2},
            {id: 'movilidad', label: 'Movilidad Propia', icon: Truck}
          ]
        : [
            {id: 'herramientas_req', label: 'Tengo Herramientas', icon: Briefcase},
            {id: 'pago_efectivo', label: 'Pago Efectivo', icon: Coins},
            {id: 'viaticos', label: 'Pago Viáticos', icon: Truck},
            {id: 'refrigerio', label: 'Doy Refrigerio', icon: Coffee}
          ];

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                
                <Modal visible={modalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Seleccionar Rubro</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <X size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={RUBROS}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.rubroItem} onPress={() => seleccionarRubro(item)}>
                                        <Text style={styles.rubroItemText}>{item}</Text>
                                        {rubro === item && <CheckCircle2 size={18} color={COLORS.primary} />}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => onSuccess && onSuccess()} style={styles.closeBtn}>
                        <X size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Crear Anuncio Profesional</Text>
                    <TouchableOpacity 
                        style={[styles.btnPublicar, cargando && { opacity: 0.5 }]} 
                        onPress={handlePublicar}
                        disabled={cargando}
                    >
                        <Text style={styles.btnPublicarText}>{cargando ? '...' : 'Publicar'}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    
                    <View style={[styles.urgentCard, esUrgente && styles.urgentCardActive]}>
                        <View style={{flex: 1}}>
                            <View style={styles.row}>
                                <AlertCircle size={18} color={esUrgente ? COLORS.urgent : COLORS.textSec} />
                                <Text style={[styles.urgentTitle, esUrgente && {color: COLORS.urgent}]}>Servicio Urgente</Text>
                            </View>
                            <Text style={styles.urgentSub}>Prioridad máxima en el Home y sirena distintiva.</Text>
                        </View>
                        <Switch 
                            value={esUrgente} 
                            onValueChange={setEsUrgente} 
                            trackColor={{ false: '#767577', true: COLORS.urgent }}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Propósito del anuncio</Text>
                        <View style={styles.tipoRow}>
                            <TouchableOpacity 
                                style={[styles.tipoBtn, tipo === 'oferta' && styles.tipoBtnActive]} 
                                onPress={() => { setTipo('oferta'); setOpciones({}); }}
                            >
                                <Briefcase size={18} color={tipo === 'oferta' ? COLORS.primary : COLORS.textSec} />
                                <Text style={[styles.tipoLabel, tipo === 'oferta' && styles.tipoLabelActive]}>Ofrecer Mi Trabajo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tipoBtn, tipo === 'demanda' && styles.tipoBtnActive]} 
                                onPress={() => { setTipo('demanda'); setOpciones({}); }}
                            >
                                <Users size={18} color={tipo === 'demanda' ? COLORS.primary : COLORS.textSec} />
                                <Text style={[styles.tipoLabel, tipo === 'demanda' && styles.tipoLabelActive]}>Buscar A Alguien</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Título del Servicio</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Ej: Electricista matriculado" 
                            value={titulo}
                            onChangeText={setTitulo}
                        />

                        <Text style={styles.label}>Rubro Especializado</Text>
                        <TouchableOpacity style={styles.selectorBtn} onPress={() => setModalVisible(true)}>
                            <Text style={styles.selectorText}>{rubro || "Seleccionar rubro..."}</Text>
                            <ChevronRight size={18} color={COLORS.textSec} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Presupuesto <Text style={styles.labelOpcional}>(Opcional)</Text></Text>
                        <View style={styles.inputIconContainer}>
                            <DollarSign size={16} color={COLORS.success} />
                            <TextInput 
                                style={styles.inputIcon} 
                                placeholder="Dejá vacío si preferís no indicarlo" 
                                keyboardType="numeric" 
                                value={presupuesto}
                                onChangeText={setPresupuesto}
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>
                            {tipo === 'oferta' ? 'Información Profesional' : 'Beneficios para el Trabajador'}
                        </Text>
                        <View style={styles.checkGrid}>
                            {opcionesDinamicas.map(item => (
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

                    <View style={styles.section}>
                        <Text style={styles.label}>Descripción</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]}
                            placeholder="Detallá horarios, materiales y experiencia..."
                            multiline
                            numberOfLines={4}
                            value={descripcion}
                            onChangeText={setDescripcion}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Fotos (Máx 4)</Text>
                        <View style={styles.fotoGrid}>
                            <TouchableOpacity style={styles.addFotoBtn} onPress={pickImage}>
                                <Camera size={24} color={COLORS.primary} />
                                <Text style={styles.addFotoText}>Cargar</Text>
                            </TouchableOpacity>
                            
                            {imagenes.map((uri, index) => (
                                <View key={index} style={styles.fotoPlaceholder}>
                                    <Image source={{ uri }} style={styles.fotoReal} />
                                    <TouchableOpacity 
                                        style={styles.deleteFoto} 
                                        onPress={() => eliminarFoto(index)}
                                    >
                                        <X size={12} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {[...Array(Math.max(0, 3 - imagenes.length))].map((_, i) => (
                                <View key={`empty-${i}`} style={styles.fotoPlaceholder} />
                            ))}
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
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    closeBtn: { padding: 5 },
    btnPublicar: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
    btnPublicarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    scroll: { padding: 20 },
    section: { marginBottom: 22 },
    label: { fontSize: 11, fontWeight: '800', color: COLORS.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    labelOpcional: { fontSize: 10, fontWeight: '500', color: COLORS.textSec, textTransform: 'none', letterSpacing: 0 },
    urgentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, padding: 15, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: COLORS.border },
    urgentCardActive: { borderColor: COLORS.urgent, backgroundColor: '#FFF5F5' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    urgentTitle: { fontWeight: '800', fontSize: 15, color: COLORS.text },
    urgentSub: { fontSize: 11, color: COLORS.textSec, lineHeight: 14 },
    tipoRow: { flexDirection: 'row', gap: 10 },
    tipoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border },
    tipoBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.accent },
    tipoLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSec },
    tipoLabelActive: { color: COLORS.primary },
    input: { backgroundColor: COLORS.bg, borderRadius: 12, padding: 16, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
    selectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
    selectorText: { color: COLORS.textSec, fontSize: 15, fontWeight: '500' },
    inputIconContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
    inputIcon: { flex: 1, paddingVertical: 14, marginLeft: 8, fontSize: 15, color: COLORS.text },
    checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    checkItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
    checkItemActive: { borderColor: COLORS.primary, backgroundColor: COLORS.accent },
    checkText: { fontSize: 11, fontWeight: '600', color: COLORS.textSec },
    checkTextActive: { color: COLORS.primary },
    textArea: { height: 110, textAlignVertical: 'top' },
    fotoGrid: { flexDirection: 'row', gap: 10 },
    addFotoBtn: { width: 75, height: 75, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent },
    addFotoText: { fontSize: 10, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
    fotoPlaceholder: { width: 75, height: 75, borderRadius: 12, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', position: 'relative' },
    fotoReal: { width: '100%', height: '100%', resizeMode: 'cover' },
    deleteFoto: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    rubroItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    rubroItemText: { fontSize: 16, color: COLORS.text }
});