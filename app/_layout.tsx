    import { useEffect, useState } from 'react';
    import { Slot, useRouter, useSegments } from 'expo-router';
    import { supabase } from '../lib/supabase';
    import { View, ActivityIndicator } from 'react-native';
    import { Profile } from '../lib/types';

    export default function RootLayout() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
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
    }, []);

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
        const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

        console.log('Perfil carregado:', data);
        setProfile(data);
        setLoading(false);
    }

    if (loading) {
        return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
        );
    }

    return <Slot />;
    }