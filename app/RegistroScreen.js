import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, CheckCircle2, Eye, EyeOff, Fingerprint, MapPin } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseConfig';

export default function RegistroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const lockRef = useRef(false);

  // --- ESTADOS DEL FORMULARIO ---
  const [usuarioEmpresa, setUsuarioEmpresa] = useState(params.usuarioEmpresa || '');
  const [nombre, setNombre] = useState(params.nombre || '');
  const [dni, setDni] = useState(params.dni || '');
  const [email, setEmail] = useState(params.email || '');
  const [clave, setClave] = useState(params.clave || '');
  const [confirmarClave, setConfirmarClave] = useState(params.confirmarClave || '');
  
  // --- ESTADOS DE UBICACIÓN ---
  const [radio, setRadio] = useState(params.radio_alcance_km || '5');
  const [latitud, setLatitud] = useState(params.latitud || null);
  const [longitud, setLongitud] = useState(params.longitud || null);
  const [zonaResidencial, setZonaResidencial] = useState(params.zona_residencial || '');
  
  // --- ESTADOS DE CONTROL ---
  const [identidadValidada, setIdentidadValidada] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verClave, setVerClave] = useState(false);

  // --- EFECTO PARA SINCRONIZAR PARÁMETROS ---
  useEffect(() => {
    // Sincroniza ubicación
    if (params.latitud) setLatitud(params.latitud);
    if (params.longitud) setLongitud(params.longitud);
    if (params.zona_residencial) setZonaResidencial(params.zona_residencial);
    if (params.radio_alcance_km) setRadio(params.radio_alcance_km);
    
    // Sincroniza datos personales (Para que no se borren al volver de biometría)
    if (params.dni) setDni(params.dni);
    if (params.nombre) setNombre(params.nombre);
    if (params.usuarioEmpresa) setUsuarioEmpresa(params.usuarioEmpresa);
    if (params.email) setEmail(params.email);
    if (params.clave) setClave(params.clave);
    if (params.confirmarClave) setConfirmarClave(params.confirmarClave);
    
    if (params.validado === 'true') setIdentidadValidada(true);
  }, [params]);

  const zonaSeleccionada = latitud !== null && latitud !== undefined && latitud !== ""; 

  const handleDniChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 8) setDni(cleaned);
  };

  const irABiometria = () => {
    router.push({
      pathname: '/registro_biometrico', 
      params: { 
        dni, usuarioEmpresa, nombre, email, clave, confirmarClave, 
        radio_alcance_km: radio, latitud, longitud, zona_residencial: zonaResidencial 
      }
    });
  };

  const irASeleccionarZona = () => {
    router.push({
      pathname: '/components/Mapas', 
      params: { 
        dni, usuarioEmpresa, nombre, email, clave, confirmarClave, 
        radio_alcance_km: radio,
        latitud: latitud || -35.0246, 
        longitud: longitud || -58.4231,
        validado: identidadValidada ? 'true' : 'false'
      }
    });
  };

  const finalizarRegistro = async () => {
    if (lockRef.current || loading) return;
    if (!identidadValidada) return Alert.alert("Validación pendiente", "Debés completar el registro biométrico.");
    if (!zonaSeleccionada) return Alert.alert("Zona requerida", "Selecciona tu zona en el mapa.");
    
    const cleanEmail = email.trim().toLowerCase();
    if (!nombre || !dni || !clave || clave !== confirmarClave) {
      return Alert.alert("Error", "Verifica los campos y que las contraseñas coincidan.");
    }

    lockRef.current = true;
    setLoading(true);

    try {
      const { data: existingUser } = await supabase.from('Usuarios').select('id').eq('dni', dni).maybeSingle();
      if (existingUser) throw new Error("Este DNI ya está registrado.");

      // 1. Primero creas el usuario en Auth (esto dispara el Trigger de Supabase automáticamente)
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: cleanEmail, password: clave });
      if (authError) throw authError;

      const userId = authData?.user?.id;
      
      // 2. En lugar de .insert(), usamos .update() 
      // Porque el Trigger ya creó la fila con el ID, ahora le ponemos los datos del formulario
      const { error: dbError } = await supabase
        .from('Usuarios')
        .update({
          usuario_empresa: usuarioEmpresa || null,
          nombre: nombre,
          dni: dni,
          radio: parseInt(radio),
          latitud: parseFloat(latitud), 
          longitud: parseFloat(longitud),
          verificado_biometria: true, 
          estado_verificacion: 'aprobado',
          zona_residencial: zonaResidencial || 'Zona seleccionada',
          fecha_auditoria: new Date().toISOString()
        })
        .eq('id', userId); // Buscamos la fila que acaba de crear el Trigger

      if (dbError) throw dbError;
      
      Alert.alert("¡Éxito!", "Cuenta creada correctamente.", [{ text: "Ingresar", onPress: () => router.replace('/HomeScreen') }]);
    } catch (e) {
      Alert.alert("Error de Registro", e.message);
    } finally {
      setLoading(false);
      lockRef.current = false;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.formTitle}>Unite a Brexel</Text>
            
            <TextInput 
              style={styles.input} 
              placeholder="Nombre de Usuario / Empresa (Opcional)" 
              placeholderTextColor="#999" 
              value={usuarioEmpresa} 
              onChangeText={setUsuarioEmpresa} 
            />
            
            <TextInput 
              style={styles.input} 
              placeholder="Nombre y Apellido Real" 
              placeholderTextColor="#999" 
              value={nombre} 
              onChangeText={setNombre} 
            />
            
            <View style={styles.dniInputGroup}>
              <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                placeholder="DNI" 
                placeholderTextColor="#999" 
                keyboardType="numeric" 
                value={dni} 
                onChangeText={handleDniChange} 
                editable={true} 
              />
              <TouchableOpacity 
                style={[styles.bioBtn, identidadValidada && styles.bioBtnSuccess]} 
                onPress={irABiometria}
              >
                {identidadValidada ? <CheckCircle2 size={20} color="#FFF" /> : <Fingerprint size={20} color="#1976D2" />}
                <Text style={[styles.bioBtnText, identidadValidada && {color: '#FFF'}]}>
                  {identidadValidada ? "VALIDADO" : "BIO-DNI"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.mapBtn, zonaSeleccionada && styles.mapBtnSuccess]} 
              onPress={irASeleccionarZona}
            >
              <View style={styles.mapBtnContent}>
                {zonaSeleccionada ? <Check size={22} color="#FFF" /> : <MapPin size={22} color="#1976D2" />}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mapBtnText, zonaSeleccionada && { color: '#FFF' }]}>
                    {zonaSeleccionada ? "ZONA SELECCIONADA" : "SELECCIONAR ZONA DE TRABAJO"}
                  </Text>
                  {zonaSeleccionada && (
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '500' }} numberOfLines={1}>
                      {zonaResidencial} • {radio}km de alcance
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            <TextInput 
              style={styles.input} 
              placeholder="Email" 
              placeholderTextColor="#999" 
              value={email} 
              onChangeText={setEmail} 
              autoCapitalize="none" 
              keyboardType="email-address" 
            />
            
            <View style={styles.passwordContainer}>
              <TextInput 
                style={styles.inputPasswordInner} 
                placeholder="Contraseña" 
                placeholderTextColor="#999" 
                value={clave} 
                onChangeText={setClave} 
                secureTextEntry={!verClave} 
              />
              <TouchableOpacity onPress={() => setVerClave(!verClave)} style={styles.eyeIcon}>
                  {verClave? <EyeOff size={22} color="#666" /> : <Eye size={22} color="#666" />}
              </TouchableOpacity>
            </View>

            <TextInput 
              style={styles.input} 
              placeholder="Confirmar Contraseña" 
              placeholderTextColor="#999" 
              value={confirmarClave} 
              onChangeText={setConfirmarClave} 
              secureTextEntry={!verClave} 
            />

            {loading ? (
              <ActivityIndicator size="large" color="#1976D2" style={{marginVertical: 20}} />
            ) : (
              <TouchableOpacity 
                style={[styles.btnSubmit, (!identidadValidada || !zonaSeleccionada) && styles.btnDisabled]} 
                onPress={finalizarRegistro}
                disabled={!identidadValidada || !zonaSeleccionada}
              >
                <Text style={styles.btnSubmitText}>
                  {(!identidadValidada || !zonaSeleccionada) ? "FALTAN DATOS" : "FINALIZAR REGISTRO"}
                </Text>
              </TouchableOpacity>
            )}
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { paddingVertical: 20, paddingHorizontal: 25, paddingBottom: 50 },
  formTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1976D2' },
  input: { width: '100%', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#DDD', color: '#000' },
  dniInputGroup: { flexDirection: 'row', gap: 8, marginBottom: 12, height: 55 },
  bioBtn: { backgroundColor: '#E3F2FD', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1976D2', justifyContent: 'center', alignItems: 'center', minWidth: 100, flexDirection: 'row', gap: 5 },
  bioBtnSuccess: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  bioBtnText: { fontSize: 11, fontWeight: 'bold', color: '#1976D2' },
  mapBtn: { width: '100%', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1976D2', borderStyle: 'dashed' },
  mapBtnSuccess: { backgroundColor: '#4CAF50', borderColor: '#4CAF50', borderStyle: 'solid' },
  mapBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapBtnText: { fontWeight: 'bold', color: '#1976D2', fontSize: 14 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#DDD' },
  inputPasswordInner: { flex: 1, padding: 15, borderRadius: 12, color: '#000' },
  eyeIcon: { paddingHorizontal: 15 },
  btnSubmit: { backgroundColor: '#1976D2', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: '#B0BEC5' },
  btnSubmitText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});