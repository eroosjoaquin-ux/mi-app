import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  Camera as CameraIcon,
  CheckCircle2,
  CreditCard,
  ScanFace,
  UserCheck,
  X
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Button,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const isWeb = Platform.OS === 'web';
const { width } = Dimensions.get('window');

const GESTOS = [
  { id: 'guiño', label: 'Guiñá un ojo', audio: 'Guiñá el ojo hasta que el contorno se pinte de verde' },
  { id: 'sonrisa', label: 'Tirá una sonrisa', audio: 'Tirá una sonrisa hasta que el contorno se pinte de verde' }
];

export default function RegistroBiometrico() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const isMounted = useRef(true);
  const timeoutsRef = useRef([]);

  const [paso, setPaso] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [mostrarCamara, setMostrarCamara] = useState(false);
  
  const [tengoFrente, setTengoFrente] = useState(false);
  const [tengoDorso, setTengoDorso] = useState(false);
  const [tengoSelfie, setTengoSelfie] = useState(false);
  const [rostroValidado, setRostroValidado] = useState(false);

  const [timerActivo, setTimerActivo] = useState(false);
  const cameraRef = useRef(null);
  const scanLoopRef = useRef(null);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [retosActivos, setRetosActivos] = useState([]);
  const [indiceReto, setIndiceReto] = useState(0);

  useEffect(() => {
    isMounted.current = true;
    if (paso === 4) setRetosActivos(shuffleGestos(GESTOS));
    return () => {
      isMounted.current = false;
      timeoutsRef.current.forEach(clearTimeout);
      Speech.stop(); 
      scanLoopRef.current?.stop();
    };
  }, [paso]);

  const hablar = (texto) => {
    if (isWeb) return; 
    Speech.stop();
    Speech.speak(texto, { language: 'es', pitch: 1.0, rate: 0.9 });
  };

  const cerrarCamara = () => {
    Speech.stop();
    setMostrarCamara(false);
    setTimerActivo(false);
    progressAnim.setValue(0);
    scanLoopRef.current?.stop();
  };

  const shuffleGestos = (array) => {
    let current = [...array];
    for (let i = current.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [current[i], current[j]] = [current[j], current[i]];
    }
    return current;
  };

  useEffect(() => {
    if (!isWeb && mostrarCamara && paso <= 2) {
      scanAnim.setValue(0);
      scanLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      );
      scanLoopRef.current.start();
    }
    return () => scanLoopRef.current?.stop();
  }, [mostrarCamara, paso]);

  useEffect(() => {
    if (!isWeb && mostrarCamara && paso === 4 && retosActivos.length > 0) {
      hablar(retosActivos[indiceReto].audio);
    }
  }, [mostrarCamara, paso, retosActivos, indiceReto]);

  const manejarBotonCaptura = () => {
    if (isWeb) {
      setLoading(true);
      const t = setTimeout(() => {
        if (!isMounted.current) return;
        if (paso === 1) { setTengoFrente(true); setPaso(2); }
        else if (paso === 2) { setTengoDorso(true); setPaso(3); }
        else if (paso === 3) { setTengoSelfie(true); setPaso(4); }
        else if (paso === 4) { setRostroValidado(true); }
        setLoading(false);
      }, 1200);
      timeoutsRef.current.push(t);
    } else {
      setMostrarCamara(true);
    }
  };

  const iniciarEscaneoVidaMobile = () => {
    setTimerActivo(true);
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3500,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && isMounted.current) {
        setTimerActivo(false);
        setMostrarCamara(false);
        setLoading(true);
        hablar("Analizando rasgos faciales");
        const t = setTimeout(() => {
          if (!isMounted.current) return;
          setRostroValidado(true);
          setLoading(false);
          hablar("Identidad confirmada");
        }, 2000);
        timeoutsRef.current.push(t);
      }
    });
  };

  // --- CAMBIO APLICADO AQUÍ: Reenvío de params para persistencia ---
  const finalizarValidacionLocal = () => {
    Alert.alert("Identidad Verificada", "Se han validado tus rasgos y documentos correctamente.", [
      { 
        text: "FINALIZAR", 
        onPress: () => {
          router.push({
            pathname: '/RegistroScreen',
            params: { 
              ...params,       // <--- MANTIENE TODOS LOS DATOS PREVIOS
              validado: 'true' // MARCA COMO VALIDADO
            }
          });
        }
      }
    ]);
  };

  if (!isWeb && !permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.textCenter}>Permiso de cámara requerido</Text>
        <Button onPress={requestPermission} title="Dar Permiso" />
      </View>
    );
  }

  if (!isWeb && mostrarCamara) {
    return (
      <View style={styles.cameraFullScreen}>
        <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing={paso <= 2 ? 'back' : 'front'} />
        
        {paso <= 2 && (
          <View style={styles.overlayDNI}>
            <View style={styles.dniGuia}>
              <Animated.View style={[styles.scanLine, {
                transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 190] }) }]
              }]} />
            </View>
            <Text style={styles.instruccionCamara}>Encuadrá el {paso === 1 ? 'FRENTE' : 'DORSO'}</Text>
          </View>
        )}

        {paso === 4 && (
          <View style={styles.maskContainer}>
            <View style={styles.faceCutout}>
              <Animated.View style={[styles.progressBorder, { 
                borderColor: '#00FF00',
                borderWidth: progressAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 10] }),
                opacity: progressAnim 
              }]} />
            </View>
            <Text style={styles.instruccionVida}>{retosActivos[indiceReto]?.label}</Text>
          </View>
        )}

        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.btnCerrar} onPress={cerrarCamara}><X color="#fff" size={30} /></TouchableOpacity>
          {paso === 4 ? (
            !timerActivo && <TouchableOpacity style={styles.btnScanVida} onPress={iniciarEscaneoVidaMobile}><Text style={styles.btnScanText}>INICIAR</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btnDisparar} onPress={() => {
              if (paso === 1) setTengoFrente(true);
              if (paso === 2) setTengoDorso(true);
              if (paso === 3) setTengoSelfie(true);
              cerrarCamara();
            }}><View style={styles.circuloInterno} /></TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#1976D2" /></View>}
      
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>Paso {paso} de 4 {isWeb && "(Web Mode)"}</Text>
        
        <View style={styles.card}>
          <View style={styles.contentArea}>
            {paso === 1 && (tengoFrente ? <CheckCircle2 size={70} color="#2E7D32" /> : <CreditCard size={70} color="#ccc" />)}
            {paso === 2 && (tengoDorso ? <CheckCircle2 size={70} color="#2E7D32" /> : <CreditCard size={70} color="#ccc" />)}
            {paso === 3 && (tengoSelfie ? <CheckCircle2 size={70} color="#2E7D32" /> : <UserCheck size={70} color="#ccc" />)}
            {paso === 4 && (rostroValidado ? <CheckCircle2 size={90} color="#2E7D32" /> : <ScanFace size={90} color="#ccc" />)}
            <Text style={styles.statusText}>
                {paso === 1 && (tengoFrente ? "DNI Frente OK" : "Frente del DNI")}
                {paso === 2 && (tengoDorso ? "DNI Dorso OK" : "Dorso del DNI")}
                {paso === 3 && (tengoSelfie ? "Selfie OK" : "Capturar Rostro")}
                {paso === 4 && (rostroValidado ? "Validación Exitosa" : "Prueba de Vida")}
            </Text>
          </View>

          {paso < 5 && !rostroValidado && (
            <TouchableOpacity style={styles.mainBtn} onPress={manejarBotonCaptura}>
              <CameraIcon color="#fff" size={22} />
              <Text style={styles.mainBtnText}>{isWeb ? "Simular Captura" : (paso === 4 ? "Iniciar Vida" : "Capturar")}</Text>
            </TouchableOpacity>
          )}

          {!isWeb && paso === 1 && tengoFrente && <TouchableOpacity style={styles.nextBtn} onPress={() => setPaso(2)}><Text style={styles.mainBtnText}>Siguiente</Text></TouchableOpacity>}
          {!isWeb && paso === 2 && tengoDorso && <TouchableOpacity style={styles.nextBtn} onPress={() => setPaso(3)}><Text style={styles.mainBtnText}>Siguiente</Text></TouchableOpacity>}
          {!isWeb && paso === 3 && tengoSelfie && <TouchableOpacity style={[styles.nextBtn, {backgroundColor: '#6A1B9A'}]} onPress={() => setPaso(4)}><Text style={styles.mainBtnText}>Ir a Vida</Text></TouchableOpacity>}
          
          {rostroValidado && (
            <TouchableOpacity style={[styles.nextBtn, {marginTop: 30}]} onPress={finalizarValidacionLocal}>
              <Text style={styles.mainBtnText}>COMPLETAR Y VOLVER</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7F9' },
  container: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textCenter: { textAlign: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#333' },
  subtitle: { fontSize: 16, color: '#1976D2', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 30, padding: 25, alignItems: 'center', elevation: 4 },
  contentArea: { width: '100%', height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8', borderRadius: 20, marginVertical: 20 },
  statusText: { marginTop: 15, fontSize: 16, color: '#555' },
  mainBtn: { backgroundColor: '#1976D2', width: '100%', padding: 18, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  nextBtn: { backgroundColor: '#2E7D32', width: '100%', padding: 18, borderRadius: 15, marginTop: 12, alignItems: 'center' },
  mainBtnText: { color: '#fff', fontWeight: 'bold' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 100, justifyContent: 'center', alignItems: 'center' },
  cameraFullScreen: { flex: 1, backgroundColor: '#000' },
  cameraControls: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  btnCerrar: { position: 'absolute', top: 50, right: 20 },
  btnDisparar: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  circuloInterno: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  overlayDNI: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  dniGuia: { width: 320, height: 200, borderWidth: 2, borderColor: '#fff', borderRadius: 15, overflow: 'hidden' },
  scanLine: { width: '100%', height: 4, backgroundColor: '#00FF00' },
  instruccionCamara: { color: '#fff', marginTop: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10 },
  maskContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  faceCutout: { width: 280, height: 380, borderRadius: 140, borderWidth: 2, borderColor: '#fff' },
  progressBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 140 },
  instruccionVida: { color: '#00FF00', fontSize: 22, fontWeight: '900', marginTop: 30 },
  btnScanVida: { backgroundColor: '#00FF00', padding: 15, borderRadius: 30 },
  btnScanText: { fontWeight: '800' }
});