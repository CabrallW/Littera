import React, { useState, useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Livro } from '../../lib/types';

const COLORS = {
  primary: '#1E3A8A', 
  onPrimary: '#FFFFFF',
  secondary: '#10B981', 
  error: '#EF4444', 
  background: '#F8F9FB',
  surface: '#FFFFFF',
  onSurface: '#1C1B1F',
  surfaceVariant: '#F3F4F6',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
  outlineVariant: '#CAC4D0',
};

interface BookCardProps {
  book: Livro;
  onOpenMenu: (book: Livro) => void;
}

const BookManagementCard = ({ book, onOpenMenu }: BookCardProps) => {
  const estoque = book.quantidade_disponivel ?? 0;
  const isOutOfStock = estoque === 0;

  return (
    <View style={styles.card}>
      {book.capa_url ? (
        <Image source={{ uri: book.capa_url }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, { alignItems: 'center', justifyContent: 'center' }]}>
          <MaterialCommunityIcons name="book-open-variant" size={24} color={COLORS.outline} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{book.titulo}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>{book.autor}</Text>
        <Text style={styles.cardCategory}>{book.categoria || 'Geral'}</Text>
      </View>
      <View style={styles.cardRight}>
        <View style={[
          styles.stockTag,
          { backgroundColor: isOutOfStock ? '#FEE2E2' : '#D1FAE5' }
        ]}>
          <Text style={[
            styles.stockText,
            { color: isOutOfStock ? COLORS.error : COLORS.secondary }
          ]}>
            {isOutOfStock ? 'Esgotado' : `${estoque} un.`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onOpenMenu(book)} style={styles.menuButton} hitSlop={10}>
          <Feather name="more-vertical" size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function AcervoScreen() {
  const [livros, setLivros] = useState<Livro[]>([]);
  const [categories, setCategories] = useState<string[]>(['Todos']);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [selectedBook, setSelectedBook] = useState<Livro | null>(null);
  
  // Estados para os Modals
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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
      console.error('Erro ao buscar categorias:', error);
    }
  }

  async function fetchLivros() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('livros').select('*').order('titulo');
      if (error) throw error;
      if (data) setLivros(data);
    } catch (error) {
      console.error('Erro ao buscar livros do acervo:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedBook) return;
    try {
      const { error } = await supabase.from('livros').delete().eq('id', selectedBook.id);
      if (error) throw error;
      setLivros((prev) => prev.filter((b) => b.id !== selectedBook.id));
      closeDeleteModal();
    } catch (error) {
      console.error('Erro ao eliminar livro:', error);
      Alert.alert('Erro', 'Não foi possível excluir o livro. Verifique se ele não possui empréstimos ativos.');
    }
  }

  async function handleSaveCategory() {
    if (!newCategoryName || newCategoryName.trim() === '') {
      setIsCategoryModalVisible(false);
      return;
    }

    const formattedCategory = newCategoryName.trim();

    if (categories.includes(formattedCategory)) {
      Alert.alert('Aviso', 'Esta categoria já existe.');
      return;
    }

    try {
      const { error } = await supabase
        .from('categorias')
        .insert([{ nome: formattedCategory }]);

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Erro', 'Esta categoria já está cadastrada no sistema.');
        } else {
          throw error;
        }
        return;
      }

      setCategories((prev) => [...prev, formattedCategory]);
      setActiveFilter(formattedCategory);
      setNewCategoryName('');
      setIsCategoryModalVisible(false);
      
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      Alert.alert('Erro', 'Não foi possível salvar a nova categoria.');
    }
  }

  const filteredBooks = useMemo(() => {
    return livros.filter((book) => {
      const matchesSearch =
        book.titulo.toLowerCase().includes(search.toLowerCase()) ||
        book.autor.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeFilter === 'Todos' || book.categoria === activeFilter;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeFilter, livros]);

  const openMenu = (book: Livro) => { setSelectedBook(book); setIsMenuVisible(true); };
  const closeMenu = () => { setIsMenuVisible(false); };
  const openDeleteModal = () => { setIsMenuVisible(false); setIsDeleteModalVisible(true); };
  const closeDeleteModal = () => { setIsDeleteModalVisible(false); setSelectedBook(null); };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header MD3 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Gestão de Acervo</Text>
          <TouchableOpacity 
            style={styles.headerIcon} 
            onPress={() => router.push('/adicionar-livro')}
          >
            <Ionicons name="add" size={28} color={COLORS.onPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={20} color={COLORS.onSurfaceVariant} />
          <TextInput
            placeholder="Buscar por título ou autor..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.onSurfaceVariant}
            style={styles.searchInput}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        {/* Seção de Filtros */}
        <View style={styles.filterSection}>
          <View style={styles.filterContainer}>
            <FlatList
              horizontal
              data={categories}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setActiveFilter(item)}
                  style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item}
            />
            <TouchableOpacity 
              style={[styles.headerIcon, styles.addCategoryButton]} 
              onPress={() => setIsCategoryModalVisible(true)}
            >
              <Ionicons name="add" size={28} color={COLORS.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Lista Principal */}
      {loading && livros.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <BookManagementCard book={item} onOpenMenu={openMenu} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchLivros}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="book-search" size={64} color={COLORS.outlineVariant} />
              <Text style={styles.emptyText}>Nenhum livro encontrado</Text>
            </View>
          }
        />
      )}

      {/* Menu de Ações (Bottom Sheet) */}
      <Modal visible={isMenuVisible} transparent animationType="slide" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selectedBook?.titulo}</Text>
              <Text style={styles.sheetSubtitle}>{selectedBook?.autor}</Text>
            </View>
            <TouchableOpacity style={styles.sheetItem}>
              <Feather name="eye" size={20} color={COLORS.onSurfaceVariant} />
              <Text style={styles.sheetItemText}>Ver Detalhes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetItem}>
              <Feather name="edit-2" size={20} color={COLORS.onSurfaceVariant} />
              <Text style={styles.sheetItemText}>Editar Informações</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetItem}>
              <MaterialCommunityIcons name="qrcode" size={20} color={COLORS.onSurfaceVariant} />
              <Text style={styles.sheetItemText}>Gerar QR Code</Text>
            </TouchableOpacity>
            <View style={styles.sheetDivider} />
            <TouchableOpacity style={styles.sheetItem} onPress={openDeleteModal}>
              <Feather name="trash-2" size={20} color={COLORS.error} />
              <Text style={[styles.sheetItemText, { color: COLORS.error }]}>Excluir do Acervo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* NOVO: Modal Customizado para Adicionar Categoria (Web & Mobile Friendly) */}
      <Modal 
        visible={isCategoryModalVisible} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlayDark}>
          <View style={styles.alertModal}>
            <View style={styles.alertHeader}>
              <MaterialCommunityIcons name="tag-plus" size={28} color={COLORS.primary} />
              <Text style={styles.alertTitle}>Nova Categoria</Text>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Nome da categoria (ex: Ficção)"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus={true}
            />

            <View style={styles.alertActions}>
              <TouchableOpacity 
                style={styles.alertBtnSecondary} 
                onPress={() => { setIsCategoryModalVisible(false); setNewCategoryName(''); }}
              >
                <Text style={styles.alertBtnTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.alertBtnPrimary, { backgroundColor: COLORS.primary }]} onPress={handleSaveCategory}>
                <Text style={styles.alertBtnTextPrimary}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade" onRequestClose={closeDeleteModal}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.alertModal}>
            <View style={styles.alertHeader}>
              <MaterialCommunityIcons name="alert-circle" size={32} color={COLORS.error} />
              <Text style={styles.alertTitle}>Confirmar Exclusão</Text>
            </View>
            <Text style={styles.alertMessage}>
              Deseja realmente excluir "{selectedBook?.titulo}" do acervo? Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertBtnSecondary} onPress={closeDeleteModal}>
                <Text style={styles.alertBtnTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertBtnPrimary} onPress={handleDelete}>
                <Text style={styles.alertBtnTextPrimary}>Sim, Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.onPrimary },
  headerIcon: { padding: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 20, borderRadius: 28, paddingHorizontal: 16, height: 48, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: COLORS.onSurface },
  filterSection: { paddingLeft: 20, paddingRight: 20 },
  filterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addCategoryButton: { marginLeft: 8 },
  filterList: { paddingRight: 8, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  filterChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.onPrimary },
  filterTextActive: { color: COLORS.onPrimary },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 16, padding: 12, marginBottom: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  cardImage: { width: 50, height: 75, borderRadius: 8, backgroundColor: COLORS.surfaceVariant },
  cardInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface, marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: COLORS.onSurfaceVariant, marginBottom: 4 },
  cardCategory: { fontSize: 11, fontWeight: '500', color: COLORS.primary, backgroundColor: '#E0E7FF', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between', height: 75, paddingVertical: 4 },
  stockTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  stockText: { fontSize: 10, fontWeight: '700' },
  menuButton: { padding: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, opacity: 0.6 },
  emptyText: { fontSize: 16, color: COLORS.onSurfaceVariant, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  bottomSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, paddingTop: 12 },
  sheetHandle: { width: 32, height: 4, backgroundColor: COLORS.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { paddingHorizontal: 24, paddingBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  sheetSubtitle: { fontSize: 14, color: COLORS.onSurfaceVariant },
  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 },
  sheetItemText: { fontSize: 16, fontWeight: '500', marginLeft: 16, color: COLORS.onSurface },
  sheetDivider: { height: 1, backgroundColor: COLORS.surfaceVariant, marginVertical: 8 },
  alertModal: { backgroundColor: COLORS.surface, borderRadius: 28, padding: 24, width: '100%', maxWidth: 360 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  alertTitle: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  alertMessage: { fontSize: 16, color: COLORS.onSurfaceVariant, lineHeight: 24, marginBottom: 24 },
  alertActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  alertBtnSecondary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  alertBtnTextSecondary: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  alertBtnPrimary: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.error },
  alertBtnTextPrimary: { fontSize: 14, fontWeight: '700', color: COLORS.onPrimary },
  modalInput: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.onSurface,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  }
});