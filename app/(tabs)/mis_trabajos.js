import { useRouter } from 'expo-router';
import { Briefcase, CheckCircle2, ChevronRight, Clock, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    StyleSheet, Text,
    TouchableOpacity,
    View
} from 'react-native';

const COLORS = {
  primary: '#1976D2',
  bg: '#F5F7F9',
  white: '#FFFFFF',
  border: '#E1E4E8',
  text: '#1A1A1A',
  textSec: '#666666',
  success: '#2E7D32',
  warning: '#ED6C02'
};

export default function MisTrabajosScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('pendientes'); // pendientes o terminados

  // Datos de prueba (Luego vendrán de tu base de datos)
  const trabajos = [
    { 
      id: '1', 
      titulo: 'Cambio de Termotanque', 
      cliente: 'Juan Perez', 
      zona: 'San Vicente', 
      precio: '45.000',
      estado: 'pendientes',
      fecha: 'Hoy, 16:00hs'
    },
    { 
      id: '2', 
      titulo: 'Instalación Eléctrica', 
      cliente: 'Maria Garcia', 
      zona: 'Alejandro Korn', 
      precio: '120.000',
      estado: 'pendientes',
      fecha: 'Mañana, 09:00hs'
    }
  ];

  const renderTrabajo = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push('/finalizar_trabajo')} // Al tocarlo, vamos a la pantalla de finalizar
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <Briefcase size={20} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.trabajoTitulo}>{item.titulo}</Text>
          <Text style={styles.clienteName}>{item.cliente}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>${item.precio}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerInfo}>
          <MapPin size={14} color={COLORS.textSec} />
          <Text style={styles.footerText}>{item.zona}</Text>
        </View>
        <View style={styles.footerInfo}>
          <Clock size={14} color={COLORS.warning} />
          <Text style={[styles.footerText, { color: COLORS.warning, fontWeight: '700' }]}>{item.fecha}</Text>
        </View>
      </View>
      
      <View style={styles.actionRow}>
        <Text style={styles.actionText}>Tocar para finalizar trabajo</Text>
        <ChevronRight size={16} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestión de Trabajos</Text>
      </View>

      {/* SELECTOR DE TABS */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, tab === 'pendientes' && styles.tabItemActive]} 
          onPress={() => setTab('pendientes')}
        >
          <Text style={[styles.tabLabel, tab === 'pendientes' && styles.tabLabelActive]}>Pendientes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, tab === 'terminados' && styles.tabItemActive]} 
          onPress={() => setTab('terminados')}
        >
          <Text style={[styles.tabLabel, tab === 'terminados' && styles.tabLabelActive]}>Terminados</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trabajos.filter(t => t.estado === tab)}
        keyExtractor={item => item.id}
        renderItem={renderTrabajo}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CheckCircle2 size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>No tenés trabajos en esta sección</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { 
    padding: 20, backgroundColor: COLORS.white, 
    borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  
  tabBar: { 
    flexDirection: 'row', backgroundColor: COLORS.white, 
    paddingHorizontal: 20, marginBottom: 10 
  },
  tabItem: { 
    flex: 1, paddingVertical: 15, alignItems: 'center', 
    borderBottomWidth: 2, borderBottomColor: 'transparent' 
  },
  tabItemActive: { borderBottomColor: COLORS.primary },
  tabLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textSec },
  tabLabelActive: { color: COLORS.primary },

  list: { padding: 20 },
  card: { 
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16, 
    marginBottom: 15, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { 
    width: 44, height: 44, borderRadius: 22, 
    backgroundColor: COLORS.primary + '10', alignItems: 'center', justifyContent: 'center' 
  },
  trabajoTitulo: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  clienteName: { fontSize: 13, color: COLORS.textSec, marginTop: 2 },
  badge: { backgroundColor: COLORS.success + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { color: COLORS.success, fontWeight: '800', fontSize: 13 },

  cardFooter: { 
    flexDirection: 'row', gap: 20, marginTop: 15, 
    paddingTop: 15, borderTopWidth: 1, borderTopColor: COLORS.border 
  },
  footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerText: { fontSize: 12, color: COLORS.textSec, fontWeight: '600' },

  actionRow: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 15, backgroundColor: COLORS.bg, padding: 10, borderRadius: 10
  },
  actionText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.textSec, marginTop: 10, fontSize: 14, fontWeight: '500' }
});