import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────
// Progresso de leitura, salvo apenas localmente (AsyncStorage),
// indexado pelo id do ArquivoDigital (arquivo importado pelo
// aluno). Não depende de usuario_id nem de tabela no Supabase —
// se o aluno reinstalar o app ou trocar de aparelho, o progresso
// se perde junto (mesma vida útil do próprio arquivo importado).
// ─────────────────────────────────────────────────────────────

const PREFIXO_CHAVE = '@littera:progresso_leitura:';

export type ProgressoPdf = {
  tipo: 'pdf';
  paginaAtual: number;
  totalPaginas: number;
  atualizadoEm: string;
};

export type ProgressoEpub = {
  tipo: 'epub';
  cfiLocalizacao: string;
  percentual: number; // 0–100, calculado pela própria lib do EPUB
  atualizadoEm: string;
};

export type ProgressoLeitura = ProgressoPdf | ProgressoEpub;

function chave(arquivoId: string) {
  return `${PREFIXO_CHAVE}${arquivoId}`;
}

export async function salvarProgressoPdf(arquivoId: string, paginaAtual: number, totalPaginas: number) {
  const progresso: ProgressoPdf = {
    tipo: 'pdf',
    paginaAtual,
    totalPaginas,
    atualizadoEm: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(chave(arquivoId), JSON.stringify(progresso));
  } catch (e) {
    console.log('Erro ao salvar progresso de PDF:', e);
  }
}

export async function salvarProgressoEpub(arquivoId: string, cfiLocalizacao: string, percentual: number) {
  const progresso: ProgressoEpub = {
    tipo: 'epub',
    cfiLocalizacao,
    percentual,
    atualizadoEm: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(chave(arquivoId), JSON.stringify(progresso));
  } catch (e) {
    console.log('Erro ao salvar progresso de EPUB:', e);
  }
}

export async function buscarProgresso(arquivoId: string): Promise<ProgressoLeitura | null> {
  try {
    const bruto = await AsyncStorage.getItem(chave(arquivoId));
    if (!bruto) return null;
    return JSON.parse(bruto);
  } catch (e) {
    console.log('Erro ao ler progresso de leitura:', e);
    return null;
  }
}

export async function removerProgresso(arquivoId: string) {
  try {
    await AsyncStorage.removeItem(chave(arquivoId));
  } catch (e) {
    console.log('Erro ao remover progresso de leitura:', e);
  }
}