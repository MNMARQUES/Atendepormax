export interface User {
  id: string;
  name: string;
  email: string;
  companyId: string;
  role: 'admin' | 'agent';
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: 'active' | 'inactive';
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstanceName?: string;
  aiPrompt?: string;
  createdAt?: string;
}

export interface DashboardMetrics {
  total_conversas: number;
  contatos: number;
  agendamentos: number;
}

export interface Contact {
  id: string | number;
  nome: string;
  telefone: string;
  criado_em: string;
  empresa_id?: string | number;
}

export interface AtendenteConfig {
  id?: number;
  empresa_id: number;
  nome_atendente: string;
  personalidade: string;
  nicho: string;
  horario_abertura: string;
  horario_fechamento: string;
  dias_funcionamento: string;
  formas_pagamento: string;
  regras_customizadas: string;
  ativo: boolean;
  criado_em?: string;
  funcao?: 'atendimento' | 'vendedor' | 'sdr' | 'suporte' | string;
  tom?: 'profissional' | 'amigavel' | 'formal' | 'descontraido' | string;
  descricao?: string;
  empresa_nome?: string;
  faqs?: { pergunta: string; resposta: string }[];
  whatsapp_conectado?: boolean;
  mensagens_hoje?: number;
}

export interface Servico {
  id?: number;
  empresa_id: number;
  nome: string;
  descricao: string;
  preco: number;
  duracao_minutos: number;
  ativo: boolean;
  criado_em?: string;
}

export interface Produto {
  id?: number;
  empresa_id: number;
  nome: string;
  descricao: string;
  preco: number | string;
  imagem_url?: string;
  estoque: number | string;
  ativo: boolean;
  criado_em?: string;
  atualizado_em?: string;
}

export interface Profissional {
  id?: number;
  empresa_id: number;
  nome: string;
  especialidades: string;
  foto_url?: string;
  horario_inicio: string;
  horario_fim: string;
  dias_trabalho: string;
  ativo: boolean;
  criado_em?: string;
  atualizado_em?: string;
  servicos?: number[]; // IDs dos serviços que atende
  // Aliases de compatibilidade para frontend
  especialidade?: string;
  disponivel?: boolean;
}

export interface Agendamento {
  id?: number;
  empresa_id: number;
  contato_id: number;
  profissional_id: number;
  servico_id: number;
  data_hora: string;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido' | 'agendado';
  observacao: string;
  criado_em?: string;
  contato?: Contact;
  profissional?: Profissional;
  servico?: Servico;
  // Flattened fields for UI compatibility
  cliente_nome?: string;
  cliente_telefone?: string;
  servico_nome?: string;
  servico_preco?: number | string;
  servico_duracao?: number | string;
  profissional_nome?: string;
}

export interface Chat {
  id: string;
  contato_nome: string;
  contato_telefone: string;
  ultima_mensagem: string;
  ultima_data: string | null;
  // Compatibility fields for the UI
  lead_temperature?: 'cold' | 'warm' | 'hot' | string;
  leadTemperature?: string;
  status?: string;
  contact?: { name: string; phone: string };
  lastMessage?: { message: string };
  createdAt?: string;
}

export interface Message {
  id: string;
  conversa_id: string;
  mensagem: string;
  de_mim: boolean;
  data: string;
  // Compatibility fields for the UI
  sender?: 'cliente' | 'bot' | 'humano';
  message?: string;
  createdAt?: string;
}

export interface Appointment {
  id: string;
  chatId: string;
  date: string;
  status: string;
  createdAt: string;
  contact?: Contact;
}
