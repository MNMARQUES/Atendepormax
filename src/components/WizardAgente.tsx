import React, { useState } from 'react';
import {
  Bot, Zap, Phone, Headphones, TrendingUp, ChevronRight,
  ChevronLeft, Check, Upload, Plus, Trash2, Loader2,
  Sparkles, Brain, Link, Wifi, X, AlertCircle
} from 'lucide-react';
import { atendenteService } from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface WizardData {
  // Identidade
  nome_agente: string;
  empresa: string;
  descricao: string;
  tom: 'profissional' | 'amigavel' | 'formal' | 'descontraido';

  // Função
  funcao: 'atendimento' | 'vendedor' | 'sdr' | 'suporte';

  // Nicho
  nicho: string;

  // Prompt
  personalidade: string;
  regras: string;
  formas_pagamento: string;
  horario_abertura: string;
  horario_fechamento: string;
  dias_funcionamento: string;

  // Conhecimento
  faqs: { pergunta: string; resposta: string }[];

  // Status
  saved: boolean;
}

const STEPS = [
  { id: 'identidade', label: 'Identidade', icon: Bot },
  { id: 'funcao', label: 'Função', icon: Zap },
  { id: 'prompt', label: 'Personalidade', icon: Brain },
  { id: 'conhecimento', label: 'Conhecimento', icon: Sparkles },
  { id: 'conexao', label: 'Conexão', icon: Wifi },
];

const FUNCOES = [
  {
    key: 'atendimento',
    label: 'Atendimento',
    icon: '🎧',
    desc: 'Responde dúvidas, agenda e orienta clientes com excelência.',
  },
  {
    key: 'vendedor',
    label: 'Vendedor',
    icon: '💰',
    desc: 'Foca em fechar negócios e converter leads em clientes.',
  },
  {
    key: 'sdr',
    label: 'SDR',
    icon: '🎯',
    desc: 'Qualifica leads e agenda reuniões para o time de vendas.',
  },
  {
    key: 'suporte',
    label: 'Suporte',
    icon: '🛡️',
    desc: 'Resolve problemas, esclarece dúvidas e fideliza clientes.',
  },
];

const NICHOS = [
  { key: 'barbearia', emoji: '✂️', label: 'Barbearia' },
  { key: 'salao', emoji: '💇', label: 'Salão' },
  { key: 'dentista', emoji: '🦷', label: 'Dentista' },
  { key: 'nutricionista', emoji: '🥗', label: 'Nutricionista' },
  { key: 'psicologo', emoji: '🧠', label: 'Psicólogo' },
  { key: 'personal', emoji: '🏋️', label: 'Personal' },
  { key: 'estetica', emoji: '💆', label: 'Estética' },
  { key: 'clinica', emoji: '🏥', label: 'Clínica' },
  { key: 'veterinaria', emoji: '🐾', label: 'Veterinária' },
  { key: 'spa', emoji: '🧖', label: 'Spa' },
  { key: 'infoproduto', emoji: '📱', label: 'Infoproduto' },
  { key: 'ecommerce', emoji: '🛒', label: 'E-commerce' },
  { key: 'outro', emoji: '🏢', label: 'Outro' },
];

const TONS = [
  { key: 'profissional', label: 'Profissional', desc: 'Formal e confiável' },
  { key: 'amigavel', label: 'Amigável', desc: 'Caloroso e próximo' },
  { key: 'formal', label: 'Formal', desc: 'Sério e técnico' },
  { key: 'descontraido', label: 'Descontraído', desc: 'Leve e informal' },
];

// ── Styles ──────────────────────────────────────────────────────────────────
const s = {
  page: 'min-h-screen bg-[#0a0a0f] text-[#f0f0f8] font-[Space_Grotesk,sans-serif]',
  card: 'bg-[#111118] border border-[#1f1f2e] rounded-[20px]',
  input: 'w-full bg-[#18181f] border border-[#1f1f2e] rounded-[12px] px-4 py-3 text-[#f0f0f8] text-sm outline-none focus:border-[#a8ff3e] focus:ring-1 focus:ring-[#a8ff3e]/20 transition-all placeholder:text-[#3a3a5a]',
  label: 'block text-[10px] font-bold text-[#7a7a9a] uppercase tracking-widest mb-2',
  btnPrimary: 'flex items-center gap-2 px-6 py-3 bg-[#a8ff3e] text-[#0a0a0f] rounded-[12px] font-bold text-sm hover:bg-[#bfff5a] transition-all',
  btnSecondary: 'flex items-center gap-2 px-6 py-3 bg-[#18181f] border border-[#1f1f2e] text-[#7a7a9a] rounded-[12px] font-bold text-sm hover:border-[#a8ff3e]/40 hover:text-[#f0f0f8] transition-all',
  accent: '#a8ff3e',
};

