# Documentação Técnica: AtendeProMax

## 1. Visão Geral
O **AtendeProMax** é uma plataforma SaaS (Software as a Service) moderna projetada para automatizar e gerenciar atendimentos via WhatsApp utilizando Inteligência Artificial. O sistema é focado em nichos de serviços como clínicas de estética, salões de beleza e consultórios, priorizando a conversão de leads e o agendamento automático.

---

## 2. Stack Tecnológica
- **Frontend**: React 19, Tailwind CSS 4, Lucide React (ícones), Recharts (gráficos), Framer Motion (animações).
- **Backend**: Node.js com Express e TypeScript.
- **Banco de Dados**: PostgreSQL (Script SQL fornecido) com Prisma ORM.
- **Autenticação**: JSON Web Tokens (JWT) com criptografia BCrypt para senhas.
- **Integração**: Pronto para Webhooks (n8n, Zapier, etc).

---

## 3. Arquitetura do Sistema

### 3.1. Multi-tenancy (Multi-empresa)
O sistema foi construído com suporte nativo a múltiplas empresas. Cada registro no banco de dados (contatos, conversas, agendamentos) está vinculado a um `company_id`, garantindo o isolamento total dos dados entre diferentes clientes do SaaS.

### 3.2. Estrutura de Dados (Prisma/SQL)
- **Companies**: Cadastro das empresas clientes.
- **Users**: Administradores de cada empresa.
- **Contacts (Leads)**: Clientes finais capturados via WhatsApp.
- **Chats**: Sessões de conversa vinculadas a um contato, com controle de status (aberto/fechado) e temperatura (quente/morno/frio).
- **ChatMessages**: Histórico completo de mensagens (Cliente, Bot, Humano).
- **Appointments**: Agendamentos realizados, com data, hora e status.

---

## 4. Funcionalidades Implementadas

### 4.1. Dashboard Inteligente
- **Métricas em Tempo Real**: Cards com total de conversas, leads e agendamentos.
- **Gráfico de Volume**: Visualização de atendimentos diários via Recharts.
- **Insights de IA**: Painel lateral que destaca horários de pico, procedimentos mais buscados e alertas de tempo de resposta.
- **Hero Section**: Status da "Recepcionista IA" e potencial financeiro de vendas.

### 4.2. Central de Conversas
- **Interface Estilo WhatsApp**: Lista de contatos à esquerda e chat detalhado à direita.
- **Resumo de IA**: Banner superior que resume automaticamente a intenção do cliente (ex: "Quer agendar limpeza de pele").
- **Ações Rápidas**: Botões para agendar ou sugerir resposta diretamente do resumo da IA.
- **Identificação Visual**: Diferenciação clara entre mensagens do cliente, do bot e de atendentes humanos.

### 4.3. Gestão de Leads
- **Tabela de Contatos**: Listagem completa com busca por nome ou telefone.
- **Qualificação**: Visualização da "temperatura" do lead baseada na interação.
- **Filtros e Exportação**: Preparado para filtros avançados e exportação de dados para CSV.

### 4.4. Agenda de Atendimentos
- **Visualização de Compromissos**: Cards detalhados com informações do cliente, data e hora.
- **Status de Agendamento**: Controle visual de pendentes, confirmados e cancelados.
- **Automação**: Interface preparada para confirmação manual ou automática via IA.

---

## 5. Integrações

### 5.1. Webhook n8n (Entrada de Dados)
O sistema possui um endpoint dedicado para receber mensagens de plataformas de automação como o n8n:
- **Endpoint**: `POST /api/webhook/message`
- **Payload Esperado**:
  ```json
  {
    "name": "João Silva",
    "phone": "21999999999",
    "message": "Gostaria de saber o preço da massagem"
  }
  ```
- **Lógica**: O backend identifica o contato pelo telefone (ou cria um novo), inicia um chat se não houver um aberto e registra a mensagem no histórico.

### 5.2. Inteligência Artificial (Gemini)
- A estrutura está preparada para utilizar o SDK `@google/genai`.
- Variável de ambiente `GEMINI_API_KEY` configurada no `.env.example`.
- A UI já exibe componentes de "Resumo de IA" e "Insights" que consomem dados processados.

---

## 6. Instruções de Uso

### 6.1. Credenciais de Acesso (Demo)
- **URL**: [App URL do Ambiente]
- **Usuário**: `admin@atendepromax.com`
- **Senha**: `admin123`

### 6.2. Comandos de Desenvolvimento
- **Iniciar Servidor**: `npm run dev` (Inicia o backend Express + Vite Middleware).
- **Build Produção**: `npm run build`.
- **Lint/Check**: `npm run lint`.

---

## 7. Próximos Passos Recomendados
1. **Conexão Real com Banco**: Substituir o `mockData` no `server.ts` pelas chamadas reais do Prisma Client.
2. **Integração Gemini**: Implementar a lógica de sumarização e classificação de leads no backend usando o SDK da Google.
3. **Notificações Push**: Adicionar suporte a WebSockets para atualizações de mensagens em tempo real sem refresh.
4. **Configurações de IA**: Permitir que cada empresa personalize o "tom de voz" e os serviços oferecidos pela sua recepcionista IA.
