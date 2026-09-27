import { supabase } from './supabase';
import { CursoTecnico, SerieCurso } from './types';

// ─────────────────────────────────────────────────────────────
// Camada de dados do relatório de leitura (bibliotecário).
//
// Importante: como não há como confirmar que o aluno realmente LEU
// o livro, "leitura" aqui é sempre sinônimo de "empréstimo devolvido"
// (status = 'devolvido' em `emprestimos`) — nunca contamos
// empréstimos 'ativo' ou 'atrasado' como leitura concluída.
// ─────────────────────────────────────────────────────────────

export type Periodo = 'mensal' | 'anual';

export type EstatisticasGerais = {
  totalDevolvidos: number;
  alunosParticipantes: number;
  totalAlunos: number;
  mediaPorAluno: number;
  tendenciaPercentual: number | null; // null = sem período anterior pra comparar
};

export type PontoGrafico = {
  label: string;
  valor: number;
  atual: boolean;
  futuro: boolean;
};

export type LeitorRanking = {
  usuario_id: string;
  nome: string;
  serie: SerieCurso | null;
  curso: CursoTecnico | null;
  totalLivros: number;
};

export type TurmaAgregada = {
  serie: SerieCurso;
  curso: CursoTecnico;
  totalLivros: number;
};

export type CategoriaAgregada = {
  nome: string;
  totalLivros: number;
  percentual: number;
};

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function inicioFimMes(ano: number, mes: number) {
  const inicio = new Date(ano, mes, 1);
  const fim = new Date(ano, mes + 1, 1);
  return { inicio, fim };
}

function inicioFimAno(ano: number) {
  const inicio = new Date(ano, 0, 1);
  const fim = new Date(ano + 1, 0, 1);
  return { inicio, fim };
}

/**
 * Busca todos os empréstimos devolvidos com data_devolucao dentro do intervalo,
 * já trazendo o perfil do aluno (nome, serie, curso) e a categoria do livro.
 */
async function buscarDevolvidosNoIntervalo(inicio: Date, fim: Date) {
  const { data, error } = await supabase
    .from('emprestimos')
    .select(
      `
      id,
      usuario_id,
      data_devolucao,
      livro:livros ( categoria ),
      usuario:profiles ( id, nome, serie, curso )
    `
    )
    .eq('status', 'devolvido')
    .gte('data_devolucao', inicio.toISOString())
    .lt('data_devolucao', fim.toISOString());

  if (error) throw error;
  return data || [];
}

async function contarTotalAlunos(): Promise<number> {
  const { data, error } = await supabase.from('user_roles').select('usuario_id').eq('tipo', 'aluno');
  if (error) throw error;
  return (data || []).length;
}

/**
 * Estatísticas do card superior: total de livros devolvidos no período,
 * % de alunos que devolveram pelo menos 1 livro, média por aluno e
 * variação percentual em relação ao período anterior equivalente.
 */
export async function buscarEstatisticasGerais(
  periodo: Periodo,
  referencia: Date = new Date()
): Promise<EstatisticasGerais> {
  const totalAlunos = await contarTotalAlunos();

  let atual: { inicio: Date; fim: Date };
  let anterior: { inicio: Date; fim: Date };

  if (periodo === 'mensal') {
    atual = inicioFimMes(referencia.getFullYear(), referencia.getMonth());
    anterior = inicioFimMes(referencia.getFullYear(), referencia.getMonth() - 1);
  } else {
    atual = inicioFimAno(referencia.getFullYear());
    anterior = inicioFimAno(referencia.getFullYear() - 1);
  }

  const [devolvidosAtual, devolvidosAnterior] = await Promise.all([
    buscarDevolvidosNoIntervalo(atual.inicio, atual.fim),
    buscarDevolvidosNoIntervalo(anterior.inicio, anterior.fim),
  ]);

  const alunosUnicos = new Set(devolvidosAtual.map((e) => e.usuario_id));
  const totalDevolvidos = devolvidosAtual.length;
  const totalAnterior = devolvidosAnterior.length;

  const tendenciaPercentual =
    totalAnterior > 0 ? Math.round(((totalDevolvidos - totalAnterior) / totalAnterior) * 100) : null;

  return {
    totalDevolvidos,
    alunosParticipantes: alunosUnicos.size,
    totalAlunos,
    mediaPorAluno: totalAlunos > 0 ? Math.round((totalDevolvidos / totalAlunos) * 10) / 10 : 0,
    tendenciaPercentual,
  };
}

/**
 * Dados do gráfico de barras: mensal = Jan–Dez do ano de referência
 * (meses futuros vêm com valor 0 e marcados como `futuro`); anual =
 * últimos 5 anos até o ano de referência.
 */
