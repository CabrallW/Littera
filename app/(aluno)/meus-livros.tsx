import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, SafeAreaView, StatusBar, ActivityIndicator, Image,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Emprestimo } from '../../lib/types';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';

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

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function MeusLivrosScreen() {
  const [tabAtiva, setTabAtiva] = useState<TabId>('emprestimos');
  const [emprestimosAtivos, setEmprestimosAtivos] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Empréstimos ativos
      const { data: ativos } = await supabase
        .from('emprestimos')
        .select('*, livro:livros(*)')
        .eq('usuario_id', user.id)
        .in('status', ['ativo', 'atrasado']);

      // Histórico
      const { data: hist } = await supabase
        .from('emprestimos')
        .select('*, livro:livros(*)')
        .eq('usuario_id', user.id)
        .eq('status', 'devolvido')
        .order('data_devolucao', { ascending: false });

      if (ativos) setEmprestimosAtivos(ativos);
      if (hist) setHistorico(hist);
    } catch (e) {
      console.error('Erro ao carregar empréstimos:', e);
    } finally {
      setLoading(false);
    }
  }

  // Função que abre o celular do aluno
  async function abrirArquivoLocal() {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip'],
        copyToCacheDirectory: true,
      });

      if (!resultado.canceled && resultado.assets.length > 0) {
        const arquivo = resultado.assets[0];
        const extensao = arquivo.name.split('.').pop()?.toLowerCase() || 'pdf';

        router.push({
          pathname: '/leitura',
          params: { uri: arquivo.uri, extensao: extensao }
        });
      }
    } catch (erro) {
      console.error('Erro ao abrir documento:', erro);
    }
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'emprestimos', label: 'Empréstimos' },
    { id: 'digital', label: 'Digital' },
    { id: 'historico', label: 'Histórico' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerSub}>Biblioteca Escolar</Text>
        <Text style={styles.headerTitulo}>Meus Livros</Text>
      </View>

      {/* Abas */}
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

      {/* Conteúdo */}
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
              ListEmptyComponent={
                <View style={styles.vazio}>
                  <Text style={styles.vazioIcone}>📚</Text>
                  <Text style={styles.vazioTexto}>Nenhum empréstimo ativo</Text>
                </View>
              }
              renderItem={({ item }) => <EmprestimoCard emprestimo={item} />}
            />
          )}

          {tabAtiva === 'digital' && (
            <View style={styles.vazio}>
              <Text style={styles.vazioIcone}>📱</Text>
              <Text style={styles.vazioTexto}>Leitor Offline</Text>
              <Text style={styles.vazioSub}>
                Abra apostilas ou livros em PDF que já estão salvos no seu celular.
              </Text>
              
              <TouchableOpacity 
                style={styles.botaoAbrirArquivo}
                onPress={abrirArquivoLocal}
              >
                <Text style={styles.textoBotaoAbrir}>Abrir arquivo do meu celular</Text>
              </TouchableOpacity>
            </View>
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
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  vazioIcone: { fontSize: 48 },
  vazioTexto: { fontSize: 16, fontWeight: '600', color: COLORS.onSurface },
  vazioSub: { fontSize: 13, color: COLORS.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 32 },
  
  // Adicionados para o botão de abrir arquivo local
  botaoAbrirArquivo: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  textoBotaoAbrir: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  }
});