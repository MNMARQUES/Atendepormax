import axios from 'axios';
import { Chat, Message } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('atendepromax_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const selectedCompanyId = localStorage.getItem('atendepromax_selected_company');
  if (selectedCompanyId) {
    config.headers['x-company-id'] = selectedCompanyId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthRequest = url.includes('/auth/login') || url.includes('/setup/full');
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';

      if (!isAuthRequest && !isAuthPage) {
        localStorage.removeItem('atendepromax_token');
        localStorage.removeItem('atendepromax_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (data: any) => {
    const response = await api.post('/setup/full', data);
    return response.data;
  },
};

export const dashboardService = {
  getMetrics: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },
};

const API_PREFIX = '';

export const conversationService = {
  getConversations: async (): Promise<Chat[]> => {
    const response = await api.get(`${API_PREFIX}/conversas`);
    return response.data;
  },
  getMessages: async (chatId: string): Promise<Message[]> => {
    const response = await api.get(`${API_PREFIX}/conversas/${chatId}/mensagens`);
    return response.data;
  },
  sendMessage: async (chatId: string, message: string): Promise<Message> => {
    const response = await api.post(`${API_PREFIX}/webhook/n8n`, { conversa_id: chatId, mensagem: message });
    return response.data;
  },
  deleteConversation: async (chatId: string | number): Promise<{ success: boolean; removedId?: string | number }> => {
    const response = await api.delete(`${API_PREFIX}/conversas/${chatId}`);
    return response.data;
  },
};

export const contactService = {
  getContacts: async () => {
    const response = await api.get('/contatos');
    return response.data;
  },
  createContact: async (data: { nome: string; telefone: string }) => {
    const response = await api.post('/contatos', data);
    return response.data;
  },
  deleteContact: async (id: string | number): Promise<{ success: boolean; removedId?: string | number }> => {
    const response = await api.delete(`/contatos/${id}`);
    return response.data;
  },
};

export const atendenteService = {
  // ── Agentes ────────────────────────────────────────────────────────────────
  getAtendentes: async () => {
    const response = await api.get('/agentes');
    return response.data;
  },
  getAtendenteById: async (id: number | string) => {
    const response = await api.get(`/agentes/${id}`);
    return response.data;
  },
  createAtendente: async (atendente: any) => {
    const response = await api.post('/agentes', atendente);
    return response.data;
  },
  updateAtendente: async (id: number | string, atendente: any) => {
    const response = await api.put(`/agentes/${id}`, atendente);
    return response.data;
  },
  deleteAtendente: async (id: number | string) => {
    const response = await api.delete(`/agentes/${id}`);
    return response.data;
  },
  toggleAtendenteStatus: async (id: number | string, ativo: boolean) => {
    const response = await api.put(`/agentes/${id}`, { ativo });
    return response.data;
  },
  gerarPromptAgente: async (agenteId: number | string) => {
    const response = await api.post(`/agentes/${agenteId}/gerar-prompt`);
    return response.data;
  },

  // ── Empresa / Config ───────────────────────────────────────────────────────
  getEmpresaConfig: async () => {
    const response = await api.get('/empresa/config');
    return response.data;
  },
  saveEmpresaConfig: async (config: any) => {
    const response = await api.put('/empresa/config', config);
    return response.data;
  },

  // ── Serviços ───────────────────────────────────────────────────────────────
  getServicos: async () => {
    const response = await api.get('/servicos');
    return response.data;
  },
  saveServico: async (servico: any) => {
    const response = await api.post('/servicos', servico);
    return response.data;
  },
  updateServico: async (id: number | string, servico: any) => {
    const response = await api.put(`/servicos/${id}`, servico);
    return response.data;
  },
  deleteServico: async (id: number | string) => {
    const response = await api.delete(`/servicos/${id}`);
    return response.data;
  },

  // ── Profissionais ──────────────────────────────────────────────────────────
  getProfissionais: async () => {
    const response = await api.get('/profissionais');
    return response.data;
  },
  saveProfissional: async (profissional: any) => {
    const response = await api.post('/profissionais', profissional);
    return response.data;
  },
  updateProfissional: async (id: number | string, profissional: any) => {
    const response = await api.put(`/profissionais/${id}`, profissional);
    return response.data;
  },
  deleteProfissional: async (id: number | string) => {
    const response = await api.delete(`/profissionais/${id}`);
    return response.data;
  },

  // ── Produtos ───────────────────────────────────────────────────────────────
  getProdutos: async () => {
    const response = await api.get('/produtos');
    return response.data;
  },
  saveProduto: async (produto: any) => {
    const response = await api.post('/produtos', produto);
    return response.data;
  },
  updateProduto: async (id: number | string, produto: any) => {
    const response = await api.put(`/produtos/${id}`, produto);
    return response.data;
  },
  deleteProduto: async (id: number | string) => {
    const response = await api.delete(`/produtos/${id}`);
    return response.data;
  },
  uploadImage: async (fileData: string, filename?: string): Promise<{ success: boolean; url: string; fullUrl: string; filename: string }> => {
    const response = await api.post('/upload', { image: fileData, filename });
    return response.data;
  },

  // ── Agendamentos ───────────────────────────────────────────────────────────
  getAgendamentos: async () => {
    const response = await api.get('/agendamentos');
    return response.data;
  },
  saveAgendamento: async (agendamento: any) => {
    const response = await api.post('/agendamentos', agendamento);
    return response.data;
  },
  updateAgendamentoStatus: async (id: number, status: string) => {
    const response = await api.patch(`/agendamentos/${id}/status`, { status });
    return response.data;
  },

  // ── Legacy (mantidos por compatibilidade) ──────────────────────────────────
  getAtendente: async () => {
    const response = await api.get('/agentes');
    return response.data;
  },
  saveConfig: async (config: any) => {
    const response = await api.put('/empresa/config', config);
    return response.data;
  },
};

export const appointmentService = {
  getAppointments: async () => {
    const response = await api.get('/appointments');
    return response.data;
  },
};

export const userService = {
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  createUser: async (userData: any) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  deleteUser: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

export const settingsService = {
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },
  updateSettings: async (data: any) => {
    const response = await api.patch('/settings', data);
    return response.data;
  },
};

export const companyService = {
  getCompanies: async () => {
    const response = await api.get('/companies');
    return response.data;
  },
  createCompany: async (data: any) => {
    const response = await api.post('/companies', data);
    return response.data;
  },
  updateCompany: async (id: string, data: any) => {
    const response = await api.patch(`/companies/${id}`, data);
    return response.data;
  },
};

export const whatsappService = {
  getConnectQR: async () => {
    const response = await api.get('/whatsapp/connect');
    return response.data;
  },
  getStatus: async () => {
    const response = await api.get('/whatsapp/status');
    return response.data;
  },
};

export { api };
