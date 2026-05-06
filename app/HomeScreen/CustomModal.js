import { Search, X } from 'lucide-react-native';
import { Dimensions, Modal, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

const COLORS = {
  textPrimary: '#050505',
  textSecondary: '#65676B',
};

export default function CustomModal({ visible, onClose, title, content, hasSearch }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalSheet, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
              {hasSearch && (
                <View style={styles.searchBarContainer}>
                  <Search size={18} color={COLORS.textSecondary} style={styles.searchIconInput} />
                  <TextInput
                    placeholder="Buscar..."
                    style={styles.searchInput}
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
              )}
              <View style={styles.modalContent}>
                <Text style={styles.modalBodyText}>{content}</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { height: height * 0.85, backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  closeBtn: { padding: 5 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', borderRadius: 12, paddingHorizontal: 15, height: 45, marginBottom: 20 },
  searchIconInput: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  modalContent: { flex: 1, alignItems: 'center', paddingTop: 20 },
  modalBodyText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center' },
});