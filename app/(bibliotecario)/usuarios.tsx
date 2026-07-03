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
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../lib/types';

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

type AlunoComDados = Profile & {
  emprestimosAtivos: number;
  pendente: boolean;
};

type FiltroTipo = 'Todos' | 'Pendentes' | 'Regulares';

function getIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

interface AlunoCardProps {
  aluno: AlunoComDados;
  onPress: (aluno: AlunoComDados) => void;
}

const AlunoCard = ({ aluno, onPress }: AlunoCardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(aluno)} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getIniciais(aluno.nome)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{aluno.nome}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            Mat: {aluno.matricula || 'N/D'}
          </Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.livrosInfo}>
          <MaterialCommunityIcons
            name="book"
            size={16}
            color={aluno.pendente ? COLORS.error : COLORS.onSurfaceVariant}
          />
          <Text style={styles.livrosText}>
            {aluno.emprestimosAtivos} {aluno.emprestimosAtivos === 1 ? 'livro' : 'livros'}
          </Text>
        </View>
        <View style={[styles.statusTag, { backgroundColor: aluno.pendente ? '#FEE2E2' : '#D1FAE5' }]}>
          {aluno.pendente && <Feather name="alert-triangle" size={11} color={COLORS.error} />}
          <Text style={[styles.statusText, { color: aluno.pendente ? COLORS.error : COLORS.secondary }]}>
            {aluno.pendente ? 'Pendente' : 'Regular'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function UsuariosScreen() {
  const [alunos, setAlunos] = useState<AlunoComDados[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FiltroTipo>('Todos');

  useEffect(() => {
    fetchAlunos();
  }, []);

  async function fetchAlunos() {
    setLoading(true);
    try {
      const { data: perfis, error: perfisError } = await supabase
        .from('profiles')
        .select('*')
        .eq('tipo', 'aluno')
        .order('nome', { ascending: true });

      if (perfisError) throw perfisError;

      const { data: emprestimos, error: emprestimosError } = await supabase
        .from('emprestimos')
        .select('usuario_id, status')
        .in('status', ['ativo', 'atrasado']);

      if (emprestimosError) throw emprestimosError;

      const mapa: Record<string, { count: number; atrasado: boolean }> = {};
      (emprestimos || []).forEach((emp) => {
        if (!mapa[emp.usuario_id]) mapa[emp.usuario_id] = { count: 0, atrasado: false };
        mapa[emp.usuario_id].count += 1;
        if (emp.status === 'atrasado') mapa[emp.usuario_id].atrasado = true;
      });

      const alunosComDados: AlunoComDados[] = (perfis || []).map((aluno) => ({
        ...aluno,
        emprestimosAtivos: mapa[aluno.id]?.count ?? 0,
        pendente: mapa[aluno.id]?.atrasado ?? false,
      }));

      setAlunos(alunosComDados);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAlunos = useMemo(() => {
    return alunos.filter((aluno) => {
      const termo = search.toLowerCase();
      const matchesSearch =
        aluno.nome.toLowerCase().includes(termo) ||
        (aluno.matricula || '').toLowerCase().includes(termo);
      const matchesFilter =
        activeFilter === 'Todos' ||
        (activeFilter === 'Pendentes' && aluno.pendente) ||
        (activeFilter === 'Regulares' && !aluno.pendente);
      return matchesSearch && matchesFilter;
    });
  }, [alunos, search, activeFilter]);

  function openDetalhes(aluno: AlunoComDados) {
    router.push({
      pathname: '/(bibliotecario)/detalhes-aluno',
      params: { aluno: JSON.stringify(aluno) },
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Alunos</Text>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={COLORS.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nome ou matrícula..."
            placeholderTextColor={COLORS.outline}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterList}>
          {(['Todos', 'Pendentes', 'Regulares'] as FiltroTipo[]).map((filtro) => (
            <TouchableOpacity
              key={filtro}
              style={[styles.filterChip, activeFilter === filtro && styles.filterChipActive]}
              onPress={() => setActiveFilter(filtro)}
            >
              <Text style={styles.filterText}>{filtro}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredAlunos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlunoCard aluno={item} onPress={openDetalhes} />}
        numColumns={1}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchAlunos}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-search" size={64} color={COLORS.outlineVariant} />
              <Text style={styles.emptyText}>Nenhum aluno encontrado</Text>
            </View>
          ) : null
        }
      />
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
  headerTop: { paddingHorizontal: 20, marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.onPrimary },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 28,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.onSurface },
  filterList: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filterChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.onPrimary },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  cardInfo: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface, marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: COLORS.onSurfaceVariant },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceVariant,
  },
  livrosInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  livrosText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, opacity: 0.6 },
  emptyText: { fontSize: 16, color: COLORS.onSurfaceVariant, marginTop: 12 },
});