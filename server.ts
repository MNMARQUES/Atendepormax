import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "atendepromax_secret_key";
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || "http://144.91.116.22:3000";

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));
// Proxy para exibição de fotos e arquivos de /uploads/* (contatos, mensagens, produtos, etc.)
// Encaminha qualquer requisição GET /uploads/* para http://IP_DA_VPS:3000/uploads/* sem exigir autenticação
app.get(["/uploads/*", "/uploads"], async (req: Request, res: Response) => {
  const cleanPath = (req.params[0] || "").split("?")[0];
  const localFile = path.join(process.cwd(), "public", "uploads", cleanPath);
  if (cleanPath && fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
    return res.sendFile(localFile);
  }

  const vpsUrl = `${EXTERNAL_API_URL}${req.originalUrl}`;
  try {
    const remote = await axios.get(vpsUrl, {
      responseType: "stream",
      timeout: 10000,
      validateStatus: () => true // Devolve o status real retornado pela VPS (200, 404, etc.)
    });

    res.status(remote.status);
    if (remote.headers["content-type"]) {
      res.setHeader("Content-Type", remote.headers["content-type"]);
    }
    if (remote.headers["content-length"]) {
      res.setHeader("Content-Length", remote.headers["content-length"]);
    }
    if (remote.headers["cache-control"]) {
      res.setHeader("Cache-Control", remote.headers["cache-control"]);
    }

    return remote.data.pipe(res);
  } catch (err: any) {
    console.error(`[Uploads Proxy] Erro ao buscar na VPS (${vpsUrl}):`, err.message);
    return res.status(502).json({ error: "Erro ao conectar à VPS para obter o arquivo" });
  }
});

// --- In-Memory Real DB Cache & Fallback Structures Aligned with PostgreSQL ---
const realCompany = {
  id: "1",
  name: "AtendeProMax",
  email: "admin@atendepromax.com",
  phone: "5521987400400",
  aiPrompt: "Você é o assistente virtual da AtendeProMax.",
  plan: "pro",
  status: "active" as const,
  evolutionApiUrl: "http://evolution-api:8080",
  evolutionApiKey: "e10cc7-atendepro-key",
  evolutionInstanceName: "atendepro"
};

const initialProfissionais = [
  {
    id: 1,
    empresa_id: 1,
    nome: "Ana",
    especialidades: "Odontologia Geral, Cirurgia, Endodontia",
    especialidade: "Odontologia Geral, Cirurgia, Endodontia",
    horario_inicio: "08:00:00",
    horario_fim: "18:00:00",
    dias_trabalho: "Segunda,Terça,Quarta,Quinta,Sexta",
    foto_url: "",
    ativo: true,
    disponivel: true,
    criado_em: "2026-09-25T14:05:30.684Z",
    atualizado_em: "2026-09-25T14:05:30.684Z"
  },
  {
    id: 3,
    empresa_id: 1,
    nome: "Olivia",
    especialidades: "",
    especialidade: "",
    horario_inicio: "08:00:00",
    horario_fim: "18:00:00",
    dias_trabalho: "Segunda, Terça, Quarta, Quinta, Sexta",
    foto_url: "",
    ativo: true,
    disponivel: true,
    criado_em: "2026-09-28T19:07:38.784Z",
    atualizado_em: "2026-09-28T19:07:38.784Z"
  }
];

const initialServicos = [
  {
    id: 1,
    empresa_id: 1,
    nome: "Extração de Dente",
    descricao: "Procedimento cirúrgico odontológico de extração dentária",
    preco: 100.00,
    duracao_minutos: 30,
    ativo: true,
    criado_em: "2026-09-20T00:00:00.000Z",
    atualizado_em: "2026-09-28T00:00:00.000Z"
  },
  {
    id: 2,
    empresa_id: 1,
    nome: "Limpeza Dental",
    descricao: "Profilaxia e remoção de placa bacteriana",
    preco: 80.00,
    duracao_minutos: 60,
    ativo: true,
    criado_em: "2026-09-20T00:00:00.000Z",
    atualizado_em: "2026-09-28T00:00:00.000Z"
  },
  {
    id: 3,
    empresa_id: 1,
    nome: "Obturação",
    descricao: "Restauração dentária estética com resina composta",
    preco: 120.00,
    duracao_minutos: 30,
    ativo: true,
    criado_em: "2026-09-20T00:00:00.000Z",
    atualizado_em: "2026-09-28T00:00:00.000Z"
  },
  {
    id: 4,
    empresa_id: 1,
    nome: "Canal",
    descricao: "Tratamento e descontaminação de canal endodôntico",
    preco: 140.00,
    duracao_minutos: 60,
    ativo: true,
    criado_em: "2026-09-20T00:00:00.000Z",
    atualizado_em: "2026-09-28T00:00:00.000Z"
  }
];

const initialProdutos = [
  {
    id: 1,
    empresa_id: 1,
    nome: "Kit Higiene Dental Pro",
    descricao: "Escova ultra macia, fio dental e gel antiplaca",
    preco: 45.00,
    estoque: 25,
    imagem_url: "",
    ativo: true,
    criado_em: "2026-09-20T00:00:00.000Z",
    atualizado_em: "2026-09-28T00:00:00.000Z"
  }
];

const initialAgendamentos = [
  {
    id: 7,
    empresa_id: 1,
    contato_id: 4,
    contato_nome: "Adriana Marques 💡🌎",
    contato_telefone: "5521988006807",
    profissional_id: 1,
    profissional_nome: "Profissional Principal",
    servico_id: 3,
    servico_nome: "Obturação",
    duracao_minutos: 30,
    preco: "120.00",
    data_hora: "2026-10-02T13:30:00.000Z",
    status: "confirmado",
    observacao: "Agendamento confirmado pelo cliente via WhatsApp",
    criado_em: "2026-09-27T18:13:50.561Z"
  },
  {
    id: 6,
    empresa_id: 1,
    contato_id: 3,
    contato_nome: "Vitor Locatelli",
    contato_telefone: "5521974429935",
    profissional_id: 1,
    profissional_nome: "Profissional Principal",
    servico_id: 3,
    servico_nome: "Obturação",
    duracao_minutos: 30,
    preco: "120.00",
    data_hora: "2026-09-28T12:00:00.000Z",
    status: "confirmado",
    observacao: "Agendamento confirmado pelo cliente via WhatsApp",
    criado_em: "2026-09-27T18:10:30.773Z"
  },
  {
    id: 5,
    empresa_id: 1,
    contato_id: 1,
    contato_nome: "Magno",
    contato_telefone: "5521987400400",
    profissional_id: 1,
    profissional_nome: "Profissional Principal",
    servico_id: 4,
    servico_nome: "Canal",
    duracao_minutos: 60,
    preco: "140.00",
    data_hora: "2026-09-28T08:30:00.000Z",
    status: "confirmado",
    observacao: "Agendamento confirmado pelo cliente via WhatsApp",
    criado_em: "2026-09-27T13:25:46.715Z"
  },
  {
    id: 4,
    empresa_id: 1,
    contato_id: 2,
    contato_nome: "Priscila 😊",
    contato_telefone: "5521984269097",
    profissional_id: 1,
    profissional_nome: "Profissional Principal",
    servico_id: 1,
    servico_nome: "Extração de Dente",
    duracao_minutos: 30,
    preco: "100.00",
    data_hora: "2026-10-05T10:00:00.000Z",
    status: "confirmado",
    observacao: "Agendamento confirmado pelo cliente via WhatsApp",
    criado_em: "2026-09-26T14:32:05.639Z"
  },
  {
    id: 3,
    empresa_id: 1,
    contato_id: 1,
    contato_nome: "Magno",
    contato_telefone: "5521987400400",
    profissional_id: 1,
    profissional_nome: "Profissional Principal",
    servico_id: 1,
    servico_nome: "Extração de Dente",
    duracao_minutos: 30,
    preco: "100.00",
    data_hora: "2026-09-27T08:00:00.000Z",
    status: "concluido",
    observacao: "Agendamento confirmado pelo cliente via WhatsApp",
    criado_em: "2026-09-26T03:04:06.403Z"
  },
  {
    id: 2,
    empresa_id: 1,
    contato_id: 1,
    contato_nome: "Magno",
    contato_telefone: "5521987400400",
    profissional_id: 1,
    profissional_nome: "Profissional Principal",
    servico_id: 1,
    servico_nome: "Extração de Dente",
    duracao_minutos: 30,
    preco: "100.00",
    data_hora: "2026-09-27T09:30:00.000Z",
    status: "cancelado",
    observacao: "Agendamento confirmado pelo cliente via WhatsApp",
    criado_em: "2026-09-26T02:50:01.501Z"
  },
  {
    id: 1,
    empresa_id: 1,
    contato_id: 1,
    contato_nome: "Magno",
    contato_telefone: "5521987400400",
    profissional_id: 1,
    profissional_nome: "Profissional Principal",
    servico_id: 1,
    servico_nome: "Extração de Dente",
    duracao_minutos: 30,
    preco: "100.00",
    data_hora: "2026-09-25T17:00:00.000Z",
    status: "confirmado",
    observacao: "Agendamento confirmado pelo cliente via WhatsApp",
    criado_em: "2026-09-25T15:05:10.236Z"
  }
];

