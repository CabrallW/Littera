import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const PADDING = 20;

const COLORS = {
  primary: '#1E3A8A',
  onPrimary: '#FFFFFF',
  background: '#F8F9FB',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  onSurface: '#1C1B1F',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
  border: '#EEEEEE',
  success: '#10B981',
  successContainer: '#D1FAE5',
  error: '#EF4444',
  errorContainer: '#FEE2E2',
  warning: '#F59E0B',
};

type ReservaPronta = {
  id: string;
  usuario_id: string;
  livro_id: string;
  prazo_retirada: string;
  livros: { titulo: string; capa_url: string | null } | null;
  profiles: { nome: string } | null;
};

type EmprestimoAtivo = {
  id: string;
  usuario_id: string;
  livro_id: string;
  data_emprestimo: string;
  data_prevista_devolucao: string;
  livros: { titulo: string; capa_url: string | null } | null;
  profiles: { nome: string } | null;
};

function formatarData(data?: string) {
  if (!data) return 'N/D';
  const d = new Date(data);
  return (
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

function estaAtrasado(dataPrevista: string) {
  return new Date(dataPrevista) < new Date();
}

export default function EmprestimosScreen() {
  const [aba, setAba] = useState<'retirada' | 'ativos'>('retirada');
  const [reservasProntas, setReservasProntas] = useState<ReservaPronta[]>([]);
  const [emprestimosAtivos, setEmprestimosAtivos] = useState<EmprestimoAtivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [{ data: reservasData, error: reservasError }, { data: emprestimosData, error: emprestimosError }] =
        await Promise.all([
          supabase
            .from('reservas')
            .select('id, usuario_id, livro_id, prazo_retirada, livros(titulo, capa_url), profiles(nome)')
            .eq('status', 'pronta_para_retirada')
            .order('prazo_retirada', { ascending: true }),
          supabase
            .from('emprestimos')
            .select('id, usuario_id, livro_id, data_emprestimo, data_prevista_devolucao, livros(titulo, capa_url), profiles(nome)')
            .eq('status', 'ativo')
            .order('data_prevista_devolucao', { ascending: true }),
        ]);

      if (reservasError) throw reservasError;
      if (emprestimosError) throw emprestimosError;

      setReservasProntas((reservasData as any) || []);
      setEmprestimosAtivos((emprestimosData as any) || []);
    } catch (e: any) {
      console.log('Erro ao carregar empréstimos:', e.message);
      Alert.alert('Erro', 'Não foi possível carregar os dados. Puxe pra baixo pra tentar de novo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    carregarDados();
  }

  function handleConfirmarRetirada(item: ReservaPronta) {
    const titulo = item.livros?.titulo || 'este livro';
    const nome = item.profiles?.nome || 'este aluno';

    Alert.alert('Confirmar retirada', `Confirmar que ${nome} está retirando "${titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setProcessando(item.id);
          try {
            const { error } = await supabase.rpc('confirmar_retirada', { p_reserva_id: item.id });
            if (error) {
              Alert.alert('Não foi possível confirmar', error.message);
              return;
            }
            carregarDados();
          } catch (err: any) {
            Alert.alert('Erro inesperado', err.message);
          } finally {
            setProcessando(null);
          }
        },
      },
    ]);
  }

  function handleRegistrarDevolucao(item: EmprestimoAtivo) {
    const titulo = item.livros?.titulo || 'este livro';
    const nome = item.profiles?.nome || 'este aluno';

    Alert.alert('Registrar devolução', `Confirmar que ${nome} devolveu "${titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setProcessando(item.id);
          try {
            const { error } = await supabase.rpc('registrar_devolucao', { p_emprestimo_id: item.id });
            if (error) {
              Alert.alert('Não foi possível registrar', error.message);
              return;
            }
            carregarDados();
          } catch (err: any) {
            Alert.alert('Erro inesperado', err.message);
          } finally {
            setProcessando(null);
          }
        },
      },
    ]);
  }

  function renderCapa(capaUrl: string | null | undefined) {
    if (capaUrl) {
      return <Image source={{ uri: capaUrl }} style={styles.capa} resizeMode="cover" />;
    }
    return (
      <View style={styles.capaPlaceholder}>
        <MaterialCommunityIcons name="book-open-variant" size={20} color={COLORS.outline} />
      </View>
    );
  }

  function renderReservaPronta({ item }: { item: ReservaPronta }) {
    const processandoEsse = processando === item.id;
    return (
      <View style={styles.card}>
        {renderCapa(item.livros?.capa_url)}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitulo} numberOfLines={2}>{item.livros?.titulo || 'Livro'}</Text>
          <Text style={styles.cardAluno} numberOfLines={1}>{item.profiles?.nome || 'Aluno'}</Text>
          <View style={styles.badgePrazo}>
            <Feather name="clock" size={12} color={COLORS.warning} />
            <Text style={styles.badgePrazoTexto}>Retirar até {formatarData(item.prazo_retirada)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.btnAcao}
          onPress={() => handleConfirmarRetirada(item)}
          disabled={processandoEsse}
          activeOpacity={0.8}
        >
          {processandoEsse ? (
            <ActivityIndicator color={COLORS.onPrimary} size="small" />
          ) : (
            <Feather name="check" size={18} color={COLORS.onPrimary} />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  function renderEmprestimoAtivo({ item }: { item: EmprestimoAtivo }) {
    const processandoEsse = processando === item.id;
    const atrasado = estaAtrasado(item.data_prevista_devolucao);
    return (
      <View style={styles.card}>
        {renderCapa(item.livros?.capa_url)}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitulo} numberOfLines={2}>{item.livros?.titulo || 'Livro'}</Text>
          <Text style={styles.cardAluno} numberOfLines={1}>{item.profiles?.nome || 'Aluno'}</Text>
          <View style={[styles.badgePrazo, atrasado ? styles.badgeAtrasado : styles.badgeNoPrazo]}>
            <Feather name={atrasado ? 'alert-triangle' : 'calendar'} size={12} color={atrasado ? COLORS.error : COLORS.success} />
            <Text style={[styles.badgePrazoTexto, { color: atrasado ? COLORS.error : COLORS.success }]}>
              {atrasado ? 'Atrasado desde ' : 'Devolver até '}{formatarData(item.data_prevista_devolucao)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.btnAcao, { backgroundColor: COLORS.success }]}
          onPress={() => handleRegistrarDevolucao(item)}
          disabled={processandoEsse}
          activeOpacity={0.8}
        >
          {processandoEsse ? (
            <ActivityIndicator color={COLORS.onPrimary} size="small" />
          ) : (
            <MaterialCommunityIcons name="keyboard-return" size={18} color={COLORS.onPrimary} />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const dadosAba = aba === 'retirada' ? reservasProntas : emprestimosAtivos;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Empréstimos</Text>
      </View>

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, aba === 'retirada' && styles.abaBotaoAtiva]}
          onPress={() => setAba('retirada')}
        >
          <Text style={[styles.abaTexto, aba === 'retirada' && styles.abaTextoAtivo]}>
            Aguardando Retirada {reservasProntas.length > 0 ? `(${reservasProntas.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, aba === 'ativos' && styles.abaBotaoAtiva]}
          onPress={() => setAba('ativos')}
        >
          <Text style={[styles.abaTexto, aba === 'ativos' && styles.abaTextoAtivo]}>
            Empréstimos Ativos {emprestimosAtivos.length > 0 ? `(${emprestimosAtivos.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={dadosAba as any[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listaContent}
          renderItem={aba === 'retirada' ? (renderReservaPronta as any) : (renderEmprestimoAtivo as any)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.vazioContainer}>
              <Feather name={aba === 'retirada' ? 'inbox' : 'book'} size={40} color={COLORS.outline} />
              <Text style={styles.vazioTexto}>
                {aba === 'retirada' ? 'Nenhuma retirada pendente' : 'Nenhum empréstimo ativo no momento'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 20,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.onPrimary },
  abas: {
    flexDirection: 'row',
    marginHorizontal: PADDING,
    marginTop: 16,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    padding: 4,
  },
  abaBotao: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  abaBotaoAtiva: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  abaTexto: { fontSize: 12, fontWeight: '600', color: COLORS.onSurfaceVariant },
  abaTextoAtivo: { color: COLORS.primary },
  listaContent: { padding: PADDING, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  capa: { width: 44, height: 64, borderRadius: 6, backgroundColor: COLORS.surfaceVariant },
  capaPlaceholder: {
    width: 44,
    height: 64,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  cardTitulo: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  cardAluno: { fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 2 },
  badgePrazo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeNoPrazo: { backgroundColor: COLORS.successContainer },
  badgeAtrasado: { backgroundColor: COLORS.errorContainer },
  badgePrazoTexto: { fontSize: 11, fontWeight: '600', color: COLORS.warning },
  btnAcao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vazioContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  vazioTexto: { fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center' },
});