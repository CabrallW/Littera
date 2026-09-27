// ─── Tipos baseados nas tabelas reais do Supabase ─────────────────────────────
// (nomes de coluna conferidos direto no schema — profiles usa `criado_em`,
// não `created_at`; `matricula` não existe na tabela e foi removida daqui)

export type TipoUsuario = 'aluno' | 'bibliotecario';

export type SerieCurso = '1' | '2' | '3';
export type CursoTecnico = 'Logística' | 'Mecânica' | 'Mecatrônica' | 'Eletrotécnica';

export type Profile = {
  id: string;
  nome: string;
  email: string | null;
  // tipo não é coluna de profiles — vem de um join/lookup em user_roles
  tipo?: TipoUsuario;
  serie: SerieCurso | null;
  curso: CursoTecnico | null;
  criado_em: string;
};

export type Livro = {
  id: string;
  titulo: string;
  autor: string;
  editora: string | null;
  isbn: string | null;
  categoria: string | null;
  sinopse: string | null;
  capa_url: string | null;
  quantidade_total: number;
  quantidade_disponivel: number | null;
  criado_em: string;
  nota_media: number | null;
  total_avaliacoes: number | null;
  paginas: number | null;
  ano: number | null;
};

export type StatusEmprestimo = 'ativo' | 'devolvido' | 'atrasado';

export type Emprestimo = {
  id: string;
  usuario_id: string;
  livro_id: string;
  data_emprestimo: string;
  data_prevista_devolucao: string;
  data_devolucao: string | null;
  status: StatusEmprestimo;
  reserva_id: string | null;
  // Relações (quando usar .select com join)
  livro?: Livro;
  usuario?: Profile;
};

export type StatusReserva = 'ativa' | 'cancelada' | 'concluida';

export type Reserva = {
  id: string;
  usuario_id: string;
  livro_id: string;
  data_reserva: string;
  status: StatusReserva;
  prazo_retirada: string | null;
  // Relações
  livro?: Livro;
  usuario?: Profile;
};

export type Avaliacao = {
  id: string;
  usuario_id: string;
  livro_id: string;
  nota: number;
  comentario: string | null;
  criado_em: string;
  // Relações
  usuario?: Profile;
  livro?: Livro;
};

export type Aviso = {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  referencia_tipo: string | null;
  referencia_id: string | null;
  lida: boolean;
  criado_em: string;
};