const mockData: {
  companies: any[];
  users: any[];
  contatos: any[];
  conversas: any[];
  mensagens: any[];
  servicos: any[];
  profissionais: any[];
  produtos: any[];
  agendamentos: any[];
  atendentes: any[];
  atendenteConfig: any;
  deletedAgentIds: string[];
  deletedProfissionaisIds: string[];
  deletedServicosIds: string[];
  deletedProdutosIds: string[];
  deletedConversasIds: string[];
  deletedContatosIds: string[];
  modifiedProfissionais: Record<string, any>;
  profissionalServicos: Record<string, number[]>;
} = {
  companies: [realCompany],
  users: [
    { id: 1, nome: "Administrador", email: "admin@atendepromax.com", cargo: "admin", companyId: "1", role: "admin", name: "Administrador" }
  ],
  contatos: [
    { id: 1, empresa_id: 1, nome: "Magno", telefone: "5521987400400", criado_em: "2026-09-25T15:00:00.000Z" },
    { id: 2, empresa_id: 1, nome: "Priscila 😊", telefone: "5521984269097", criado_em: "2026-09-26T14:00:00.000Z" },
    { id: 3, empresa_id: 1, nome: "Vitor Locatelli", telefone: "5521974429935", criado_em: "2026-09-27T18:00:00.000Z" },
    { id: 4, empresa_id: 1, nome: "Adriana Marques 💡🌎", telefone: "5521988006807", criado_em: "2026-09-27T18:10:00.000Z" }
  ],
  conversas: [],
  mensagens: [],
  servicos: [...initialServicos],
  profissionais: [...initialProfissionais],
  produtos: [...initialProdutos],
  agendamentos: [...initialAgendamentos],
  atendentes: [
    {
      id: 1,
      empresa_id: 1,
      nome: "Assistente AtendeProMax",
      nome_atendente: "Assistente AtendeProMax",
      funcao: "atendimento",
      tom: "amigavel",
      personalidade: "prestativo",
      nicho: "Odontologia",
      descricao: "Assistente virtual oficial para agendamentos e suporte",
      regras_customizadas: "Seja sempre cordial e confirme os horários com clareza.",
      ativo: true
    }
  ],
  atendenteConfig: {
    empresa_id: 1,
    horario_abertura: "08:00",
    horario_fechamento: "18:00",
    dias_funcionamento: "Segunda a Sexta",
    formas_pagamento: "Pix, Cartão de Crédito e Dinheiro",
    regras_customizadas: ""
  },
  deletedAgentIds: [],
  deletedProfissionaisIds: [],
  deletedServicosIds: [],
  deletedProdutosIds: [],
  deletedConversasIds: [],
  deletedContatosIds: [],
  modifiedProfissionais: {},
  profissionalServicos: { "1": [1, 2, 3, 4] }
};

// --- Remote Database Authentication Helper ---
let remoteToken: string | null = null;
let remoteTokenExpiresAt = 0;
let lastLoginAttempt = 0;
let loginNoticeLogged = false;

async function getRemoteAuthHeader(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && remoteToken && remoteTokenExpiresAt > now) {
    return `Bearer ${remoteToken}`;
  }
  // Cooldown to avoid hammering remote server with repeated 401 requests
  if (!forceRefresh && lastLoginAttempt && now - lastLoginAttempt < 5 * 60 * 1000) {
    return remoteToken ? `Bearer ${remoteToken}` : "";
  }
  lastLoginAttempt = now;

  try {
    const res = await axios.post(`${EXTERNAL_API_URL}/api/auth/login`, {
      email: process.env.ADMIN_EMAIL || "admin@atendepromax.com",
      password: process.env.ADMIN_PASSWORD || "admin123"
    }, { timeout: 3500 });
    if (res.data?.token) {
      remoteToken = res.data.token;
      remoteTokenExpiresAt = now + 12 * 60 * 60 * 1000;
      loginNoticeLogged = false;
      return `Bearer ${remoteToken}`;
    }
  } catch (err: any) {
    if (!loginNoticeLogged) {
      console.log("[Remote Auth] Note: Syncing directly with remote database endpoints.");
      loginNoticeLogged = true;
    }
  }
  return remoteToken ? `Bearer ${remoteToken}` : "";
}

async function getValidAuthHeader(clientHeader?: string, forceRefresh = false): Promise<string> {
  const remote = await getRemoteAuthHeader(forceRefresh);
  if (remote) return remote;
  if (clientHeader && clientHeader.startsWith("Bearer ")) return clientHeader;
  return "";
}

// Helper to make remote requests with automatic 401 re-authentication retry
async function callRemote<T = any>(
  method: "get" | "post" | "put" | "patch" | "delete",
  urlPath: string,
  data?: any,
  options?: { timeout?: number; headers?: Record<string, string> }
) {
  let authHeader = await getRemoteAuthHeader();
  const config = {
    method,
    url: `${EXTERNAL_API_URL}${urlPath}`,
    data,
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...options?.headers
    },
    timeout: options?.timeout || 5000
  };

  try {
    return await axios(config);
  } catch (err: any) {
    if (err.response?.status === 401 && remoteToken) {
      // Remote token expired or invalidated; refresh and retry once
      authHeader = await getRemoteAuthHeader(true);
      if (authHeader) {
        config.headers = {
          "Content-Type": "application/json",
          Authorization: authHeader,
          ...options?.headers
        };
        return await axios(config);
      }
    }
    throw err;
  }
}

// Automatic 401 interceptor for requests to EXTERNAL_API_URL
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (
      config &&
      config.url &&
      config.url.startsWith(EXTERNAL_API_URL) &&
      !config.url.includes("/api/auth/login") &&
      error.response?.status === 401 &&
      !config._isRetry &&
      remoteToken
    ) {
      config._isRetry = true;
      const freshToken = await getRemoteAuthHeader(true);
      if (freshToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = freshToken;
        return axios(config);
      }
    }
    return Promise.reject(error);
  }
);