// ── Component ──────────────────────────────────────────────────────────────
const WizardAgente: React.FC<{ onComplete?: () => void; onCancel?: () => void }> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<WizardData>({
    nome_agente: '',
    empresa: '',
    descricao: '',
    tom: 'amigavel',
    funcao: 'atendimento',
    nicho: '',
    personalidade: '',
    regras: '',
    formas_pagamento: 'Pix, Cartão de Crédito, Dinheiro',
    horario_abertura: '08:00',
    horario_fechamento: '18:00',
    dias_funcionamento: 'Segunda a Sexta',
    faqs: [],
    saved: false,
  });

  const up = (patch: Partial<WizardData>) => setData(d => ({ ...d, ...patch }));

  const canNext = () => {
    if (step === 0) return data.nome_agente.trim() && data.empresa.trim();
    if (step === 1) return !!data.funcao && !!data.nicho;
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const agentPayload = {
        nome_atendente: data.nome_agente,
        nome_agente: data.nome_agente,
        empresa_nome: data.empresa,
        funcao: data.funcao,
        tom: data.tom,
        nicho: data.nicho,
        descricao: data.descricao,
        personalidade: `${data.personalidade || 'Educado e prestativo'}. Tom: ${data.tom}.`,
        horario_abertura: data.horario_abertura,
        horario_fechamento: data.horario_fechamento,
        dias_funcionamento: data.dias_funcionamento,
        formas_pagamento: data.formas_pagamento,
        faqs: data.faqs,
        regras_customizadas: [
          data.regras,
          data.funcao === 'vendedor' ? 'Foque em converter o cliente, apresente benefícios e crie urgência quando apropriado.' : '',
          data.funcao === 'sdr' ? 'Qualifique o lead fazendo perguntas estratégicas antes de oferecer qualquer solução.' : '',
          data.funcao === 'suporte' ? 'Priorize resolver o problema do cliente antes de qualquer outra ação.' : '',
        ].filter(Boolean).join('\n'),
        ativo: true,
      };

      await atendenteService.createAtendente(agentPayload);
      await atendenteService.saveConfig(agentPayload);
      up({ saved: true });
      setStep(4);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao salvar configuração.');
    } finally {
      setSaving(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className={s.page}>
      {/* Header */}
      <div className="border-b border-[#1f1f2e] bg-[#111118]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#a8ff3e] rounded-lg flex items-center justify-center">
              <Bot size={18} className="text-[#0a0a0f]" />
            </div>
            <span className="font-bold text-[#f0f0f8]">AtendeProMax</span>
            <span className="text-[#3a3a5a]">/</span>
            <span className="text-[#7a7a9a] text-sm">Criar Agente</span>
          </div>
          <button onClick={onCancel} className="p-2 text-[#3a3a5a] hover:text-[#f0f0f8] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-[2px] bg-[#1f1f2e]">
          <div
            className="h-full bg-[#a8ff3e] transition-all duration-500"
            style={{ width: `${progress}%`, boxShadow: '0 0 12px rgba(168,255,62,0.5)' }}
          />
        </div>
      </div>

      {/* Steps nav */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  i === step
                    ? 'bg-[#a8ff3e]/10 text-[#a8ff3e] border border-[#a8ff3e]/30'
                    : i < step
                      ? 'text-[#a8ff3e]/60 cursor-pointer hover:text-[#a8ff3e]'
                      : 'text-[#3a3a5a] cursor-default'
                }`}
              >
                {i < step ? <Check size={12} /> : <s.icon size={12} />}
                <span className="hidden sm:block">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-[1px] ${i < step ? 'bg-[#a8ff3e]/30' : 'bg-[#1f1f2e]'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 0: IDENTIDADE ── */}
        {step === 0 && (
          <div className="max-w-xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Identidade Principal</h1>
              <p className="text-[#7a7a9a]">Defina quem é seu agente e como ele se apresenta ao mundo.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className={s.label}>Nome do Agente *</label>
                <input
                  type="text"
                  value={data.nome_agente}
                  onChange={e => up({ nome_agente: e.target.value })}
                  placeholder="Ex: Sofia, Maria, Assistente Virtual"
                  className={s.input}
                  autoFocus
                />
              </div>

              <div>
                <label className={s.label}>Empresa / Contexto *</label>
                <input
                  type="text"
                  value={data.empresa}
                  onChange={e => up({ empresa: e.target.value })}
                  placeholder="Ex: Clínica Bella, Barbearia do João"
                  className={s.input}
                />
              </div>

              <div>
                <label className={s.label}>Descrição (Opcional)</label>
                <textarea
                  value={data.descricao}
                  onChange={e => up({ descricao: e.target.value })}
                  placeholder="Descreva brevemente o objetivo principal do agente..."
                  rows={3}
                  className={`${s.input} resize-none`}
                />
              </div>

              <div>
                <label className={s.label}>Tom de Voz</label>
                <div className="grid grid-cols-2 gap-3">
                  {TONS.map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => up({ tom: t.key as any })}
                      className={`p-4 rounded-[12px] text-left border-2 transition-all ${
                        data.tom === t.key
                          ? 'border-[#a8ff3e] bg-[#a8ff3e]/5'
                          : 'border-[#1f1f2e] bg-[#18181f] hover:border-[#2a2a3d]'
                      }`}
                    >
                      <p className={`font-bold text-sm ${data.tom === t.key ? 'text-[#a8ff3e]' : 'text-[#f0f0f8]'}`}>{t.label}</p>
                      <p className="text-[#7a7a9a] text-xs mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: FUNÇÃO + NICHO ── */}
        {step === 1 && (
          <div className="max-w-2xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Definir Função</h1>
              <p className="text-[#7a7a9a]">Escolha o papel operacional do agente e o segmento de atuação.</p>
            </div>

            <div className="mb-8">
              <label className={s.label}>Função Principal</label>
              <div className="grid grid-cols-2 gap-4">
                {FUNCOES.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => up({ funcao: f.key as any })}
                    className={`p-5 rounded-[16px] text-left border-2 transition-all group ${
                      data.funcao === f.key
                        ? 'border-[#a8ff3e] bg-[#a8ff3e]/5'
                        : 'border-[#1f1f2e] bg-[#18181f] hover:border-[#2a2a3d]'
                    }`}
                  >
                    <span className="text-2xl mb-3 block">{f.icon}</span>
                    <p className={`font-bold text-sm mb-1 ${data.funcao === f.key ? 'text-[#a8ff3e]' : 'text-[#f0f0f8]'}`}>{f.label}</p>
                    <p className="text-[#7a7a9a] text-xs leading-relaxed">{f.desc}</p>
                    {data.funcao === f.key && (
                      <div className="mt-3 flex items-center gap-1 text-[#a8ff3e] text-[10px] font-bold uppercase tracking-widest">
                        <Check size={10} /> Selecionado
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={s.label}>Nicho / Segmento *</label>
              <div className="grid grid-cols-4 gap-2">
                {NICHOS.map(n => (
                  <button
                    key={n.key}
                    type="button"
                    onClick={() => up({ nicho: n.key })}
                    className={`p-3 rounded-[12px] text-center border-2 transition-all ${
                      data.nicho === n.key
                        ? 'border-[#a8ff3e] bg-[#a8ff3e]/5'
                        : 'border-[#1f1f2e] bg-[#18181f] hover:border-[#2a2a3d]'
                    }`}
                  >
                    <span className="text-xl block mb-1">{n.emoji}</span>
                    <p className={`text-[10px] font-bold ${data.nicho === n.key ? 'text-[#a8ff3e]' : 'text-[#7a7a9a]'}`}>{n.label}</p>
                  </button>
                ))}
              </div>
              {data.nicho === 'outro' && (
                <input
                  type="text"
                  placeholder="Descreva seu segmento..."
                  className={`${s.input} mt-3`}
                  onChange={e => up({ nicho: e.target.value })}
                />
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: PERSONALIDADE / PROMPT ── */}
        {step === 2 && (
          <div className="max-w-xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Personalidade & Regras</h1>
              <p className="text-[#7a7a9a]">Configure como o agente se comporta e o que pode ou não fazer.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className={s.label}>Personalidade do Agente</label>
                <textarea
                  value={data.personalidade}
                  onChange={e => up({ personalidade: e.target.value })}
                  placeholder="Ex: Educada, prestativa, objetiva e sempre positiva. Usa linguagem simples e acessível."
                  rows={4}
                  className={`${s.input} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={s.label}>Abertura</label>
                  <input type="time" value={data.horario_abertura} onChange={e => up({ horario_abertura: e.target.value })} className={s.input} />
                </div>
                <div>
                  <label className={s.label}>Fechamento</label>
                  <input type="time" value={data.horario_fechamento} onChange={e => up({ horario_fechamento: e.target.value })} className={s.input} />
                </div>
              </div>

              <div>
                <label className={s.label}>Dias de Funcionamento</label>
                <input
                  type="text"
                  value={data.dias_funcionamento}
                  onChange={e => up({ dias_funcionamento: e.target.value })}
                  placeholder="Ex: Segunda a Sexta"
                  className={s.input}
                />
              </div>

              <div>
                <label className={s.label}>Formas de Pagamento</label>
                <input
                  type="text"
                  value={data.formas_pagamento}
                  onChange={e => up({ formas_pagamento: e.target.value })}
                  placeholder="Ex: Pix, Cartão de Crédito, Dinheiro"
                  className={s.input}
                />
              </div>

              <div>
                <label className={s.label}>Regras Especiais (Opcional)</label>
                <textarea
                  value={data.regras}
                  onChange={e => up({ regras: e.target.value })}
                  placeholder="Ex: Nunca falar sobre concorrentes. Oferecer desconto apenas quando autorizado..."
                  rows={3}
                  className={`${s.input} resize-none`}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: CONHECIMENTO / FAQ ── */}
        {step === 3 && (
          <div className="max-w-2xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Base de Conhecimento</h1>
              <p className="text-[#7a7a9a]">Adicione perguntas e respostas para o agente responder com precisão.</p>
            </div>

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-1">
              {data.faqs.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-[#1f1f2e] rounded-[16px]">
                  <Brain size={32} className="mx-auto mb-3 text-[#3a3a5a]" />
                  <p className="text-[#7a7a9a] text-sm font-medium">Nenhuma FAQ adicionada.</p>
                  <p className="text-[#3a3a5a] text-xs mt-1">O agente usará apenas as informações dos serviços cadastrados.</p>
                </div>
              )}
              {data.faqs.map((faq, i) => (
                <div key={i} className="p-4 bg-[#18181f] rounded-[16px] border border-[#1f1f2e] space-y-3 group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#a8ff3e] uppercase tracking-widest">FAQ #{i + 1}</span>
                    <button
                      onClick={() => up({ faqs: data.faqs.filter((_, j) => j !== i) })}
                      className="p-1 text-[#3a3a5a] hover:text-[#ff4d6d] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={faq.pergunta}
                    onChange={e => {
                      const faqs = [...data.faqs];
                      faqs[i] = { ...faqs[i], pergunta: e.target.value };
                      up({ faqs });
                    }}
                    placeholder="Pergunta"
                    className={s.input}
                  />
                  <textarea
                    value={faq.resposta}
                    onChange={e => {
                      const faqs = [...data.faqs];
                      faqs[i] = { ...faqs[i], resposta: e.target.value };
                      up({ faqs });
                    }}
                    placeholder="Resposta"
                    rows={2}
                    className={`${s.input} resize-none`}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => up({ faqs: [...data.faqs, { pergunta: '', resposta: '' }] })}
              className="w-full py-3 border-2 border-dashed border-[#1f1f2e] rounded-[16px] text-[#7a7a9a] text-sm font-bold hover:border-[#a8ff3e]/40 hover:text-[#a8ff3e] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Adicionar FAQ
            </button>

            <div className="mt-6 p-4 bg-[#a8ff3e]/5 border border-[#a8ff3e]/20 rounded-[16px] flex gap-3">
              <AlertCircle size={16} className="text-[#a8ff3e] flex-shrink-0 mt-0.5" />
              <p className="text-[#a8ff3e]/80 text-xs leading-relaxed">
                FAQs são opcionais. O agente já conhece os serviços, profissionais e regras configuradas. Use FAQs para informações específicas como políticas, dúvidas frequentes ou instruções personalizadas.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 4: CONEXÃO / CONCLUSÃO ── */}
        {step === 4 && (
          <div className="max-w-xl mx-auto text-center">
            {!data.saved ? (
              <>
                <div className="mb-8">
                  <div className="w-20 h-20 bg-[#a8ff3e]/10 border border-[#a8ff3e]/20 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                    <Wifi size={36} className="text-[#a8ff3e]" />
                  </div>
                  <h1 className="text-3xl font-bold mb-2">Pronto para Ativar</h1>
                  <p className="text-[#7a7a9a]">Revise as configurações e ative seu agente.</p>
                </div>

                {/* Resumo */}
                <div className="bg-[#111118] border border-[#1f1f2e] rounded-[20px] p-6 text-left space-y-4 mb-8">
                  <div className="flex items-center justify-between pb-4 border-b border-[#1f1f2e]">
                    <span className="text-[#7a7a9a] text-sm">Agente</span>
                    <span className="font-bold text-[#f0f0f8]">{data.nome_agente}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7a7a9a] text-sm">Empresa</span>
                    <span className="font-bold text-[#f0f0f8]">{data.empresa}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7a7a9a] text-sm">Função</span>
                    <span className="font-bold text-[#a8ff3e] capitalize">{data.funcao}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7a7a9a] text-sm">Nicho</span>
                    <span className="font-bold text-[#f0f0f8] capitalize">{data.nicho}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7a7a9a] text-sm">Tom</span>
                    <span className="font-bold text-[#f0f0f8] capitalize">{data.tom}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7a7a9a] text-sm">Horário</span>
                    <span className="font-bold text-[#f0f0f8]">{data.horario_abertura} – {data.horario_fechamento}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7a7a9a] text-sm">FAQs</span>
                    <span className="font-bold text-[#f0f0f8]">{data.faqs.length} cadastradas</span>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-4 bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 rounded-[12px] text-[#ff4d6d] text-sm font-medium">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-4 bg-[#a8ff3e] text-[#0a0a0f] rounded-[16px] font-bold text-sm hover:bg-[#bfff5a] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ boxShadow: '0 0 24px rgba(168,255,62,0.3)' }}
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                  {saving ? 'Ativando agente...' : 'Ativar Agente'}
                </button>
              </>
            ) : (
              <div className="py-8">
                <div className="w-24 h-24 bg-[#a8ff3e]/10 border-2 border-[#a8ff3e]/30 rounded-full flex items-center justify-center mx-auto mb-8"
                  style={{ boxShadow: '0 0 48px rgba(168,255,62,0.2)' }}>
                  <Check size={40} className="text-[#a8ff3e]" />
                </div>
                <h1 className="text-4xl font-bold mb-3">Conectado!</h1>
                <p className="text-[#7a7a9a] mb-2">Seu agente <span className="text-[#a8ff3e] font-bold">{data.nome_agente}</span> está ativo.</p>
                <p className="text-[#3a3a5a] text-sm mb-10">Conecte ao WhatsApp nas Configurações para começar a receber mensagens.</p>

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <div className="p-4 bg-[#111118] border border-[#1f1f2e] rounded-[16px]">
                    <div className="w-2 h-2 bg-[#a8ff3e] rounded-full animate-pulse mb-3" />
                    <p className="text-xs text-[#7a7a9a] font-medium">Status</p>
                    <p className="text-[#a8ff3e] font-bold text-sm mt-0.5">Ativo</p>
                  </div>
                  <div className="p-4 bg-[#111118] border border-[#1f1f2e] rounded-[16px]">
                    <Bot size={16} className="text-[#7a7a9a] mb-3" />
                    <p className="text-xs text-[#7a7a9a] font-medium">Agente</p>
                    <p className="text-[#f0f0f8] font-bold text-sm mt-0.5 truncate">{data.nome_agente}</p>
                  </div>
                </div>

                <button onClick={onComplete} className={`${s.btnPrimary} mx-auto mt-8`}>
                  Ir para o Dashboard <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ── */}
        {!(step === 4 && data.saved) && (
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-[#1f1f2e]">
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : onCancel?.()}
              className={s.btnSecondary}
            >
              <ChevronLeft size={16} />
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </button>

            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all ${
                    i === step ? 'w-6 h-2 bg-[#a8ff3e]' : i < step ? 'w-2 h-2 bg-[#a8ff3e]/40' : 'w-2 h-2 bg-[#1f1f2e]'
                  }`}
                />
              ))}
            </div>

            {step < 3 ? (
              <button
                onClick={() => canNext() && setStep(s => s + 1)}
                disabled={!canNext()}
                className={`${s.btnPrimary} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Próximo <ChevronRight size={16} />
              </button>
            ) : step === 3 ? (
              <button onClick={() => setStep(4)} className={s.btnPrimary}>
                Revisar <ChevronRight size={16} />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default WizardAgente;
