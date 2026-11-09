import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import Pdf from 'react-native-pdf';
import { Reader, ReaderProvider } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';
import { buscarDefinicao, abrirBuscaGoogle } from '../lib/dicionario';
import ModalDicionario from '../components/ModalDicionario';
import {
  buscarProgresso,
  salvarProgressoPdf,
  salvarProgressoEpub,
  ProgressoPdf,
  ProgressoEpub,
} from '../lib/progressoLeitura';

// Intervalo mínimo entre salvamentos de progresso (evita gravar no
// AsyncStorage a cada página virada rapidamente / cada pixel de scroll)
const INTERVALO_MINIMO_SALVAMENTO_MS = 2000;

function BarraProgresso({ percentual, texto }: { percentual: number; texto: string }) {
  return (
    <View style={styles.barraProgressoContainer}>
      <View style={styles.barraProgressoFundo}>
        <View style={[styles.barraProgressoPreenchida, { width: `${Math.min(Math.max(percentual, 0), 100)}%` }]} />
      </View>
      <Text style={styles.barraProgressoTexto}>{texto}</Text>
    </View>
  );
}

export default function TelaLeitura() {
  const { uri, extensao, arquivoId } = useLocalSearchParams<{ uri: string; extensao: string; arquivoId?: string }>();
  const { width, height } = Dimensions.get('window');
  const [carregandoPdf, setCarregandoPdf] = useState(true);
  const [erroPdf, setErroPdf] = useState(false);

  // Progresso — carregado do AsyncStorage assim que a tela abre
  const [progressoInicialCarregado, setProgressoInicialCarregado] = useState(false);
  const [paginaInicialPdf, setPaginaInicialPdf] = useState<number | undefined>(undefined);
  const [localizacaoInicialEpub, setLocalizacaoInicialEpub] = useState<string | undefined>(undefined);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [percentualEpub, setPercentualEpub] = useState(0);

  const ultimoSalvamentoRef = useRef(0);

  // Estado do modal de dicionário (só usado no EPUB)
  const [modalVisivel, setModalVisivel] = useState(false);
  const [palavraSelecionada, setPalavraSelecionada] = useState('');
  const [definicoes, setDefinicoes] = useState<string[] | null>(null);
  const [carregandoDefinicao, setCarregandoDefinicao] = useState(false);

  // Carrega progresso salvo (se houver) antes de renderizar o leitor,
  // pra já abrir na página/localização certa em vez de sempre do início.
  useEffect(() => {
    (async () => {
      if (arquivoId) {
        const progresso = await buscarProgresso(arquivoId);
        if (progresso?.tipo === 'pdf') {
          const p = progresso as ProgressoPdf;
          setPaginaInicialPdf(p.paginaAtual);
          setPaginaAtual(p.paginaAtual);
          setTotalPaginas(p.totalPaginas);
        } else if (progresso?.tipo === 'epub') {
          const p = progresso as ProgressoEpub;
          setLocalizacaoInicialEpub(p.cfiLocalizacao);
          setPercentualEpub(p.percentual);
        }
      }
      setProgressoInicialCarregado(true);
    })();
  }, [arquivoId]);

  async function abrirDicionario(texto: string) {
    setPalavraSelecionada(texto);
    setModalVisivel(true);
    setCarregandoDefinicao(true);
    setDefinicoes(null);
    const resultado = await buscarDefinicao(texto);
    setDefinicoes(resultado);
    setCarregandoDefinicao(false);
  }

  function handlePageChanged(pagina: number, numeroDePaginas: number) {
    setPaginaAtual(pagina);
    setTotalPaginas(numeroDePaginas);

    if (!arquivoId) return;

    // Throttle simples: só grava se já passou o intervalo mínimo desde o último salvamento
    const agora = Date.now();
    if (agora - ultimoSalvamentoRef.current >= INTERVALO_MINIMO_SALVAMENTO_MS) {
      ultimoSalvamentoRef.current = agora;
      salvarProgressoPdf(arquivoId, pagina, numeroDePaginas);
    }
  }

  // Garante que a última página vista seja salva mesmo se o throttle
  // tiver "engolido" o último evento (ex: usuário sai da tela logo após virar a página)
  useEffect(() => {
    return () => {
      if (arquivoId && extensao === 'pdf' && totalPaginas > 0) {
        salvarProgressoPdf(arquivoId, paginaAtual, totalPaginas);
      }
    };
  }, [arquivoId, extensao, paginaAtual, totalPaginas]);

  if (!uri) {
    return (
      <View style={styles.containerCenter}>
        <Stack.Screen options={{ title: 'Erro' }} />
        <Text style={styles.textoErro}>Nenhum arquivo informado.</Text>
      </View>
    );
  }

  // Espera carregar o progresso salvo antes de montar o leitor —
  // assim ele já nasce sabendo a página/localização certa, em vez
  // de abrir do início e "pular" pra página salva um instante depois.
  if (!progressoInicialCarregado) {
    return (
      <View style={styles.containerCenter}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  if (extensao === 'pdf') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Lendo PDF', headerBackTitle: 'Voltar' }} />

        <Pdf
          source={{ uri, cache: true }}
          horizontal
          enablePaging
          page={paginaInicialPdf}
          onLoadComplete={(numeroDePaginas) => {
            setCarregandoPdf(false);
            setTotalPaginas(numeroDePaginas);
          }}
          onPageChanged={handlePageChanged}
          onError={(error) => {
            console.log('Erro no leitor de PDF:', error);
            setCarregandoPdf(false);
            setErroPdf(true);
          }}
          style={styles.pdf}
        />

        {carregandoPdf && (
          <View style={styles.overlayCarregando}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.textoCarregando}>Abrindo livro...</Text>
          </View>
        )}

        {erroPdf && (
          <View style={styles.overlayCarregando}>
            <Text style={styles.textoErro}>Não foi possível abrir este PDF.</Text>
          </View>
        )}

        {!carregandoPdf && !erroPdf && totalPaginas > 0 && (
          <BarraProgresso
            percentual={(paginaAtual / totalPaginas) * 100}
            texto={`Página ${paginaAtual} de ${totalPaginas}`}
          />
        )}
      </View>
    );
  }

  if (extensao === 'epub') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Lendo EPUB', headerBackTitle: 'Voltar' }} />

        <ReaderProvider>
          <Reader
            src={uri}
            width={width}
            height={height - 40 /* espaço reservado pra barra de progresso no rodapé */}
            fileSystem={useFileSystem}
            initialLocation={localizacaoInicialEpub}
            onLocationChange={(totalLocations, localizacaoAtual, progresso) => {
              setPercentualEpub(progresso);

              if (!arquivoId || !localizacaoAtual?.start?.cfi) return;

              const agora = Date.now();
              if (agora - ultimoSalvamentoRef.current >= INTERVALO_MINIMO_SALVAMENTO_MS) {
                ultimoSalvamentoRef.current = agora;
                salvarProgressoEpub(arquivoId, localizacaoAtual.start.cfi, progresso);
              }
            }}
            menuItems={[
              {
                key: 'dicionario',
                label: 'Dicionário',
                action: (cfiRange, texto) => {
                  abrirDicionario(texto);
                  return false; // mantém a seleção enquanto o modal está aberto
                },
              },
              {
                key: 'pesquisar',
                label: 'Pesquisar',
                action: (cfiRange, texto) => {
                  abrirBuscaGoogle(texto);
                  return true; // limpa a seleção, já que vai sair do app
                },
              },
            ]}
            renderLoadingFileComponent={() => (
              <View style={styles.containerCenter}>
                <ActivityIndicator size="large" color="#1E3A8A" />
                <Text style={styles.textoCarregando}>Abrindo livro...</Text>
              </View>
            )}
          />
        </ReaderProvider>

        <BarraProgresso percentual={percentualEpub} texto={`${Math.round(percentualEpub)}% concluído`} />

        <ModalDicionario
          visivel={modalVisivel}
          palavra={palavraSelecionada}
          definicoes={definicoes}
          carregando={carregandoDefinicao}
          onFechar={() => setModalVisivel(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.containerCenter}>
      <Stack.Screen options={{ title: 'Erro' }} />
      <Text style={styles.textoErro}>Formato não suportado.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: '#F3F4F6',
  },
  overlayCarregando: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  textoErro: {
    fontSize: 16,
    color: '#49454F',
    fontWeight: '600',
  },
  textoCarregando: {
    marginTop: 12,
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  // ─── Barra de progresso (rodapé fixo) ──────────────────────────
  barraProgressoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  barraProgressoFundo: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 6,
  },
  barraProgressoPreenchida: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#1E3A8A',
  },
  barraProgressoTexto: {
    fontSize: 11,
    color: '#49454F',
    textAlign: 'center',
    fontWeight: '500',
  },
});