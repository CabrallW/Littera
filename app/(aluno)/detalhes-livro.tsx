import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// ─── Constantes do Projeto ───────────────────────────────────────────────────
const PADDING = 32;
const GAP = 8;

const COLORS = {
  primary: '#1E3A8A',
  onPrimary: '#FFFFFF',
  secondaryContainer: '#D1FAE5',
  surface: '#FFFFFF',
  onSurface: '#1C1B1F',
  surfaceVariant: '#F3F4F6',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
  background: '#F8F9FB',
  success: '#10B981',
  error: '#EF4444',
  border: '#EEEEEE',
};

export default function DetalhesLivroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isFavorito, setIsFavorito] = useState(false);

  // Captura o parâmetro dinâmico
  let livro: any = null;
  try {
    if (params.livro) {
      livro = JSON.parse(params.livro as string);
    }
  } catch (error) {
    console.error("Erro ao converter os dados do livro:", error);
  }

  // Fallback se os dados não carregarem
  if (!livro) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Erro ao carregar os detalhes do livro.</Text>
        <TouchableOpacity style={styles.btnVoltarErro} onPress={() => router.back()}>
          <Text style={{ color: COLORS.onPrimary, fontWeight: '600' }}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isAvailable = livro.quantidade_disponivel > 0;

  function handleEmprestimo() {
    if (!isAvailable) return;
    Alert.alert("Sucesso", `Solicitação de empréstimo para "${livro.titulo}" enviada!`);
  }

  function toggleFavorito() {
    setIsFavorito(!isFavorito);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Detalhes do Livro</Text>
        <TouchableOpacity onPress={toggleFavorito} style={styles.iconButton} activeOpacity={0.7}>
          <Ionicons 
            name={isFavorito ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorito ? COLORS.error : COLORS.onSurfaceVariant} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Seção da Capa */}
        <View style={styles.heroSection}>
          <View style={styles.capaContainer}>
            {livro.capa_url ? (
              <Image source={{ uri: livro.capa_url }} style={styles.capa} resizeMode="cover" />
            ) : (
              <View style={styles.capaPlaceholder}>
                <MaterialCommunityIcons name="book-open-page-variant" size={48} color={COLORS.outline} />
              </View>
            )}
          </View>
        </View>

        {/* Informações Principais */}
        <View style={styles.infoSection}>
          <Text style={styles.titulo}>{livro.titulo}</Text>
          <Text style={styles.autor}>{livro.autor}</Text>
          <View style={styles.tagCategoria}>
            <Text style={styles.tagTexto}>{livro.categoria || 'Geral'}</Text>
          </View>

          {/* ─── NOVA SEÇÃO DE AVALIAÇÃO (NOTA) ─────────────────── */}
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={styles.ratingNota}>{livro.nota_media || '4.8'}</Text>
            <Text style={styles.ratingTotal}>({livro.total_avaliacoes || '156'} avaliações)</Text>
          </View>
        </View>

        {/* Grid de Métricas de Estoque */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={{ marginRight: 4 }} />
              <Text style={styles.metricValue}>{livro.quantidade_disponivel || 0}</Text>
            </View>
            <Text style={styles.metricLabel}>Disponível</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={styles.metricIconRow}>
              <MaterialCommunityIcons name="bookshelf" size={20} color={COLORS.onSurface} style={{ marginRight: 4 }} />
              <Text style={styles.metricValue}>{livro.quantidade_total || 0}</Text>
            </View>
            <Text style={styles.metricLabel}>Total no Acervo</Text>
          </View>
        </View>

        {/* Card de Detalhes Técnicos */}
        <View style={styles.techDetailsCard}>
          {/* Páginas (Exemplo estático caso não exista no banco) */}
          <View style={styles.techRow}>
            <View style={styles.techLabelContainer}>
              <Feather name="layers" size={18} color={COLORS.onSurfaceVariant} />
              <Text style={styles.techLabel}>Páginas</Text>
            </View>
            <Text style={styles.techValue}>{livro.paginas || 'N/D'}</Text>
          </View>

          {/* Ano */}
          <View style={styles.techRow}>
            <View style={styles.techLabelContainer}>
              <Feather name="calendar" size={18} color={COLORS.onSurfaceVariant} />
              <Text style={styles.techLabel}>Ano de Publicação</Text>
            </View>
            <Text style={styles.techValue}>{livro.ano || 'N/D'}</Text>
          </View>

          {/* Editora */}
          <View style={styles.techRow}>
            <View style={styles.techLabelContainer}>
              <Feather name="briefcase" size={18} color={COLORS.onSurfaceVariant} />
              <Text style={styles.techLabel}>Editora</Text>
            </View>
            <Text style={styles.techValue}>{livro.editora || 'N/D'}</Text>
          </View>

          {/* ISBN */}
          <View style={[styles.techRow, { borderBottomWidth: 0 }]}>
            <View style={styles.techLabelContainer}>
              <Feather name="hash" size={18} color={COLORS.onSurfaceVariant} />
              <Text style={styles.techLabel}>ISBN</Text>
            </View>
            <Text style={styles.techValue}>{livro.isbn || 'N/D'}</Text>
          </View>
        </View>

        {/* Seção de Sinopse */}
        {livro.sinopse ? (
          <View style={styles.sinopseSection}>
            <Text style={styles.sectionTitle}>Sinopse</Text>
            <Text style={styles.sinopseTexto}>{livro.sinopse}</Text>
          </View>
        ) : null}

      </ScrollView>

      {/* Botão de Ação Fixo */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.btnEmprestimo, !isAvailable && styles.btnDesabilitado]} 
          onPress={handleEmprestimo}
          disabled={!isAvailable}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="book-check" size={20} color={COLORS.onPrimary} />
          <Text style={styles.btnEmprestimoTexto}>
            {isAvailable ? 'Solicitar Empréstimo' : 'Livro Indisponível'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: PADDING,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 16,
  },
  btnVoltarErro: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'ios' ? 20 : PADDING,
    height: 64,
    backgroundColor: COLORS.surface,
    zIndex: 50,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingTop: PADDING,
    paddingHorizontal: PADDING,
    paddingBottom: 100, // Espaço para o footer fixo
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: GAP * 2,
  },
  capaContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  capa: {
    width: 192,
    height: 288,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceVariant,
  },
  capaPlaceholder: {
    width: 192,
    height: 288,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: GAP * 3,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.onSurface,
    textAlign: 'center',
    marginBottom: GAP / 2,
  },
  autor: {
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  tagCategoria: {
    backgroundColor: '#DCE1FF', // Equivalente ao primary-fixed do HTML
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: GAP * 1.5,
  },
  tagTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00164E', // Equivalente ao on-primary-fixed do HTML
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: GAP * 1.5,
    gap: 4,
  },
  ratingNota: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginLeft: 2,
  },
  ratingTotal: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP * 3,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  techDetailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: GAP * 3,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  techLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
  },
  techLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    marginLeft: GAP,
  },
  techValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  sinopseSection: {
    marginBottom: GAP * 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: GAP,
  },
  sinopseTexto: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: COLORS.onSurfaceVariant,
    textAlign: 'justify',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingHorizontal: PADDING,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16, // Safe area bottom padding
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceVariant,
    elevation: 10,
  },
  btnEmprestimo: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: GAP,
  },
  btnDesabilitado: {
    backgroundColor: COLORS.outline,
    opacity: 0.6,
  },
  btnEmprestimoTexto: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});