import { StyleSheet, Text, View } from 'react-native';

const COLORS = {
  green: '#4CAF50',
  yellow: '#FFC107',
  red: '#F44336',
};

export default function BarraReputacion({ puntos }) {
  const colorBarra = puntos > 75 ? COLORS.green : puntos > 40 ? COLORS.yellow : COLORS.red;
  return (
    <View style={styles.reputacionContenedor}>
      <View style={styles.barraFondo}>
        <View style={[styles.barraProgreso, { width: `${puntos}%`, backgroundColor: colorBarra }]} />
      </View>
      <Text style={[styles.reputacionTexto, { color: colorBarra }]}>{puntos}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  reputacionContenedor: { position: 'absolute', bottom: -5, left: 10, width: 30, alignItems: 'center' },
  barraFondo: { width: 30, height: 4, backgroundColor: '#E4E6EB', borderRadius: 2, overflow: 'hidden' },
  barraProgreso: { height: '100%' },
  reputacionTexto: { fontSize: 7, fontWeight: 'bold', marginTop: 1 },
});