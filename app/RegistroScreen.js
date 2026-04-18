import Slider from '@react-native-community/slider'; // Asegurate de tenerla o usá un TextInput numérico
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, MapPin } from 'lucide-react-native';
import { useState } from 'react';
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
  View,
} from 'react-native';
import MapView, { Circle, UrlTile } from 'react-native-maps';

import { Image as ImageCompressor } from 'react-native-compressor';
import { supabase } from '../services/supabaseConfig';

export default function RegistroScreen({ onBack, onNextStep }) {
  const router = useRouter();
  const [usuarioEmpresa, setUsuarioEmpresa] = useState('');
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [dniFrente, setDniFrente] = useState(null);
  const [dniDorso, setDniDorso] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // ESTADOS DEL MAPA
  const [radio, setRadio] = useState(5); 
  const [region, setRegion] = useState({
    latitude: -35.0246,
    longitude: -58.4231,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });
  const [coordText, setCoordText] = useState("San Vicente, Buenos Aires");

  const handleDniChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 8) setDni(cleaned);
  };

  const optimizarYSubir = async (uri, fileName) => {
    try {
      const uriOptimizada = await ImageCompressor.compress(uri, { maxWidth: 1000, quality: 0.7 });
      const response = await fetch(uriOptimizada);
      const blob = await response.blob();
      const { data, error } = await supabase.storage
        .from('DNI_FOTOS')
        .upload(`${Date.now()}_${fileName}`, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw error;
      return data.path;
    } catch (e) {
      console.log("Error optimizando/subiendo:", e.message);
      return null;
    }
  };

  const seleccionarImagen = async (tipo) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Error", "Necesitamos permiso de cámara.");

    Alert.alert("Captura de DNI", "Seleccioná el origen", [
      { text: "Cámara", onPress: async () => {
          const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.5 });
          if (!res.canceled) tipo === 'frente' ? setDniFrente(res.assets[0].uri) : setDniDorso(res.assets[0].uri);
      }},
      { text: "Galería", onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.5 });
          if (!res.canceled) tipo === 'frente' ? setDniFrente(res.assets[0].uri) : setDniDorso(res.assets[0].uri);
      }},
      { text: "Cancelar", style: "cancel" }
    ]);
  };

  const finalizarRegistro = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (dni.length < 7) return Alert.alert("DNI Inválido", "Revisá tu número de documento.");
    if (!cleanEmail || !clave || !dniFrente) return Alert.alert("Faltan datos", "El nombre, DNI y foto de frente son obligatorios.");
    if (clave !== confirmarClave) return Alert.alert("Error", "Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: cleanEmail, password: clave });
      if (authError) throw authError;
      const userUid = authData.user.id;

      const pathFrente = await optimizarYSubir(dniFrente, `${dni}_frente.jpg`);
      const pathDorso = dniDorso ? await optimizarYSubir(dniDorso, `${dni}_dorso.jpg`) : null;

      const { error: insertError } = await supabase
        .from('Usuarios')
        .insert([{
            id: userUid,
            usuario_empresa: usuarioEmpresa,
            nombre: nombre,
            dni: dni,
            radio: radio,
            latitud: region.latitude, // Puente para el perfil
            longitud: region.longitude, // Puente para el perfil
            foto_frente: pathFrente,
            foto_dorso: pathDorso,
            deuda_comision: 0,
            esperando_verificacion: true
        }]);

      if (insertError) throw insertError;
      Alert.alert("¡Casi listo!", "Cuenta creada. Ahora vamos a realizar la prueba de vida.", [{ text: "Continuar", onPress: () => onNextStep() }]);
    } catch (e) {
      Alert.alert("Error en registro", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.formTitle}>Unite a Brexel</Text>
          
          <TextInput style={styles.input} placeholder="Nombre de Usuario / Empresa" placeholderTextColor="#999" value={usuarioEmpresa} onChangeText={setUsuarioEmpresa} />
          <TextInput style={styles.input} placeholder="Nombre y Apellido Real" placeholderTextColor="#999" value={nombre} onChangeText={setNombre} />
          
          <View style={styles.dniInputGroup}>
            <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="DNI" placeholderTextColor="#999" keyboardType="numeric" value={dni} onChangeText={handleDniChange} />
            <TouchableOpacity style={[styles.camBtn, dniFrente && {borderColor: '#4CAF50', backgroundColor: '#E8F5E9'}]} onPress={() => seleccionarImagen('frente')}>
                <Text style={{fontSize: 11, fontWeight: 'bold'}}>{dniFrente? "✅ FRENTE" : "📷 FRENTE"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.camBtn, dniDorso && {borderColor: '#4CAF50', backgroundColor: '#E8F5E9'}]} onPress={() => seleccionarImagen('dorso')}>
                <Text style={{fontSize: 11, fontWeight: 'bold'}}>{dniDorso? "✅ DORSO" : "📷 DORSO"}</Text>
            </TouchableOpacity>
          </View>

          {/* MAPA OPENSTREETMAP */}
          <Text style={styles.label}>Zona de cobertura: {radio}km</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={null}
              initialRegion={region}
              onRegionChangeComplete={(r) => setRegion(r)}
            >
              <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
              <Circle 
                center={{ latitude: region.latitude, longitude: region.longitude }}
                radius={radio * 1000}
                fillColor="rgba(25, 118, 210, 0.2)"
                strokeColor="#1976D2"
              />
            </MapView>
            <View style={styles.mapOverlay}>
               <MapPin size={24} color="#D32F2F" />
            </View>
          </View>
          
          <View style={styles.sliderContainer}>
            <Text>5km</Text>
            <Slider
              style={{flex: 1, height: 40}}
              minimumValue={5}
              maximumValue={150}
              step={5}
              value={radio}
              onValueChange={(v) => setRadio(v)}
              minimumTrackTintColor="#1976D2"
              maximumTrackTintColor="#ddd"
            />
            <Text>150km</Text>
          </View>

          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          
          <View style={styles.passwordContainer}>
            <TextInput style={styles.inputPasswordInner} placeholder="Contraseña" placeholderTextColor="#999" value={clave} onChangeText={setClave} secureTextEntry={!verClave} />
            <TouchableOpacity onPress={() => setVerClave(!verClave)} style={styles.eyeIcon}>
                {verClave? <EyeOff size={22} color="#666" /> : <Eye size={22} color="#666" />}
            </TouchableOpacity>
          </View>

          <TextInput style={styles.input} placeholder="Confirmar Contraseña" placeholderTextColor="#999" value={confirmarClave} onChangeText={setConfirmarClave} secureTextEntry={!verClave} />

          {loading ? (
            <ActivityIndicator size="large" color="#1976D2" style={{marginVertical: 20}} />
          ) : (
            <TouchableOpacity style={styles.btnSubmit} onPress={finalizarRegistro}>
                <Text style={styles.btnSubmitText}>CREAR CUENTA Y VALIDAR</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={{ marginTop: 25, marginBottom: 50 }} onPress={() => router.back()}>
            <Text style={{ textAlign: 'center', color: '#666' }}>
              ¿Ya tenés cuenta? <Text style={{color: '#1976D2', fontWeight: 'bold'}}>Iniciá sesión</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { paddingVertical: 40, paddingHorizontal: 25 },
  formTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#1976D2' },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  input: { width: '100%', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#DDD', color: '#000' },
  dniInputGroup: { flexDirection: 'row', gap: 8, marginBottom: 15, height: 55 },
  camBtn: { backgroundColor: '#E3F2FD', paddingHorizontal: 5, borderRadius: 12, borderWidth: 1, borderColor: '#1976D2', justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  mapContainer: { height: 250, width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: '#DDD', position: 'relative' },
  map: { flex: 1 },
  mapOverlay: { position: 'absolute', top: '50%', left: '50%', marginLeft: -12, marginTop: -24 },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#DDD' },
  inputPasswordInner: { flex: 1, padding: 15, borderRadius: 12, color: '#000' },
  eyeIcon: { paddingHorizontal: 15 },
  btnSubmit: { backgroundColor: '#1976D2', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnSubmitText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});