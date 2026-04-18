import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech'; // <-- Nueva dependencia
import {
  Camera as CameraIcon,
  CheckCircle2,
  Circle,
  ScanFace,
  ShieldAlert,
  UserCheck,
  Volume2,
  X
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
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
import { Image as ImageCompressor } from 'react-native-compressor';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseConfig';

// --- CONFIGURACIÓN DE RETOS CON AUDIO ---
const GESTOS = [
  { id: 'guiño', label: 'Guiñá un ojo', audio: 'Guiñá el ojo hasta que el círculo se pinte de verde' },
  { id: 'sonrisa', label: 'Tirá una sonrisa', audio: 'Ahora tirá una sonrisa para la cámara' },
  { id: 'sorpresa', label: 'Poné cara de sorpresa', audio: 'Sorprendete para finalizar la prueba' }
];

export default function RegistroBiometrico({ onComplete }) {
  const router = useRouter();
  const [paso, setPaso] = useState(1); 
  const [aceptoSeguro, setAceptoSeguro] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [fotoDNI, setFotoDNI] = useState(null);
  const [fotoSelfie, setFotoSelfie] = useState(null);
  const [rostroValidado, setRostroValidado] = useState(false);
  const cameraRef = useRef(null);

  const [retosActivos, setRetosActivos] = useState([]);
  const [indiceReto, setIndiceReto] = useState(0);

  // Función para dictar instrucciones
  const hablar = (texto) => {
    Speech.speak(texto, { language: 'es', pitch: 1.0, rate: 0.9 });
  };

  useEffect(() => {
    if (paso === 3) {
      const aleatorios = [...GESTOS].sort(() => 0.5 - Math.random()).slice(0, 2);
      setRetosActivos(aleatorios);
      setIndiceReto(0);
    }
  }, [paso]);

  // Disparar audio cuando cambia el reto o se abre la cámara
  useEffect(() => {
    if (mostrarCamara && paso === 3 && retosActivos.length > 0) {
      hablar(retosActivos[indiceReto].audio);
    }
  }, [indiceReto, mostrarCamara]);

  const optimizarImagen = async (uri) => {
    try {
      const result = await ImageCompressor.compress(uri, {
        compressionMethod: 'manual',
        maxWidth: 1200,
        quality: 0.8,
      });
      return result;
    } catch (e) {
      console.error("Error comprimiendo:", e);
      return uri;
    }
  };

  const onFacesDetected = ({ faces }) => {
    if (rostroValidado || paso !== 3 || faces.length === 0 || retosActivos.length === 0) return;

    const face = faces[0];
    const retoActual = retosActivos[indiceReto];
    let completado = false;

    if (retoActual.id === 'guiño') {
      if (face.leftEyeOpenProbability < 0.4 || face.rightEyeOpenProbability < 0.4) completado = true;
    } 
    else if (retoActual.id === 'sonrisa') {
      if (face.smilingProbability > 0.7) completado = true;
    } 
    else if (retoActual.id === 'sorpresa') {
      if (face.leftEyeOpenProbability > 0.9 && face.rightEyeOpenProbability > 0.9 && face.smilingProbability < 0.1) completado = true;
    }

    if (completado) {
      if (indiceReto < retosActivos.length - 1) {
        setIndiceReto(indiceReto + 1);
      } else {
        setRostroValidado(true);
        setMostrarCamara(false);
        hablar("Identidad validada correctamente");
        Alert.alert("¡Validado!", "Completaste las pruebas de vida.");
      }
    }
  };

  const tomarFoto = async () => {
    if (cameraRef.current) {
      try {
        setLoading(true);
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
        const uriComprimida = await optimizarImagen(photo.uri);
        if (paso === 1) setFotoDNI(uriComprimida);
        else if (paso === 2) setFotoSelfie(uriComprimida);
        setMostrarCamara(false);
      } catch (e) {
        Alert.alert("Error", "No se pudo capturar la imagen.");
      } finally {
        setLoading(false);
      }
    }
  };

  const manejarBotonCamara = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permiso denegado", "Necesitamos acceso a la cámara.");
        return;
      }
    }
    setMostrarCamara(true);
  };

  const finalizarRegistro = async () => {
    if (!aceptoSeguro) {
      Alert.alert("Atención", "Debes declarar que cuentas con seguro.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("No hay sesión activa");

      const { error: updateError } = await supabase
        .from('Usuarios') 
        .update({ 
          esperando_verificacion: false, 
          declaracion_seguro: true,
          fecha_auditoria: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      Alert.alert("Éxito", "Validación completada. Ya podés usar Brexel.",
        [{ text: "Entrar", onPress: () => {
            if (onComplete) onComplete();
            router.replace('/(tabs)/social');
        }}]
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No pudimos actualizar tu perfil.");
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
          facing={paso >= 2 ? 'front' : 'back'}
          onFacesDetected={paso === 3 ? onFacesDetected : undefined}
          faceDetectorSettings={{
            mode: FaceDetector.FaceDetectorMode.fast,
            detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
            runClassifications: FaceDetector.FaceDetectorClassifications.all,
            minDetectionInterval: 100,
            tracking: true,
          }}
        />
        
        {/* Guía visual para el rostro */}
        <View style={styles.guiaOverlay}>
            <View style={[styles.circuloGuia, rostroValidado && {borderColor: '#2E7D32'}]} />
        </View>

        <View style={styles.cameraOverlay}>
          <TouchableOpacity style={styles.btnCerrar} onPress={() => setMostrarCamara(false)}>
            <X color="#fff" size={30} />
          </TouchableOpacity>
          
          {paso !== 3 && (
            <TouchableOpacity style={styles.btnDisparar} onPress={tomarFoto} disabled={loading}>
              {loading ? <ActivityIndicator color="#1976D2" /> : <View style={styles.circuloInterno} />}
            </TouchableOpacity>
          )}

          {paso === 3 && retosActivos.length > 0 && (
            <View style={styles.instruccionFlotante}>
              <Volume2 color="#1976D2" size={20} style={{marginRight: 10}} />
              <View>
                <Text style={styles.retoHeader}>RETO {indiceReto + 1} DE 2</Text>
                <Text style={styles.instruccionText}>{retosActivos[indiceReto].label}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F7F9' }} edges={['right', 'left', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Validación de Seguridad</Text>
          <Text style={styles.subtitle}>Paso {paso} de 3</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            {paso === 1 && <ShieldAlert size={48} color="#1976D2" />}
            {paso === 2 && <UserCheck size={48} color="#2E7D32" />}
            {paso === 3 && <ScanFace size={48} color="#6A1B9A" />}
          </View>
          
          <Text style={styles.cardTitle}>
            {paso === 1 ? "Foto del DNI" : paso === 2 ? "Foto con DNI" : "Prueba de Vida"}
          </Text>
          
          {paso === 3 ? (
            <View style={{ alignItems: 'center' }}>
               {rostroValidado ? (
                 <CheckCircle2 size={100} color="#2E7D32" style={{ marginTop: 20 }} />
               ) : (
                 <View style={{alignItems: 'center'}}>
                    <Volume2 color="#6A1B9A" size={32} style={{marginBottom: 10}} />
                    <Text style={styles.cardText}>Seguí las instrucciones por voz para confirmar tu identidad.</Text>
                 </View>
               )}
            </View>
          ) : (paso === 1 ? fotoDNI : fotoSelfie) ? (
            <Image source={{ uri: paso === 1 ? fotoDNI : fotoSelfie }} style={styles.preview} />
          ) : (
            <Text style={styles.cardText}>
              {paso === 1 ? "Capturá el frente de tu documento." : "Sostené tu DNI al lado de tu cara."}
            </Text>
          )}

          {!rostroValidado && (
            <TouchableOpacity style={styles.btnFoto} onPress={manejarBotonCamara} disabled={loading}>
              <CameraIcon color="#fff" size={20} />
              <Text style={styles.btnText}>
                {paso === 3 ? "Iniciar Validación" : "Abrir Cámara"}
              </Text>
            </TouchableOpacity>
          )}

          {paso === 1 && fotoDNI && (
            <TouchableOpacity style={[styles.btnFoto, {backgroundColor: '#2E7D32', marginTop: 10}]} onPress={() => setPaso(2)}>
              <Text style={styles.btnText}>Continuar al Paso 2</Text>
            </TouchableOpacity>
          )}

          {paso === 2 && fotoSelfie && (
            <TouchableOpacity style={[styles.btnFoto, {backgroundColor: '#6A1B9A', marginTop: 10}]} onPress={() => setPaso(3)}>
              <Text style={styles.btnText}>Continuar a Validación Facial</Text>
            </TouchableOpacity>
          )}
        </View>

        {paso === 3 && rostroValidado && (
          <View style={[styles.card, {marginTop: 20}]}>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setAceptoSeguro(!aceptoSeguro)}>
              {aceptoSeguro ? <CheckCircle2 size={26} color="#2E7D32" /> : <Circle size={26} color="#CCC" />}
              <Text style={styles.checkboxText}>Declaro bajo juramento que cuento con seguro vigente.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnFinalizar, (!aceptoSeguro || loading) && { backgroundColor: '#BDBDBD' }]} 
              onPress={finalizarRegistro}
              disabled={!aceptoSeguro || loading}
            >
              <Text style={styles.btnText}>Finalizar y Entrar</Text>
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
  guiaOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  circuloGuia: { width: 260, height: 350, borderRadius: 130, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
  btnDisparar: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  circuloInterno: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  btnCerrar: { position: 'absolute', top: 40, right: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  checkboxText: { flex: 1, fontSize: 13, color: '#444' },
  instruccionFlotante: { backgroundColor: 'white', padding: 15, borderRadius: 20, marginBottom: 20, alignItems: 'center', flexDirection: 'row' },
  retoHeader: { color: '#1976D2', fontSize: 10, fontWeight: 'bold' },
  instruccionText: { color: '#1A1A1A', fontWeight: 'bold', fontSize: 16 }
});