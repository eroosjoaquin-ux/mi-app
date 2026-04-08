import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import {
  Camera as CameraIcon,
  CheckCircle2,
  Circle,
  ShieldAlert,
  UserCheck,
  X
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseConfig';

export default function RegistroBiometrico({ onComplete }) {
  const router = useRouter();
  const [paso, setPaso] = useState(1); 
  const [aceptoSeguro, setAceptoSeguro] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [fotoDNI, setFotoDNI] = useState(null);
  const [fotoSelfie, setFotoSelfie] = useState(null);
  const cameraRef = useRef(null);

  const tomarFoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        if (paso === 1) setFotoDNI(photo.uri);
        else setFotoSelfie(photo.uri);
        setMostrarCamara(false);
      } catch (e) {
        Alert.alert("Error", "No se pudo capturar la imagen. Intentá de nuevo.");
      }
    }
  };

  const manejarBotonCamara = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permiso denegado", "Necesitamos la cámara para validar tu identidad.");
        return;
      }
    }
    setMostrarCamara(true);
  };

  const finalizarRegistro = async () => {
    if (!aceptoSeguro) {
      Alert.alert("Atención", "Debes declarar que cuentas con seguro para poder continuar.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("No se encontró una sesión activa");

      // SINCRONIZADO CON TU TABLA: Usamos 'esperando_verificacion'
      const { error: updateError } = await supabase
        .from('Usuarios') 
        .update({ 
          esperando_verificacion: true, // Esta es la columna real de tu tabla
          declaracion_seguro: true,
          fecha_auditoria: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      Alert.alert(
        "Éxito", 
        "Validación completada correctamente.",
        [{ text: "Entrar", onPress: () => {
            // Ejecutamos la función de cierre y redirigimos
            if (onComplete) onComplete();
            router.replace('/(tabs)/social');
        }}]
      );

    } catch (error) {
      console.log("Error detallado:", error);
      Alert.alert("Error de Conexión", "No pudimos actualizar tu perfil.");
    } finally {
      setLoading(false);
    }
  };

  if (mostrarCamara) {
    return (
      <View style={styles.cameraFullScreen}>
        <CameraView 
          style={StyleSheet.absoluteFill} 
          ref={cameraRef} 
          facing={paso === 2 ? 'front' : 'back'}
        />
        <View style={styles.cameraOverlay}>
          <TouchableOpacity style={styles.btnCerrar} onPress={() => setMostrarCamara(false)}>
            <X color="#fff" size={30} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnDisparar} onPress={tomarFoto}>
            <View style={styles.circuloInterno} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F7F9' }} edges={['right', 'left', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Validación de Seguridad</Text>
          <Text style={styles.subtitle}>Paso {paso} de 2</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            {paso === 1 ? <ShieldAlert size={48} color="#1976D2" /> : <UserCheck size={48} color="#2E7D32" />}
          </View>
          <Text style={styles.cardTitle}>{paso === 1 ? "Foto del DNI" : "Prueba de Vida"}</Text>
          
          {(paso === 1 ? fotoDNI : fotoSelfie) ? (
            <Image source={{ uri: paso === 1 ? fotoDNI : fotoSelfie }} style={styles.preview} />
          ) : (
            <Text style={styles.cardText}>
              {paso === 1 
                ? "Captura el frente de tu documento. Asegúrate de que los datos sean legibles." 
                : "IMPORTANTE: Sostén tu DNI al lado de tu cara y guiña un ojo para la selfie."}
            </Text>
          )}

          <TouchableOpacity style={styles.btnFoto} onPress={manejarBotonCamara}>
            <CameraIcon color="#fff" size={20} />
            <Text style={styles.btnText}>
              {(paso === 1 ? fotoDNI : fotoSelfie) ? "Repetir Captura" : "Abrir Cámara"}
            </Text>
          </TouchableOpacity>

          {paso === 1 && fotoDNI && (
            <TouchableOpacity style={[styles.btnFoto, {backgroundColor: '#2E7D32', marginTop: 10}]} onPress={() => setPaso(2)}>
              <Text style={styles.btnText}>Continuar al Paso 2</Text>
            </TouchableOpacity>
          )}
        </View>

        {paso === 2 && fotoSelfie && (
          <View style={[styles.card, {marginTop: 20}]}>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setAceptoSeguro(!aceptoSeguro)}>
              {aceptoSeguro ? <CheckCircle2 size={26} color="#2E7D32" /> : <Circle size={26} color="#CCC" />}
              <Text style={styles.checkboxText}>Declaro que cuento con seguro vigente.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnFinalizar, (!aceptoSeguro || loading) && { backgroundColor: '#BDBDBD' }]} 
              onPress={finalizarRegistro}
              disabled={!aceptoSeguro || loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Enviar para Auditoría</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { marginTop: 20, marginBottom: 30 },
  title: { fontSize: 24, fontWeight: '900', color: '#1A1A1A' },
  subtitle: { fontSize: 16, color: '#1976D2', fontWeight: '700' },
  iconContainer: { alignItems: 'center', marginBottom: 10 },
  card: { backgroundColor: '#fff', padding: 25, borderRadius: 28, elevation: 3 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  cardText: { textAlign: 'center', color: '#666', marginTop: 12, lineHeight: 22 },
  preview: { width: '100%', height: 200, borderRadius: 16, marginTop: 15 },
  btnFoto: { backgroundColor: '#1976D2', flexDirection: 'row', padding: 18, borderRadius: 16, marginTop: 25, gap: 10, alignItems: 'center', justifyContent: 'center' },
  btnFinalizar: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 16, width: '100%', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cameraFullScreen: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { 
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end', 
    alignItems: 'center', 
    paddingBottom: 40 
  },
  btnDisparar: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  circuloInterno: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  btnCerrar: { position: 'absolute', top: 40, right: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  checkboxText: { flex: 1, fontSize: 13, color: '#444' }
});