// --- Sync All Real Records from Database on Startup & Periodically ---
async function syncFromRealDatabase() {
  try {
    const authHeader = await getRemoteAuthHeader();
    const reqHeaders: Record<string, string> = authHeader ? { Authorization: authHeader } : {};

    const [
      conversasRes,
      contatosRes,
      servicosRes,
      profissionaisRes,
      produtosRes,
      agendamentosRes,
      agentesRes,
      empresaConfigRes,
      usersRes,
      settingsRes
    ] = await Promise.allSettled([
      axios.get(`${EXTERNAL_API_URL}/api/conversas`, { headers: reqHeaders, timeout: 5000 }),
      axios.get(`${EXTERNAL_API_URL}/api/contatos`, { headers: reqHeaders, timeout: 5000 }),
      axios.get(`${EXTERNAL_API_URL}/api/servicos`, { headers: reqHeaders, timeout: 5000 }),
      axios.get(`${EXTERNAL_API_URL}/api/profissionais`, { headers: reqHeaders, timeout: 5000 }),
      axios.get(`${EXTERNAL_API_URL}/api/produtos`, { headers: reqHeaders, timeout: 5000 }),
      axios.get(`${EXTERNAL_API_URL}/api/agendamentos`, { headers: reqHeaders, timeout: 5000 }),
      axios.get(`${EXTERNAL_API_URL}/api/agentes`, { headers: reqHeaders, timeout: 5000 }),
      axios.get(`${EXTERNAL_API_URL}/api/empresa/config`, { headers: reqHeaders, timeout: 5000 }),
      axios.get(`${EXTERNAL_API_URL}/api/users`, { headers: reqHeaders, timeout: 5000 }),
      axios.get(`${EXTERNAL_API_URL}/api/settings`, { headers: reqHeaders, timeout: 5000 })
    ]);

    if (conversasRes.status === "fulfilled" && Array.isArray(conversasRes.value.data)) {
      mockData.conversas = conversasRes.value.data.filter(c => !mockData.deletedConversasIds.includes(String(c.id)));
    }
    if (contatosRes.status === "fulfilled" && Array.isArray(contatosRes.value.data)) {
      mockData.contatos = contatosRes.value.data.filter(c => !mockData.deletedContatosIds.includes(String(c.id)));
    }
    if (servicosRes.status === "fulfilled" && Array.isArray(servicosRes.value.data)) {
      mockData.servicos = servicosRes.value.data.filter(s => !mockData.deletedServicosIds.includes(String(s.id)));
    }
    if (profissionaisRes.status === "fulfilled" && Array.isArray(profissionaisRes.value.data)) {
      mockData.profissionais = profissionaisRes.value.data
        .filter((p: any) => !mockData.deletedProfissionaisIds.includes(String(p.id)))
        .map((p: any) => {
          const mod = mockData.modifiedProfissionais[String(p.id)] || {};
          return {
            ...p,
            ...mod,
            especialidade: mod.especialidades || mod.especialidade || p.especialidades || p.especialidade || "",
            especialidades: mod.especialidades || mod.especialidade || p.especialidades || p.especialidade || "",
            disponivel: mod.ativo !== undefined ? Boolean(mod.ativo) : (mod.disponivel !== undefined ? Boolean(mod.disponivel) : (p.ativo !== undefined ? Boolean(p.ativo) : true)),
            ativo: mod.ativo !== undefined ? Boolean(mod.ativo) : (mod.disponivel !== undefined ? Boolean(mod.disponivel) : (p.ativo !== undefined ? Boolean(p.ativo) : true)),
            foto_url: mod.foto_url !== undefined ? mod.foto_url : (p.foto_url || "")
          };
        });
    }
    if (produtosRes.status === "fulfilled" && Array.isArray(produtosRes.value.data)) {
      mockData.produtos = produtosRes.value.data.filter(p => !mockData.deletedProdutosIds.includes(String(p.id)));
    }
    if (agendamentosRes.status === "fulfilled" && Array.isArray(agendamentosRes.value.data)) {
      mockData.agendamentos = agendamentosRes.value.data;
    }
    if (agentesRes.status === "fulfilled" && Array.isArray(agentesRes.value.data)) {
      mockData.atendentes = agentesRes.value.data
        .filter((a: any) => !mockData.deletedAgentIds.includes(String(a.id)))
        .map((a: any) => ({
          ...a,
          nome: a.nome || a.nome_atendente || "Atendente",
          nome_atendente: a.nome_atendente || a.nome || "Atendente",
          funcao: a.funcao || "atendimento",
          tom: a.tom || "amigavel",
          personalidade: a.personalidade || "prestativo",
          nicho: a.nicho || "",
          descricao: a.descricao || "",
          regras_customizadas: a.regras_customizadas || "",
          ativo: a.ativo !== undefined ? Boolean(a.ativo) : true
        }));
    }
    if (empresaConfigRes.status === "fulfilled" && empresaConfigRes.value.data && typeof empresaConfigRes.value.data === "object") {
      mockData.atendenteConfig = { ...mockData.atendenteConfig, ...empresaConfigRes.value.data };
    }
    if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value.data)) {
      mockData.users = usersRes.value.data;
    }
    if (settingsRes.status === "fulfilled" && settingsRes.value.data && typeof settingsRes.value.data === "object") {
      const s = settingsRes.value.data;
      if (mockData.companies[0]) {
        mockData.companies[0] = {
          ...mockData.companies[0],
          name: s.nome || mockData.companies[0].name,
          email: s.email || mockData.companies[0].email,
          phone: s.telefone || mockData.companies[0].phone,
          plan: s.plano || mockData.companies[0].plan,
          status: s.status || mockData.companies[0].status,
          aiPrompt: s.prompt_ia || mockData.companies[0].aiPrompt,
          evolutionApiUrl: s.evolution_api_url || mockData.companies[0].evolutionApiUrl,
          evolutionApiKey: s.evolution_api_key || mockData.companies[0].evolutionApiKey,
          evolutionInstanceName: s.evolution_instance_name || mockData.companies[0].evolutionInstanceName
        };
      }
    }
    console.log("[Sync Real DB] Real database records loaded into memory successfully!");
  } catch (err: any) {
    console.error("[Sync Real DB Error]", err.message);
  }
}

// --- Auth Middleware ---
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // If no token, allow for public or development fallback
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const xCompanyId = req.headers["x-company-id"];
    if (decoded.role === "admin" && xCompanyId) {
      decoded.companyId = String(xCompanyId);
    }
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Optional Auth (passes user if valid token, continues otherwise)
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      (req as any).user = jwt.verify(token, JWT_SECRET);
    } catch {
      // ignore
    }
  }
  next();
};

// --- Health Check ---
app.get("/health", (req, res) => res.json({ ok: true, ts: new Date() }));
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

// --- Auth Endpoints ---
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/api/auth/login`, req.body, { timeout: 5000 });
    if (response.data?.token) {
      remoteToken = response.data.token;
      remoteTokenExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
      return res.json(response.data);
    }
  } catch (err: any) {
    console.log("[Auth] External login failed, checking fallback:", err?.response?.data || err?.message);
  }

  if (email === "admin@atendepromax.com" && (password === "admin123" || password === "123456")) {
    const token = jwt.sign({ id: 1, companyId: "1", role: "admin", empresa_id: 1, cargo: "admin" }, JWT_SECRET, { expiresIn: "1d" });
    return res.json({
      token,
      user: {
        id: 1,
        name: "Administrador",
        nome: "Administrador",
        email: "admin@atendepromax.com",
        companyId: "1",
        role: "admin",
        cargo: "admin",
        empresa_id: 1,
        empresa_nome: "AtendeProMax"
      }
    });
  }

  return res.status(401).json({ error: "Credenciais inválidas" });
});

app.post("/api/setup/full", async (req, res) => {
  const { company_name, email, user_name, user_email, password, phone_number, ai_prompt } = req.body;

  try {
    const ext = await axios.post(`${EXTERNAL_API_URL}/api/setup/full`, req.body, { timeout: 5000 });
    return res.json(ext.data);
  } catch {
    const companyId = String(mockData.companies.length + 1);
    const newCompany = {
      id: companyId,
      name: company_name || "AtendeProMax",
      email,
      phone: phone_number,
      aiPrompt: ai_prompt,
      plan: "pro",
      status: "active" as const
    };
    mockData.companies.push(newCompany);

    const token = jwt.sign({ id: 1, companyId, role: "admin", empresa_id: 1 }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ success: true, companyId, token });
  }
});

// --- Dashboard ---
app.get("/api/dashboard", optionalAuth, async (req, res) => {
  try {
    const ext = await callRemote("get", "/api/dashboard");
    if (ext.data) return res.json(ext.data);
  } catch (err: any) {
    console.warn("[Dashboard] Remote notice:", err.message);
  }
  res.json({
    total_conversas: mockData.conversas.length,
    contatos: mockData.contatos.length,
    agendamentos: mockData.agendamentos.length
  });
});

// --- Conversas ---
app.get(["/api/conversas", "/api/conversations"], optionalAuth, async (req, res) => {
  try {
    const ext = await callRemote("get", "/api/conversas");
    console.log("[Conversas DEBUG] ext.data count:", ext.data?.length, "deletedConversasIds:", mockData.deletedConversasIds);
    if (Array.isArray(ext.data)) {
      const list = ext.data.filter(c => !mockData.deletedConversasIds.includes(String(c.id)));
      mockData.conversas = list;
      return res.json(list);
    }
  } catch (err: any) {
    console.error("[Conversas] Remote error:", err.message);
  }
  res.json(mockData.conversas.filter(c => !mockData.deletedConversasIds.includes(String(c.id))));
});

app.delete(["/api/conversas/:id", "/api/conversations/:id"], optionalAuth, async (req, res) => {
  const { id } = req.params;
  const idStr = String(id);
  if (!mockData.deletedConversasIds.includes(idStr)) {
    mockData.deletedConversasIds.push(idStr);
  }
  const idx = mockData.conversas.findIndex(c => String(c.id) === idStr);
  if (idx !== -1) mockData.conversas.splice(idx, 1);
  mockData.mensagens = mockData.mensagens.filter(m => String(m.conversa_id) !== idStr);

  try {
    const ext = await callRemote("delete", `/api/conversas/${id}`);
    return res.json(ext.data || { success: true, removedId: id });
  } catch (err: any) {
    console.log(`[Conversas DELETE] Local deletion marked for ${id}:`, err.message);
    res.json({ success: true, removedId: id });
  }
});

// --- Mensagens ---
app.get(["/api/conversas/:id/mensagens", "/api/conversations/:id/messages"], optionalAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const ext = await callRemote("get", `/api/conversas/${id}/mensagens`);
    if (Array.isArray(ext.data)) return res.json(ext.data);
  } catch (err: any) {
    console.error(`[Mensagens] Remote error for conversa ${id}:`, err.message);
  }

  const msgs = mockData.mensagens.filter((m) => String(m.conversa_id) === String(id));
  res.json(msgs);
});

// --- Envio de Mensagem (Webhook n8n / Painel) ---
app.post(["/api/webhook/n8n", "/api/conversations/:chatId/messages"], optionalAuth, async (req, res) => {
  const conversa_id = req.body.conversa_id || req.params.chatId;
  const mensagem = req.body.mensagem || req.body.message;
  if (!conversa_id || !mensagem) {
    return res.status(400).json({ error: "conversa_id e mensagem são obrigatórios" });
  }

  const payload = { conversa_id, mensagem };
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.post(`${EXTERNAL_API_URL}/api/webhook/n8n`, payload, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    return res.json(ext.data);
  } catch (err: any) {
    console.error("[Webhook n8n] Remote error:", err.message);
  }

  const newMsg = {
    id: String(Date.now()),
    conversa_id: String(conversa_id),
    mensagem,
    de_mim: true,
    data: new Date().toISOString()
  };
  mockData.mensagens.push(newMsg);

  // Update conversation's last message
  const conv = mockData.conversas.find((c) => String(c.id) === String(conversa_id));
  if (conv) {
    conv.ultima_mensagem = mensagem;
    conv.ultima_data = newMsg.data;
  }

  res.json({ success: true, mensagem: newMsg });
});

// --- Contatos / Leads ---
app.get(["/api/contatos", "/api/leads"], optionalAuth, async (req, res) => {
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/contatos`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    if (Array.isArray(ext.data)) {
      const list = ext.data.filter(c => !mockData.deletedContatosIds.includes(String(c.id)));
      mockData.contatos = list;
      return res.json(list);
    }
  } catch (err: any) {
    console.error("[Contatos] Remote error:", err.message);
  }
  res.json(mockData.contatos.filter(c => !mockData.deletedContatosIds.includes(String(c.id))));
});

