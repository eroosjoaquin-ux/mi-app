import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Smartphone
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Usamos la librería de Expo que es más estable para APKs
import * as Clipboard from 'expo-clipboard';

// Importación de Supabase (ajustada a tu estructura)
import { supabase } from '../../services/supabaseConfig';

const COLORS = {
  primary: '#1976D2',
  danger: '#D32F2F',
  success: '#2E7D32',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  warning: '#ED6C02'
};

export default function WalletScreen() {
  const [deudaComision, setDeudaComision] = useState(0); 
  const [loading, setLoading] = useState(true);
  
  const MI_ALIAS = "BREXEL.OFICIOS.MP"; 
  const MI_CELULAR = "54911XXXXXXXX"; // <--- Cambialo por tu celular real

  useEffect(() => {
    const obtenerDeuda = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('Usuarios') 
            .select('deuda_comision')
            .eq('id', user.id)
            .single();
          
          if (data) setDeudaComision(data.deuda_comision || 0);
        }
      } catch (error) {
        console.error("Error al cargar deuda:", error);
      } finally {
        setLoading(false);
      }
    };

    obtenerDeuda();
  }, []);

  const copiarAlias = async () => {
    await Clipboard.setStringAsync(MI_ALIAS);
    Alert.alert("¡Copiado!", "El alias se copió al portapapeles. Ya podés pegarlo en Mercado Pago.");
  };

  const pagarComision = () => {
    const mensaje = `Hola Brexel! Acabo de transferir la comisión de $${deudaComision}. Adjunto comprobante.`;
    const url = `https://wa.me/${MI_CELULAR}?text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* CABECERA DE ESTADO */}
        <View style={[styles.statusCard, deudaComision > 0 ? styles.statusBad : styles.statusGood]}>
          {deudaComision > 0 ? (
            <AlertTriangle size={40} color={COLORS.danger} />
          ) : (
            <CheckCircle size={40} color={COLORS.success} />
          )}
          <Text style={[styles.statusTitle, { color: deudaComision > 0 ? COLORS.danger : COLORS.success }]}>
            {deudaComision > 0 ? "Comisión Pendiente" : "Perfil Activo"}
          </Text>
          <Text style={styles.statusAmount}>${deudaComision.toLocaleString('es-AR')}</Text>
          {deudaComision > 0 && (
            <Text style={styles.statusSub}>Debés regularizar para recibir más trabajos.</Text>
          )}
        </View>

        {/* BLOQUE DE PAGO DIRECTO */}
        {deudaComision > 0 && (
          <View style={styles.paySection}>
            <Text style={styles.sectionTitle}>¿Cómo pagar?</Text>
            
            <View style={styles.stepBox}>
              <Text style={styles.stepLabel}>1. Transferí por Mercado Pago o CBU al Alias:</Text>
              <TouchableOpacity 
                style={styles.aliasContainer} 
                onPress={copiarAlias}
                activeOpacity={0.7}
              >
                <Text style={styles.aliasText}>{MI_ALIAS}</Text>
                <Copy size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.stepBox}>
              <Text style={styles.stepLabel}>2. Notificá el pago para habilitar tu cuenta:</Text>
              <TouchableOpacity style={styles.btnWS} onPress={pagarComision} activeOpacity={0.8}>
                <Smartphone size={20} color="#FFF" />
                <Text style={styles.btnText}>Enviar Comprobante por WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* EXPLICACIÓN DEL SISTEMA */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>¿Por qué debo pagar comisión?</Text>
          <Text style={styles.infoText}>
            Brexel cobra un <Text style={{fontWeight: 'bold'}}>2%</Text> por cada trabajo contactado exitosamente. 
            Mantener tu cuenta al día te permite figurar en los primeros puestos de búsqueda en San Vicente.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20 },
  statusCard: { 
    padding: 30, borderRadius: 28, alignItems: 'center', marginBottom: 25,
    borderWidth: 2, backgroundColor: '#FFF', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10
  },
  statusBad: { borderColor: COLORS.danger, backgroundColor: '#FFF5F5' },
  statusGood: { borderColor: COLORS.success, backgroundColor: '#F0FDF4' },
  statusTitle: { fontSize: 16, fontWeight: '800', marginTop: 10, textTransform: 'uppercase' },
  statusAmount: { fontSize: 48, fontWeight: '900', color: '#1A1A1A', marginVertical: 5 },
  statusSub: { fontSize: 13, color: COLORS.danger, fontWeight: '600', textAlign: 'center' },
  paySection: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1A1A1A', marginBottom: 15 },
  stepBox: { marginBottom: 20 },
  stepLabel: { fontSize: 14, color: '#64748B', marginBottom: 10, lineHeight: 20 },
  aliasContainer: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F0F7FF', padding: 18, borderRadius: 16, 
    borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.primary
  },
  aliasText: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  btnWS: { 
    backgroundColor: '#25D366', flexDirection: 'row', padding: 18, 
    borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10 
  },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  infoCard: { marginTop: 25, padding: 20, backgroundColor: '#F1F5F9', borderRadius: 20, marginBottom: 40 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#475569', marginBottom: 5 },
  infoText: { fontSize: 13, color: '#64748B', lineHeight: 18 }
});