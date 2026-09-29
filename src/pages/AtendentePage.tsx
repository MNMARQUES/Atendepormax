import React, { useState, useEffect } from 'react';
import {
  Bot, Plus, Settings, MessageSquare, Trash2, ToggleLeft, ToggleRight,
  Clock, Edit3, Eye, Zap, AlertCircle, CheckCircle, Save, X, Send,
  Briefcase, Star, BookOpen, Info
} from 'lucide-react';
import { atendenteService } from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Agente {
  id: number;
  nome: string;
  funcao: string;
  nicho: string;
  personalidade: string;
  tom: string;
  regras_customizadas: string;
  descricao: string;
  ativo: boolean;
}

interface EmpresaConfig {
  horario_abertura: string;
  horario_fechamento: string;
  dias_funcionamento: string;
  formas_pagamento: string;
}

const FUNCAO_OPTIONS = [
  { value: 'atendimento',  label: 'Atendimento Geral',    icon: '💬' },
  { value: 'agendamento',  label: 'Agendamento',           icon: '📅' },
  { value: 'vendas',       label: 'Vendas',                icon: '💰' },
  { value: 'suporte',      label: 'Suporte Técnico',       icon: '🔧' },
  { value: 'financeiro',   label: 'Financeiro / Cobrança', icon: '💳' },
  { value: 'pos_venda',    label: 'Pós-Venda',             icon: '⭐' },
];

const TOM_OPTIONS = [
  { value: 'formal',      label: 'Formal' },
  { value: 'semiformal',  label: 'Semiformal' },
  { value: 'casual',      label: 'Casual' },
  { value: 'amigavel',    label: 'Amigável' },
  { value: 'tecnico',     label: 'Técnico' },
];