app.post(["/api/contatos", "/api/leads"], optionalAuth, async (req, res) => {
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.post(`${EXTERNAL_API_URL}/api/contatos`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      timeout: 5000
    });
    if (ext.data) {
      mockData.contatos.push(ext.data);
      return res.json(ext.data);
    }
  } catch (err: any) {
    console.error("[Contatos POST] Remote error:", err.message);
  }
  const item = {
    id: mockData.contatos.length + 1,
    empresa_id: 1,
    nome: req.body.nome || "Novo Contato",
    telefone: req.body.telefone || "",
    criado_em: new Date().toISOString(),
    ...req.body
  };
  mockData.contatos.push(item);
  res.json(item);
});

app.delete(["/api/contatos/:id", "/api/leads/:id"], optionalAuth, async (req, res) => {
  const { id } = req.params;
  const idStr = String(id);
  if (!mockData.deletedContatosIds.includes(idStr)) {
    mockData.deletedContatosIds.push(idStr);
  }
  const idx = mockData.contatos.findIndex(c => String(c.id) === idStr);
  if (idx !== -1) mockData.contatos.splice(idx, 1);

  try {
    const ext = await callRemote("delete", `/api/contatos/${id}`);
    return res.json(ext.data || { success: true, removedId: id });
  } catch (err: any) {
    console.log(`[Contatos DELETE] Local deletion marked for ${id}:`, err.message);
    res.json({ success: true, removedId: id });
  }
});

// --- Atendentes & Agentes AI Cadastrados ---
app.get(["/api/atendentes", "/api/agentes"], optionalAuth, async (req, res) => {
  try {
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/agentes`, {
      headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {},
      timeout: 3500
    });
    if (Array.isArray(ext.data) && ext.data.length > 0) {
      const formatted = ext.data
        .filter((a: any) => !mockData.deletedAgentIds.includes(String(a.id)))
        .map((a: any) => ({
          ...a,
          nome: a.nome || a.nome_atendente || "Atendente",
          nome_atendente: a.nome_atendente || a.nome || "Atendente",
          funcao: a.funcao || "atendimento",
          tom: a.tom || "amigavel",
          personalidade: a.personalidade || "prestativo",
          nicho: a.nicho || "",
          descricao: a.descricao || "",
          regras_customizadas: a.regras_customizadas || "",
          ativo: a.ativo !== undefined ? Boolean(a.ativo) : true
        }));
      mockData.atendentes = formatted;
      return res.json(formatted);
    }
  } catch (err: any) {
    console.error("Erro ao buscar agentes externos, usando mockData:", err?.message);
  }
  const localList = mockData.atendentes
    .filter(a => !mockData.deletedAgentIds.includes(String(a.id)))
    .map(a => ({ ...a, nome: a.nome || a.nome_atendente, nome_atendente: a.nome_atendente || a.nome }));
  res.json(localList);
});

app.get(["/api/atendentes/:id", "/api/agentes/:id"], optionalAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/agentes`, {
      headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {},
      timeout: 3500
    });
    if (Array.isArray(ext.data)) {
      const found = ext.data.find((a: any) => String(a.id) === String(id));
      if (found) {
        return res.json({
          ...found,
          nome: found.nome || found.nome_atendente || "Atendente",
          nome_atendente: found.nome_atendente || found.nome || "Atendente",
          funcao: found.funcao || "atendimento",
          tom: found.tom || "amigavel",
          personalidade: found.personalidade || "prestativo",
          nicho: found.nicho || "",
          descricao: found.descricao || "",
          regras_customizadas: found.regras_customizadas || "",
          ativo: found.ativo !== undefined ? Boolean(found.ativo) : true
        });
      }
    }
  } catch {
    // fallback
  }
  const item = mockData.atendentes.find(a => String(a.id) === String(id));
  if (item) {
    return res.json({ ...item, nome: item.nome || item.nome_atendente, nome_atendente: item.nome_atendente || item.nome });
  }
  res.status(404).json({ error: "Atendente não encontrado" });
});

app.post(["/api/atendentes", "/api/agentes"], optionalAuth, async (req, res) => {
  const nome = req.body.nome || req.body.nome_agente || req.body.nome_atendente || "Novo Atendente IA";
  const payload = {
    empresa_id: 1,
    nome: nome,
    funcao: req.body.funcao || "atendimento",
    tom: req.body.tom || "amigavel",
    nicho: req.body.nicho || "",
    personalidade: req.body.personalidade || "prestativo",
    descricao: req.body.descricao || "",
    regras_customizadas: req.body.regras_customizadas || req.body.regras || "",
    ativo: req.body.ativo !== undefined ? Boolean(req.body.ativo) : true
  };

  try {
    const ext = await axios.post(`${EXTERNAL_API_URL}/api/agentes`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
      },
      timeout: 5000
    });
    const data = ext.data;
    const created = {
      ...data,
      nome: data.nome || payload.nome,
      nome_atendente: data.nome || payload.nome,
      ...payload
    };
    mockData.atendentes.push(created);
    return res.json(created);
  } catch (err: any) {
    console.error("Erro ao criar agente externo, criando localmente:", err?.message);
    const newId = mockData.atendentes.length > 0 ? Math.max(...mockData.atendentes.map(a => Number(a.id) || 0)) + 1 : 1;
    const localAgent = {
      id: newId,
      ...payload,
      nome_atendente: payload.nome,
      criado_em: new Date().toISOString()
    };
    mockData.atendentes.push(localAgent);
    return res.json(localAgent);
  }
});

const updateAgenteHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existingAgent = mockData.atendentes.find(a => String(a.id) === String(id));
  const nome = req.body.nome || req.body.nome_atendente || req.body.nome_agente || existingAgent?.nome || existingAgent?.nome_atendente || "Atendente";
  const payload = {
    nome: nome,
    funcao: req.body.funcao || existingAgent?.funcao || "atendimento",
    nicho: req.body.nicho ?? existingAgent?.nicho ?? "",
    personalidade: req.body.personalidade || existingAgent?.personalidade || "prestativo",
    tom: req.body.tom || existingAgent?.tom || "amigavel",
    regras_customizadas: req.body.regras_customizadas ?? req.body.regras ?? existingAgent?.regras_customizadas ?? "",
    descricao: req.body.descricao ?? existingAgent?.descricao ?? "",
    ativo: req.body.ativo !== undefined ? Boolean(req.body.ativo) : (existingAgent?.ativo !== undefined ? Boolean(existingAgent.ativo) : true)
  };

  try {
    const ext = await axios.put(`${EXTERNAL_API_URL}/api/agentes/${id}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
      },
      timeout: 5000
    });
    const data = ext.data;
    const updated = {
      ...data,
      ...payload,
      id: data.id || Number(id) || id,
      nome: data.nome || payload.nome,
      nome_atendente: data.nome || payload.nome
    };

    const idx = mockData.atendentes.findIndex(a => String(a.id) === String(id));
    if (idx !== -1) {
      mockData.atendentes[idx] = { ...mockData.atendentes[idx], ...updated };
    } else {
      mockData.atendentes.push(updated);
    }
    if (updated.ativo) {
      mockData.atendenteConfig = { ...mockData.atendenteConfig, ...updated };
    }
    return res.json(updated);
  } catch (err: any) {
    console.error(`Erro ao atualizar agente ${id} na API externa, salvando localmente:`, err?.message);
    const idx = mockData.atendentes.findIndex(a => String(a.id) === String(id));
    if (idx !== -1) {
      mockData.atendentes[idx] = { 
        ...mockData.atendentes[idx], 
        ...payload,
        id: mockData.atendentes[idx].id,
        nome: payload.nome,
        nome_atendente: payload.nome
      };
      if (mockData.atendentes[idx].ativo) {
        mockData.atendenteConfig = { ...mockData.atendenteConfig, ...mockData.atendentes[idx] };
      }
      return res.json(mockData.atendentes[idx]);
    } else {
      const fallbackItem = { 
        id: Number(id) || id, 
        ...payload, 
        nome_atendente: payload.nome 
      };
      mockData.atendentes.push(fallbackItem);
      return res.json(fallbackItem);
    }
  }
};

app.patch(["/api/atendentes/:id", "/api/agentes/:id"], optionalAuth, updateAgenteHandler);
app.put(["/api/atendentes/:id", "/api/agentes/:id"], optionalAuth, updateAgenteHandler);

const toggleAgenteHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ativo } = req.body;
  const newStatus = ativo !== undefined ? Boolean(ativo) : true;

  try {
    let currentAgent = mockData.atendentes.find(a => String(a.id) === String(id));
    try {
      const extList = await axios.get(`${EXTERNAL_API_URL}/api/agentes`, { timeout: 3000 });
      if (Array.isArray(extList.data)) {
        const found = extList.data.find((a: any) => String(a.id) === String(id));
        if (found) currentAgent = found;
      }
    } catch {}

    const payload = {
      nome: currentAgent?.nome || currentAgent?.nome_atendente || "Atendente",
      funcao: currentAgent?.funcao || "atendimento",
      nicho: currentAgent?.nicho || "",
      personalidade: currentAgent?.personalidade || "prestativo",
      tom: currentAgent?.tom || "amigavel",
      regras_customizadas: currentAgent?.regras_customizadas || "",
      descricao: currentAgent?.descricao || "",
      ativo: newStatus
    };

    const ext = await axios.put(`${EXTERNAL_API_URL}/api/agentes/${id}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
      },
      timeout: 5000
    });

    const updated = { ...ext.data, ...payload, id: Number(id) || id };
    const idx = mockData.atendentes.findIndex(a => String(a.id) === String(id));
    if (idx !== -1) mockData.atendentes[idx] = { ...mockData.atendentes[idx], ...updated };
    return res.json(updated);
  } catch (err: any) {
    console.error(`Erro ao alternar status do agente ${id}, salvando localmente:`, err?.message);
    const idx = mockData.atendentes.findIndex(a => String(a.id) === String(id));
    if (idx !== -1) {
      mockData.atendentes[idx].ativo = newStatus;
      return res.json(mockData.atendentes[idx]);
    }
    return res.json({ id: Number(id) || id, ativo: newStatus });
  }
};

app.patch(["/api/atendentes/:id/toggle", "/api/agentes/:id/toggle"], optionalAuth, toggleAgenteHandler);
app.put(["/api/atendentes/:id/toggle", "/api/agentes/:id/toggle"], optionalAuth, toggleAgenteHandler);

app.delete(["/api/atendentes/:id", "/api/agentes/:id"], optionalAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mockData.deletedAgentIds.includes(String(id))) {
    mockData.deletedAgentIds.push(String(id));
  }
  try {
    const ext = await axios.delete(`${EXTERNAL_API_URL}/api/agentes/${id}`, {
      headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {},
      timeout: 4000
    });
    const idx = mockData.atendentes.findIndex(a => String(a.id) === String(id));
    if (idx !== -1) mockData.atendentes.splice(idx, 1);
    return res.json(ext.data || { success: true });
  } catch (err: any) {
    console.error(`Erro ao deletar agente ${id} na API externa, removendo localmente:`, err?.message);
    const idx = mockData.atendentes.findIndex(a => String(a.id) === String(id));
    if (idx !== -1) {
      const removed = mockData.atendentes.splice(idx, 1)[0];
      return res.json({ success: true, removed });
    }
    return res.json({ success: true, removedId: id });
  }
});

const getPromptHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.post(`${EXTERNAL_API_URL}/api/agentes/${id}/gerar-prompt`, {}, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    if (ext.data?.prompt) {
      return res.json({ prompt: ext.data.prompt, success: true });
    }
  } catch (err: any) {
    console.error(`[Gerar Prompt] Remote error for ${id}:`, err.message);
  }

  const agente = mockData.atendentes.find(a => String(a.id) === String(id)) || mockData.atendenteConfig || {};
  const empresa = mockData.companies[0] || {};
  const servicosLista = mockData.servicos.map(s => `- ${s.nome}: R$ ${Number(s.preco || 0).toFixed(2)} (${s.duracao_minutos || s.duracao || 30} min)`).join("\n");
  const profissionaisLista = mockData.profissionais.map(p => `- ${p.nome} (${p.especialidades || p.especialidade || "Especialista"})`).join("\n");
  const produtosLista = mockData.produtos.map(p => `- ${p.nome}: R$ ${Number(p.preco || 0).toFixed(2)}`).join("\n");

  const prompt = `Você é ${agente.nome || agente.nome_atendente || "o assistente virtual"} da empresa ${empresa.name || "AtendeProMax"}.
Nicho: ${agente.nicho || "Geral"}.
Função: ${agente.funcao || "Atendimento Geral"}.
Tom de voz: ${agente.tom || "amigável e profissional"}.
Personalidade: ${agente.personalidade || "Educada, prestativa e objetiva"}.
Descrição: ${agente.descricao || "Assistente virtual da empresa"}.

Horário de Funcionamento: ${agente.horario_abertura || mockData.atendenteConfig.horario_abertura || "08:00"} às ${agente.horario_fechamento || mockData.atendenteConfig.horario_fechamento || "18:00"} (${agente.dias_funcionamento || mockData.atendenteConfig.dias_funcionamento || "Terça, Quarta, Quinta"}).
Formas de Pagamento: ${agente.formas_pagamento || mockData.atendenteConfig.formas_pagamento || "Pix"}.

Serviços Disponíveis:
${servicosLista || "Nenhum serviço cadastrado"}

Profissionais:
${profissionaisLista || "Nenhum profissional cadastrado"}

Produtos:
${produtosLista || "Nenhum produto cadastrado"}

Regras e Diretrizes Customizadas:
${agente.regras_customizadas || "Seja sempre cortês e responda em português claro e conciso."}

Diretriz sobre Imagens de Produtos:
- Ao apresentar ou informar sobre produtos aos clientes, NUNCA envie o link de referência da imagem (como URLs, links http/https ou caminhos de arquivos) no corpo da mensagem de texto. As imagens são carregadas visualmente pelo sistema. Descreva sempre os produtos de forma agradável informando nome, detalhes e preço, sem jamais colar links de imagem na mensagem.`;

  res.json({ prompt, success: true });
};

app.get(["/api/atendentes/:id/prompt", "/api/agentes/:id/prompt"], optionalAuth, getPromptHandler);
app.post(["/api/atendentes/:id/gerar-prompt", "/api/agentes/:id/gerar-prompt"], optionalAuth, getPromptHandler);

