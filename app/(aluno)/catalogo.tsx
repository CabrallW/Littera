import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Livro } from '../../lib/types';

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
};

// ─── Card de livro ────────────────────────────────────────────────────────────
function BookCard({ book, cardWidth, onPress }: { book: Livro; cardWidth: number; onPress: () => void }) {
  const isAvailable = book.quantidade_disponivel > 0;

  return (
    <TouchableOpacity 
      style={[styles.card, { width: cardWidth }]} 
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        {book.capa_url ? (
          <Image source={{ uri: book.capa_url }} style={styles.bookImage} resizeMode="cover" />
        ) : (
          <View style={[styles.bookImage, styles.placeholderImage]}>
            <MaterialCommunityIcons name="book-open-variant" size={32} color={COLORS.outline} />
          </View>
        )}
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.bookTitle} numberOfLines={1}>{book.titulo}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{book.autor}</Text>
        <Text style={[
          styles.bookStatus,
          { color: isAvailable ? COLORS.success : COLORS.onSurfaceVariant }
        ]}>
          {isAvailable ? 'Disponível' : `${book.quantidade_total} exemplares`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function CatalogoScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columnCount = width < 768 ? 3 : 5; 
  const cardWidth = (width - (PADDING * 2) - (GAP * (columnCount - 1))) / columnCount;
  
  const [livros, setLivros] = useState<Livro[]>([]);
  // Estado para armazenar as categorias vindas do banco de dados
  const [categories, setCategories] = useState<string[]>(['Todos']);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Todos');
  const [search, setSearch] = useState('');

  useEffect(() => { 
    fetchLivros(); 
    fetchCategorias();
  }, []);

  async function fetchCategorias() {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('nome')
        .order('nome', { ascending: true });

      if (error) throw error;

      if (data) {
        const nomesDasCategorias = data.map((cat) => cat.nome);
        setCategories(['Todos', ...nomesDasCategorias]);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias para o aluno:', error);
    }
  }

  async function fetchLivros() {
    setLoading(true);
    try {
      const { data } = await supabase.from('livros').select('*').order('titulo');
      if (data) setLivros(data);
    } catch (error) {
      console.error('Erro ao buscar livros:', error);
    } finally {
      setLoading(false);
    }
  }

  // Lógica corrigida e otimizada com useMemo para aplicar tanto a busca por texto quanto o filtro por categoria
  const filteredLivros = useMemo(() => {
    return livros.filter((l: Livro) => {
      const matchesSearch = 
        l.titulo.toLowerCase().includes(search.toLowerCase()) ||
        l.autor.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = activeTab === 'Todos' || l.categoria === activeTab;

      return matchesSearch && matchesCategory;
    });
  }, [search, activeTab, livros]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Cabeçalho do App (provisório) */}
      <View style={styles.appHeader}>
        <MaterialCommunityIcons name="book-education" size={22} color={COLORS.primary} />
        <Text style={styles.appName}>Littera</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color={COLORS.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar no catálogo"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.onSurfaceVariant}
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Categorias Dinâmicas vindas do banco */}
      <View style={styles.chipsContainer}>
        <FlatList
          horizontal
          data={categories}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveTab(item)}
              style={[styles.chip, activeTab === item && styles.chipActive]}
            >
              <Text style={[styles.chipText, activeTab === item && styles.chipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item}
        />
      </View>

      {/* Header da seção */}
      <View style={styles.contentHeader}>
        <Text style={styles.sectionTitle}>Novidades</Text>
        <Text style={styles.resultCount}>{filteredLivros.length} livros</Text>
      </View>

      {/* Grid */}
      <FlatList
        key={columnCount} 
        data={filteredLivros}
        keyExtractor={(item) => item.id.toString()}
        numColumns={columnCount}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={async () => {
          await fetchLivros();
          await fetchCategorias(); // Atualiza as categorias no "pull-to-refresh"
        }}
        renderItem={({ item }) => (
          <BookCard 
            book={item} 
            cardWidth={cardWidth} 
            onPress={() => router.push({
              pathname: '/(aluno)/detalhes-livro',
              params: { livro: JSON.stringify(item) }
            })}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 48 }}>📚</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.onSurface, marginTop: 8 }}>
              Nenhum livro encontrado
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: PADDING,
    paddingTop: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  searchSection: { paddingHorizontal: PADDING, paddingVertical: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 28, paddingHorizontal: 16, height: 56,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.onSurface },
  chipsContainer: { marginBottom: 16 },
  chipsScroll: { paddingHorizontal: PADDING, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.outline, backgroundColor: COLORS.surface,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, fontWeight: '500', color: COLORS.onSurfaceVariant },
  chipTextActive: { color: COLORS.onPrimary },
  contentHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', paddingHorizontal: PADDING, marginBottom: 12,
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: COLORS.onSurface },
  resultCount: { fontSize: 12, color: COLORS.onSurfaceVariant },
  listContainer: { paddingHorizontal: PADDING, paddingBottom: 24 },
  row: { justifyContent: 'flex-start', gap: GAP, marginBottom: 20 },
  card: { },
  imageContainer: { position: 'relative', marginBottom: 8 },
  bookImage: {
    width: '100%', aspectRatio: 2 / 3,
    borderRadius: 12, backgroundColor: COLORS.surfaceVariant,
  },
  placeholderImage: { alignItems: 'center', justifyContent: 'center' },
  addButton: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: COLORS.surface, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  cardContent: { gap: 2 },
  bookTitle: { fontSize: 13, fontWeight: '700', color: COLORS.onSurface },
  bookAuthor: { fontSize: 11, color: COLORS.onSurfaceVariant },
  bookStatus: { fontSize: 11, fontWeight: '600' },
});