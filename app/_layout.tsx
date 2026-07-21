import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator } from 'react-native';
import { Profile } from '../lib/types';
import * as Font from 'expo-font';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Carrega as fontes dos ícones antes de tudo
  useEffect(() => {
  async function carregarFontes() {
    try {
      await Font.loadAsync({
        ...Ionicons.font,
        ...Feather.font,
        ...MaterialCommunityIcons.font,
      });
    } catch (e) {
      console.warn('Erro ao carregar fontes:', e);
    } finally {
      setFontsLoaded(true);
    }
  }
  carregarFontes();
}, []);

  useEffect(() => {
    if (!fontsLoaded) return;

    // Verifica sessão ativa ao abrir o app
    supabase.auth.getSession().then(({ data }: { data: any }) => {
      const session = data.session;
      if (session?.user) {
        carregarPerfil(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escuta mudanças de login/logout
    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        carregarPerfil(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fontsLoaded]);

  useEffect(() => {
    if (loading) return;

    const emRotaPublica = segments[0] === undefined || segments[0] === 'index';

    if (!profile && !emRotaPublica) {
      router.replace('/');
    } else if (profile && emRotaPublica) {
      if (profile.tipo === 'aluno') {
        router.replace('/(aluno)/catalogo');
      } else if (profile.tipo === 'bibliotecario') {
        router.replace('/(bibliotecario)/acervo');
      }
    }
  }, [profile, loading]);

  async function carregarPerfil(userId: string) {
    try {
      const { data: perfilData, error: perfilError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (perfilError) throw perfilError;

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('tipo')
        .eq('usuario_id', userId)
        .single();

      if (roleError) throw roleError;

      // Mescla o tipo (agora vindo de user_roles) de volta no objeto profile,
      // pra não precisar mexer no resto do arquivo — a lógica de roteamento
      // abaixo continua usando profile.tipo normalmente
      setProfile({ ...perfilData, tipo: roleData.tipo });
    } catch (e) {
      console.error('Erro ao carregar perfil:', e);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return <Slot />;
}