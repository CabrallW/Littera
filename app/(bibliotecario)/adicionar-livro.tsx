import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#10B981',
  background: '#F8F9FB',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  onSurface: '#1C1B1F',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
  outlineVariant: '#CAC4D0',
  error: '#EF4444',
};

// FUNÇÃO NOVA: Busca notas, páginas e ano silenciosamente
async function obterDadosExtrasPorISBN(isbnBase: string) {
  if (!isbnBase) return { nota_media: 0, total_avaliacoes: 0, paginas: null, ano: null };

  const isbnLimpo = isbnBase.replace(/[^0-9X]/gi, '');
  let dadosExtras = { 
    nota_media: 0, 
    total_avaliacoes: 0, 
    paginas: null as number | null, 
    ano: null as number | null 
  };

  try {
    // 1. Busca a edição para pegar páginas, ano e a chave da obra
    const respostaEdicao = await fetch(`https://openlibrary.org/isbn/${isbnLimpo}.json`);
    if (!respostaEdicao.ok) return dadosExtras;

    const dadosEdicao = await respostaEdicao.json();

    // Captura páginas e ano (usando Regex para extrair apenas os 4 dígitos do ano)
    if (dadosEdicao.number_of_pages) dadosExtras.paginas = parseInt(dadosEdicao.number_of_pages);
    if (dadosEdicao.publish_date) {
       const matchAno = dadosEdicao.publish_date.match(/\d{4}/);
       if (matchAno) dadosExtras.ano = parseInt(matchAno[0]);
    }

    // 2. Busca a nota usando a chave da Obra (Work)
    if (dadosEdicao.works && dadosEdicao.works.length > 0) {
      const workKey = dadosEdicao.works[0].key;
      const respostaNotas = await fetch(`https://openlibrary.org${workKey}/ratings.json`);
      
      if (respostaNotas.ok) {
        const dadosNotas = await respostaNotas.json();
        if (dadosNotas.summary) {
          dadosExtras.nota_media = dadosNotas.summary.average ? parseFloat(dadosNotas.summary.average.toFixed(1)) : 0;
          dadosExtras.total_avaliacoes = dadosNotas.summary.count || 0;
        }
      }
    }
  } catch (error) {
    console.log('Erro silencioso ao buscar dados extras:', error);
  }
  
  return dadosExtras;
}

