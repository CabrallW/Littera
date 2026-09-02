import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const PADDING = 20;
const BREAKPOINT_DESKTOP = 768;

const COLORS = {
  primary: '#1E3A8A',
  primaryLight: '#3B82F6',
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
  warning: '#F59E0B',
  warningContainer: '#FEF3C7',
  gold: '#F59E0B',
  silver: '#9CA3AF',
  bronze: '#B45309',
};

// ─────────────────────────────────────────────────────────
// DADOS FICTÍCIOS (mock) — substituir por consultas reais
// ao Supabase quando o módulo de relatórios for integrado.
// ─────────────────────────────────────────────────────────

type Periodo = 'mensal' | 'anual';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MES_ATUAL_INDEX = 7; // Agosto (0-indexado) — usado para não "inventar" meses futuros

const LEITURAS_POR_MES = [118, 134, 142, 158, 171, 96, 89, 190, 0, 0, 0, 0];
const LEITURAS_POR_ANO = [
  { label: '2022', valor: 980 },
  { label: '2023', valor: 1240 },
  { label: '2024', valor: 1450 },
  { label: '2025', valor: 1680 },
  { label: '2026', valor: 1290 },
];

const RANKING_LEITORES = [
  { nome: 'Maria Eduarda Silva', turma: '6º Ano A', livros: 34 },
  { nome: 'João Pedro Santos', turma: '9º Ano B', livros: 29 },
  { nome: 'Ana Clara Oliveira', turma: '7º Ano C', livros: 27 },
  { nome: 'Lucas Gabriel Costa', turma: '8º Ano A', livros: 25 },
  { nome: 'Beatriz Almeida', turma: '5º Ano B', livros: 22 },
];

const LEITURAS_POR_TURMA = [
  { turma: '6º Ano A', livros: 210 },
  { turma: '7º Ano A', livros: 195 },
  { turma: '6º Ano B', livros: 178 },
  { turma: '7º Ano B', livros: 160 },
  { turma: '8º Ano A', livros: 145 },
  { turma: '9º Ano A', livros: 132 },
];

const CATEGORIAS_MAIS_LIDAS = [
  { nome: 'Ficção', percentual: 34, cor: COLORS.primary },
  { nome: 'Aventura', percentual: 22, cor: COLORS.success },
  { nome: 'Romance', percentual: 18, cor: '#EC4899' },
  { nome: 'Biografias', percentual: 14, cor: COLORS.warning },
  { nome: 'Outros', percentual: 12, cor: COLORS.outline },
];

const STATS = {
  mensal: {
    totalLivros: 190,
    participantesAtivos: 231,
    totalAlunos: 480,
    mediaPorAluno: 1.8,
    tendencia: 11, // % vs mês anterior
  },
  anual: {
    totalLivros: 1290,
    participantesAtivos: 402,
    totalAlunos: 480,
    mediaPorAluno: 3.2,
    tendencia: 18, // % vs mesmo período do ano anterior
  },
};

// ─────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  valor,
  destaque,
  desktop,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  destaque?: boolean;
  desktop?: boolean;
}) {
  return (
    <View
      style={[
        styles.statCard,
        destaque && styles.statCardDestaque,
        desktop && styles.statCardDesktop,
      ]}
    >
      <View style={[styles.statIconWrap, destaque && styles.statIconWrapDestaque]}>{icon}</View>
      <Text style={[styles.statValor, destaque && styles.statValorDestaque, desktop && styles.statValorDesktop]}>
        {valor}
      </Text>
      <Text style={[styles.statLabel, destaque && styles.statLabelDestaque]}>{label}</Text>
    </View>
  );
}

function BarraProgresso({ percentual, cor }: { percentual: number; cor: string }) {
  return (
    <View style={styles.barraFundo}>
      <View style={[styles.barraPreenchida, { width: `${Math.min(percentual, 100)}%`, backgroundColor: cor }]} />
    </View>
  );
}

