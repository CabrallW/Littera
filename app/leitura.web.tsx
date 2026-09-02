import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';

// Versão exibida apenas quando o app roda no navegador (expo start --web).
// O leitor de PDF/EPUB usa bibliotecas nativas (react-native-pdf, epubjs
// com expo-file-system) que não têm suporte no bundler web, então a
// leitura de livros fica restrita ao app mobile (iOS/Android).
export default function TelaLeituraWeb() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Leitura' }} />
      <Feather name="smartphone" size={40} color="#79747E" />
      <Text style={styles.titulo}>Disponível apenas no app mobile</Text>
      <Text style={styles.texto}>
        A leitura de livros (PDF e EPUB) funciona apenas no aplicativo para Android e iOS.
        Abra o Littera no seu celular para continuar lendo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  titulo: { fontSize: 16, fontWeight: '700', color: '#1C1B1F', marginTop: 4 },
  texto: { fontSize: 13, color: '#49454F', textAlign: 'center', lineHeight: 19 },
});