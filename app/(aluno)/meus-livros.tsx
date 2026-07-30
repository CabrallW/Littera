import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, SafeAreaView, StatusBar, ActivityIndicator, Image, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import {
  listarArquivosDigitais,
  escolherEImportarArquivo,
  removerArquivoDigital,
  ArquivoDigital,
} from '../../lib/arquivosDigitais';

type TabId = 'emprestimos' | 'digital' | 'historico';

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#10B981',
  amber: '#F59E0B',
  danger: '#EF4444',
  bg: '#F8F9FB',
  white: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  onSurface: '#1C1B1F',
  onSurfaceVariant: '#49454F',
  border: '#E5E7EB',
};

const CORES_CAPA = [
  '#1E3A8A', '#4F46E5', '#0F766E', '#B45309',
  '#7C3AED', '#0369A1', '#065F46', '#9D174D',
];

// ─── Card de Reserva (na fila ou pronta pra retirar) ─────────────────────────
function ReservaCard({
  reserva,
  onCancelar,
  processando,
}: {
  reserva: any;
  onCancelar: () => void;
  processando: boolean;
}) {
  const cor = CORES_CAPA[(reserva.livro?.titulo?.charCodeAt(0) ?? 0) % CORES_CAPA.length];
  const iniciais = reserva.livro?.titulo?.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() ?? '??';
  const pronta = reserva.status === 'pronta_para_retirada';

  return (
    <View style={styles.card}>
      {reserva.livro?.capa_url ? (
        <Image source={{ uri: reserva.livro.capa_url }} style={styles.capa} resizeMode="cover" />
      ) : (
        <View style={[styles.capa, { backgroundColor: cor, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{iniciais}</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitulo} numberOfLines={2}>{reserva.livro?.titulo ?? 'Livro'}</Text>
        <Text style={styles.cardAutor} numberOfLines={1}>{reserva.livro?.autor ?? ''}</Text>

        {pronta ? (
          <>
            <Text style={styles.cardData}>
              Retire até {new Date(reserva.prazo_retirada).toLocaleDateString('pt-BR')}
            </Text>
            <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.badgeText, { color: COLORS.secondary }]}>Pronto para retirar</Text>
            </View>
          </>
        ) : (
          <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.badgeText, { color: COLORS.amber }]}>Na fila de espera</Text>
          </View>
        )}

        <TouchableOpacity onPress={onCancelar} disabled={processando} style={{ marginTop: 4 }}>
          <Text style={styles.linkCancelar}>{processando ? 'Cancelando...' : 'Cancelar reserva'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Card de Empréstimo ───────────────────────────────────────────────────────
function EmprestimoCard({ emprestimo }: { emprestimo: any }) {
  const dataDevol = new Date(emprestimo.data_prevista_devolucao);
  const hoje = new Date();
  const diasRestantes = Math.ceil((dataDevol.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  const atrasado = diasRestantes < 0;

  const corDias = atrasado ? COLORS.danger : diasRestantes <= 3 ? COLORS.amber : COLORS.secondary;
  const cor = CORES_CAPA[(emprestimo.livro?.titulo?.charCodeAt(0) ?? 0) % CORES_CAPA.length];
  const iniciais = emprestimo.livro?.titulo?.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() ?? '??';

  return (
    <View style={styles.card}>
      {emprestimo.livro?.capa_url ? (
        <Image source={{ uri: emprestimo.livro.capa_url }} style={styles.capa} resizeMode="cover" />
      ) : (
        <View style={[styles.capa, { backgroundColor: cor, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{iniciais}</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitulo} numberOfLines={2}>{emprestimo.livro?.titulo ?? 'Livro'}</Text>
        <Text style={styles.cardAutor} numberOfLines={1}>{emprestimo.livro?.autor ?? ''}</Text>
        <Text style={styles.cardData}>Devolução: {dataDevol.toLocaleDateString('pt-BR')}</Text>
        <View style={[styles.badge, { backgroundColor: atrasado ? '#FEE2E2' : diasRestantes <= 3 ? '#FEF3C7' : '#D1FAE5' }]}>
          <Text style={[styles.badgeText, { color: corDias }]}>
            {atrasado ? `Atrasado ${Math.abs(diasRestantes)}d` : diasRestantes === 0 ? 'Vence hoje' : `${diasRestantes} dias restantes`}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Card de Histórico ────────────────────────────────────────────────────────
function HistoricoCard({ emprestimo }: { emprestimo: any }) {
  const dataDevol = new Date(emprestimo.data_devolucao ?? emprestimo.data_prevista_devolucao);
  const cor = CORES_CAPA[(emprestimo.livro?.titulo?.charCodeAt(0) ?? 0) % CORES_CAPA.length];
  const iniciais = emprestimo.livro?.titulo?.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() ?? '??';

  return (
    <View style={[styles.card, { opacity: 0.85 }]}>
      {emprestimo.livro?.capa_url ? (
        <Image source={{ uri: emprestimo.livro.capa_url }} style={styles.capa} resizeMode="cover" />
      ) : (
        <View style={[styles.capa, { backgroundColor: cor, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{iniciais}</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitulo} numberOfLines={2}>{emprestimo.livro?.titulo ?? 'Livro'}</Text>
        <Text style={styles.cardAutor} numberOfLines={1}>{emprestimo.livro?.autor ?? ''}</Text>
        <Text style={styles.cardData}>Devolvido em: {dataDevol.toLocaleDateString('pt-BR')}</Text>
        <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
          <Text style={[styles.badgeText, { color: COLORS.secondary }]}>✓ Devolvido</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Card de Arquivo Digital ──────────────────────────────────────────────────
function ArquivoDigitalCard({
  arquivo,
  onAbrir,
  onRemover,
}: {
  arquivo: ArquivoDigital;
  onAbrir: () => void;
  onRemover: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onAbrir} activeOpacity={0.7}>
      <View
        style={[
          styles.capa,
          { backgroundColor: arquivo.extensao === 'pdf' ? '#B45309' : '#0F766E', alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{arquivo.extensao.toUpperCase()}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitulo} numberOfLines={2}>{arquivo.nome}</Text>
        <Text style={styles.cardData}>
          Adicionado em {new Date(arquivo.adicionadoEm).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      <TouchableOpacity onPress={onRemover} style={{ padding: 8 }}>
        <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: '700' }}>Remover</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function MeusLivrosScreen() {
  const [tabAtiva, setTabAtiva] = useState<TabId>('emprestimos');
  const [emprestimosAtivos, setEmprestimosAtivos] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [arquivosDigitais, setArquivosDigitais] = useState<ArquivoDigital[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (tabAtiva === 'digital') {
      carregarArquivosDigitais();
    }
  }, [tabAtiva]);

  async function carregarDados() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ativos } = await supabase
        .from('emprestimos')
        .select('*, livro:livros(*)')
        .eq('usuario_id', user.id)
        .eq('status', 'ativo');

      const { data: reservasData } = await supabase
        .from('reservas')
        .select('*, livro:livros(*)')
        .eq('usuario_id', user.id)
        .in('status', ['na_fila', 'pronta_para_retirada'])
        .order('data_reserva', { ascending: true });

      const { data: hist } = await supabase
        .from('emprestimos')
        .select('*, livro:livros(*)')
        .eq('usuario_id', user.id)
        .eq('status', 'devolvido')
        .order('data_devolucao', { ascending: false });

      if (ativos) setEmprestimosAtivos(ativos);
      if (reservasData) setReservas(reservasData);
      if (hist) setHistorico(hist);
    } catch (e) {
      console.error('Erro ao carregar empréstimos:', e);
    } finally {
      setLoading(false);
    }
  }

  async function carregarArquivosDigitais() {
    const lista = await listarArquivosDigitais();
    setArquivosDigitais(lista);
  }

  function handleCancelarReserva(reservaId: string) {
    Alert.alert('Cancelar reserva', 'Tem certeza que deseja sair da fila de espera desse livro?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, cancelar',
        style: 'destructive',
        onPress: async () => {
          setProcessando(reservaId);
          try {
            const { error } = await supabase.rpc('cancelar_reserva', { p_reserva_id: reservaId });
            if (error) {
              Alert.alert('Erro', error.message);
              return;
            }
            carregarDados();
          } catch (e: any) {
            Alert.alert('Erro inesperado', e.message);
          } finally {
            setProcessando(null);
          }
        },
      },
    ]);
  }

  async function handleImportarArquivo() {
    setImportando(true);
    try {
      const arquivo = await escolherEImportarArquivo();
      if (arquivo) {
        await carregarArquivosDigitais();
        router.push({ pathname: '/leitura', params: { uri: arquivo.uriLocal, extensao: arquivo.extensao } });
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível importar o arquivo.');
    } finally {
      setImportando(false);
    }
  }

  function handleAbrirArquivo(arquivo: ArquivoDigital) {
    router.push({ pathname: '/leitura', params: { uri: arquivo.uriLocal, extensao: arquivo.extensao } });
  }

  function handleRemoverArquivo(arquivo: ArquivoDigital) {
    Alert.alert('Remover arquivo', `Remover "${arquivo.nome}" da lista? O arquivo será apagado do dispositivo.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await removerArquivoDigital(arquivo.id);
          carregarArquivosDigitais();
        },
      },
    ]);
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'emprestimos', label: 'Empréstimos' },
    { id: 'digital', label: 'Digital' },
    { id: 'historico', label: 'Histórico' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <Text style={styles.headerSub}>Biblioteca Escolar</Text>
        <Text style={styles.headerTitulo}>Meus Livros</Text>
      </View>

      <View style={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, tabAtiva === tab.id && styles.tabAtiva]}
            onPress={() => setTabAtiva(tab.id)}
          >
            <Text style={[styles.tabTexto, tabAtiva === tab.id && styles.tabTextoAtivo]}>
              {tab.label}
            </Text>
            {tabAtiva === tab.id && <View style={styles.tabIndicador} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <>
          {tabAtiva === 'emprestimos' && (
            <FlatList
              data={emprestimosAtivos}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.lista}
              showsVerticalScrollIndicator={false}
              onRefresh={carregarDados}
              refreshing={loading}
              ListHeaderComponent={
                reservas.length > 0 ? (
                  <View style={{ gap: 12, marginBottom: emprestimosAtivos.length > 0 ? 12 : 0 }}>
                    {reservas.map((reserva) => (
                      <ReservaCard
                        key={reserva.id}
                        reserva={reserva}
                        onCancelar={() => handleCancelarReserva(reserva.id)}
                        processando={processando === reserva.id}
                      />
                    ))}
                  </View>
                ) : null
              }
              ListEmptyComponent={
                emprestimosAtivos.length === 0 && reservas.length === 0 ? (
                  <View style={styles.vazio}>
                    <Text style={styles.vazioIcone}>📚</Text>
                    <Text style={styles.vazioTexto}>Nenhum empréstimo ativo</Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => <EmprestimoCard emprestimo={item} />}
            />
          )}

          {tabAtiva === 'digital' && (
            <FlatList
              data={arquivosDigitais}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.lista}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <TouchableOpacity style={styles.btnImportar} onPress={handleImportarArquivo} disabled={importando}>
                  {importando ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnImportarTexto}>+ Abrir arquivo do dispositivo (PDF/EPUB)</Text>
                  )}
                </TouchableOpacity>
              }
              ListEmptyComponent={
                <View style={styles.vazio}>
                  <Text style={styles.vazioIcone}>📄</Text>
                  <Text style={styles.vazioTexto}>Nenhum arquivo aberto ainda</Text>
                  <Text style={styles.vazioSub}>Toque no botão acima para escolher um PDF ou EPUB do seu celular</Text>
                </View>
              }
              renderItem={({ item }) => (
                <ArquivoDigitalCard
                  arquivo={item}
                  onAbrir={() => handleAbrirArquivo(item)}
                  onRemover={() => handleRemoverArquivo(item)}
                />
              )}
            />
          )}

          {tabAtiva === 'historico' && (
            <FlatList
              data={historico}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.lista}
              showsVerticalScrollIndicator={false}
              onRefresh={carregarDados}
              refreshing={loading}
              ListEmptyComponent={
                <View style={styles.vazio}>
                  <Text style={styles.vazioIcone}>🕐</Text>
                  <Text style={styles.vazioTexto}>Nenhum histórico ainda</Text>
                </View>
              }
              renderItem={({ item }) => <HistoricoCard emprestimo={item} />}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  headerSub: { color: '#93C5FD', fontSize: 12, letterSpacing: 0.5 },
  headerTitulo: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 2 },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    position: 'relative',
  },
  tabAtiva: {},
  tabTexto: { fontSize: 13, fontWeight: '500', color: COLORS.onSurfaceVariant },
  tabTextoAtivo: { color: COLORS.primary, fontWeight: '700' },
  tabIndicador: {
    position: 'absolute', bottom: 0, left: 16, right: 16,
    height: 2, backgroundColor: COLORS.primary, borderRadius: 1,
  },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 12,
    flexDirection: 'row', padding: 12, gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  capa: { width: 56, height: 80, borderRadius: 8, flexShrink: 0 },
  cardInfo: { flex: 1, gap: 3 },
  cardTitulo: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  cardAutor: { fontSize: 12, color: COLORS.onSurfaceVariant },
  cardData: { fontSize: 11, color: COLORS.onSurfaceVariant },
  badge: {
    alignSelf: 'flex-start', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 6, marginTop: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  linkCancelar: { fontSize: 11, fontWeight: '700', color: COLORS.danger },
  btnImportar: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  btnImportarTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  vazioIcone: { fontSize: 48 },
  vazioTexto: { fontSize: 16, fontWeight: '600', color: COLORS.onSurface },
  vazioSub: { fontSize: 13, color: COLORS.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 32 },
});