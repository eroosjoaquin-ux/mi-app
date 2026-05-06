import { Heart, MessageSquare, MoreHorizontal, ShieldCheck } from 'lucide-react-native';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BarraReputacion from './BarraReputacion';

const COLORS = {
  white: '#FFFFFF',
  blueLight: '#E3F2FD',
  blue: '#1976D2',
  textPrimary: '#050505',
  textSecondary: '#65676B',
  border: '#E4E6EB',
  red: '#F44336',
};

export default function PostCard({ post, onContactar }) {
  const userName = post.Usuarios?.usuario_empresa || post.titulo || "Usuario";
  const userAvatar = post.Usuarios?.avatar_url || post.userPhoto;

  return (
    <View style={[styles.postCard, post.es_urgente && { borderColor: COLORS.red, borderWidth: 1.5 }]}>
      <View style={styles.postHeader}>
        <View style={styles.contenedorAvatar}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.userPhoto} />
          ) : (
            <View style={[styles.userPhoto, { backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>{userName.charAt(0)}</Text>
            </View>
          )}
          <BarraReputacion puntos={post.reputacion || 0} />
        </View>
        <View style={styles.postHeaderText}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.userName}>{userName}</Text>
            {post.verificado && <ShieldCheck size={16} color={COLORS.blue} style={{ marginLeft: 4 }} />}
            {post.es_urgente && <Text style={{ color: COLORS.red, fontSize: 10, fontWeight: 'bold', marginLeft: 8 }}>🚨 URGENTE</Text>}
          </View>
          <Text style={styles.userSubtext}>{post.rubro} • {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Recién'}</Text>
        </View>
        <TouchableOpacity><MoreHorizontal size={20} color={COLORS.textSecondary} /></TouchableOpacity>
      </View>

      <Text style={styles.postDescription}>
        <Text style={{ fontWeight: 'bold' }}>{post.titulo}{'\n'}</Text>
        {post.descripcion}
      </Text>

      {post.imagen_url && (
        <Image source={{ uri: post.imagen_url }} style={styles.postImage} resizeMode="cover" />
      )}

      <View style={styles.interactionBar}>
        <View style={styles.statGroup}>
          <View style={styles.likeIconCircle}><Heart size={10} color="white" fill="white" /></View>
          <Text style={styles.statText}>{post.likes || 0}</Text>
        </View>
        <Text style={styles.statText}>{post.comments || 0} comentarios</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.actionButton}>
          <MessageSquare size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionButtonText}>Comentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.contactBtnActive]} onPress={() => onContactar(post)}>
          <MessageSquare size={20} color="white" />
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Contactar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  postCard: { backgroundColor: COLORS.white, marginHorizontal: 15, marginTop: 15, borderRadius: 25, borderWidth: 1, borderColor: COLORS.border, padding: 15 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  contenedorAvatar: { position: 'relative' },
  userPhoto: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: COLORS.blueLight },
  postHeaderText: { flex: 1, paddingHorizontal: 10 },
  userName: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary },
  userSubtext: { fontSize: 12, color: COLORS.textSecondary },
  postDescription: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 10, lineHeight: 18 },
  postImage: { width: '100%', height: 220, borderRadius: 20, marginBottom: 12 },
  interactionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  likeIconCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center' },
  statText: { fontSize: 13, color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },
  actionButtonsRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#F0F2F5', gap: 5 },
  actionButtonText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  contactBtnActive: { backgroundColor: COLORS.blue, flex: 1 },
});