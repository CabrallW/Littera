// ─── Tipos baseados nas tabelas do Supabase ───────────────────────────────────

export type TipoUsuario = 'aluno' | 'bibliotecario';

export type Profile = {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  matricula: string | null;
  created_at: string;
};

export type Livro = {
  id: string;
  titulo: string;
  autor: string;
  editora: string | null;
  isbn: string | null;
  categoria: string | null;
  descricao: string | null;
  capa_url: string | null;
  quantidade_total: number;
  quantidade_disponivel: number;
  created_at: string;
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
  created_at: string;
  // Relações
  usuario?: Profile;
  livro?: Livro;
};