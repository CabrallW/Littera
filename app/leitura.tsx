// Arquivo de fallback exigido pelo Expo Router.
//
// Quando existem variantes por plataforma (leitura.native.tsx e
// leitura.web.tsx), o Router ainda precisa de um arquivo "genérico"
// com este mesmo nome (sem sufixo) para conseguir montar a árvore de
// rotas — é usado só para o Router *descobrir* que a rota "/leitura"
// existe. Em tempo de execução, tanto o Metro quanto o próprio Router
// sempre priorizam a variante específica da plataforma (.native.tsx
// no iOS/Android, .web.tsx no navegador), então este arquivo nunca é
// realmente renderizado — mas precisa existir e exportar algo válido.
//
// Reexporta da versão .web (e não da .native) de propósito: assim o
// bundler nunca precisa tocar em react-native-pdf/epubjs ao processar
// este arquivo de fallback, nem no build web nem no build nativo.
export { default } from './leitura.web';