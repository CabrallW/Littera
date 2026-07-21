import React from 'react';
import { View, StyleSheet, Dimensions, Text, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import Pdf from 'react-native-pdf';

// 1. Novas importações para o leitor de EPUB
import { Reader, ReaderProvider } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';

export default function TelaLeitura() {
  // Pega os parâmetros passados pelo router.push
  const { uri, extensao } = useLocalSearchParams<{ uri: string, extensao: string }>();
  const { width, height } = Dimensions.get('window');

  if (extensao === 'pdf') {
    return (
      <View style={styles.container}>
        {/* Configura o Header do Expo Router para esta tela */}
        <Stack.Screen options={{ title: 'Lendo PDF', headerBackTitle: 'Voltar' }} />
        
        <Pdf
          source={{ uri: uri, cache: true }}
          // Aqui está a mágica de passar página como livro físico:
          horizontal={true}
          enablePaging={true}
          
          onLoadProgress={(percent) => (
             <ActivityIndicator size="large" color="#1E3A8A" style={styles.loading} />
          )}
          onError={(error) => {
            console.log('Erro no leitor de PDF:', error);
          }}
          style={styles.pdf}
        />
      </View>
    );
  }

  // 2. Lógica real do Leitor de EPUB substituindo o texto "em construção"
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
            renderLoadingFileComponent={() => (
              <View style={styles.containerCenter}>
                <ActivityIndicator size="large" color="#1E3A8A" />
                <Text style={styles.textoCarregando}>Abrindo livro...</Text>
              </View>
            )}
          />
        </ReaderProvider>
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
  textoErro: {
    fontSize: 16,
    color: '#49454F',
    fontWeight: '600'
  },
  textoCarregando: {
    marginTop: 12,
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '500'
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  }
});