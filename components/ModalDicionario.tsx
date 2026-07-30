import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { abrirBuscaGoogle } from '../lib/dicionario';

export default function ModalDicionario({
  visivel,
  palavra,
  definicoes,
  carregando,
  onFechar,
}: {
  visivel: boolean;
  palavra: string;
  definicoes: string[] | null;
  carregando: boolean;
  onFechar: () => void;
}) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.palavra} numberOfLines={2}>{palavra}</Text>
            <TouchableOpacity onPress={onFechar}>
              <Feather name="x" size={22} color="#49454F" />
            </TouchableOpacity>
          </View>

          {carregando ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color="#1E3A8A" />
          ) : definicoes && definicoes.length > 0 ? (
            <ScrollView style={{ maxHeight: 200 }}>
              {definicoes.map((def, i) => (
                <Text key={i} style={styles.definicao}>{i + 1}. {def}</Text>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.semResultado}>Nenhuma definição encontrada.</Text>
          )}

          <TouchableOpacity style={styles.btnGoogle} onPress={() => abrirBuscaGoogle(palavra)}>
            <Feather name="search" size={16} color="#1E3A8A" />
            <Text style={styles.btnGoogleTexto}>Pesquisar no Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  palavra: { fontSize: 18, fontWeight: '700', color: '#1C1B1F', flex: 1, textTransform: 'capitalize' },
  definicao: { fontSize: 14, color: '#49454F', lineHeight: 20, marginBottom: 8 },
  semResultado: { fontSize: 14, color: '#79747E', fontStyle: 'italic', marginVertical: 12 },
  btnGoogle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  btnGoogleTexto: { color: '#1E3A8A', fontWeight: '600', fontSize: 13 },
});