export default function AdicionarLivroScreen({ navigation }: any) {
  // Estados do formulário
  const [termoBusca, setTermoBusca] = useState('');
  const [isbn, setIsbn] = useState('');
  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [sinopse, setSinopse] = useState('');
  const [capaUrl, setCapaUrl] = useState('');
  const [quantidade, setQuantidade] = useState('1');

  // Estados para o Autocomplete de Categoria
  const [categoriasDB, setCategoriasDB] = useState<string[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  // Estados para seleção de edição/versão
  const [resultadosBusca, setResultadosBusca] = useState<any[]>([]);
  const [isModalEdicaoVisible, setIsModalEdicaoVisible] = useState(false);

  // Estados de controle da câmera e requisições
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados: Flash da câmera e Trava anti-duplicação
  const [torch, setTorch] = useState(false);
  const [scannedLock, setScannedLock] = useState(false);

  // Busca inicial das Categorias existentes no banco
  useEffect(() => {
    async function fetchCategorias() {
      try {
        const { data, error } = await supabase.from('categorias').select('nome');
        if (!error && data) {
          setCategoriasDB(data.map((c) => c.nome));
        }
      } catch (err) {
        console.log('Erro ao buscar categorias para autocomplete', err);
      }
    }
    fetchCategorias();
  }, []);

  // Lógica de filtro do Autocomplete
  const categoriasFiltradas = categoriasDB.filter((cat) =>
    cat.toLowerCase().includes(categoria.toLowerCase())
  );

  // BUSCA UNIVERSAL INTELIGENTE (Detecta Texto ou ISBN automaticamente)
  async function buscarLivro(codigoScanner = '') {
    const queryBruta = codigoScanner || termoBusca;
    
    if (!queryBruta.trim()) {
      Alert.alert('Aviso', 'Digite algo para buscar.');
      return;
    }

    const queryLimpa = queryBruta.replace(/[-\s]/g, '');
    const isIsbn = /^\d{10,13}$/.test(queryLimpa) || !!codigoScanner;
    const queryFinal = isIsbn ? queryLimpa : queryBruta;

    setTitulo('');
    setAutor('');
    setCategoria('');
    setSinopse('');
    setCapaUrl('');
    if (isIsbn) setIsbn(queryLimpa);

    setLoading(true);
    setIsScanning(false);
    setTorch(false);

    if (!isIsbn) {
      try {
        const termoLimpo = queryFinal.trim();
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termoLimpo)}&maxResults=5&key=${process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY}`;        
        const response = await fetch(url);
        
        if (!response.ok) {
          Alert.alert('Erro', `O servidor do Google respondeu com erro ${response.status}`);
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data && data.items && data.items.length > 0) {
          setResultadosBusca(data.items);
          setIsModalEdicaoVisible(true);
        } else {
          Alert.alert('Aviso', 'Nenhum livro foi encontrado. Verifique a ortografia ou mude o termo.');
        }
      } catch (error: any) {
        Alert.alert('Erro de Rede', 'Não foi possível conectar à internet para buscar o livro.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const urlOpenLibrary = `https://openlibrary.org/api/books?bibkeys=ISBN:${queryFinal}&jscmd=data&format=json`;
      const response = await fetch(urlOpenLibrary);
      const data = await response.json();
      const chaveLivro = `ISBN:${queryFinal}`;

      if (data && data[chaveLivro]) {
        const info = data[chaveLivro];
        
        let sinopseExtraida = '';
        if (info.notes) {
          sinopseExtraida = typeof info.notes === 'string' ? info.notes : (info.notes.value || '');
        } else if (info.description) {
          sinopseExtraida = typeof info.description === 'string' ? info.description : (info.description.value || '');
        }

        if (!sinopseExtraida.trim()) {
          try {
            const respostaBrasil = await fetch(`https://brasilapi.com.br/api/isbn/v1/${queryFinal}`);
            if (respostaBrasil.status === 200) {
              const dadosBrasil = await respostaBrasil.json();
              sinopseExtraida = dadosBrasil.synopsis || '';
            }
          } catch (e) {}
        }

        const livroFormatado = {
          title: info.title || '',
          authors: info.authors || [],
          subjects: info.subjects || [],
          notes: sinopseExtraida || 'Sem sinopse disponível.',
          cover: info.cover
        };

        selecionarVolume(livroFormatado);
        Alert.alert('Sucesso!', 'Livro localizado pelo ISBN!');
        
      } else {
        try {
          const respostaBrasil = await fetch(`https://brasilapi.com.br/api/isbn/v1/${queryFinal}`);
          if (respostaBrasil.status === 200) {
            const dadosBrasil = await respostaBrasil.json();
            
            const livroBrasil = {
              title: dadosBrasil.title || '',
              authors: dadosBrasil.authors ? dadosBrasil.authors.map((a: string) => ({ name: a })) : [],
              subjects: dadosBrasil.subjects ? dadosBrasil.subjects.map((s: string) => ({ name: s })) : [],
              notes: dadosBrasil.synopsis || 'Sem sinopse disponível.',
              cover: null 
            };

            selecionarVolume(livroBrasil);
            Alert.alert('Sucesso!', 'Livro localizado na base nacional!');
            return;
          }
        } catch (e) {}

        Alert.alert(
          'Não encontrado',
          'O ISBN não foi encontrado nos catálogos automáticos. Insira os dados manualmente.',
          [{ text: 'Ok, digitar' }]
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível conectar aos serviços de busca mundial.');
    } finally {
      setLoading(false);
    }
  }

  function selecionarVolume(volumeInfo: any) {
    const ehIsbn = 'notes' in volumeInfo;

    setTitulo(volumeInfo.title || '');
    
    if (volumeInfo.authors) {
      if (typeof volumeInfo.authors[0] === 'string') {
        setAutor(volumeInfo.authors.join(', '));
      } else if (volumeInfo.authors[0]?.name) {
        setAutor(volumeInfo.authors.map((a: any) => a.name).join(', '));
      }
    } else {
      setAutor('Desconhecido');
    }
    
    // Configura a categoria escaneada
    if (ehIsbn) {
      setCategoria(volumeInfo.subjects && volumeInfo.subjects.length > 0 ? volumeInfo.subjects[0].name : 'Geral');
    } else {
      setCategoria(volumeInfo.categories && volumeInfo.categories.length > 0 ? volumeInfo.categories[0] : 'Geral');
    }
    
    // Garante que o menu de sugestões não abra sozinho após o escaneamento
    setMostrarSugestoes(false); 
      
    setSinopse(ehIsbn ? (volumeInfo.notes || 'Sem sinopse disponível.') : (volumeInfo.description || 'Sem sinopse disponível.'));
    
    if (!ehIsbn && volumeInfo.imageLinks) {
      const capa = volumeInfo.imageLinks.thumbnail || volumeInfo.imageLinks.smallThumbnail;
      setCapaUrl(capa ? capa.replace('http://', 'https://') : '');
    } else if (ehIsbn && volumeInfo.cover?.medium) {
      setCapaUrl(volumeInfo.cover.medium.replace('http://', 'https://'));
    } else {
      setCapaUrl('');
    }
    
    setIsModalEdicaoVisible(false);
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scannedLock) return; 
    setScannedLock(true); 
    setIsScanning(false); 
    setTorch(false);      
    
    buscarLivro(data);
  };

  const abrirCamera = () => {
    setScannedLock(false); 
    setIsScanning(true);
  };

  async function handleSalvarLivro() {
    if (!titulo || !autor) {
      Alert.alert('Erro', 'Título e Autor são obrigatórios.');
      return;
    }
    
    setSaving(true);
    
    const qtd = parseInt(quantidade) || 1;
    const categoriaFinal = categoria.trim() === '' ? 'Geral' : categoria.trim();

    // --- NOVO: BUSCA OS DADOS EXTRAS ANTES DE SALVAR ---
    // --- ATUALIZADO: Tipagem explícita para evitar o erro do TS ---
    let dadosExtras = { 
      nota_media: 0, 
      total_avaliacoes: 0, 
      paginas: null as number | null, 
      ano: null as number | null 
    };

    if (isbn) {
      dadosExtras = await obterDadosExtrasPorISBN(isbn);
    }

    // Objeto atualizado com as novas colunas
    const livroData = {
      titulo,
      autor,
      categoria: categoriaFinal,
      sinopse,
      capa_url: capaUrl,
      quantidade_total: qtd,
      quantidade_disponivel: qtd,
      isbn: isbn,
      nota_media: dadosExtras.nota_media,
      total_avaliacoes: dadosExtras.total_avaliacoes,
      paginas: dadosExtras.paginas,
      ano: dadosExtras.ano
    };

    try {
      const { error } = await supabase.from('livros').insert([livroData]);
      
      if (error) {
        Alert.alert('Erro do Banco', error.message);
        return;
      }

      if (!categoriasDB.includes(categoriaFinal)) {
         setCategoriasDB((prev) => [...prev, categoriaFinal]);
      }
      
      Alert.alert('Sucesso!', 'Livro adicionado ao acervo.');
      
      // Limpa os campos após o sucesso
      setTitulo('');
      setAutor('');
      setCategoria('');
      setSinopse('');
      setCapaUrl('');
      setQuantidade('1'); 
      setIsbn('');
      setTermoBusca(''); 
      setMostrarSugestoes(false);
      
    } catch (err: any) {
      Alert.alert('Erro inesperado', err.message);
    } finally {
      setSaving(false);
    }
  }

  if (isScanning && !permission?.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>Precisamos da sua permissão para usar a câmera</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}><Text style={styles.btnText}>Conceder Permissão</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12 }]} onPress={() => setIsScanning(false)}><Text style={styles.btnTextSecondary}>Voltar</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Adicionar Novo Livro</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Buscar Livro</Text>
          <View style={styles.rowInput}>
            <TextInput 
              style={[styles.input, { flex: 1, marginBottom: 0 }]} 
              placeholder="Ex: Título, Autor, Editora ou ISBN" 
              value={termoBusca} 
              onChangeText={setTermoBusca} 
            />
            <TouchableOpacity style={styles.btnSearch} onPress={() => buscarLivro()} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Feather name="search" size={20} color="#FFF" />}
            </TouchableOpacity>
          </View>
        </View>

        {isScanning ? (
          <View style={styles.scannerWrapper}>
            <CameraView 
              style={styles.scanner} 
              enableTorch={torch} 
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }} 
              onBarcodeScanned={handleBarCodeScanned} 
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scanTarget} />
              
              <View style={styles.scannerControls}>
                <TouchableOpacity style={styles.btnFlash} onPress={() => setTorch(!torch)}>
                  <Ionicons name={torch ? "flash" : "flash-off"} size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnCancelScan} onPress={() => { setIsScanning(false); setTorch(false); }}>
                  <Text style={styles.btnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.scanActivationCard} onPress={abrirCamera}>
            <MaterialCommunityIcons name="barcode-scan" size={24} color={COLORS.primary} />
            <Text style={styles.scanActivationText}>Escanear Código de Barras</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Dados do Livro (Editável)</Text>

        {capaUrl ? (
          <View style={styles.coverPreviewContainer}>
            <Image source={{ uri: capaUrl }} style={styles.coverPreview} resizeMode="contain" />
            <TouchableOpacity onPress={() => setCapaUrl('')} style={styles.btnRemoveCover}>
              <Text style={{ color: COLORS.error, fontSize: 12, fontWeight: '600' }}>Remover Capa</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Link da Capa (Opcional)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Cole aqui o link de uma imagem (https://...)" 
            value={capaUrl} 
            onChangeText={setCapaUrl} 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Título do Livro *</Text>
          <TextInput style={styles.input} placeholder="Preenchimento automático ou manual..." value={titulo} onChangeText={setTitulo} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Autor *</Text>
          <TextInput style={styles.input} placeholder="Nome do autor..." value={autor} onChangeText={setAutor} />
        </View>

        {/* --- MODIFICAÇÃO PRINCIPAL: LINHA DE CATEGORIA E ESTOQUE COM AUTOCOMPLETE --- */}
        <View style={[styles.row, { zIndex: 10 }]}> 
          <View style={[styles.inputGroup, { flex: 2, position: 'relative', zIndex: 10 }]}>
            <Text style={styles.label}>Categoria</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Gênero" 
              value={categoria} 
              onChangeText={(text) => {
                setCategoria(text);
                setMostrarSugestoes(true);
              }}
              onFocus={() => setMostrarSugestoes(true)}
              // onBlur com leve atraso permite ao usuário clicar na sugestão sem que ela suma instantaneamente
              onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)} 
            />

            {/* Menu de Sugestões Dropdown */}
            {mostrarSugestoes && categoria.length > 0 && categoriasFiltradas.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {categoriasFiltradas.slice(0, 5).map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setCategoria(item); // Preenche com a grafia oficial
                        setMostrarSugestoes(false); // Esconde a lista
                      }}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 12, zIndex: 1 }]}>
            <Text style={styles.label}>Estoque</Text>
            <TextInput 
              style={styles.input} 
              placeholder="1" 
              keyboardType="numeric" 
              value={quantidade} 
              onChangeText={setQuantidade} 
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ISBN</Text>
          <TextInput style={styles.input} placeholder="Código numérico" value={isbn} onChangeText={setIsbn} keyboardType="numeric" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Sinopse / Descrição</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Resumo..." value={sinopse} onChangeText={setSinopse} multiline numberOfLines={4} />
        </View>

        <TouchableOpacity style={styles.btnSave} onPress={handleSalvarLivro} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSaveText}>Salvar no Acervo</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL DE EDIÇÕES */}
      <Modal visible={isModalEdicaoVisible} transparent animationType="slide" onRequestClose={() => setIsModalEdicaoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione a Versão/Editora</Text>
              <TouchableOpacity onPress={() => setIsModalEdicaoVisible(false)}><Ionicons name="close" size={24} color={COLORS.onSurface} /></TouchableOpacity>
            </View>
            <FlatList
              data={resultadosBusca}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const info = item.volumeInfo;
                const capaItem = info.imageLinks?.smallThumbnail || info.imageLinks?.thumbnail || '';
                return (
                  <TouchableOpacity style={styles.itemEdicao} onPress={() => selecionarVolume(info)}>
                    {capaItem ? (
                      <Image source={{ uri: capaItem.replace('http://', 'https://') }} style={styles.imgEdicao} />
                    ) : (
                      <View style={[styles.imgEdicao, { backgroundColor: COLORS.surfaceVariant, alignItems: 'center', justifyContent: 'center' }]}><MaterialCommunityIcons name="book-open-variant" size={18} color={COLORS.outline} /></View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.txtTituloEdicao} numberOfLines={2}>{info.title}</Text>
                      <Text style={styles.txtDetalhesEdicao} numberOfLines={1}>Autor: {info.authors?.join(', ') || 'Desconhecido'}</Text>
                      <Text style={styles.txtEditoraHighlight}>Editora: {info.publisher || 'Não informada'} ({info.publishedDate?.substring(0, 4) || 'N/A'})</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 20, paddingBottom: 20, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  scrollContainer: { padding: 20, paddingBottom: 60 },
  scanActivationCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', padding: 14, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1.5, borderColor: COLORS.primary, marginBottom: 20, gap: 8 },
  scanActivationText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  scannerWrapper: { height: 260, borderRadius: 16, overflow: 'hidden', marginBottom: 20, position: 'relative' },
  scanner: { flex: 1 },
  scannerOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanTarget: { width: 220, height: 120, borderWidth: 2, borderColor: COLORS.secondary, borderRadius: 8, backgroundColor: 'transparent', marginBottom: 40 },
  scannerControls: { position: 'absolute', bottom: 16, flexDirection: 'row', gap: 16, alignItems: 'center' },
  btnFlash: { backgroundColor: 'rgba(0,0,0,0.7)', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  btnCancelScan: { backgroundColor: COLORS.error, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant, marginBottom: 6 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 46, fontSize: 15, color: COLORS.onSurface },
  rowInput: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btnSearch: { backgroundColor: COLORS.primary, width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface, marginBottom: 12 },
  row: { flexDirection: 'row' },
  textArea: { height: 90, paddingTop: 10, textAlignVertical: 'top' },
  coverPreviewContainer: { alignItems: 'center', marginBottom: 14 },
  coverPreview: { width: 90, height: 130, borderRadius: 8 },
  btnRemoveCover: { marginTop: 4, padding: 4 },
  btnSave: { backgroundColor: COLORS.secondary, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  btnSaveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  permissionText: { fontSize: 16, textAlign: 'center', color: COLORS.onSurfaceVariant, marginBottom: 20 },
  btnPrimary: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnSecondary: { paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  btnTextSecondary: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  itemEdicao: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.surfaceVariant, alignItems: 'center' },
  imgEdicao: { width: 40, height: 60, borderRadius: 4 },
  txtTituloEdicao: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  txtDetalhesEdicao: { fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 2 },
  txtEditoraHighlight: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginTop: 2 },
  
  // ESTILOS NOVOS PARA O MENU SUSPENSO (AUTOCOMPLETE)
  suggestionsContainer: {
    position: 'absolute',
    top: 70, // Fica perfeitamente abaixo do input da Categoria
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    elevation: 5, // Sombra para Android
    shadowColor: '#000', // Sombra para iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    maxHeight: 180, // Limita a altura para não poluir a tela
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.onSurface,
    fontWeight: '500',
  }
});