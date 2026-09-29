import React, { useState, useEffect, useRef } from 'react';
import {
  Scissors, User, ShoppingBag, Clock, CreditCard,
  Plus, Edit3, Trash2, Save, X, CheckCircle, AlertCircle,
  Search, ToggleLeft, ToggleRight, UploadCloud, Camera, Link as LinkIcon, Image as ImageIcon, Globe, MapPin, ExternalLink
} from 'lucide-react';
import { atendenteService } from '../services/api';

interface Servico {
  id?: number;
  nome: string;
  descricao: string;
  duracao_minutos: number | string;
  preco: number | string;
  ativo?: boolean;
}

interface Profissional {
  id?: number;
  empresa_id?: number;
  nome: string;
  especialidade: string;
  especialidades?: string;
  foto_url?: string;
  disponivel: boolean;
  ativo?: boolean;
  horario_inicio: string;
  horario_fim: string;
  dias_trabalho: string;
}

interface Produto {
  id?: number;
  empresa_id?: number;
  nome: string;
  descricao: string;
  preco: number | string;
  estoque: number | string;
  imagem_url?: string;
  ativo?: boolean;
}

interface EmpresaConfig {
  horario_abertura: string;
  horario_fechamento: string;
  dias_funcionamento: string;
  formas_pagamento: string;
  endereco: string;
  link_maps: string;
}

const linkMapsValido = (u: string) => !u.trim() || /^https?:\/\/\S+$/i.test(u.trim());

const DIAS_OPTIONS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const PAGAMENTO_OPTIONS = ['Dinheiro', 'Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Boleto'];

const emptyServico = (): Servico => ({ nome: '', descricao: '', duracao_minutos: '', preco: '', ativo: true });
const emptyProfissional = (): Profissional => ({
  nome: '',
  especialidade: '',
  especialidades: '',
  foto_url: '',
  disponivel: true,
  ativo: true,
  horario_inicio: '08:00',
  horario_fim: '18:00',
  dias_trabalho: 'Segunda, Terça, Quarta, Quinta, Sexta'
});
const emptyProduto = (): Produto => ({
  nome: '',
  descricao: '',
  preco: '',
  estoque: '',
  imagem_url: '',
  ativo: true
});

// Painel em HTTPS não carrega imagem http://IP:3000/... (conteúdo misto). Só para EXIBIR,
// troca por /uploads/arquivo, que o servidor do painel encaminha à VPS. O valor salvo não muda.
const imgSrc = (u?: string): string => {
  if (!u) return '';
  if (/^http:\/\/[^/]+(?=\/uploads\/)/i.test(u)) {
    return u.replace(/^http:\/\/[^/]+(?=\/uploads\/)/i, '');
  }
  return u;
};

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

