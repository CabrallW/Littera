import React from 'react';
import { SafeAreaView, StyleSheet, useWindowDimensions, View, ActivityIndicator } from 'react-native';
import { Reader, ReaderProvider } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';

// 1. Tipagem adicionada para corrigir o erro do 'route'
interface LeitorEpubProps {
  route: {
    params: {
      epubUrl: string;
    };
  };
}

export default function LeitorEpubScreen({ route }: LeitorEpubProps) {
  // Pegando a URL ou caminho do arquivo passado pela navegação
  const { epubUrl } = route.params; 
  const { width, height } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.container}>
      <ReaderProvider>
        <Reader
          src={epubUrl}
          width={width}
          height={height}
          fileSystem={useFileSystem}
          // 2. Propriedade corrigida para renderLoadingFileComponent
          renderLoadingFileComponent={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}
        />
      </ReaderProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});