export async function buscarDadosGrafico(periodo: Periodo, referencia: Date = new Date()): Promise<PontoGrafico[]> {
  if (periodo === 'mensal') {
    const ano = referencia.getFullYear();
    const mesAtual = referencia.getMonth();

    const contagens = await Promise.all(
      Array.from({ length: 12 }, (_, mes) => {
        if (mes > mesAtual) return Promise.resolve(0);
        const { inicio, fim } = inicioFimMes(ano, mes);
        return buscarDevolvidosNoIntervalo(inicio, fim).then((r) => r.length);
      })
    );

    return contagens.map((valor, i) => ({
      label: MESES_ABREV[i],
      valor,
      atual: i === mesAtual,
      futuro: i > mesAtual,
    }));
  }

  const anoAtual = referencia.getFullYear();
  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 4 + i);

  const contagens = await Promise.all(
    anos.map((ano) => {
      const { inicio, fim } = inicioFimAno(ano);
      return buscarDevolvidosNoIntervalo(inicio, fim).then((r) => r.length);
    })
  );

  return contagens.map((valor, i) => ({
    label: String(anos[i]),
    valor,
    atual: anos[i] === anoAtual,
    futuro: false,
  }));
}

/**
 * Top 5 alunos por quantidade de livros devolvidos no período.
 */
export async function buscarRankingLeitores(periodo: Periodo, referencia: Date = new Date()): Promise<LeitorRanking[]> {
  const { inicio, fim } =
    periodo === 'mensal'
      ? inicioFimMes(referencia.getFullYear(), referencia.getMonth())
      : inicioFimAno(referencia.getFullYear());

  const devolvidos = await buscarDevolvidosNoIntervalo(inicio, fim);

  const mapa = new Map<string, LeitorRanking>();
  for (const emp of devolvidos) {
    const usuario = emp.usuario as any;
    if (!usuario) continue;

    const atual = mapa.get(usuario.id) ?? {
      usuario_id: usuario.id,
      nome: usuario.nome,
      serie: usuario.serie,
      curso: usuario.curso,
      totalLivros: 0,
    };
    atual.totalLivros += 1;
    mapa.set(usuario.id, atual);
  }

  return Array.from(mapa.values())
    .sort((a, b) => b.totalLivros - a.totalLivros)
    .slice(0, 5);
}

/**
 * Total de livros devolvidos agrupado por turma (serie + curso).
 * Alunos sem serie/curso preenchidos (perfil ainda não configurado
 * pelo bibliotecário) são ignorados aqui — não têm turma pra agrupar.
 */
export async function buscarLeiturasPorTurma(periodo: Periodo, referencia: Date = new Date()): Promise<TurmaAgregada[]> {
  const { inicio, fim } =
    periodo === 'mensal'
      ? inicioFimMes(referencia.getFullYear(), referencia.getMonth())
      : inicioFimAno(referencia.getFullYear());

  const devolvidos = await buscarDevolvidosNoIntervalo(inicio, fim);

  const mapa = new Map<string, TurmaAgregada>();
  for (const emp of devolvidos) {
    const usuario = emp.usuario as any;
    if (!usuario?.serie || !usuario?.curso) continue; // sem turma cadastrada

    const chave = `${usuario.serie}-${usuario.curso}`;
    const atual = mapa.get(chave) ?? { serie: usuario.serie, curso: usuario.curso, totalLivros: 0 };
    atual.totalLivros += 1;
    mapa.set(chave, atual);
  }

  return Array.from(mapa.values()).sort((a, b) => b.totalLivros - a.totalLivros);
}

/**
 * Total de livros devolvidos agrupado por categoria do livro,
 * com o percentual de cada uma sobre o total do período.
 */
export async function buscarCategoriasMaisLidas(
  periodo: Periodo,
  referencia: Date = new Date()
): Promise<CategoriaAgregada[]> {
  const { inicio, fim } =
    periodo === 'mensal'
      ? inicioFimMes(referencia.getFullYear(), referencia.getMonth())
      : inicioFimAno(referencia.getFullYear());

  const devolvidos = await buscarDevolvidosNoIntervalo(inicio, fim);
  const total = devolvidos.length;

  const mapa = new Map<string, number>();
  for (const emp of devolvidos) {
    const categoria = (emp.livro as any)?.categoria || 'Sem categoria';
    mapa.set(categoria, (mapa.get(categoria) || 0) + 1);
  }

  return Array.from(mapa.entries())
    .map(([nome, totalLivros]) => ({
      nome,
      totalLivros,
      percentual: total > 0 ? Math.round((totalLivros / total) * 100) : 0,
    }))
    .sort((a, b) => b.totalLivros - a.totalLivros);
}