const PERSONALIDADE_OPTIONS = [
  { value: 'prestativo',   label: 'Prestativo e paciente' },
  { value: 'objetivo',     label: 'Objetivo e direto' },
  { value: 'empatico',     label: 'Empático e acolhedor' },
  { value: 'animado',      label: 'Animado e entusiasmado' },
  { value: 'profissional', label: 'Profissional e sério' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AtendentePage() {
  const [activeTab, setActiveTab]         = useState(0);
  const [agentes, setAgentes]             = useState<Agente[]>([]);
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>({ horario_abertura: '', horario_fechamento: '', dias_funcionamento: '', formas_pagamento: '' });
  const [selectedAgente, setSelectedAgente] = useState<Agente | null>(null);
  const [config, setConfig]               = useState<Agente | null>(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [saveMsg, setSaveMsg]             = useState('');
  const [promptTexto, setPromptTexto]     = useState('');

  // Delete & Notification State
  const [agenteToDelete, setAgenteToDelete] = useState<Agente | null>(null);
  const [isDeleting, setIsDeleting]         = useState(false);
  const [toast, setToast]                   = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // Modals
  const [showQuickAdd,   setShowQuickAdd]   = useState(false);
  const [showTestChat,   setShowTestChat]   = useState(false);
  const [showViewPrompt, setShowViewPrompt] = useState(false);

  // Quick Add form
  const [quickForm, setQuickForm] = useState({
    nome: '', funcao: 'atendimento', tom: 'semiformal',
    personalidade: 'prestativo', nicho: '', descricao: '', regras_customizadas: '',
  });

  // Test chat
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatInput,    setChatInput]    = useState('');
  const [chatLoading,  setChatLoading]  = useState(false);

  // ─── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [agentesRes, empresaRes] = await Promise.all([
        atendenteService.getAtendentes().catch(() => []),
        atendenteService.getEmpresaConfig().catch(() => ({})),
      ]);
      const lista: Agente[] = Array.isArray(agentesRes) ? agentesRes : [];
      setAgentes(lista);
      setEmpresaConfig({
        horario_abertura:  empresaRes.horario_abertura  || '',
        horario_fechamento: empresaRes.horario_fechamento || '',
        dias_funcionamento: empresaRes.dias_funcionamento || '',
        formas_pagamento:  empresaRes.formas_pagamento  || '',
      });
      if (lista.length > 0 && !selectedAgente) {
        setSelectedAgente(lista[0]);
        setConfig(lista[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar agentes:', err);
    } finally {
      setLoading(false);
    }
  }

  function selectAgente(ag: Agente) {
    setSelectedAgente(ag);
    setConfig({ ...ag });
    setActiveTab(1);
  }

  // ─── Save config ──────────────────────────────────────────────────────────
  async function handleSaveConfig() {
    if (!config?.id) {
      showToast('Nenhum atendente selecionado.', false);
      return;
    }
    setSaving(true);
    setSaveMsg('');
    try {
      const fields = {
        nome: config.nome?.trim() || 'Atendente',
        funcao: config.funcao || 'atendimento',
        tom: config.tom || 'amigavel',
        personalidade: config.personalidade || 'prestativo',
        nicho: config.nicho || '',
        descricao: config.descricao || '',
        regras_customizadas: config.regras_customizadas || '',
        ativo: config.ativo !== undefined ? config.ativo : true,
      };
      const res = await atendenteService.updateAtendente(config.id, fields);
      const merged = { ...config, ...fields, ...(res || {}) };

      setAgentes(prev => prev.map(a => String(a.id) === String(config.id) ? merged : a));
      setSelectedAgente(merged);
      setConfig(merged);
      setSaveMsg('Alterações salvas com sucesso!');
      showToast('Atendente salvo com sucesso!', true);
    } catch (err: any) {
      console.error('Erro ao salvar atendente:', err);
      setSaveMsg('Erro ao salvar alterações.');
      showToast('Erro ao salvar alterações do atendente.', false);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3500);
    }
  }

  // ─── Toggle / Delete ──────────────────────────────────────────────────────
  async function handleToggle(ag: Agente) {
    try {
      const nextStatus = !ag.ativo;
      await atendenteService.toggleAtendenteStatus(ag.id, nextStatus);
      setAgentes(prev => prev.map(a => String(a.id) === String(ag.id) ? { ...a, ativo: nextStatus } : a));
      if (selectedAgente && String(selectedAgente.id) === String(ag.id)) {
        setSelectedAgente(p => p ? { ...p, ativo: nextStatus } : p);
      }
      if (config && String(config.id) === String(ag.id)) {
        setConfig(c => c ? { ...c, ativo: nextStatus } : c);
      }
      showToast(`Atendente ${nextStatus ? 'ativado' : 'desativado'} com sucesso.`, true);
    } catch { 
      console.error('Erro ao alternar status');
      showToast('Erro ao alternar status.', false);
    }
  }

  function handleDelete(ag: Agente) {
    setAgenteToDelete(ag);
  }

  async function handleConfirmDelete() {
    if (!agenteToDelete) return;
    setIsDeleting(true);
    const target = agenteToDelete;
    try {
      await atendenteService.deleteAtendente(target.id);
      setAgentes(prev => prev.filter(a => a.id !== target.id));
      if (selectedAgente?.id === target.id) {
        const remaining = agentes.filter(a => a.id !== target.id);
        if (remaining.length > 0) {
          setSelectedAgente(remaining[0]);
          setConfig({ ...remaining[0] });
        } else {
          setSelectedAgente(null);
          setConfig(null);
          setActiveTab(0);
        }
      }
      showToast(`Atendente "${target.nome}" excluído com sucesso!`, true);
      setAgenteToDelete(null);
    } catch (err) {
      console.error('Erro ao remover atendente:', err);
      // Fallback local removal so UI remains responsive
      setAgentes(prev => prev.filter(a => a.id !== target.id));
      if (selectedAgente?.id === target.id) {
        const remaining = agentes.filter(a => a.id !== target.id);
        if (remaining.length > 0) {
          setSelectedAgente(remaining[0]);
          setConfig({ ...remaining[0] });
        } else {
          setSelectedAgente(null);
          setConfig(null);
          setActiveTab(0);
        }
      }
      showToast(`Atendente "${target.nome}" excluído.`, true);
      setAgenteToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  // ─── Quick Add ────────────────────────────────────────────────────────────
  async function handleQuickAdd() {
    if (!quickForm.nome.trim()) return;
    try {
      const novo = await atendenteService.createAtendente({ ...quickForm, empresa_id: 1, ativo: true });
      setAgentes(prev => [...prev, novo]);
      setShowQuickAdd(false);
      setQuickForm({ nome: '', funcao: 'atendimento', tom: 'semiformal', personalidade: 'prestativo', nicho: '', descricao: '', regras_customizadas: '' });
      selectAgente(novo);
    } catch { console.error('Erro ao criar agente'); }
  }

  // ─── Generate Prompt ──────────────────────────────────────────────────────
  async function handleGerarPrompt() {
    if (!selectedAgente?.id) return;
    try {
      const res = await atendenteService.gerarPromptAgente(selectedAgente.id);
      setPromptTexto(res.prompt || '');
      setShowViewPrompt(true);
    } catch { console.error('Erro ao gerar prompt'); }
  }

  // ─── Test Chat ────────────────────────────────────────────────────────────
  async function handleSendChat() {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput }]);
    setChatInput('');
    setChatLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setChatMessages(prev => [...prev, { role: 'assistant', text: 'Resposta simulada. Conecte ao backend para respostas reais.' }]);
    setChatLoading(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  const tabs = [
    { label: 'Atendentes',    icon: <Bot size={15} /> },
    { label: 'Configuração',  icon: <Settings size={15} /> },
    { label: 'Prompt',        icon: <BookOpen size={15} /> },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="text-blue-600" size={28} /> Atendentes de IA
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie seus agentes de inteligência artificial</p>
        </div>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} /> Novo Atendente
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === idx ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Lista ───────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <div>
          {agentes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Bot size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Nenhum atendente cadastrado</p>
              <p className="text-sm mt-1">Clique em "Novo Atendente" para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {agentes.map(ag => (
                <div
                  key={ag.id}
                  className={`bg-white rounded-xl border p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition ${
                    selectedAgente?.id === ag.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                        {ag.nome?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{ag.nome}</p>
                        <p className="text-xs text-gray-400 capitalize">{ag.funcao?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <button onClick={() => handleToggle(ag)} className="text-gray-400 hover:text-blue-600">
                      {ag.ativo
                        ? <ToggleRight size={24} className="text-green-500" />
                        : <ToggleLeft size={24} />}
                    </button>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ag.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {ag.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {ag.tom && <span className="text-xs text-gray-400 capitalize">{ag.tom}</span>}
                  </div>

                  {/* Horário da empresa */}
                  {empresaConfig.horario_abertura && (
                    <div className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                      <Clock size={12} />
                      {empresaConfig.horario_abertura} – {empresaConfig.horario_fechamento}
                      {empresaConfig.dias_funcionamento && (
                        <span className="ml-1 text-gray-400 truncate">({empresaConfig.dias_funcionamento})</span>
                      )}
                    </div>
                  )}

                  {ag.descricao && (
                    <p className="text-xs text-gray-500 line-clamp-2">{ag.descricao}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                    <button
                      onClick={() => selectAgente(ag)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 border border-zinc-200/80 px-2.5 py-1.5 rounded-lg transition font-medium"
                    >
                      <Edit3 size={13} /> Editar
                    </button>
                    <button
                      onClick={() => { setSelectedAgente(ag); setShowTestChat(true); setChatMessages([]); }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60 px-2.5 py-1.5 rounded-lg transition font-medium"
                    >
                      <MessageSquare size={13} /> Testar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ag)}
                      title={`Excluir atendente ${ag.nome}`}
                      className="flex items-center justify-center gap-1 text-xs bg-rose-50 text-rose-600 border border-rose-200/70 hover:bg-rose-100 hover:text-rose-700 px-3 py-1.5 rounded-lg transition font-medium"
                    >
                      <Trash2 size={13} />
                      <span className="hidden sm:inline">Excluir</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 1: Configuração ─────────────────────────────────────────── */}
      {activeTab === 1 && (
        <div>
          {!config ? (
            <div className="text-center py-16 text-gray-400">
              <Settings size={48} className="mx-auto mb-3 opacity-30" />
              <p>Selecione um atendente na aba "Atendentes" para configurar</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Info banner */}
              <div className="flex items-start gap-3 bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-700">
                <Info size={18} className="mt-0.5 flex-shrink-0 text-zinc-500" />
                <div>
                  <p className="font-semibold text-zinc-900">Configuração individual do agente</p>
                  <p className="mt-0.5 text-zinc-600 text-xs">
                    Horários, formas de pagamento e catálogo (serviços, produtos, profissionais)
                    são configurados na página <strong>Catálogo</strong> e são compartilhados entre todos os agentes.
                  </p>
                </div>
              </div>

              {/* Seletor de agente e ação rápida de exclusão */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Agente Selecionado</label>
                  <select
                    value={config.id}
                    onChange={e => {
                      const ag = agentes.find(a => String(a.id) === String(e.target.value));
                      if (ag) { setSelectedAgente(ag); setConfig({ ...ag }); }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-white"
                  >
                    {agentes.map(ag => <option key={ag.id} value={ag.id}>{ag.nome} ({ag.funcao})</option>)}
                  </select>
                </div>
                <div className="sm:pt-5">
                  <button
                    type="button"
                    onClick={() => handleDelete(config)}
                    title="Excluir este atendente"
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 rounded-lg transition"
                  >
                    <Trash2 size={14} /> Excluir Atendente
                  </button>
                </div>
              </div>

              {/* Identidade */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Star size={16} className="text-yellow-500" /> Identidade
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Nome *</label>
                    <input
                      value={config.nome || ''}
                      onChange={e => setConfig(c => c ? { ...c, nome: e.target.value } : c)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Assistente Virtual, Max, Sofia..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Nicho / Área</label>
                    <input
                      value={config.nicho || ''}
                      onChange={e => setConfig(c => c ? { ...c, nicho: e.target.value } : c)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Salão, Clínica, E-commerce..."
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Descrição breve</label>
                  <input
                    value={config.descricao || ''}
                    onChange={e => setConfig(c => c ? { ...c, descricao: e.target.value } : c)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Uma linha descrevendo o papel deste agente"
                  />
                </div>
              </div>

              {/* Função & Comportamento */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Briefcase size={16} className="text-blue-500" /> Função e Comportamento
                </h3>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Função principal</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {FUNCAO_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setConfig(c => c ? { ...c, funcao: opt.value } : c)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                          config.funcao === opt.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        <span>{opt.icon}</span> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Tom de voz</label>
                    <select
                      value={config.tom || 'semiformal'}
                      onChange={e => setConfig(c => c ? { ...c, tom: e.target.value } : c)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {TOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Personalidade</label>
                    <select
                      value={config.personalidade || 'prestativo'}
                      onChange={e => setConfig(c => c ? { ...c, personalidade: e.target.value } : c)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {PERSONALIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Regras customizadas */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <AlertCircle size={16} className="text-orange-500" /> Regras Customizadas
                </h3>
                <p className="text-xs text-gray-500">Instruções específicas que apenas este agente deve seguir.</p>
                <textarea
                  rows={5}
                  value={config.regras_customizadas || ''}
                  onChange={e => setConfig(c => c ? { ...c, regras_customizadas: e.target.value } : c)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Ex: Nunca mencione preços sem antes perguntar o serviço desejado..."
                />
              </div>

              {/* Ações */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-zinc-900 text-white px-6 py-2.5 rounded-lg hover:bg-zinc-800 transition disabled:opacity-60 text-sm font-medium shadow-xs"
                >
                  {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={16} />}
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button
                  onClick={handleGerarPrompt}
                  className="flex items-center justify-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                >
                  <Zap size={16} /> Gerar Prompt IA
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(config)}
                  className="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-200/80 hover:bg-rose-100 hover:text-rose-700 px-5 py-2.5 rounded-lg transition text-sm font-medium sm:ml-auto"
                >
                  <Trash2 size={16} /> Excluir Atendente
                </button>
                {saveMsg && (
                  <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${saveMsg.includes('sucesso') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                    {saveMsg.includes('sucesso') ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {saveMsg}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Prompt ──────────────────────────────────────────────── */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">Prompt Consolidado</h2>
              <p className="text-xs text-gray-500 mt-0.5">Configuração do agente + catálogo da empresa combinados</p>
            </div>
            <button
              onClick={handleGerarPrompt}
              disabled={!selectedAgente}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition disabled:opacity-50"
            >
              <Zap size={14} /> Gerar Prompt
            </button>
          </div>

          {!selectedAgente ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p>Selecione um atendente para gerar o prompt</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-3">
                Agente: <strong className="text-gray-700">{selectedAgente.nome}</strong>
              </p>
              {promptTexto ? (
                <pre className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                  {promptTexto}
                </pre>
              ) : (
                <p className="text-gray-400 text-sm">Clique em "Gerar Prompt" para visualizar o prompt consolidado.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAIS
      ════════════════════════════════════════════════════════════════════ */}

      {/* Modal: Quick Add */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus size={20} className="text-blue-600" /> Novo Atendente
              </h3>
              <button onClick={() => setShowQuickAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nome *</label>
                <input
                  value={quickForm.nome}
                  onChange={e => setQuickForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do atendente"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Função</label>
                  <select value={quickForm.funcao} onChange={e => setQuickForm(f => ({ ...f, funcao: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {FUNCAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tom</label>
                  <select value={quickForm.tom} onChange={e => setQuickForm(f => ({ ...f, tom: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nicho</label>
                <input value={quickForm.nicho} onChange={e => setQuickForm(f => ({ ...f, nicho: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Salão de beleza" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Personalidade</label>
                <select value={quickForm.personalidade} onChange={e => setQuickForm(f => ({ ...f, personalidade: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PERSONALIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowQuickAdd(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={handleQuickAdd} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition">Criar Atendente</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Test Chat */}
      {showTestChat && selectedAgente && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ height: '80vh' }}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare size={18} className="text-purple-600" /> Testar — {selectedAgente.nome}
              </h3>
              <button onClick={() => { setShowTestChat(false); setChatMessages([]); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Envie uma mensagem para testar o agente</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-2 rounded-2xl text-sm text-gray-500 animate-pulse">Digitando...</div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite sua mensagem..."
              />
              <button onClick={handleSendChat} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Prompt */}
      {showViewPrompt && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Eye size={18} className="text-purple-600" /> Prompt Gerado — {selectedAgente?.nome}
              </h3>
              <button onClick={() => setShowViewPrompt(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <pre className="flex-1 overflow-y-auto text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4">
              {promptTexto || 'Nenhum prompt gerado ainda.'}
            </pre>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowViewPrompt(false)} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-200 transition">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Agente */}
      {agenteToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            
            <h3 className="text-lg font-bold text-zinc-900 text-center">Excluir Atendente de IA?</h3>
            <p className="text-sm text-zinc-600 text-center mt-2">
              Tem certeza que deseja excluir o assistente <strong className="text-zinc-900 font-semibold">"{agenteToDelete.nome}"</strong>?
              Esta ação removerá o atendente do sistema.
            </p>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 my-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-900 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 border border-zinc-700">
                <Bot size={18} />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-semibold text-xs text-zinc-900 truncate">{agenteToDelete.nome}</p>
                <p className="text-[11px] text-zinc-500 capitalize">
                  {agenteToDelete.funcao?.replace('_', ' ')} • {agenteToDelete.tom || 'Profissional'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setAgenteToDelete(null)}
                disabled={isDeleting}
                className="flex-1 border border-zinc-300 text-zinc-700 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
              >
                {isDeleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Trash2 size={16} />
                )}
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all transform animate-in slide-in-from-bottom-2 ${
          toast.ok ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-rose-600 text-white border-rose-700'
        }`}>
          {toast.ok ? <CheckCircle size={17} className="text-emerald-400" /> : <AlertCircle size={17} className="text-white" />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