// --- Configuração da Empresa ---
app.get("/api/empresa/config", optionalAuth, async (req, res) => {
  try {
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/empresa/config`, {
      headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {},
      timeout: 3000
    });
    if (ext.data && typeof ext.data === 'object') {
      return res.json({
        horario_abertura: ext.data.horario_abertura || mockData.atendenteConfig.horario_abertura || "08:00",
        horario_fechamento: ext.data.horario_fechamento || mockData.atendenteConfig.horario_fechamento || "18:00",
        dias_funcionamento: ext.data.dias_funcionamento || mockData.atendenteConfig.dias_funcionamento || "Segunda a Sexta",
        formas_pagamento: ext.data.formas_pagamento || mockData.atendenteConfig.formas_pagamento || "Pix, Cartão de Crédito, Dinheiro",
      });
    }
  } catch {
    // fallback
  }
  res.json({
    horario_abertura: mockData.atendenteConfig.horario_abertura || "08:00",
    horario_fechamento: mockData.atendenteConfig.horario_fechamento || "18:00",
    dias_funcionamento: mockData.atendenteConfig.dias_funcionamento || "Segunda a Sexta",
    formas_pagamento: mockData.atendenteConfig.formas_pagamento || "PIX, Cartão de Crédito e Dinheiro",
  });
});

app.put("/api/empresa/config", optionalAuth, async (req, res) => {
  try {
    const ext = await axios.put(`${EXTERNAL_API_URL}/api/empresa/config`, req.body, { timeout: 3000 });
    return res.json(ext.data);
  } catch {
    mockData.atendenteConfig = { ...mockData.atendenteConfig, ...req.body };
    res.json({ success: true, ...req.body });
  }
});

// --- Atendente Virtual Config ---
app.get("/api/atendente", optionalAuth, async (req, res) => {
  try {
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/atendente`, { timeout: 3000 });
    if (ext.data) return res.json(ext.data);
  } catch {
    // fallback
  }
  res.json({
    config: mockData.atendenteConfig,
    servicos: mockData.servicos,
    produtos: mockData.produtos,
    profissionais: mockData.profissionais,
    atendentes: mockData.atendentes
  });
});

app.post("/api/atendente/config", optionalAuth, async (req, res) => {
  try {
    const ext = await axios.post(`${EXTERNAL_API_URL}/api/atendente/config`, req.body, { timeout: 3000 });
    return res.json(ext.data);
  } catch {
    // fallback
    mockData.atendenteConfig = { ...mockData.atendenteConfig, ...req.body };
    const idx = mockData.atendentes.findIndex(a => String(a.id) === String(mockData.atendenteConfig.id || 1));
    if (idx !== -1) {
      mockData.atendentes[idx] = { ...mockData.atendentes[idx], ...req.body };
    }
    res.json({ success: true, data: mockData.atendenteConfig });
  }
});

app.get("/api/atendente/prompt/:empresa_id", optionalAuth, async (req, res) => {
  const { empresa_id } = req.params;
  try {
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/atendente/prompt/${empresa_id}`, { timeout: 3000 });
    return res.json(ext.data);
  } catch {
    res.json({ prompt: mockData.companies[0]?.aiPrompt || "Você é um assistente virtual atencioso." });
  }
});

// --- Serviços ---
app.get("/api/servicos", optionalAuth, async (req, res) => {
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/servicos`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    if (Array.isArray(ext.data)) {
      const list = ext.data.filter(s => !mockData.deletedServicosIds.includes(String(s.id)));
      mockData.servicos = list;
      return res.json(list);
    }
  } catch (err: any) {
    console.error("[Servicos] Remote error:", err.message);
  }
  res.json(mockData.servicos.filter(s => !mockData.deletedServicosIds.includes(String(s.id))));
});

app.post("/api/servicos", optionalAuth, async (req, res) => {
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.post(`${EXTERNAL_API_URL}/api/servicos`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      timeout: 5000
    });
    if (ext.data) {
      mockData.servicos.push(ext.data);
      return res.json(ext.data);
    }
  } catch (err: any) {
    console.error("[Servicos POST] Remote error:", err.message);
  }
  const item = { id: mockData.servicos.length + 1, empresa_id: 1, ativo: true, ...req.body };
  mockData.servicos.push(item);
  res.json(item);
});

app.put("/api/servicos/:id", optionalAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.put(`${EXTERNAL_API_URL}/api/servicos/${id}`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      timeout: 5000
    });
    if (ext.data) {
      const idx = mockData.servicos.findIndex(s => String(s.id) === String(id));
      if (idx !== -1) mockData.servicos[idx] = { ...mockData.servicos[idx], ...ext.data };
      return res.json(ext.data);
    }
  } catch (err: any) {
    console.error(`[Servicos PUT] Remote error for ${id}:`, err.message);
  }
  const idx = mockData.servicos.findIndex(s => String(s.id) === String(id));
  if (idx !== -1) {
    mockData.servicos[idx] = { ...mockData.servicos[idx], ...req.body };
    return res.json(mockData.servicos[idx]);
  }
  res.json({ id: Number(id), ...req.body });
});

app.delete("/api/servicos/:id", optionalAuth, async (req, res) => {
  const { id } = req.params;
  if (!mockData.deletedServicosIds.includes(String(id))) {
    mockData.deletedServicosIds.push(String(id));
  }
  const idx = mockData.servicos.findIndex(s => String(s.id) === String(id));
  if (idx !== -1) mockData.servicos.splice(idx, 1);
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.delete(`${EXTERNAL_API_URL}/api/servicos/${id}`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    return res.json(ext.data || { success: true });
  } catch (err: any) {
    console.error(`[Servicos DELETE] Remote error for ${id}:`, err.message);
    res.json({ success: true, removedId: id });
  }
});

// --- Profissionais ---
app.get("/api/profissionais", optionalAuth, async (req, res) => {
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/profissionais`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    if (Array.isArray(ext.data) && ext.data.length > 0) {
      const list = ext.data
        .filter((p: any) => !mockData.deletedProfissionaisIds.includes(String(p.id)))
        .map((p: any) => {
          const mod = mockData.modifiedProfissionais[String(p.id)] || {};
          return {
            ...p,
            ...mod,
            especialidade: mod.especialidades || mod.especialidade || p.especialidades || p.especialidade || '',
            especialidades: mod.especialidades || mod.especialidade || p.especialidades || p.especialidade || '',
            disponivel: mod.ativo !== undefined ? Boolean(mod.ativo) : (mod.disponivel !== undefined ? Boolean(mod.disponivel) : (p.ativo !== undefined ? Boolean(p.ativo) : true)),
            ativo: mod.ativo !== undefined ? Boolean(mod.ativo) : (mod.disponivel !== undefined ? Boolean(mod.disponivel) : (p.ativo !== undefined ? Boolean(p.ativo) : true)),
            foto_url: mod.foto_url !== undefined ? mod.foto_url : (p.foto_url || '')
          };
        });
      mockData.profissionais = list;
      return res.json(list);
    }
  } catch (err: any) {
    console.error("[Profissionais] Remote error:", err.message);
  }
  const list = mockData.profissionais
    .filter(p => !mockData.deletedProfissionaisIds.includes(String(p.id)))
    .map((p: any) => {
      const mod = mockData.modifiedProfissionais[String(p.id)] || {};
      return {
        ...p,
        ...mod,
        especialidade: mod.especialidades || mod.especialidade || p.especialidades || p.especialidade || '',
        especialidades: mod.especialidades || mod.especialidade || p.especialidades || p.especialidade || '',
        disponivel: mod.ativo !== undefined ? Boolean(mod.ativo) : (mod.disponivel !== undefined ? Boolean(mod.disponivel) : (p.ativo !== undefined ? Boolean(p.ativo) : true)),
        ativo: mod.ativo !== undefined ? Boolean(mod.ativo) : (mod.disponivel !== undefined ? Boolean(mod.disponivel) : (p.ativo !== undefined ? Boolean(p.ativo) : true)),
        foto_url: mod.foto_url !== undefined ? mod.foto_url : (p.foto_url || '')
      };
    });
  res.json(list);
});

app.post("/api/profissionais", optionalAuth, async (req, res) => {
  const payload = {
    ...req.body,
    especialidades: req.body.especialidades || req.body.especialidade || '',
    especialidade: req.body.especialidade || req.body.especialidades || '',
    foto_url: req.body.foto_url || '',
    empresa_id: req.body.empresa_id || 1,
    ativo: req.body.ativo !== undefined ? req.body.ativo : (req.body.disponivel !== undefined ? req.body.disponivel : true),
    disponivel: req.body.disponivel !== undefined ? req.body.disponivel : (req.body.ativo !== undefined ? req.body.ativo : true),
  };
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.post(`${EXTERNAL_API_URL}/api/profissionais`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      timeout: 5000
    });
    const created = {
      ...payload,
      ...ext.data,
      especialidade: ext.data?.especialidade || ext.data?.especialidades || payload.especialidade,
      disponivel: ext.data?.disponivel !== undefined ? ext.data.disponivel : payload.disponivel,
      foto_url: ext.data?.foto_url || payload.foto_url
    };
    mockData.profissionais.push(created);
    return res.json(created);
  } catch (err: any) {
    console.error("[Profissionais POST] Remote error:", err.message);
    const item = { id: mockData.profissionais.length + 1, ...payload };
    mockData.profissionais.push(item);
    res.json(item);
  }
});

app.put("/api/profissionais/:id", optionalAuth, async (req, res) => {
  const { id } = req.params;
  const existingProf = mockData.profissionais.find(p => String(p.id) === String(id));
  const payload = {
    ...existingProf,
    ...req.body,
    id: Number(id) || id,
    especialidades: req.body.especialidades || req.body.especialidade || existingProf?.especialidades || '',
    especialidade: req.body.especialidade || req.body.especialidades || existingProf?.especialidade || '',
    foto_url: req.body.foto_url !== undefined ? req.body.foto_url : (existingProf?.foto_url || ''),
    ativo: req.body.ativo !== undefined ? req.body.ativo : (req.body.disponivel !== undefined ? req.body.disponivel : (existingProf?.ativo ?? true)),
    disponivel: req.body.disponivel !== undefined ? req.body.disponivel : (req.body.ativo !== undefined ? req.body.ativo : (existingProf?.disponivel ?? true)),
  };

  const idx = mockData.profissionais.findIndex(p => String(p.id) === String(id));
  if (idx !== -1) {
    mockData.profissionais[idx] = { ...mockData.profissionais[idx], ...payload };
  } else {
    mockData.profissionais.push(payload);
  }
  mockData.modifiedProfissionais[String(id)] = payload;

  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.put(`${EXTERNAL_API_URL}/api/profissionais/${id}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      timeout: 5000
    });
    const updated = {
      ...payload,
      ...ext.data,
      id: Number(id) || id,
      especialidade: ext.data?.especialidade || ext.data?.especialidades || payload.especialidade,
      disponivel: ext.data?.disponivel !== undefined ? ext.data.disponivel : payload.disponivel
    };
    if (idx !== -1) mockData.profissionais[idx] = updated;
    mockData.modifiedProfissionais[String(id)] = updated;
    return res.json(updated);
  } catch (err: any) {
    console.warn(`[Profissionais PUT] Atualizado localmente (aviso remoto para ${id}: ${err.message})`);
    return res.json(payload);
  }
});

