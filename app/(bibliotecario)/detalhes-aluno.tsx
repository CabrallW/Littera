import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Emprestimo, Profile } from '../../lib/types';

const COLORS = {
  primary: '#1E3A8A',
  onPrimary: '#FFFFFF',
  secondary: '#10B981',
  secondaryContainer: '#D1FAE5',
  error: '#EF4444',
  errorContainer: '#FEE2E2',
  background: '#F8F9FB',
  surface: '#FFFFFF',
  onSurface: '#1C1B1F',
  surfaceVariant: '#F3F4F6',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
  outlineVariant: '#CAC4D0',
  border: '#EEEEEE',
};

function formatarData(data: string | null) {
  if (!data) return '—';
  return new Date(data).toLocaleDateString('pt-BR');
}

function diasEmAtraso(dataPrevista: string) {
  const hoje = new Date();
  const prevista = new Date(dataPrevista);
  const diff = Math.floor((hoje.getTime() - prevista.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function DetalhesAlunoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [aluno, setAluno] = useState<Profile | null>(null);
  const [emprestimosAtivos, setEmprestimosAtivos] = useState<Emprestimo[]>([]);
  const [historico, setHistorico] = useState<Emprestimo[]>([]);
  const [loading, setLoading] = useState(false);
  const [devolvendoId, setDevolvendoId] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (params.aluno) {
        setAluno(JSON.parse(params.aluno as string));
      }
    } catch (error) {
      console.error('Erro ao converter os dados do aluno:', error);
    }
  }, [params.aluno]);

  const fetchEmprestimos = useCallback(async () => {
    if (!aluno) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('emprestimos')
        .select('*, livro:livros(*)')
        .eq('usuario_id', aluno.id)
        .order('data_emprestimo', { ascending: false });

      if (error) throw error;

      const todos = data || [];
      setEmprestimosAtivos(todos.filter((e) => e.status === 'ativo' || e.status === 'atrasado'));
      setHistorico(todos.filter((e) => e.status === 'devolvido'));
    } catch (error) {
      console.error('Erro ao buscar empréstimos do aluno:', error);
    } finally {
      setLoading(false);
    }
  }, [aluno]);

  useEffect(() => {
    fetchEmprestimos();
  }, [fetchEmprestimos]);

  async function handleDevolucao(emprestimo: Emprestimo) {
    setDevolvendoId(emprestimo.id);
    try {
      const { error } = await supabase
        .from('emprestimos')
        .update({ status: 'devolvido', data_devolucao: new Date().toISOString() })
        .eq('id', emprestimo.id);

      if (error) throw error;
      await fetchEmprestimos();
    } catch (error) {
      console.error('Erro ao registrar devolução:', error);
      Alert.alert('Erro', 'Não foi possível registrar a devolução.');
    } finally {
      setDevolvendoId(null);
    }
  }

  function confirmarDevolucao(emprestimo: Emprestimo) {
    Alert.alert(
      'Confirmar Devolução',
      `Registrar a devolução de "${emprestimo.livro?.titulo || 'este livro'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => handleDevolucao(emprestimo) },
      ]
    );
  }

  function handleNovoEmprestimo() {
    Alert.alert('Em breve', 'O registro de novos empréstimos estará disponível em breve na aba Empréstimos.');
  }

  if (!aluno) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Erro ao carregar os detalhes do aluno.</Text>
        <TouchableOpacity style={styles.btnVoltarErro} onPress={() => router.back()}>
          <Text style={{ color: COLORS.onPrimary, fontWeight: '600' }}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const iniciais = aluno.nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Detalhes do Aluno</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Perfil */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{iniciais}</Text>
          </View>
          <Text style={styles.nome}>{aluno.nome}</Text>
          <View style={styles.emailRow}>
            <Feather name="mail" size={14} color={COLORS.onSurfaceVariant} />
            <Text style={styles.email}>{aluno.email}</Text>
          </View>
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Text style={styles.tagTexto}>
                {aluno.serie && aluno.curso ? `${aluno.serie}º ${aluno.curso}` : 'Turma não definida'}
              </Text>
            </View>
          </View>
        </View>

        {loading && emprestimosAtivos.length === 0 && historico.length === 0 ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Empréstimos Ativos */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Feather name="book" size={16} color={COLORS.primary} /> Empréstimos Ativos
              </Text>

              {emprestimosAtivos.length === 0 ? (
                <Text style={styles.vazioTexto}>Nenhum empréstimo ativo no momento.</Text>
              ) : (
                emprestimosAtivos.map((emp) => {
                  const atraso = diasEmAtraso(emp.data_prevista_devolucao);
                  const estaAtrasado = emp.status === 'atrasado' || atraso > 0;
                  return (
                    <View
                      key={emp.id}
                      style={[styles.emprestimoCard, estaAtrasado && styles.emprestimoCardAtrasado]}
                    >
                      <View style={styles.livroIconWrap}>
                        <MaterialCommunityIcons name="book-open-variant" size={22} color={COLORS.outline} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.livroTitulo} numberOfLines={1}>
                          {emp.livro?.titulo || 'Livro'}
                        </Text>
                        <Text style={styles.livroAutor} numberOfLines={1}>
                          {emp.livro?.autor || ''}
                        </Text>
                        <View style={styles.emprestimoFooter}>
                          {estaAtrasado ? (
                            <Text style={styles.statusAtrasado}>
                              <Feather name="alert-triangle" size={12} /> Atrasado{atraso > 0 ? ` (${atraso} dias)` : ''}
                            </Text>
                          ) : (
                            <Text style={styles.statusNoPrazo}>
                              <Feather name="clock" size={12} /> No prazo
                            </Text>
                          )}
                          <Text style={styles.dataDevolucao}>
                            Devolver: {formatarData(emp.data_prevista_devolucao)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.btnDevolver}
                          onPress={() => confirmarDevolucao(emp)}
                          disabled={devolvendoId === emp.id}
                        >
                          {devolvendoId === emp.id ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                          ) : (
                            <>
                              <Feather name="corner-down-left" size={14} color={COLORS.primary} />
                              <Text style={styles.btnDevolverTexto}>Registrar Devolução</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Histórico */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Feather name="clock" size={16} color={COLORS.primary} /> Histórico
              </Text>
              <View style={styles.historicoCard}>
                {historico.length === 0 ? (
                  <Text style={[styles.vazioTexto, { padding: 16 }]}>Nenhum empréstimo concluído ainda.</Text>
                ) : (
                  historico.slice(0, 5).map((emp, index) => (
                    <View
                      key={emp.id}
                      style={[styles.historicoItem, index < historico.length - 1 && styles.historicoDivider]}
                    >
                      <View>
                        <Text style={styles.historicoTitulo}>{emp.livro?.titulo || 'Livro'}</Text>
                        <Text style={styles.historicoData}>Devolvido em {formatarData(emp.data_devolucao)}</Text>
                      </View>
                      <Feather name="check-circle" size={18} color={COLORS.secondary} />
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Ações fixas */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnSecundario} activeOpacity={0.8} onPress={fetchEmprestimos}>
          <Feather name="refresh-cw" size={18} color={COLORS.onSurface} />
          <Text style={styles.btnSecundarioTexto}>Atualizar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimario} activeOpacity={0.8} onPress={handleNovoEmprestimo}>
          <Feather name="plus-square" size={18} color={COLORS.onPrimary} />
          <Text style={styles.btnPrimarioTexto}>Empréstimo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 32,
  },
  errorText: { fontSize: 16, color: COLORS.onSurfaceVariant, textAlign: 'center', marginBottom: 16 },
  btnVoltarErro: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 16,
    height: 64,
    backgroundColor: COLORS.surface,
  },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface, flex: 1, textAlign: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: COLORS.primary },
  nome: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4, textAlign: 'center' },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  email: { fontSize: 14, color: COLORS.onSurfaceVariant },
  tagsRow: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: COLORS.surfaceVariant, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tagTexto: { fontSize: 12, fontWeight: '600', color: COLORS.onSurface },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.onSurface, marginBottom: 12 },
  vazioTexto: { fontSize: 14, color: COLORS.onSurfaceVariant, fontStyle: 'italic' },
  emprestimoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  emprestimoCardAtrasado: { backgroundColor: '#FEF2F2', borderColor: COLORS.errorContainer },
  livroIconWrap: {
    width: 44,
    height: 64,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livroTitulo: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface },
  livroAutor: { fontSize: 13, color: COLORS.onSurfaceVariant, marginBottom: 6 },
  emprestimoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusAtrasado: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  statusNoPrazo: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },
  dataDevolucao: { fontSize: 12, color: COLORS.onSurfaceVariant },
  btnDevolver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E0E7FF',
  },
  btnDevolverTexto: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  historicoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  historicoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  historicoDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.surfaceVariant },
  historicoTitulo: { fontSize: 14, fontWeight: '600', color: COLORS.onSurface },
  historicoData: { fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceVariant,
  },
  btnSecundario: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: COLORS.secondaryContainer,
  },
  btnSecundarioTexto: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  btnPrimario: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  btnPrimarioTexto: { fontSize: 14, fontWeight: '700', color: COLORS.onPrimary },
});