import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

const CHAVE_STORAGE = '@littera:arquivos_digitais';

// IMPORTANTE: a pasta de destino é criada dentro de uma função (lazy),
// e não como constante no topo do módulo. `Paths.document` só existe
// em iOS/Android — se isso rodasse na hora do import (como constante
// de módulo), quebraria o bundle inteiro no web com
// "this.validatePath is not a function", mesmo em telas que nunca
// chamam essa função. Esta tela (importação de PDF/EPUB) já é
// exclusiva do app mobile, então isso nunca é chamado no web — mas
// o import do módulo em si precisa continuar seguro.
function obterPastaDestino() {
  return new Directory(Paths.document, 'livros-digitais');
}

export type ArquivoDigital = {
  id: string;
  nome: string;
  extensao: 'pdf' | 'epub';
  uriLocal: string;
  adicionadoEm: string;
};

export async function listarArquivosDigitais(): Promise<ArquivoDigital[]> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_STORAGE);
    if (!bruto) return [];
    const lista: ArquivoDigital[] = JSON.parse(bruto);
    return lista.sort((a, b) => new Date(b.adicionadoEm).getTime() - new Date(a.adicionadoEm).getTime());
  } catch (e) {
    console.log('Erro ao listar arquivos digitais:', e);
    return [];
  }
}

async function salvarLista(lista: ArquivoDigital[]) {
  await AsyncStorage.setItem(CHAVE_STORAGE, JSON.stringify(lista));
}

export async function escolherEImportarArquivo(): Promise<ArquivoDigital | null> {
  const resultado = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (resultado.canceled || !resultado.assets || resultado.assets.length === 0) {
    return null;
  }

  const arquivo = resultado.assets[0];
  const nomeMinusculo = arquivo.name.toLowerCase();

  let extensao: 'pdf' | 'epub';
  if (nomeMinusculo.endsWith('.pdf')) extensao = 'pdf';
  else if (nomeMinusculo.endsWith('.epub')) extensao = 'epub';
  else {
    throw new Error('Formato não suportado. Escolha um arquivo PDF ou EPUB.');
  }

  // Garante que a pasta de destino existe dentro do sandbox do app
  const pastaDestino = obterPastaDestino();
  if (!pastaDestino.exists) {
    pastaDestino.create();
  }

  const id = `${Date.now()}`;
  const arquivoOrigem = new File(arquivo.uri);
  const arquivoDestino = new File(pastaDestino, `${id}.${extensao}`);

  // Copia pra dentro da pasta do próprio app — assim não depende da permissão
  // ou localização original do arquivo (Downloads, Google Drive, etc.)
  arquivoOrigem.copy(arquivoDestino);

  const novoArquivo: ArquivoDigital = {
    id,
    nome: arquivo.name,
    extensao,
    uriLocal: arquivoDestino.uri,
    adicionadoEm: new Date().toISOString(),
  };

  const listaAtual = await listarArquivosDigitais();
  await salvarLista([novoArquivo, ...listaAtual]);

  return novoArquivo;
}

export async function removerArquivoDigital(id: string) {
  const lista = await listarArquivosDigitais();
  const arquivo = lista.find((a) => a.id === id);

  if (arquivo) {
    try {
      const arquivoRef = new File(arquivo.uriLocal);
      if (arquivoRef.exists) arquivoRef.delete();
    } catch (e) {
      console.log('Erro ao apagar arquivo do disco:', e);
    }
  }

  await salvarLista(lista.filter((a) => a.id !== id));
}