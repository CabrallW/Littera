import { Tabs } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = {
  primary: '#1E3A8A', // Azul escuro para o item ativo
  inactive: '#9CA3AF', // Cinza para os inativos
  background: '#FFFFFF',
};

export default function BibliotecarioLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 65, // Aumentamos um pouco a altura para acomodar 6 ícones confortavelmente
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10, // Diminuímos levemente a fonte para caber tudo na mesma linha
          fontWeight: '600',
        },
      }}
    >
      {/* 1. ACERVO */}
      <Tabs.Screen
        name="acervo"
        options={{
          title: 'Acervo',
          tabBarIcon: ({ color }) => (
            <Feather name="layers" size={20} color={color} />
          ),
        }}
      />

      {/* 2. EMPRÉSTIMOS */}
      <Tabs.Screen
        name="emprestimos"
        options={{
          title: 'Empréstimos',
          tabBarIcon: ({ color }) => (
            <Feather name="repeat" size={20} color={color} />
          ),
        }}
      />

      {/* 3. ADICIONAR LIVRO */}
      <Tabs.Screen
        name="adicionar-livro"
        options={{
          title: 'Novo',
          tabBarIcon: ({ color }) => (
            <Feather name="plus-square" size={20} color={color} />
          ),
        }}
      />

      {/* 4. USUÁRIOS */}
      <Tabs.Screen
        name="usuarios"
        options={{
          title: 'Usuários',
          tabBarIcon: ({ color }) => (
            <Feather name="users" size={20} color={color} />
          ),
        }}
      />

      {/* 5. RELATÓRIOS */}
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color }) => (
            <Feather name="bar-chart-2" size={20} color={color} />
          ),
        }}
      />

      {/* 6. CONFIGURAÇÕES */}
      <Tabs.Screen
        name="configuracoes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => (
            <Feather name="settings" size={20} color={color} />
          ),
        }}
      />

      {/* ─── TELA DE DETALHES DO ALUNO (OCULTA DA BARRA DE MENU) ─────────── */}
      <Tabs.Screen
        name="detalhes-aluno"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}