// Mostra o motivo real que veio do backend (401, 409, "campo obrigatório"...)
// em vez de uma mensagem genérica que esconde o problema.
function msgErro(e: any, padrao: string): string {
  const doServidor =
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.data?.error ||
    e?.body?.error;
  const status = e?.response?.status || e?.status;
  if (doServidor) return status ? `${doServidor}` : String(doServidor);
  if (status === 401) return 'Sessão expirada. Faça login novamente.';
  if (status === 409) return 'Registro em uso. Desative em vez de excluir.';
  if (e?.message && !/^\[object/.test(e.message)) return e.message;
  return padrao;
}

const ehAtivo = (x: { ativo?: boolean; disponivel?: boolean }) =>
  x.ativo !== false && x.disponivel !== false;

export default function CatalogoPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>({ horario_abertura: '', horario_fechamento: '', dias_funcionamento: '', formas_pagamento: '', endereco: '', link_maps: '' });
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ type: 'servico' | 'profissional' | 'produto' | null; data: any; isEdit: boolean }>({ type: null, data: null, isEdit: false });
  const [savingConfig, setSavingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'servico' | 'profissional' | 'produto'; id: number | string; nome: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([]);
  const [pagamentoSelecionados, setPagamentoSelecionados] = useState<string[]>([]);

  // ── Serviços vinculados ao profissional em edição
  const [modalLinkedIds, setModalLinkedIds] = useState<number[]>([]);
  const [modalLinkedLoading, setModalLinkedLoading] = useState(false);
  // A API de vínculo serviço↔profissional pode não existir no backend.
  // Enquanto não existir, a seção fica escondida em vez de fingir que salva.
  const [vinculoSuportado, setVinculoSuportado] = useState(true);

  // ── Upload de Fotos de Produtos / Profissionais
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [erroFoto, setErroFoto] = useState('');
  const [productImageTab, setProductImageTab] = useState<'link' | 'upload'>('link');

  // Reduz a foto antes de enviar (máx. 1280px, JPEG 85%). Foto de celular de 4-8MB
  // vira ~200-400KB: não estoura limite de proxy/Nginx e o WhatsApp entrega mais rápido.
  // GIF (pode ser animado) e imagens pequenas seguem como estão.
  async function comprimirImagem(file: File): Promise<string> {
    const lerOriginal = () => new Promise<string>((ok, err) => {
      const r = new FileReader();
      r.onload = () => ok(r.result as string);
      r.onerror = () => err(new Error('Erro ao ler arquivo da imagem'));
      r.readAsDataURL(file);
    });
    if (file.type === 'image/gif' || file.size <= 500 * 1024) return lerOriginal();
    try {
      const bmp = await createImageBitmap(file);
      const escala = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * escala));
      const h = Math.max(1, Math.round(bmp.height * escala));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return lerOriginal();
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // PNG transparente vira fundo branco
      ctx.drawImage(bmp, 0, 0, w, h);
      bmp.close?.();
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return lerOriginal();
    }
  }

  // Envia a foto direto ao backend (POST /api/upload) e exige URL absoluta na resposta.
  // Para apontar para outro endereço, defina VITE_UPLOAD_URL (ex.: http://IP:3000/api/upload).
  async function enviarFoto(image: string, filename: string): Promise<{ url: string }> {
    const destino = (import.meta as any).env?.VITE_UPLOAD_URL || `${API_BASE}/upload`;
    const r = await fetch(destino, { method: 'POST', headers: authHeaders(true), body: JSON.stringify({ image, filename }) });
    let d: any = null;
    try { d = await r.json(); } catch { /* resposta sem JSON */ }
    if (!r.ok) {
      throw Object.assign(new Error(d?.error || `Erro ${r.status} ao enviar a foto`), { status: r.status, response: { status: r.status, data: d } });
    }
    const returnedUrl = d?.url || d?.fullUrl;
    if (!returnedUrl) {
      throw new Error('O servidor não devolveu o endereço da imagem.');
    }
    return { url: returnedUrl };
  }

  async function handlePhotoFileSelected(file: File, target: 'produto' | 'profissional' = 'produto') {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem (PNG, JPG, WEBP, etc.)', false);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('Arquivo muito grande. O limite máximo é 15MB.', false);
      return;
    }

    const campo = target === 'produto' ? 'imagem_url' : 'foto_url';
    const anterior = (modal.data && modal.data[campo]) || '';
    setErroFoto('');
    setUploadingPhoto(true);
    try {
      const base64Data = await comprimirImagem(file);
      // Prévia imediata no formulário
      setModal(m => ({ ...m, data: { ...m.data, [campo]: base64Data } }));

      // Envio ao servidor para salvar a imagem e obter a URL pública
      const res = await enviarFoto(base64Data, file.name);
      if (!res?.url) throw new Error('O servidor não devolveu a URL da imagem');
      setModal(m => ({ ...m, data: { ...m.data, [campo]: res.url } }));
      showToast('Foto enviada com sucesso!');
    } catch (err: any) {
      console.error('Erro no upload da imagem:', err);
      // Volta ao valor anterior: senão o base64 pesado ficava no campo e ia parar no banco ao salvar.
      setModal(m => ({ ...m, data: { ...m.data, [campo]: anterior } }));
      const motivo = msgErro(err, 'Erro ao enviar foto para o servidor');
      setErroFoto(`${motivo}${err?.status ? ` (código ${err.status})` : ''}`);
      showToast(motivo, false);
    } finally {
      setUploadingPhoto(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  function authHeaders(json = false): Record<string, string> {
    const token = localStorage.getItem('atendepromax_token') || '';
    const h: Record<string, string> = {};
    if (json) h['Content-Type'] = 'application/json';
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async function fetchAll() {
    setLoading(true);
    const falhas: string[] = [];
    try {
      const [servicosRes, profissionaisRes, produtosRes, empresaRes] = await Promise.all([
        atendenteService.getServicos().catch((e: any) => { falhas.push('serviços'); console.error('[getServicos]', e); return []; }),
        atendenteService.getProfissionais().catch((e: any) => { falhas.push('profissionais'); console.error('[getProfissionais]', e); return []; }),
        atendenteService.getProdutos().catch((e: any) => { falhas.push('produtos'); console.error('[getProdutos]', e); return []; }),
        atendenteService.getEmpresaConfig().catch((e: any) => { falhas.push('configurações'); console.error('[getEmpresaConfig]', e); return {}; }),
      ]);
      setServicos(Array.isArray(servicosRes) ? servicosRes : []);
      const mappedProfissionais = Array.isArray(profissionaisRes) ? profissionaisRes.map((p: any) => ({
        ...p,
        especialidade: p.especialidade || p.especialidades || '',
        especialidades: p.especialidades || p.especialidade || '',
        foto_url: p.foto_url || '',
        horario_inicio: p.horario_inicio ? String(p.horario_inicio).substring(0, 5) : '08:00',
        horario_fim: p.horario_fim ? String(p.horario_fim).substring(0, 5) : '18:00',
        dias_trabalho: p.dias_trabalho || 'Segunda, Terça, Quarta, Quinta, Sexta',
        // ativo é a coluna real do banco; disponivel é o nome usado na tela.
        disponivel: p.ativo !== undefined && p.ativo !== null ? p.ativo : (p.disponivel !== undefined ? p.disponivel : true),
        ativo: p.ativo !== undefined && p.ativo !== null ? p.ativo : (p.disponivel !== undefined ? p.disponivel : true)
      })) : [];
      setProfissionais(mappedProfissionais);
      setProdutos(Array.isArray(produtosRes) ? produtosRes : []);
      const ec: EmpresaConfig = { horario_abertura: empresaRes.horario_abertura || '', horario_fechamento: empresaRes.horario_fechamento || '', dias_funcionamento: empresaRes.dias_funcionamento || '', formas_pagamento: empresaRes.formas_pagamento || '', endereco: empresaRes.endereco || '', link_maps: empresaRes.link_maps || '' };
      setEmpresaConfig(ec);
      setDiasSelecionados(ec.dias_funcionamento ? ec.dias_funcionamento.split(',').map(d => d.trim()).filter(Boolean) : []);
      setPagamentoSelecionados(ec.formas_pagamento ? ec.formas_pagamento.split(',').map(p => p.trim()).filter(Boolean) : []);
      // Lista vazia por erro de rede é diferente de lista vazia de verdade.
      if (falhas.length) showToast(`Não consegui carregar: ${falhas.join(', ')}. Verifique a conexão.`, false);
    } catch (e) {
      showToast(msgErro(e, 'Erro ao carregar dados'), false);
    } finally { setLoading(false); }
  }

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), ok ? 4000 : 12000); }

  function openModal(type: 'servico' | 'profissional' | 'produto', data: any = null) {
    setModal({ type, data: data ? { ...data } : (type === 'servico' ? emptyServico() : type === 'profissional' ? emptyProfissional() : emptyProduto()), isEdit: !!data?.id });
    if (type === 'profissional') {
      setModalLinkedIds([]);
      if (data?.id && vinculoSuportado) {
        setModalLinkedLoading(true);
        fetch(`${API_BASE}/profissionais/${data.id}/servicos`, { headers: authHeaders() })
          .then(async r => {
            if (r.status === 404) { setVinculoSuportado(false); return; }
            if (r.ok) {
              const d = await r.json();
              setModalLinkedIds(Array.isArray(d) ? d.map((s: any) => Number(s.id)) : []);
            }
          })
          .catch(() => setVinculoSuportado(false))
          .finally(() => setModalLinkedLoading(false));
      }
    }
  }
  function closeModal() {
    setModal({ type: null, data: null, isEdit: false });
    setModalLinkedIds([]);
    setUploadingPhoto(false);
    setIsDraggingPhoto(false);
    setErroFoto('');
    setProductImageTab('link');
  }

  async function saveServico() {
    const d = modal.data as Servico;
    if (!d.nome.trim()) return showToast('Nome obrigatório', false);
    setSaving(true);
    try {
      if (modal.isEdit && d.id) {
        const u = await atendenteService.updateServico(d.id, d);
        setServicos(prev => prev.map(s => String(s.id) === String(d.id) ? { ...d, ...(u || {}) } : s));
      } else {
        const novo = await atendenteService.saveServico(d);
        setServicos(prev => [...prev, novo]);
      }
      showToast(modal.isEdit ? 'Serviço atualizado' : 'Serviço adicionado');
      closeModal();
    } catch (e) {
      showToast(msgErro(e, 'Erro ao salvar serviço'), false);
    } finally { setSaving(false); }
  }

  async function saveProfissional() {
    const d = modal.data as Profissional;
    if (uploadingPhoto) return showToast('Aguarde o envio da foto terminar', false);
    if (!d.nome.trim()) return showToast('Nome obrigatório', false);
    setSaving(true);
    try {
      const ativoFinal = d.disponivel !== undefined ? d.disponivel : (d.ativo !== undefined ? d.ativo : true);
      const payload = {
        ...d,
        especialidades: d.especialidade || d.especialidades || '',
        especialidade: d.especialidade || d.especialidades || '',
        foto_url: d.foto_url || '',
        ativo: ativoFinal,
        disponivel: ativoFinal
      };
      let profId: number | string;
      if (modal.isEdit && d.id) {
        profId = d.id;
        const u = await atendenteService.updateProfissional(d.id, payload);
        const updatedProf = { ...payload, ...(u || {}) };
        setProfissionais(prev => prev.map(p => String(p.id) === String(d.id) ? updatedProf : p));
      } else {
        const novo = await atendenteService.saveProfissional(payload);
        setProfissionais(prev => [...prev, {
          ...payload,
          ...(novo || {}),
          disponivel: novo?.ativo !== undefined ? novo.ativo : ativoFinal,
          ativo: novo?.ativo !== undefined ? novo.ativo : ativoFinal
        }]);
        profId = novo?.id;
      }

      if (vinculoSuportado && profId) await sincronizarVinculos(profId);

      showToast(modal.isEdit ? 'Profissional atualizado' : 'Profissional adicionado');
      closeModal();
    } catch (e) {
      showToast(msgErro(e, 'Erro ao salvar profissional'), false);
    } finally { setSaving(false); }
  }

  // Vínculo serviço↔profissional: só funciona se o backend tiver essas rotas.
  async function sincronizarVinculos(profId: number | string) {
    try {
      const headers = authHeaders(true);
      let currentIds: number[] = [];
      const r = await fetch(`${API_BASE}/profissionais/${profId}/servicos`, { headers });
      if (r.status === 404) { setVinculoSuportado(false); return; }
      if (r.ok) {
        const cur = await r.json();
        currentIds = Array.isArray(cur) ? cur.map((s: any) => Number(s.id)) : [];
      }

      const toAdd = modalLinkedIds.filter(id => !currentIds.includes(Number(id)));
      const toRemove = currentIds.filter(id => !modalLinkedIds.includes(Number(id)));

      const respostas = await Promise.all([
        ...toAdd.map(sid => fetch(`${API_BASE}/profissionais/${profId}/servicos`, {
          method: 'POST', headers, body: JSON.stringify({ servico_id: Number(sid) })
        })),
        ...toRemove.map(sid => fetch(`${API_BASE}/profissionais/${profId}/servicos/${sid}`, {
          method: 'DELETE', headers
        })),
      ]);
      if (respostas.some(x => x.status === 404)) setVinculoSuportado(false);
      else if (respostas.some(x => !x.ok)) showToast('Profissional salvo, mas os serviços vinculados não foram atualizados', false);
    } catch (linkErr) {
      console.warn('Erro ao sincronizar vínculos de serviços:', linkErr);
      showToast('Profissional salvo, mas os serviços vinculados não foram atualizados', false);
    }
  }

  // O backend lê o campo `ativo`. Mandar só `disponivel` invertido não mudava nada,
  // porque o `ativo` antigo ia junto no objeto e ganhava a disputa.
  async function toggleAtivo(tipo: 'servico' | 'profissional' | 'produto', item: any) {
    const novo = !ehAtivo(item);
    try {
      if (tipo === 'profissional') {
        const u = await atendenteService.updateProfissional(item.id, { ...item, ativo: novo, disponivel: novo });
        setProfissionais(prev => prev.map(p => String(p.id) === String(item.id)
          ? { ...item, ...(u || {}), ativo: novo, disponivel: novo } : p));
      } else if (tipo === 'servico') {
        const u = await atendenteService.updateServico(item.id, { ...item, ativo: novo });
        setServicos(prev => prev.map(s => String(s.id) === String(item.id) ? { ...item, ...(u || {}), ativo: novo } : s));
      } else {
        const u = await atendenteService.updateProduto(item.id, { ...item, ativo: novo });
        setProdutos(prev => prev.map(p => String(p.id) === String(item.id) ? { ...item, ...(u || {}), ativo: novo } : p));
      }
      showToast(novo ? 'Ativado' : 'Desativado (some do atendimento automático)');
    } catch (e) {
      showToast(msgErro(e, 'Erro ao atualizar'), false);
    }
  }

  async function saveProduto() {
    const d = modal.data as Produto;
    if (uploadingPhoto) return showToast('Aguarde o envio da foto terminar', false);
    if (!d.nome.trim()) return showToast('Nome obrigatório', false);
    setSaving(true);
    try {
      const payload = { ...d, imagem_url: d.imagem_url || '', ativo: d.ativo !== undefined ? d.ativo : true };
      if (modal.isEdit && d.id) {
        const u = await atendenteService.updateProduto(d.id, payload);
        setProdutos(prev => prev.map(p => String(p.id) === String(d.id) ? { ...payload, ...(u || {}) } : p));
      } else {
        const novo = await atendenteService.saveProduto(payload);
        setProdutos(prev => [...prev, novo]);
      }
      showToast(modal.isEdit ? 'Produto atualizado' : 'Produto adicionado');
      closeModal();
    } catch (e) {
      showToast(msgErro(e, 'Erro ao salvar produto'), false);
    } finally { setSaving(false); }
  }

  // Só remove da tela quando o backend confirma. Antes, um erro (por exemplo
  // "já tem agendamentos") sumia com o item e ele voltava no próximo refresh.
  async function handleConfirmDelete() {
    if (!itemToDelete) return;
    const { type, id } = itemToDelete;
    setDeleting(true);
    try {
      if (type === 'profissional') { await atendenteService.deleteProfissional(id); setProfissionais(prev => prev.filter(p => String(p.id) !== String(id))); }
      else if (type === 'servico') { await atendenteService.deleteServico(id); setServicos(prev => prev.filter(s => String(s.id) !== String(id))); }
      else { await atendenteService.deleteProduto(id); setProdutos(prev => prev.filter(p => String(p.id) !== String(id))); }
      showToast('Item removido');
      setItemToDelete(null);
    } catch (e) {
      showToast(msgErro(e, 'Não foi possível excluir'), false);
    } finally { setDeleting(false); }
  }

  async function saveEmpresaConfig() {
    if (!linkMapsValido(empresaConfig.link_maps)) {
      return showToast('Link do Google Maps inválido. Deve começar com http:// ou https://', false);
    }
    setSavingConfig(true);
    try {
      const payload = { ...empresaConfig, endereco: empresaConfig.endereco.trim(), link_maps: empresaConfig.link_maps.trim(), dias_funcionamento: diasSelecionados.join(', '), formas_pagamento: pagamentoSelecionados.join(', ') };
      await atendenteService.saveEmpresaConfig(payload);
      setEmpresaConfig(payload);
      showToast('Configurações salvas');
    } catch (e) { showToast(msgErro(e, 'Erro ao salvar'), false); } finally { setSavingConfig(false); }
  }

  const q = search.toLowerCase();
  const filteredServicos = servicos.filter(s => (s.nome || '').toLowerCase().includes(q) || (s.descricao || '').toLowerCase().includes(q));
  const filteredProfissionais = profissionais.filter(p => (p.nome || '').toLowerCase().includes(q) || (p.especialidade || p.especialidades || '').toLowerCase().includes(q));
  const filteredProdutos = produtos.filter(p => (p.nome || '').toLowerCase().includes(q) || (p.descricao || '').toLowerCase().includes(q));

  const tabs = [
    { label: 'Serviços', icon: <Scissors size={15} />, count: servicos.length },
    { label: 'Profissionais', icon: <User size={15} />, count: profissionais.length },
    { label: 'Produtos', icon: <ShoppingBag size={15} />, count: produtos.length },
    { label: 'Horários & Pagamento', icon: <Clock size={15} />, count: null },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo da Empresa</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie serviços, profissionais, produtos e horários de funcionamento</p>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.ok ? <CheckCircle size={16} className="flex-shrink-0" /> : <AlertCircle size={16} className="flex-shrink-0" />} {toast.msg}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {tabs.map((tab, idx) => (
          <button key={idx} onClick={() => { setActiveTab(idx); setSearch(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === idx ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.icon} {tab.label}
            {tab.count !== null && <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === idx ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Serviços */}
      {activeTab === 0 && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar serviço..." /></div>
            <button onClick={() => openModal('servico')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"><Plus size={15} /> Adicionar</button>
          </div>
          {filteredServicos.length === 0 ? <EmptyState icon={<Scissors size={40} />} msg="Nenhum serviço cadastrado" /> : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {filteredServicos.map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{s.nome}</p>
                      {!ehAtivo(s) && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inativo</span>}
                    </div>
                    {s.descricao && <p className="text-xs text-gray-500 truncate">{s.descricao}</p>}
                    <div className="flex gap-4 mt-1 text-xs text-gray-400">
                      {s.duracao_minutos ? <span className="flex items-center gap-1"><Clock size={11} /> {s.duracao_minutos} min</span> : null}
                      {s.preco ? <span className="flex items-center gap-1"><CreditCard size={11} /> R$ {Number(s.preco).toFixed(2)}</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <button onClick={() => toggleAtivo('servico', s)} className="px-1 text-gray-400 hover:text-blue-600 transition" title={ehAtivo(s) ? 'Ativo no atendimento' : 'Fora do atendimento'}>
                      {ehAtivo(s) ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                    </button>
                    <button onClick={() => openModal('servico', s)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit3 size={15} /></button>
                    <button onClick={() => setItemToDelete({ type: 'servico', id: s.id!, nome: s.nome })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 1: Profissionais */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar profissional..." /></div>
            <button onClick={() => openModal('profissional')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"><Plus size={15} /> Adicionar</button>
          </div>
          {filteredProfissionais.length === 0 ? <EmptyState icon={<User size={40} />} msg="Nenhum profissional cadastrado" /> : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {filteredProfissionais.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {p.foto_url ? (
                      <img src={imgSrc(p.foto_url)} alt={p.nome} className="w-10 h-10 rounded-full object-cover border border-purple-200 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                        {p.nome?.[0]?.toUpperCase() || 'P'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{p.nome}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ehAtivo(p) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {ehAtivo(p) ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {(p.especialidade || p.especialidades) && (
                        <p className="text-xs text-gray-500 truncate">{p.especialidade || p.especialidades}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <Clock size={11} /> {p.horario_inicio} às {p.horario_fim} · {p.dias_trabalho}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <button onClick={() => toggleAtivo('profissional', p)} className="px-1 text-gray-400 hover:text-blue-600 transition" title={ehAtivo(p) ? 'Disponível' : 'Indisponível'}>
                      {ehAtivo(p) ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                    </button>
                    <button onClick={() => openModal('profissional', p)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit3 size={15} /></button>
                    <button onClick={() => setItemToDelete({ type: 'profissional', id: p.id!, nome: p.nome })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Produtos */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar produto..." /></div>
            <button onClick={() => openModal('produto')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"><Plus size={15} /> Adicionar</button>
          </div>
          {filteredProdutos.length === 0 ? <EmptyState icon={<ShoppingBag size={40} />} msg="Nenhum produto cadastrado" /> : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {filteredProdutos.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {p.imagem_url ? (
                      <img src={imgSrc(p.imagem_url)} alt={p.nome} className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><ShoppingBag size={16} /></div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{p.nome}</p>
                        {!ehAtivo(p) && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inativo</span>}
                      </div>
                      {p.descricao && <p className="text-xs text-gray-500 truncate">{p.descricao}</p>}
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        {p.preco ? <span>R$ {Number(p.preco).toFixed(2)}</span> : null}
                        {p.estoque != null && p.estoque !== '' ? <span>Estoque: {p.estoque}</span> : null}
                        {!p.imagem_url ? (
                          <button
                            type="button"
                            onClick={() => openModal('produto', p)}
                            className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-100/60 bg-amber-50 px-2 py-0.5 rounded-md font-medium text-[11px] transition"
                            title="Clique para enviar uma foto para este produto"
                          >
                            <Camera size={11} /> Adicionar foto
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                            <CheckCircle size={11} /> com foto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <button onClick={() => toggleAtivo('produto', p)} className="px-1 text-gray-400 hover:text-blue-600 transition" title={ehAtivo(p) ? 'À venda' : 'Fora do catálogo'}>
                      {ehAtivo(p) ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                    </button>
                    <button onClick={() => openModal('produto', p)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit3 size={15} /></button>
                    <button onClick={() => setItemToDelete({ type: 'produto', id: p.id!, nome: p.nome })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Horários & Pagamento */}
      {activeTab === 3 && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Clock size={16} className="text-blue-500" /> Horário de Funcionamento</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Abertura</label><input type="time" value={empresaConfig.horario_abertura} onChange={e => setEmpresaConfig(c => ({ ...c, horario_abertura: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Fechamento</label><input type="time" value={empresaConfig.horario_fechamento} onChange={e => setEmpresaConfig(c => ({ ...c, horario_fechamento: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Dias de funcionamento</label>
              <div className="flex flex-wrap gap-2">{DIAS_OPTIONS.map(dia => (<button key={dia} onClick={() => setDiasSelecionados(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia])} className={`px-3 py-1.5 rounded-lg text-sm border transition ${diasSelecionados.includes(dia) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>{dia}</button>))}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><CreditCard size={16} className="text-green-500" /> Formas de Pagamento</h3>
            <div className="flex flex-wrap gap-2">{PAGAMENTO_OPTIONS.map(p => (<button key={p} onClick={() => setPagamentoSelecionados(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={`px-3 py-1.5 rounded-lg text-sm border transition ${pagamentoSelecionados.includes(p) ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:border-green-400'}`}>{p}</button>))}</div>
            {pagamentoSelecionados.length > 0 && <p className="text-xs text-gray-500">Aceita: {pagamentoSelecionados.join(', ')}</p>}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><MapPin size={16} className="text-red-500" /> Localização</h3>
            <Field label="Endereço completo">
              <input value={empresaConfig.endereco} onChange={e => setEmpresaConfig(c => ({ ...c, endereco: e.target.value }))} className={inputCls} placeholder="Rua, número, bairro, cidade/UF" />
            </Field>
            <Field label="Link do Google Maps">
              <div className="flex gap-2 items-center">
                <input type="url" value={empresaConfig.link_maps} onChange={e => setEmpresaConfig(c => ({ ...c, link_maps: e.target.value }))}
                  className={`${inputCls} ${linkMapsValido(empresaConfig.link_maps) ? '' : 'border-red-400 focus:ring-red-400'}`} placeholder="https://maps.app.goo.gl/..." />
                <button type="button" disabled={!empresaConfig.link_maps.trim() || !linkMapsValido(empresaConfig.link_maps)}
                  onClick={() => window.open(empresaConfig.link_maps.trim(), '_blank', 'noopener,noreferrer')}
                  className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border border-gray-300 disabled:opacity-50">
                  <ExternalLink size={14} /> Testar
                </button>
              </div>
              {!linkMapsValido(empresaConfig.link_maps) && <p className="text-[11px] text-red-500 mt-1">O link deve começar com http:// ou https://</p>}
              <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">No Google Maps, busque sua empresa → Compartilhar → Copiar link. O atendente envia o endereço e este link quando o cliente perguntar onde fica ou como chegar.</p>
            </Field>
          </div>
          <button onClick={saveEmpresaConfig} disabled={savingConfig} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-60">
            {savingConfig ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={16} />}
            {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      )}

      {/* ══ Modal Serviço */}
      {modal.type === 'servico' && (
        <Modal title={modal.isEdit ? 'Editar Serviço' : 'Novo Serviço'} saving={saving} onClose={closeModal} onSave={saveServico} isEdit={modal.isEdit} onDelete={() => { const s = modal.data as Servico; if (s.id) { closeModal(); setItemToDelete({ type: 'servico', id: s.id, nome: s.nome }); } }}>
          <Field label="Nome *"><input autoFocus value={modal.data.nome} onChange={e => setModal(m => ({ ...m, data: { ...m.data, nome: e.target.value } }))} className={inputCls} placeholder="Ex: Corte de cabelo" /></Field>
          <Field label="Descrição"><textarea rows={3} value={modal.data.descricao} onChange={e => setModal(m => ({ ...m, data: { ...m.data, descricao: e.target.value } }))} className={`${inputCls} resize-none`} placeholder="Descrição do serviço" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duração (min)"><input type="number" value={modal.data.duracao_minutos} onChange={e => setModal(m => ({ ...m, data: { ...m.data, duracao_minutos: e.target.value } }))} className={inputCls} placeholder="60" /></Field>
            <Field label="Preço (R$)"><input type="number" step="0.01" value={modal.data.preco} onChange={e => setModal(m => ({ ...m, data: { ...m.data, preco: e.target.value } }))} className={inputCls} placeholder="0,00" /></Field>
          </div>
        </Modal>
      )}

      {/* ══ Modal Profissional */}
      {modal.type === 'profissional' && (
        <Modal title={modal.isEdit ? 'Editar Profissional' : 'Novo Profissional'} saving={saving} onClose={closeModal} onSave={saveProfissional} isEdit={modal.isEdit} onDelete={() => { const p = modal.data as Profissional; if (p.id) { closeModal(); setItemToDelete({ type: 'profissional', id: p.id, nome: p.nome }); } }}>
          <Field label="Nome *"><input autoFocus value={modal.data.nome} onChange={e => setModal(m => ({ ...m, data: { ...m.data, nome: e.target.value } }))} className={inputCls} placeholder="Nome completo" /></Field>
          <Field label="Especialidades"><input value={modal.data.especialidade || modal.data.especialidades || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, especialidade: e.target.value, especialidades: e.target.value } }))} className={inputCls} placeholder="Ex: Odontologia Geral, Cirurgia, Endodontia" /></Field>
          <Field label="Foto do Profissional (opcional)">
            <div className="flex gap-2 items-center">
              <input value={modal.data.foto_url || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, foto_url: e.target.value } }))} className={inputCls} placeholder="https://exemplo.com/foto.jpg ou faça upload" />
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = e => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handlePhotoFileSelected(file, 'profissional');
                  };
                  input.click();
                }}
                className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border border-gray-300"
                title="Fazer upload de foto do profissional"
              >
                <UploadCloud size={14} /> Upload
              </button>
            </div>
            {modal.data.foto_url ? (
              <div className="mt-2 flex items-center gap-3">
                <img src={imgSrc(modal.data.foto_url)} alt="prévia" className="w-12 h-12 object-cover rounded-full border border-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <button type="button" onClick={() => setModal(m => ({ ...m, data: { ...m.data, foto_url: '' } }))} className="text-xs text-red-500 hover:text-red-700">Remover foto</button>
              </div>
            ) : null}
            {erroFoto && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span><strong>Não foi possível enviar a foto.</strong> {erroFoto}</span>
              </div>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Horário Início"><input type="time" value={modal.data.horario_inicio} onChange={e => setModal(m => ({ ...m, data: { ...m.data, horario_inicio: e.target.value } }))} className={inputCls} /></Field>
            <Field label="Horário Fim"><input type="time" value={modal.data.horario_fim} onChange={e => setModal(m => ({ ...m, data: { ...m.data, horario_fim: e.target.value } }))} className={inputCls} /></Field>
          </div>
          <Field label="Dias de Trabalho">
            <div className="flex flex-wrap gap-2">{DIAS_OPTIONS.map(dia => { const dias = (modal.data.dias_trabalho || '').split(',').map((d: string) => d.trim()); const selected = dias.includes(dia); return (<button key={dia} type="button" onClick={() => { const current = (modal.data.dias_trabalho || '').split(',').map((d: string) => d.trim()).filter(Boolean); setModal(m => ({ ...m, data: { ...m.data, dias_trabalho: (selected ? current.filter((d: string) => d !== dia) : [...current, dia]).join(', ') } })); }} className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>{dia}</button>); })}</div>
          </Field>
          <Field label="Disponibilidade">
            <button type="button" onClick={() => setModal(m => ({ ...m, data: { ...m.data, disponivel: !m.data.disponivel, ativo: !m.data.disponivel } }))} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition w-full ${modal.data.disponivel ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500'}`}>
              {modal.data.disponivel ? <><ToggleRight size={18} className="text-green-500" /> Disponível</> : <><ToggleLeft size={18} /> Indisponível</>}
            </button>
          </Field>
          {vinculoSuportado && (
            <Field label="Serviços atendidos">
              {modalLinkedLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-2"><div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Carregando...</div>
              ) : servicos.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">Nenhum serviço cadastrado ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {servicos.map(s => {
                    const selected = modalLinkedIds.includes(s.id!);
                    return (
                      <button key={s.id} type="button"
                        onClick={() => setModalLinkedIds(prev => selected ? prev.filter(id => id !== s.id) : [...prev, s.id!])}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>
                        {selected && <CheckCircle size={11} />} {s.nome}
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>
          )}
        </Modal>
      )}

      {/* ══ Modal Produto */}
      {modal.type === 'produto' && (
        <Modal title={modal.isEdit ? 'Editar Produto' : 'Novo Produto'} saving={saving} onClose={closeModal} onSave={saveProduto} isEdit={modal.isEdit} onDelete={() => { const p = modal.data as Produto; if (p.id) { closeModal(); setItemToDelete({ type: 'produto', id: p.id, nome: p.nome }); } }}>
          <Field label="Nome *"><input autoFocus value={modal.data.nome} onChange={e => setModal(m => ({ ...m, data: { ...m.data, nome: e.target.value } }))} className={inputCls} placeholder="Nome do produto" /></Field>
          <Field label="Descrição"><textarea rows={3} value={modal.data.descricao} onChange={e => setModal(m => ({ ...m, data: { ...m.data, descricao: e.target.value } }))} className={`${inputCls} resize-none`} placeholder="Descrição" /></Field>
          {/* ── Imagem do Produto: Link Fornecido ou Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-blue-600" />
                Imagem do Produto
              </label>
              {modal.data.imagem_url && (
                <button
                  type="button"
                  onClick={() => setModal(m => ({ ...m, data: { ...m.data, imagem_url: '' } }))}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition"
                >
                  <Trash2 size={12} /> Remover imagem
                </button>
              )}
            </div>

            {/* Alternador de Método: Link (URL) vs Upload */}
            <div className="flex p-1 bg-gray-100 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setProductImageTab('link')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                  productImageTab === 'link'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LinkIcon size={13} />
                Link da Imagem (URL)
              </button>
              <button
                type="button"
                onClick={() => setProductImageTab('upload')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                  productImageTab === 'upload'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UploadCloud size={13} />
                Upload do Dispositivo
              </button>
            </div>

            {/* Opção 1: Link da Imagem */}
            {productImageTab === 'link' && (
              <div className="space-y-2">
                <div>
                  <input
                    value={modal.data.imagem_url || ''}
                    onChange={e => {
                      setErroFoto('');
                      setModal(m => ({ ...m, data: { ...m.data, imagem_url: e.target.value.trim() } }));
                    }}
                    className={inputCls}
                    placeholder="Cole o link da imagem (ex: https://site.com/foto-produto.jpg)"
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                    💡 O link fornecido carrega a imagem no catálogo e para exibição ao usuário. O link de referência não será enviado como texto de mensagem para o cliente no WhatsApp.
                  </p>
                </div>
              </div>
            )}

            {/* Opção 2: Upload de Arquivo */}
            {productImageTab === 'upload' && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoFileSelected(file, 'produto');
                    e.target.value = '';
                  }}
                />
                <div
                  onDragOver={e => { e.preventDefault(); setIsDraggingPhoto(true); }}
                  onDragLeave={() => setIsDraggingPhoto(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDraggingPhoto(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handlePhotoFileSelected(file, 'produto');
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                    isDraggingPhoto
                      ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                      : 'border-gray-300 hover:border-blue-400 bg-gray-50/60 hover:bg-blue-50/30'
                  }`}
                >
                  {uploadingPhoto ? (
                    <div className="py-2 flex flex-col items-center gap-1.5">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-blue-600 font-medium">Enviando foto...</p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={20} className="text-blue-500" />
                      <p className="text-xs font-semibold text-gray-700">Clique para escolher ou arraste uma foto</p>
                      <span className="text-[11px] text-gray-400">PNG, JPG, WEBP até 15MB</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Prévia da Imagem Carregada */}
            {modal.data.imagem_url ? (
              <div className="border border-gray-200 rounded-xl p-3 bg-gradient-to-r from-gray-50 to-blue-50/20 flex items-center gap-3.5 shadow-2xs">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-300 bg-white shrink-0 flex items-center justify-center shadow-xs">
                  <img
                    src={imgSrc(modal.data.imagem_url)}
                    alt="Prévia do produto"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).onerror = null;
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                    }}
                  />
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Imagem carregada para o usuário
                  </div>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5 max-w-[240px]" title={modal.data.imagem_url}>
                    {modal.data.imagem_url.startsWith('data:') ? 'Arquivo de imagem' : modal.data.imagem_url}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                    <CheckCircle size={11} /> Pronta para exibição no catálogo
                  </p>
                </div>
              </div>
            ) : null}

            {erroFoto && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span><strong>Aviso:</strong> {erroFoto}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$)"><input type="number" step="0.01" value={modal.data.preco} onChange={e => setModal(m => ({ ...m, data: { ...m.data, preco: e.target.value } }))} className={inputCls} placeholder="0,00" /></Field>
            <Field label="Estoque"><input type="number" value={modal.data.estoque} onChange={e => setModal(m => ({ ...m, data: { ...m.data, estoque: e.target.value } }))} className={inputCls} placeholder="0" /></Field>
          </div>
        </Modal>
      )}

      {/* ══ Modal Confirmação de Exclusão */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4"><Trash2 size={24} /></div>
            <h3 className="text-lg font-bold text-gray-900">Excluir {itemToDelete.type === 'profissional' ? 'Profissional' : itemToDelete.type === 'servico' ? 'Serviço' : 'Produto'}?</h3>
            <p className="text-sm text-gray-500 mt-2">Tem certeza que deseja remover <strong>"{itemToDelete.nome}"</strong>?</p>
            <p className="text-xs text-gray-400 mt-2">Se houver agendamentos ligados a ele, desative em vez de excluir.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setItemToDelete(null)} disabled={deleting} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">Cancelar</button>
              <button onClick={handleConfirmDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60">
                {deleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={16} />}
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function EmptyState({ icon, msg }: { icon: React.ReactNode; msg: string }) {
  return <div className="text-center py-14 text-gray-400"><div className="flex justify-center mb-3 opacity-30">{icon}</div><p className="text-sm">{msg}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>{children}</div>;
}

function Modal({ title, onClose, onSave, onDelete, isEdit, saving, children }: { title: string; onClose: () => void; onSave: () => void; onDelete?: () => void; isEdit?: boolean; saving?: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="flex items-center gap-3 mt-6">
          {isEdit && onDelete && (
            <button type="button" onClick={onDelete} className="px-3.5 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 transition flex items-center gap-1.5"><Trash2 size={15} /> Excluir</button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-4 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
          <button type="button" onClick={onSave} disabled={saving} className="px-5 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-2 font-medium disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />} {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
