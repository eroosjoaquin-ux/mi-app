import * as ImagePicker from 'expo-image-picker';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

// CORRECCIÓN: Ruta a la carpeta services
import { supabase } from '../services/supabaseConfig';

export default function RegistroScreen({ onBack }) {
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
  const [radio, setRadio] = useState(5);
  const [coordText, setCoordText] = useState("");

  const handleDniChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 8) setDni(cleaned);
  };

  const subirFotoStorage = async (uri, fileName) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Asegurate de que el bucket 'DNI_FOTOS' exista en tu panel de Supabase
      const { data, error } = await supabase.storage
        .from('DNI_FOTOS')
        .upload(`${Date.now()}_${fileName}`, blob, { 
            upsert: true,
            contentType: 'image/jpeg' 
        });
      
      if (error) throw error;
      return data.path;
    } catch (e) {
      console.log("Error subiendo foto:", e.message);
      return null;
    }
  };

  const seleccionarImagen = async (tipo) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        return Alert.alert("Error", "Necesitamos permiso de cámara para validar tu identidad.");
    }

    Alert.alert("Seleccionar Foto", "Elegí el origen", [
      { text: "Cámara", onPress: async () => {
          const res = await ImagePicker.launchCameraAsync({ 
            allowsEditing: true, 
            aspect: [4, 3],
            quality: 0.5 
          });
          if (!res.canceled) tipo === 'frente' ? setDniFrente(res.assets[0].uri) : setDniDorso(res.assets[0].uri);
      }},
      { text: "Galería", onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ 
            allowsEditing: true, 
            aspect: [4, 3],
            quality: 0.5 
          });
          if (!res.canceled) tipo === 'frente' ? setDniFrente(res.assets[0].uri) : setDniDorso(res.assets[0].uri);
      }},
      { text: "Cancelar", style: "cancel" }
    ]);
  };

  const finalizarRegistro = async () => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Validaciones básicas
    if (dni.length < 7) return Alert.alert("DNI Inválido", "Revisá tu número de documento.");
    if (!cleanEmail || !clave || !dniFrente) return Alert.alert("Faltan datos", "El nombre, DNI y foto de frente son obligatorios.");
    if (clave !== confirmarClave) return Alert.alert("Error", "Las contraseñas no coinciden.");

    setLoading(true);
    try {
      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email: cleanEmail, 
        password: clave 
      });
      
      if (authError) throw authError;

      const userUid = authData.user.id;

      // 2. Subir fotos si existen
      const pathFrente = await subirFotoStorage(dniFrente, `${dni}_frente.jpg`);
      const pathDorso = dniDorso ? await subirFotoStorage(dniDorso, `${dni}_dorso.jpg`) : null;

      // 3. Insertar en tabla Usuarios (Ojo con las mayúsculas en el nombre de la tabla)
      const { error: insertError } = await supabase
        .from('Usuarios') 
        .insert([{ 
            id: userUid,
            usuario_empresa: usuarioEmpresa,
            nombre: nombre,
            dni: dni, 
            radio: radio,
            foto_frente: pathFrente,
            foto_dorso: pathDorso,
            deuda_comision: 0 // Arranca en cero
        }]);

      if (insertError) throw insertError;

      Alert.alert("¡Cuenta Creada!", "Revisá tu email para confirmar el registro.");
      onBack();
      
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
            <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                placeholder="DNI (Sin puntos)" 
                placeholderTextColor="#999" 
                keyboardType="numeric" 
                value={dni} 
                onChangeText={handleDniChange} 
            />
            <TouchableOpacity style={[styles.camBtn, dniFrente && {borderColor: '#4CAF50', backgroundColor: '#E8F5E9'}]} onPress={() => seleccionarImagen('frente')}>
                <Text style={{fontSize: 12}}>{dniFrente? "✅ Listo" : "📷 Frente"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.camBtn, dniDorso && {borderColor: '#4CAF50', backgroundColor: '#E8F5E9'}]} onPress={() => seleccionarImagen('dorso')}>
                <Text style={{fontSize: 12}}>{dniDorso? "✅ Listo" : "📷 Dorso"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.input} onPress={() => { setCoordText("Confirmado"); setRadio(10); Alert.alert("Ubicación", "Zona de cobertura establecida en 10km a la redonda."); }}>
            <Text style={{color: coordText ? '#2E7D32' : '#666', fontWeight: coordText ? 'bold' : 'normal'}}>
                {coordText ? `📍 Cobertura: ${radio}km confirmada` : "📍 Seleccionar Zona de Trabajo"}
            </Text>
          </TouchableOpacity>

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
                <Text style={styles.btnSubmitText}>CREAR CUENTA</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={{ marginTop: 25, marginBottom: 50 }} onPress={onBack}>
            <Text style={{ textAlign: 'center', color: '#666' }}>¿Ya tenés cuenta? <Text style={{color: '#1976D2', fontWeight: 'bold'}}>Iniciá sesión</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { paddingVertical: 40, paddingHorizontal: 25 },
  formTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#1976D2' },
  input: { width: '100%', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#DDD', color: '#000', justifyContent: 'center' },
  dniInputGroup: { flexDirection: 'row', gap: 8, marginBottom: 15, height: 55 },
  camBtn: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#1976D2', justifyContent: 'center', alignItems: 'center', minWidth: 75 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#DDD' },
  inputPasswordInner: { flex: 1, padding: 15, borderRadius: 12, color: '#000' },
  eyeIcon: { paddingHorizontal: 15 },
  btnSubmit: { backgroundColor: '#1976D2', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnSubmitText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
});