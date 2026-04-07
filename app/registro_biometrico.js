import { useRouter } from 'expo-router';
import {
    Camera as CameraIcon,
    CheckCircle2,
    Circle,
    ShieldAlert,
    UserCheck
} from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// CORRECCIÓN: Ruta actualizada a tu carpeta de servicios
import { supabase } from '../services/supabaseConfig';

export default function RegistroBiometrico() {
  const router = useRouter();
  const [paso, setPaso] = useState(1); 
  const [aceptoSeguro, setAceptoSeguro] = useState(false);
  const [loading, setLoading] = useState(false);

  const finalizarRegistro = async () => {
    if (!aceptoSeguro) {
      Alert.alert("Atención", "Debes declarar que cuentas con seguro para poder continuar.");
      return;
    }

    setLoading(true);

    try {
      // 1. Obtenemos el ID del usuario actual
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) throw new Error("No se encontró una sesión activa");

      // 2. Actualizamos la tabla 'Usuarios'
      // CORRECCIÓN: Usamos 'Usuarios' y arreglamos el objeto Date
      const { error: updateError } = await supabase
        .from('Usuarios') 
        .update({ 
          esperando_verificacion: true,
          declaracion_seguro: true,
          fecha_auditoria: new Date().toISOString() // Corregido: Date en lugar de Error
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 3. Éxito: Informamos y redirigimos
      Alert.alert(
        "Datos Recibidos", 
        "Tu perfil ha entrado en fase de auditoría. Revisaremos tus fotos de DNI y seguridad. Te notificaremos pronto."
      );
      
      // Redirigimos a la pantalla principal o perfil
      router.replace('/(tabs)/wallet');

    } catch (error) {
      Alert.alert("Error de Conexión", "No pudimos actualizar tu perfil. Revisá tu internet.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Validación de Seguridad</Text>
        <Text style={styles.subtitle}>Paso {paso} de 2</Text>
      </View>

      {paso === 1 ? (
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <ShieldAlert size={48} color="#1976D2" />
          </View>
          <Text style={styles.cardTitle}>Foto del DNI</Text>
          <Text style={styles.cardText}>
            Ya capturamos tu DNI en el registro, pero necesitamos confirmar que sea legible para la auditoría final.
          </Text>
          <TouchableOpacity 
            style={styles.btnFoto} 
            onPress={() => setPaso(2)}
            activeOpacity={0.8}
          >
            <CameraIcon color="#fff" size={20} />
            <Text style={styles.btnText}>Continuar a Selfie</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <UserCheck size={48} color="#2E7D32" />
          </View>
          <Text style={styles.cardTitle}>Prueba de Vida</Text>
          <Text style={[styles.cardText, { fontWeight: '700', color: '#D32F2F' }]}>
            IMPORTANTE: Sacate una foto guiñando un ojo y sosteniendo tu DNI al lado de tu cara.
          </Text>
          
          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.checkboxRow} 
            onPress={() => setAceptoSeguro(!aceptoSeguro)}
            activeOpacity={0.7}
          >
            {aceptoSeguro ? (
              <CheckCircle2 size={26} color="#2E7D32" />
            ) : (
              <Circle size={26} color="#CCC" />
            )}
            <Text style={styles.checkboxText}>
              Declaro bajo juramento que cuento con seguro de accidentes personales vigente para realizar tareas técnicas.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.btnFinalizar, 
              (!aceptoSeguro || loading) && { backgroundColor: '#BDBDBD' }
            ]} 
            onPress={finalizarRegistro}
            disabled={!aceptoSeguro || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>Enviar para Auditoría</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ⚠️ En Brexel auditamos cada perfil para garantizar la seguridad de la comunidad de San Vicente.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F9', padding: 20 },
  header: { marginTop: 40, marginBottom: 30 },
  title: { fontSize: 24, fontWeight: '900', color: '#1A1A1A' },
  subtitle: { fontSize: 16, color: '#1976D2', fontWeight: '700' },
  iconContainer: { alignItems: 'center', marginBottom: 10 },
  card: { 
    backgroundColor: '#fff', 
    padding: 25, 
    borderRadius: 28, 
    elevation: 3 
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  cardText: { textAlign: 'center', color: '#666', marginTop: 12, lineHeight: 22, fontSize: 14 },
  btnFoto: { backgroundColor: '#1976D2', flexDirection: 'row', padding: 18, borderRadius: 16, marginTop: 25, gap: 10, alignItems: 'center', justifyContent: 'center' },
  btnFinalizar: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 16, marginTop: 25, width: '100%', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#F0F0F0', width: '100%', marginVertical: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginVertical: 10, paddingRight: 10 },
  checkboxText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 20, fontWeight: '500' },
  infoBox: { marginTop: 30, padding: 18, backgroundColor: '#E3F2FD', borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#1976D2' },
  infoText: { color: '#1976D2', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 }
});