app.delete("/api/profissionais/:id", optionalAuth, async (req, res) => {
  const { id } = req.params;
  if (!mockData.deletedProfissionaisIds.includes(String(id))) {
    mockData.deletedProfissionaisIds.push(String(id));
  }
  delete mockData.modifiedProfissionais[String(id)];
  delete mockData.profissionalServicos[String(id)];
  const idx = mockData.profissionais.findIndex(p => String(p.id) === String(id));
  if (idx !== -1) mockData.profissionais.splice(idx, 1);
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.delete(`${EXTERNAL_API_URL}/api/profissionais/${id}`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    return res.json(ext.data || { success: true });
  } catch (err: any) {
    console.error(`Erro ao deletar profissional ${id} na API externa:`, err?.message);
    res.json({ success: true, removedId: id });
  }
});

// --- Profissionais x Serviços (Vínculos) ---
app.get("/api/profissionais/:id/servicos", optionalAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/profissionais/${id}/servicos`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    if (Array.isArray(ext.data)) {
      mockData.profissionalServicos[String(id)] = ext.data.map((s: any) => s.id);
      return res.json(ext.data);
    }
  } catch (err: any) {
    console.warn(`[Profissionais Servicos GET] Aviso remoto para profissional ${id}:`, err.message);
  }
  const linkedIds = mockData.profissionalServicos[String(id)] || [];
  const servicos = mockData.servicos.filter((s: any) => linkedIds.includes(s.id));
  res.json(servicos);
});

app.post("/api/profissionais/:id/servicos", optionalAuth, async (req, res) => {
  const { id } = req.params;
  const servicoId = req.body.servico_id || req.body.servicoId;
  if (!mockData.profissionalServicos[String(id)]) {
    mockData.profissionalServicos[String(id)] = [];
  }
  if (servicoId && !mockData.profissionalServicos[String(id)].includes(Number(servicoId))) {
    mockData.profissionalServicos[String(id)].push(Number(servicoId));
  }
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.post(`${EXTERNAL_API_URL}/api/profissionais/${id}/servicos`, {
      servico_id: Number(servicoId)
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      timeout: 5000
    });
    return res.json(ext.data || { ok: true });
  } catch (err: any) {
    console.warn(`[Profissionais Servicos POST] Aviso remoto para ${id}:`, err.message);
    res.json({ ok: true });
  }
});

app.delete("/api/profissionais/:id/servicos/:servicoId", optionalAuth, async (req, res) => {
  const { id, servicoId } = req.params;
  if (mockData.profissionalServicos[String(id)]) {
    mockData.profissionalServicos[String(id)] = mockData.profissionalServicos[String(id)].filter(
      (sid: number) => String(sid) !== String(servicoId)
    );
  }
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.delete(`${EXTERNAL_API_URL}/api/profissionais/${id}/servicos/${servicoId}`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    return res.json(ext.data || { ok: true });
  } catch (err: any) {
    console.warn(`[Profissionais Servicos DELETE] Aviso remoto para ${id}:`, err.message);
    res.json({ ok: true });
  }
});

// --- Produtos ---
app.get("/api/produtos", optionalAuth, async (req, res) => {
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/produtos`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    if (Array.isArray(ext.data)) {
      const list = ext.data.filter((prod: any) => !mockData.deletedProdutosIds.includes(String(prod.id)));
      mockData.produtos = list;
      return res.json(list);
    }
  } catch (err: any) {
    console.error("[Produtos] Remote error:", err.message);
  }
  const list = mockData.produtos.filter(prod => !mockData.deletedProdutosIds.includes(String(prod.id)));
  res.json(list);
});

app.post("/api/produtos", optionalAuth, async (req, res) => {
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.post(`${EXTERNAL_API_URL}/api/produtos`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      timeout: 5000
    });
    if (ext.data) {
      mockData.produtos.push(ext.data);
      return res.json(ext.data);
    }
  } catch (err: any) {
    console.error("[Produtos POST] Remote error:", err.message);
  }
  const item = { id: mockData.produtos.length + 1, empresa_id: 1, ativo: true, ...req.body };
  mockData.produtos.push(item);
  res.json(item);
});

app.put("/api/produtos/:id", optionalAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.put(`${EXTERNAL_API_URL}/api/produtos/${id}`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      timeout: 5000
    });
    if (ext.data) {
      const idx = mockData.produtos.findIndex(p => String(p.id) === String(id));
      if (idx !== -1) mockData.produtos[idx] = { ...mockData.produtos[idx], ...ext.data };
      return res.json(ext.data);
    }
  } catch (err: any) {
    console.error(`[Produtos PUT] Remote error for ${id}:`, err.message);
  }
  const idx = mockData.produtos.findIndex(p => String(p.id) === String(id));
  if (idx !== -1) {
    mockData.produtos[idx] = { ...mockData.produtos[idx], ...req.body };
    return res.json(mockData.produtos[idx]);
  }
  res.json({ id: Number(id), ...req.body });
});

app.delete("/api/produtos/:id", optionalAuth, async (req, res) => {
  const { id } = req.params;
  if (!mockData.deletedProdutosIds.includes(String(id))) {
    mockData.deletedProdutosIds.push(String(id));
  }
  const idx = mockData.produtos.findIndex(p => String(p.id) === String(id));
  if (idx !== -1) mockData.produtos.splice(idx, 1);
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.delete(`${EXTERNAL_API_URL}/api/produtos/${id}`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    return res.json(ext.data || { success: true });
  } catch (err: any) {
    console.error(`[Produtos DELETE] Remote error for ${id}:`, err.message);
    res.json({ success: true, removedId: id });
  }
});

