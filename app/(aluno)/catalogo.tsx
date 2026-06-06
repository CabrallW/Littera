import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Livro } from '../../lib/types';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 5;
const PADDING = 32;
const GAP = 8;
const CARD_WIDTH = (width - (PADDING * 2) - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

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

const CATEGORIES = ['Todos', 'Fantasia', 'Romance', 'Mistério', 'Clássicos'];

// ─── Card de livro ────────────────────────────────────────────────────────────
function BookCard({ book }: { book: Livro }) {
  const isAvailable = book.quantidade_disponivel > 0;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
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
  const [livros, setLivros] = useState<Livro[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Todos');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchLivros(); }, []);

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

  const filteredLivros = livros.filter((l: Livro) =>
    l.titulo.toLowerCase().includes(search.toLowerCase()) ||
    l.autor.toLowerCase().includes(search.toLowerCase())
  );
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      window.scrollBy({ top: 150, behavior: 'smooth' });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      window.scrollBy({ top: -150, behavior: 'smooth' });
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

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

      {/* Categorias */}
      <View style={styles.chipsContainer}>
        <FlatList
          horizontal
          data={CATEGORIES}
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
        data={filteredLivros}
        renderItem={({ item }) => <BookCard book={item} />}
        keyExtractor={(item) => item.id.toString()}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchLivros}
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
  card: { width: CARD_WIDTH },
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