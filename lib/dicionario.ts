import { Linking } from 'react-native';

async function buscarNaWiktionaryPT(palavra: string): Promise<string[] | null> {
  try {
    const resposta = await fetch(`https://pt.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(palavra)}`);
    if (!resposta.ok) return null;

    const dados = await resposta.json();
    const entradas = dados?.[palavra.toLowerCase()] || dados?.[Object.keys(dados)[0]];
    if (!Array.isArray(entradas)) return null;

    const definicoes = entradas
      .flatMap((bloco: any) => bloco.definitions?.map((d: any) => d.definition) || [])
      .filter(Boolean)
      .map((texto: string) => texto.replace(/<[^>]+>/g, '').trim());

    return definicoes.length > 0 ? definicoes : null;
  } catch (e) {
    return null;
  }
}

async function buscarNoDicionarioAberto(palavra: string): Promise<string[] | null> {
  try {
    const resposta = await fetch(`https://api.dicionario-aberto.net/word/${encodeURIComponent(palavra)}`);
    if (!resposta.ok) return null;

    const dados = await resposta.json();
    if (!Array.isArray(dados) || dados.length === 0) return null;

    const definicoes = dados
      .map((entrada: any) => {
        const match = entrada.xml?.match(/<def>([\s\S]*?)<\/def>/);
        if (!match) return null;
        return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      })
      .filter(Boolean) as string[];

    return definicoes.length > 0 ? definicoes : null;
  } catch (e) {
    return null;
  }
}

export async function buscarDefinicao(palavra: string): Promise<string[] | null> {
  const palavraLimpa = palavra.trim().toLowerCase().replace(/[^a-zà-ú]/gi, '');
  if (!palavraLimpa) return null;

  const daWiktionary = await buscarNaWiktionaryPT(palavraLimpa);
  if (daWiktionary) return daWiktionary;

  return await buscarNoDicionarioAberto(palavraLimpa);
}

export function abrirBuscaGoogle(texto: string) {
  Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(texto)}`);
}