import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons'; // Importação dos ícones profissionais
import { supabase } from '../lib/supabase';

const COLORS = {
  primary: '#1E3A8A',
  primaryLight: '#3B5FBB',
  secondary: '#10B981',
  bg: '#F3F4F6',
  white: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  danger: '#EF4444',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleLogin() {
    if (!email || !senha) {
      setErro('Preencha o e-mail e a senha.');
      return;
    }

    setErro('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      setErro('E-mail ou senha incorretos.');
    }

    loading && setLoading(false); // Tratamento simples para evitar vazamento de estado
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Substituído 📚 por um ícone de livro aberto */}
          <Feather name="book-open" size={56} color={COLORS.white} style={styles.headerIcone} />
          <Text style={styles.headerTitulo}>Biblioteca Escolar</Text>
          <Text style={styles.headerSub}>Faça login para continuar</Text>
        </View>

        {/* Card de login */}
        <View style={styles.card}>

          {/* E-mail */}
          <View style={styles.campoContainer}>
            <Text style={styles.campoLabel}>E-mail</Text>
            <View style={[styles.inputContainer, erro && styles.inputErro]}>
              {/* Substituído ✉️ por ícone de carta */}
              <Feather name="mail" size={18} color={COLORS.textSecondary} style={styles.inputIcone} />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Senha */}
          <View style={styles.campoContainer}>
            <Text style={styles.campoLabel}>Senha</Text>
            <View style={[styles.inputContainer, erro && styles.inputErro]}>
              {/* Substituído 🔒 por ícone de cadeado */}
              <Feather name="lock" size={18} color={COLORS.textSecondary} style={styles.inputIcone} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!mostrarSenha}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)} activeOpacity={0.7}>
                {/* Substituído 👁️ e 🙈 por ícones de olho aberto/fechado */}
                <Feather 
                  name={mostrarSenha ? "eye-off" : "eye"} 
                  size={18} 
                  color={COLORS.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Erro */}
          {erro ? (
            <View style={styles.erroContainer}>
              {/* Substituído ⚠️ por ícone de alerta integrado */}
              <Feather name="alert-triangle" size={16} color={COLORS.danger} style={{ marginRight: 6 }} />
              <Text style={styles.erroTexto}>{erro}</Text>
            </View>
          ) : null}

          {/* Botão */}
          <TouchableOpacity
            style={[styles.botao, loading && styles.botaoDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.botaoTexto}>Entrar</Text>
            )}
          </TouchableOpacity>

        </View>

        <Text style={styles.rodape}>
          Problemas para acessar? Fale com o bibliotecário.
        </Text>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  headerIcone: { marginBottom: 12 }, // Limpo a propriedade fontSize que era do emoji
  headerTitulo: { fontSize: 26, fontWeight: '700', color: COLORS.white, marginBottom: 6 },
  headerSub: { fontSize: 14, color: '#93C5FD' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  campoContainer: { marginBottom: 16 },
  campoLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.bg,
  },
  inputErro: { borderColor: COLORS.danger },
  inputIcone: { marginRight: 8 }, // Removido fontSize estático
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary, paddingVertical: 0 }, // O paddingVertical evita desalinhamento no Android
  erroContainer: {
    backgroundColor: '#FEE2E2', borderRadius: 8,
    padding: 10, marginBottom: 16, flexDirection: 'row', alignItems: 'center'
  },
  erroTexto: { fontSize: 13, color: COLORS.danger, flex: 1 },
  botao: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  botaoDisabled: { opacity: 0.7 },
  botaoTexto: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  rodape: { textAlign: 'center', color: '#93C5FD', fontSize: 12, marginTop: 24 },
});