export default function RelatoriosScreen() {
  const [periodo, setPeriodo] = useState<Periodo>('mensal');
  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINT_DESKTOP;

  const stats = STATS[periodo];
  const participacaoPercentual = Math.round((stats.participantesAtivos / stats.totalAlunos) * 100);

  const dadosGrafico = useMemo(() => {
    if (periodo === 'mensal') {
      const max = Math.max(...LEITURAS_POR_MES);
      return LEITURAS_POR_MES.map((valor, i) => ({
        label: MESES_ABREV[i],
        valor,
        futuro: i > MES_ATUAL_INDEX,
        atual: i === MES_ATUAL_INDEX,
        alturaPct: max > 0 ? (valor / max) * 100 : 0,
      }));
    }
    const max = Math.max(...LEITURAS_POR_ANO.map((d) => d.valor));
    return LEITURAS_POR_ANO.map((d, i) => ({
      label: d.label,
      valor: d.valor,
      futuro: false,
      atual: i === LEITURAS_POR_ANO.length - 1,
      alturaPct: max > 0 ? (d.valor / max) * 100 : 0,
    }));
  }, [periodo]);

  const maxTurma = Math.max(...LEITURAS_POR_TURMA.map((t) => t.livros));

  // ─── Blocos de conteúdo reutilizados nos dois layouts ──────────────
  const GraficoCard = ({ compactHeight = 150 }: { compactHeight?: number }) => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitulo}>{periodo === 'mensal' ? 'Leituras por mês' : 'Leituras por ano'}</Text>
        <MaterialCommunityIcons name="chart-bar" size={18} color={COLORS.outline} />
      </View>

      <View style={[styles.grafico, { height: compactHeight }]}>
        {dadosGrafico.map((item, i) => (
          <View key={i} style={styles.barraColuna}>
            <Text style={styles.barraValorTopo}>{!item.futuro && item.valor > 0 ? item.valor : ''}</Text>
            <View style={styles.barraArea}>
              <View
                style={[
                  styles.barra,
                  {
                    height: `${Math.max(item.alturaPct, item.futuro ? 0 : 3)}%`,
                    backgroundColor: item.futuro
                      ? COLORS.surfaceVariant
                      : item.atual
                      ? COLORS.primary
                      : COLORS.primaryLight,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barraLabel, item.atual && styles.barraLabelAtual]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const RankingCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitulo}>Top leitores</Text>
        <MaterialCommunityIcons name="trophy-outline" size={18} color={COLORS.outline} />
      </View>

      {RANKING_LEITORES.map((leitor, i) => {
        const corMedalha = i === 0 ? COLORS.gold : i === 1 ? COLORS.silver : i === 2 ? COLORS.bronze : COLORS.outline;
        return (
          <View key={i} style={[styles.rankingLinha, i === RANKING_LEITORES.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.rankingPosicao, { backgroundColor: i < 3 ? corMedalha : COLORS.surfaceVariant }]}>
              <Text style={[styles.rankingPosicaoTexto, { color: i < 3 ? COLORS.onPrimary : COLORS.onSurfaceVariant }]}>
                {i + 1}
              </Text>
            </View>
            <View style={styles.rankingInfo}>
              <Text style={styles.rankingNome} numberOfLines={1}>{leitor.nome}</Text>
              <Text style={styles.rankingTurma}>{leitor.turma}</Text>
            </View>
            <View style={styles.rankingLivrosWrap}>
              <MaterialCommunityIcons name="book-open-variant" size={13} color={COLORS.primary} />
              <Text style={styles.rankingLivros}>{leitor.livros}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  const TurmasCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitulo}>Leituras por turma</Text>
        <Feather name="layers" size={16} color={COLORS.outline} />
      </View>

      {LEITURAS_POR_TURMA.map((item, i) => (
        <View key={i} style={styles.turmaLinha}>
          <View style={styles.turmaHeaderLinha}>
            <Text style={styles.turmaNome}>{item.turma}</Text>
            <Text style={styles.turmaValor}>{item.livros} livros</Text>
          </View>
          <BarraProgresso percentual={(item.livros / maxTurma) * 100} cor={COLORS.primary} />
        </View>
      ))}
    </View>
  );

  const CategoriasCard = ({ marginBottom = 16 }: { marginBottom?: number }) => (
    <View style={[styles.card, { marginBottom }]}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitulo}>Categorias mais lidas</Text>
        <Feather name="pie-chart" size={16} color={COLORS.outline} />
      </View>

      {CATEGORIAS_MAIS_LIDAS.map((cat, i) => (
        <View key={i} style={styles.turmaLinha}>
          <View style={styles.turmaHeaderLinha}>
            <View style={styles.categoriaLabelWrap}>
              <View style={[styles.categoriaDot, { backgroundColor: cat.cor }]} />
              <Text style={styles.turmaNome}>{cat.nome}</Text>
            </View>
            <Text style={styles.turmaValor}>{cat.percentual}%</Text>
          </View>
          <BarraProgresso percentual={cat.percentual} cor={cat.cor} />
        </View>
      ))}
    </View>
  );

  const AbasFiltro = ({ vertical = false }: { vertical?: boolean }) => (
    <View style={[styles.abas, vertical && styles.abasVertical]}>
      <TouchableOpacity
        style={[styles.abaBotao, periodo === 'mensal' && styles.abaBotaoAtiva]}
        onPress={() => setPeriodo('mensal')}
        activeOpacity={0.8}
      >
        <Feather name="calendar" size={13} color={periodo === 'mensal' ? COLORS.primary : COLORS.onSurfaceVariant} />
        <Text style={[styles.abaTexto, periodo === 'mensal' && styles.abaTextoAtivo]}>Mensal</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.abaBotao, periodo === 'anual' && styles.abaBotaoAtiva]}
        onPress={() => setPeriodo('anual')}
        activeOpacity={0.8}
      >
        <Feather name="bar-chart" size={13} color={periodo === 'anual' ? COLORS.primary : COLORS.onSurfaceVariant} />
        <Text style={[styles.abaTexto, periodo === 'anual' && styles.abaTextoAtivo]}>Anual</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Layout DESKTOP: dashboard em grid, sem tab bar mobile ─────────
  if (isDesktop) {
    return (
      <View style={styles.containerDesktop}>
        <View style={styles.headerDesktop}>
          <View>
            <Text style={styles.headerTitleDesktop}>Relatórios</Text>
            <Text style={styles.headerSubtitleDesktop}>Monitoramento de leitura da escola</Text>
          </View>
          <AbasFiltro />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContentDesktop} showsVerticalScrollIndicator={false}>
          <View style={styles.statsRowDesktop}>
            <StatCard
              desktop
              icon={<MaterialCommunityIcons name="book-open-page-variant" size={20} color={COLORS.onPrimary} />}
              label={periodo === 'mensal' ? 'Livros lidos no mês' : 'Livros lidos no ano'}
              valor={String(stats.totalLivros)}
              destaque
            />
            <StatCard
              desktop
              icon={<Feather name="users" size={18} color={COLORS.primary} />}
              label="Alunos participantes"
              valor={`${participacaoPercentual}%`}
            />
            <StatCard
              desktop
              icon={<Feather name="trending-up" size={18} color={COLORS.primary} />}
              label="Média por aluno"
              valor={stats.mediaPorAluno.toString().replace('.', ',')}
            />
            <View style={[styles.tendenciaCardDesktop]}>
              <View style={styles.statIconWrap}>
                <Feather name="arrow-up-right" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.tendenciaValorDesktop}>+{stats.tendencia}%</Text>
              <Text style={styles.statLabel}>
                {periodo === 'mensal' ? 'vs. mês anterior' : 'vs. ano anterior'}
              </Text>
            </View>
          </View>

          {/* Grid principal: 2 colunas largas + 1 coluna lateral */}
          <View style={styles.gridDesktop}>
            <View style={styles.colunaPrincipal}>
              <GraficoCard compactHeight={220} />
              <View style={styles.duasColunas}>
                <View style={styles.metadeColuna}>
                  <TurmasCard />
                </View>
                <View style={styles.metadeColuna}>
                  <CategoriasCard marginBottom={0} />
                </View>
              </View>
            </View>

            <View style={styles.colunaLateral}>
              <RankingCard />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Layout MOBILE: scroll vertical único (igual ao existente) ─────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Relatórios</Text>
        <Text style={styles.headerSubtitle}>Monitoramento de leitura da escola</Text>
      </View>

      <AbasFiltro vertical />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <StatCard
            icon={<MaterialCommunityIcons name="book-open-page-variant" size={18} color={COLORS.onPrimary} />}
            label={periodo === 'mensal' ? 'Livros lidos no mês' : 'Livros lidos no ano'}
            valor={String(stats.totalLivros)}
            destaque
          />
          <StatCard
            icon={<Feather name="users" size={16} color={COLORS.primary} />}
            label="Alunos participantes"
            valor={`${participacaoPercentual}%`}
          />
          <StatCard
            icon={<Feather name="trending-up" size={16} color={COLORS.primary} />}
            label="Média por aluno"
            valor={stats.mediaPorAluno.toString().replace('.', ',')}
          />
        </View>

        <View style={styles.tendenciaCard}>
          <Feather name="arrow-up-right" size={14} color={COLORS.success} />
          <Text style={styles.tendenciaTexto}>
            <Text style={styles.tendenciaValor}>+{stats.tendencia}%</Text>{' '}
            {periodo === 'mensal' ? 'em relação ao mês anterior' : 'em relação ao ano anterior'}
          </Text>
        </View>

        <GraficoCard />
        <RankingCard />
        <TurmasCard />
        <CategoriasCard marginBottom={32} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ═══════════════ MOBILE ═══════════════
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 20,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.onPrimary },
  headerSubtitle: { fontSize: 12, color: '#DBE4FF', marginTop: 4 },

  abas: {
    flexDirection: 'row',
    marginHorizontal: PADDING,
    marginTop: 16,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    padding: 4,
  },
  abasVertical: {},
  abaBotao: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  abaBotaoAtiva: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  abaTexto: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
  abaTextoAtivo: { color: COLORS.primary },

  scrollContent: { padding: PADDING, paddingBottom: 8 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    alignItems: 'flex-start',
  },
  statCardDestaque: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statCardDesktop: { padding: 18, borderRadius: 14 },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIconWrapDestaque: { backgroundColor: 'rgba(255,255,255,0.18)' },
  statValor: { fontSize: 20, fontWeight: '800', color: COLORS.onSurface },
  statValorDesktop: { fontSize: 26 },
  statValorDestaque: { color: COLORS.onPrimary },
  statLabel: { fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 2 },
  statLabelDestaque: { color: '#DBE4FF' },

  tendenciaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.successContainer,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  tendenciaTexto: { fontSize: 12, color: '#065F46' },
  tendenciaValor: { fontWeight: '700' },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitulo: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface },

  // Gráfico de barras
  grafico: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barraColuna: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barraValorTopo: { fontSize: 9, fontWeight: '700', color: COLORS.onSurfaceVariant, marginBottom: 4 },
  barraArea: { flex: 1, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  barra: { width: '55%', minWidth: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barraLabel: { fontSize: 10, color: COLORS.onSurfaceVariant, marginTop: 6 },
  barraLabelAtual: { color: COLORS.primary, fontWeight: '700' },

  // Ranking
  rankingLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  rankingPosicao: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankingPosicaoTexto: { fontSize: 12, fontWeight: '800' },
  rankingInfo: { flex: 1, marginRight: 8 },
  rankingNome: { fontSize: 13, fontWeight: '600', color: COLORS.onSurface },
  rankingTurma: { fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 1 },
  rankingLivrosWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rankingLivros: { fontSize: 13, fontWeight: '700', color: COLORS.onSurface },

  // Turmas / categorias (barra de progresso horizontal)
  turmaLinha: { marginBottom: 14 },
  turmaHeaderLinha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  turmaNome: { fontSize: 13, fontWeight: '600', color: COLORS.onSurface },
  turmaValor: { fontSize: 12, color: COLORS.onSurfaceVariant },
  barraFundo: { height: 8, borderRadius: 999, backgroundColor: COLORS.surfaceVariant, overflow: 'hidden' },
  barraPreenchida: { height: '100%', borderRadius: 999 },
  categoriaLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoriaDot: { width: 8, height: 8, borderRadius: 4 },

  // ═══════════════ DESKTOP ═══════════════
  containerDesktop: { flex: 1, backgroundColor: COLORS.background },
  headerDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 24,
  },
  headerTitleDesktop: { fontSize: 26, fontWeight: '800', color: COLORS.onSurface },
  headerSubtitleDesktop: { fontSize: 14, color: COLORS.onSurfaceVariant, marginTop: 4 },

  scrollContentDesktop: { paddingHorizontal: 40, paddingBottom: 48, maxWidth: 1400, width: '100%', alignSelf: 'center' },

  statsRowDesktop: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  tendenciaCardDesktop: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  tendenciaValorDesktop: { fontSize: 26, fontWeight: '800', color: COLORS.success },

  gridDesktop: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  colunaPrincipal: { flex: 2.2, gap: 0 },
  colunaLateral: { flex: 1 },
  duasColunas: { flexDirection: 'row', gap: 20 },
  metadeColuna: { flex: 1 },
});