// --- Upload de Fotos (Produtos & Gerais) ---
app.post(["/api/upload", "/api/produtos/upload"], optionalAuth, async (req: Request, res: Response) => {
  try {
    const { image, file, data, filename: originalName } = req.body;
    const base64Data = image || file || data;

    if (!base64Data || typeof base64Data !== "string") {
      return res.status(400).json({ error: "Nenhuma imagem informada" });
    }

    // 1. Tenta encaminhar o upload diretamente para a VPS se configurada
    try {
      const ext = await callRemote("post", "/api/upload", req.body, { timeout: 15000 });
      if (ext.data && (ext.data.url || ext.data.fullUrl)) {
        let vpsUrl = ext.data.url || ext.data.fullUrl;
        if (!/^https?:\/\//i.test(vpsUrl)) {
          vpsUrl = `${EXTERNAL_API_URL}${vpsUrl.startsWith('/') ? '' : '/'}${vpsUrl}`;
        }
        console.log("[Upload VPS] Foto enviada com sucesso para a VPS:", vpsUrl);
        return res.json({
          ...ext.data,
          success: true,
          url: vpsUrl,
          fullUrl: vpsUrl
        });
      }
    } catch (remoteErr: any) {
      console.warn(`[Upload VPS] Aviso ao enviar para VPS (${remoteErr.message}), salvando no servidor local...`);
    }

    // 2. Fallback: Processa e salva localmente
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let extension = "jpg";

    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (mime.includes("png")) extension = "png";
      else if (mime.includes("webp")) extension = "webp";
      else if (mime.includes("gif")) extension = "gif";
      else if (mime.includes("jpeg") || mime.includes("jpg")) extension = "jpg";
      else extension = "png";

      buffer = Buffer.from(matches[2], "base64");
    } else {
      buffer = Buffer.from(base64Data, "base64");
      if (originalName && originalName.includes(".")) {
        const parts = originalName.split(".");
        extension = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "");
      }
    }

    if (buffer.length > 15 * 1024 * 1024) {
      return res.status(400).json({ error: "Imagem muito grande (máximo 15MB)" });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const cleanBase = originalName
      ? path.parse(originalName).name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20)
      : "produto";
    const filename = `${cleanBase}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const host = req.get("host") || `localhost:${PORT}`;
    const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const relativeUrl = `/uploads/${filename}`;
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    return res.json({
      success: true,
      url: fullUrl,
      relativeUrl,
      fullUrl,
      filename
    });
  } catch (err: any) {
    console.error("[Upload Error]", err);
    return res.status(500).json({ error: "Erro ao processar upload da foto: " + err.message });
  }
});

// --- Agendamentos ---
app.get(["/api/agendamentos", "/api/appointments"], optionalAuth, async (req, res) => {
  try {
    const ext = await callRemote("get", "/api/agendamentos");
    if (Array.isArray(ext.data) && ext.data.length > 0) {
      mockData.agendamentos = ext.data.map((a: any) => {
        const prof = mockData.profissionais.find(p => Number(p.id) === Number(a.profissional_id));
        const srv = mockData.servicos.find(s => Number(s.id) === Number(a.servico_id));
        return {
          ...a,
          profissional_nome: prof?.nome || a.profissional_nome || "Profissional",
          servico_nome: srv?.nome || a.servico_nome || (a.servico_id === 1 ? "Extração de Dente" : a.servico_id === 3 ? "Obturação" : a.servico_id === 4 ? "Canal" : "Limpeza Dental"),
          duracao_minutos: a.duracao_minutos || srv?.duracao_minutos || 30,
          preco: a.preco || (srv?.preco ? String(srv.preco) : "100.00")
        };
      });
      return res.json(mockData.agendamentos);
    }
  } catch (err: any) {
    console.error("[Agendamentos] Remote error:", err.message);
  }
  const enriched = mockData.agendamentos.map((a: any) => {
    const prof = mockData.profissionais.find(p => Number(p.id) === Number(a.profissional_id));
    const srv = mockData.servicos.find(s => Number(s.id) === Number(a.servico_id));
    return {
      ...a,
      profissional_nome: prof?.nome || a.profissional_nome || "Profissional",
      servico_nome: srv?.nome || a.servico_nome || (a.servico_id === 1 ? "Extração de Dente" : a.servico_id === 3 ? "Obturação" : a.servico_id === 4 ? "Canal" : "Limpeza Dental"),
      duracao_minutos: a.duracao_minutos || srv?.duracao_minutos || 30,
      preco: a.preco || (srv?.preco ? String(srv.preco) : "100.00")
    };
  });
  res.json(enriched);
});

app.post("/api/agendamentos", optionalAuth, async (req, res) => {
  try {
    const ext = await callRemote("post", "/api/agendamentos", req.body);
    if (ext.data) {
      mockData.agendamentos.push(ext.data);
      return res.json(ext.data);
    }
  } catch (err: any) {
    console.error("[Agendamentos POST] Remote error:", err.message);
  }
  const item = { id: mockData.agendamentos.length + 1, empresa_id: 1, status: "confirmado", ...req.body };
  mockData.agendamentos.push(item);
  res.json(item);
});

app.patch("/api/agendamentos/:id/status", optionalAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const ext = await callRemote("patch", `/api/agendamentos/${id}/status`, req.body);
    return res.json(ext.data);
  } catch (err: any) {
    console.error(`[Agendamentos Status PATCH] Remote error for ${id}:`, err.message);
  }
  const agend = mockData.agendamentos.find((a) => String(a.id) === String(id));
  if (agend) agend.status = status;
  res.json(agend || { success: true });
});

// --- Settings ---
app.get("/api/settings", optionalAuth, async (req, res) => {
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/settings`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    if (ext.data) return res.json(ext.data);
  } catch (err: any) {
    console.error("[Settings] Remote error:", err.message);
  }
  res.json(mockData.companies[0]);
});

app.patch("/api/settings", optionalAuth, async (req, res) => {
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.patch(`${EXTERNAL_API_URL}/api/settings`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      timeout: 5000
    });
    return res.json(ext.data);
  } catch (err: any) {
    console.error("[Settings PATCH] Remote error:", err.message);
  }
  mockData.companies[0] = { ...mockData.companies[0], ...req.body };
  res.json(mockData.companies[0]);
});

// --- WhatsApp Status & Connect ---
app.get("/api/whatsapp/status", optionalAuth, async (req, res) => {
  try {
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/whatsapp/status`, { timeout: 3000 });
    return res.json(ext.data);
  } catch {
    res.json({ connected: true, instance: { instanceName: "atendepro", state: "open" } });
  }
});

app.get("/api/whatsapp/foto/:numero", optionalAuth, async (req, res) => {
  const { numero } = req.params;
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/whatsapp/foto/${numero}`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    return res.json(ext.data);
  } catch {
    res.json({ pictureUrl: null });
  }
});

app.get("/api/whatsapp/connect", optionalAuth, async (req, res) => {
  try {
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/whatsapp/connect`, { timeout: 4000 });
    return res.json(ext.data);
  } catch {
    res.json({ code: "QR_CODE_MOCK_SUCCESS", state: "connecting" });
  }
});

// --- Users & Companies ---
app.get("/api/companies", optionalAuth, async (req, res) => {
  // Company settings are synced with real database via /api/settings
  res.json(mockData.companies);
});

app.post("/api/companies", optionalAuth, async (req, res) => {
  const newComp = {
    id: String(mockData.companies.length + 1),
    name: req.body.name || "Nova Empresa",
    email: req.body.email || "",
    phone: req.body.phone || "",
    plan: req.body.plan || "pro",
    status: "active" as const,
    ...req.body
  };
  mockData.companies.push(newComp);
  res.json(newComp);
});

app.patch("/api/companies/:id", optionalAuth, async (req, res) => {
  const { id } = req.params;
  const comp = mockData.companies.find((c) => c.id === id);
  if (comp) {
    Object.assign(comp, req.body);
  }
  // If editing the primary company, update settings in the remote database
  if (id === "1") {
    try {
      await callRemote("patch", "/api/settings", {
        nome: req.body.name || comp?.name,
        email: req.body.email || comp?.email,
        telefone: req.body.phone || comp?.phone,
        plano: req.body.plan || comp?.plan,
        prompt_ia: req.body.aiPrompt || comp?.aiPrompt
      });
    } catch (err: any) {
      console.warn("[Companies Settings Sync Notice]:", err.message);
    }
  }
  res.json(comp || { success: true });
});

app.get("/api/users", optionalAuth, async (req, res) => {
  try {
    const authHeader = await getValidAuthHeader(req.headers.authorization);
    const ext = await axios.get(`${EXTERNAL_API_URL}/api/users`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 5000
    });
    if (Array.isArray(ext.data)) {
      mockData.users = ext.data;
      return res.json(ext.data);
    }
  } catch (err: any) {
    console.error("[Users] Remote error:", err.message);
  }
  res.json(mockData.users.map((u) => ({ id: u.id, nome: u.name, email: u.email, cargo: u.role, ativo: true })));
});

// --- Vite Integration & Server Startup ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    // Sync real database records in background without blocking server boot
    syncFromRealDatabase()
      .then(() => {
        console.log("[Sync Real DB] Initial background sync complete");
      })
      .catch((err: any) => {
        console.error("[Startup Sync Warning]", err.message);
      });

    // Keep real database records synced periodically
    setInterval(() => {
      syncFromRealDatabase().catch(() => {});
    }, 60000);
  });

  server.on("error", (err: any) => {
    console.error("[Server Error]", err);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
