import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    CheckCircle2,
    MessageSquare,
    Star,
    ThumbsUp,
    X
} from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView, Platform,
    SafeAreaView, ScrollView,
    StyleSheet, Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// CORRECCIÓN DE RUTA: Apuntamos a services/supabaseConfig
import { supabase } from '../services/supabaseConfig';

const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#1976D2',
    success: '#2E7D32',
    bg: '#F8FAFC',
    white: '#FFFFFF',
    text: '#0F172A',
    textSec: '#64748B',
    border: '#E2E8F0',
    star: '#F59E0B',
    accent: '#EEF2FF'
};

export default function FinalizarTrabajoScreen() {
    const router = useRouter();
    const { jobId, montoTotal } = useLocalSearchParams(); 
    
    const [rating, setRating] = useState(0);
    const [comentario, setComentario] = useState('');
    const [enviando, setEnviando] = useState(false);

    const labels = ["Malo", "Regular", "Bueno", "Muy Bueno", "Excelente!"];

    const finalizarYCalcularComision = async () => {
        if (rating === 0) return;
        setEnviando(true);

        try {
            // 1. Limpieza del monto para asegurar que sea un número
            // Quitamos el signo $, los puntos de miles y cambiamos coma por punto
            const montoLimpio = montoTotal 
                ? montoTotal.replace(/[^0-9,.]/g, '').replace(/\./g, '').replace(',', '.') 
                : "0";
            const montoNum = parseFloat(montoLimpio);
            const comisionBrexel = montoNum * 0.02; // El 2% acordado

            // 2. Actualizamos el estado del Trabajo
            const { error: jobError } = await supabase
                .from('jobs')
                .update({ 
                    estado: 'finalizado',
                    rating_cliente: rating,
                    resena_cliente: comentario,
                    comision_valor: comisionBrexel,
                    pagado_brexel: false 
                })
                .eq('id', jobId);

            if (jobError) throw jobError;

            // 3. Sumar la deuda al Trabajador
            const { data: jobData, error: fetchError } = await supabase
                .from('jobs')
                .select('worker_id')
                .eq('id', jobId)
                .single();

            if (fetchError) throw fetchError;

            if (jobData?.worker_id) {
                // Llamamos a la función SQL que creamos en Supabase
                const { error: rpcError } = await supabase.rpc('sumar_comision_pendiente', { 
                    user_id: jobData.worker_id, 
                    monto_a_sumar: comisionBrexel 
                });
                if (rpcError) console.error("Error RPC:", rpcError.message);
            }

            Alert.alert(
                "¡Trabajo Finalizado!", 
                `Se generó una comisión de $${comisionBrexel.toLocaleString('es-AR')}. ¡Gracias por usar Brexel!`
            );
            
            router.replace('/(tabs)/mis_trabajos');

        } catch (error) {
            console.error("Error al finalizar:", error.message);
            Alert.alert("Error", "No pudimos cerrar el trabajo. Intentá de nuevo.");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{flex: 1}}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <X size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Finalizar Trabajo</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.successCard}>
                        <View style={styles.checkIconWrapper}>
                            <CheckCircle2 size={40} color={COLORS.success} />
                        </View>
                        <Text style={styles.mainTitle}>¿Cómo fue el servicio?</Text>
                        <Text style={styles.subTitle}>
                            Tu calificación ayuda a que la comunidad de San Vicente crezca con confianza.
                        </Text>
                    </View>

                    <View style={styles.ratingSection}>
                        <View style={styles.starRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <TouchableOpacity 
                                    key={s} 
                                    onPress={() => setRating(s)}
                                    style={styles.starContainer}
                                >
                                    <Star 
                                        size={42} 
                                        color={s <= rating ? COLORS.star : COLORS.border} 
                                        fill={s <= rating ? COLORS.star : 'transparent'} 
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                        {rating > 0 && (
                            <View style={styles.labelBadge}>
                                <Text style={styles.labelText}>{labels[rating - 1]}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.commentSection}>
                        <View style={styles.labelRow}>
                            <MessageSquare size={16} color={COLORS.textSec} />
                            <Text style={styles.sectionLabelInline}>Comentario opcional</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Muy puntual y dejó todo limpio..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            value={comentario}
                            onChangeText={setComentario}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.btnSubmit, (rating === 0 || enviando) && styles.btnDisabled]}
                        disabled={rating === 0 || enviando}
                        onPress={finalizarYCalcularComision}
                    >
                        {enviando ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <View style={styles.btnContent}>
                                <ThumbsUp size={20} color="#FFF" />
                                <Text style={styles.btnText}>PUBLICAR Y CERRAR</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={{height: 40}} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
        paddingHorizontal: 20, paddingVertical: 15, backgroundColor: COLORS.white,
        borderBottomWidth: 1, borderBottomColor: COLORS.border
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    closeBtn: { padding: 8, borderRadius: 12, backgroundColor: COLORS.bg },
    scroll: { padding: 24 },
    successCard: { alignItems: 'center', marginBottom: 25 },
    checkIconWrapper: {
        width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.success + '15',
        alignItems: 'center', justifyContent: 'center', marginBottom: 15
    },
    mainTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
    subTitle: { fontSize: 14, color: COLORS.textSec, textAlign: 'center', marginTop: 10, lineHeight: 20 },
    ratingSection: { alignItems: 'center', marginBottom: 30 },
    starRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    labelBadge: { backgroundColor: COLORS.star + '15', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    labelText: { color: COLORS.star, fontWeight: '800', fontSize: 12 },
    commentSection: { marginBottom: 30 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    sectionLabelInline: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    input: { 
        backgroundColor: COLORS.white, borderRadius: 12, padding: 15, 
        fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
        textAlignVertical: 'top', height: 100
    },
    btnSubmit: { 
        backgroundColor: COLORS.primary, padding: 18, borderRadius: 15,
        elevation: 4
    },
    btnDisabled: { backgroundColor: '#CBD5E1', elevation: 0 },
    btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});