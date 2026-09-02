const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ─────────────────────────────────────────────────────────────
// Algumas libs (leitor de PDF, etc.) só existem em código nativo
// (iOS/Android) e não têm build para web. O Expo Router, ao montar
// a lista de rotas a partir da pasta `app/` (require.context),
// às vezes ainda tenta importar o arquivo .native.tsx durante o
// bundle web, mesmo existindo uma versão .web.tsx equivalente.
// Isso derruba o bundler com "Importing native-only module...".
//
// A solução é interceptar aqui, no resolver do Metro: quando a
// plataforma alvo for "web" e o módulo pedido for uma dessas libs
// nativas, devolvemos um módulo vazio em vez de deixar o Metro
// tentar resolver o arquivo nativo de verdade.
// ─────────────────────────────────────────────────────────────
const MODULOS_APENAS_NATIVOS = [
  'react-native-pdf',
  'react-native-blob-util',
];

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const ehModuloNativo = MODULOS_APENAS_NATIVOS.some(
    (nome) => moduleName === nome || moduleName.startsWith(`${nome}/`)
  );

  if (platform === 'web' && ehModuloNativo) {
    return { type: 'empty' };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;