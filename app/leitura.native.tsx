import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Text, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import Pdf from 'react-native-pdf';
import { Reader, ReaderProvider } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';
import { buscarDefinicao, abrirBuscaGoogle } from '../lib/dicionario';
import ModalDicionario from '../components/ModalDicionario';

export default function TelaLeitura() {
  const { uri, extensao } = useLocalSearchParams<{ uri: string; extensao: string }>();
  const { width, height } = Dimensions.get('window');
  const [carregandoPdf, setCarregandoPdf] = useState(true);
  const [erroPdf, setErroPdf] = useState(false);

  // Estado do modal de dicionário (só usado no EPUB)
  const [modalVisivel, setModalVisivel] = useState(false);
  const [palavraSelecionada, setPalavraSelecionada] = useState('');
  const [definicoes, setDefinicoes] = useState<string[] | null>(null);
  const [carregandoDefinicao, setCarregandoDefinicao] = useState(false);

  async function abrirDicionario(texto: string) {
    setPalavraSelecionada(texto);
    setModalVisivel(true);
    setCarregandoDefinicao(true);
    setDefinicoes(null);
    const resultado = await buscarDefinicao(texto);
    setDefinicoes(resultado);
    setCarregandoDefinicao(false);
  }

  if (!uri) {
    return (
      <View style={styles.containerCenter}>
        <Stack.Screen options={{ title: 'Erro' }} />
        <Text style={styles.textoErro}>Nenhum arquivo informado.</Text>
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
          onLoadComplete={() => setCarregandoPdf(false)}
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
            height={height}
            fileSystem={useFileSystem}
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
});