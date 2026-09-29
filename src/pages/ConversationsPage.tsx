import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { conversationService } from '../services/api';
import { Chat, Message } from '../types';
import {
  MessageSquare,
  Search,
  Send,
  Calendar,
  Sparkles,
  Zap,
  Trash2,
  CheckCheck,
  RefreshCw,
  Clock,
  Phone,
  Bot,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEMP_MAP: Record<string, { label: string; color: string }> = {
  cold: { label: 'Frio',    color: 'bg-sky-50 text-sky-700 border border-sky-200/80' },
  warm: { label: 'Morno',   color: 'bg-amber-50 text-amber-700 border border-amber-200/80' },
  hot:  { label: 'Quente',  color: 'bg-rose-50 text-rose-700 border border-rose-200/80' },
};

function getTempChip(value?: string) {
  return TEMP_MAP[value ?? ''] ?? TEMP_MAP.warm;
}

function safeDate(value?: string | Date | null): Date {
  if (!value) return new Date();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Remove sufixo de device do JID do WhatsApp (ex: :22) e caracteres não numéricos */
function cleanPhone(value?: string | null): string {
  if (!value) return '';
  return value.split(':')[0].replace(/\D/g, '');
}

/** Retorna nome de exibição; se for JID/número bruto ou "undefined", exibe o número limpo */
function displayName(nome?: string | null, telefone?: string | null): string {
  if (!nome || nome === 'undefined' || nome === 'null') return cleanPhone(telefone) || 'Contato';
  if (/^\d+[:\-]?\d*$/.test(nome.trim())) {
    return cleanPhone(telefone) || cleanPhone(nome) || 'Contato';
  }
  return nome;
}

// Normaliza URLs da VPS para usar o proxy relativo /uploads/...
function normalizePhotoUrl(u?: string | null): string {
  if (!u) return '';
  if (/^http:\/\/[^/]+(?=\/uploads\/)/i.test(u)) {
    return u.replace(/^http:\/\/[^/]+(?=\/uploads\/)/i, '');
  }
  return u;
}

function isImageUrl(text?: string | null): boolean {
  if (!text) return false;
  const t = text.trim();
  return (
    t.startsWith('/uploads/') ||
    /^https?:\/\/[^\s]+(?:\.png|\.jpg|\.jpeg|\.webp|\.gif|\/uploads\/[^\s]+)/i.test(t)
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  nome?: string;
  foto?: string | null;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ nome, foto, className = '' }) => {
  const [imgError, setImgError] = useState(false);
  const normalized = normalizePhotoUrl(foto);

  useEffect(() => {
    setImgError(false);
  }, [normalized]);

  if (normalized && !imgError) {
    return (
      <img
        src={normalized}
        alt={nome ?? ''}
        referrerPolicy="no-referrer"
        className={`object-cover ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center text-zinc-700 font-mono font-bold bg-zinc-100 border border-zinc-200/80 uppercase ${className}`}>
      {nome?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const ConversationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [contactPhotos, setContactPhotos] = useState<Record<string, string | null>>({});
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCopilotBanner, setShowCopilotBanner] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetchingPhotos = useRef<Set<string>>(new Set());

  // ── Foto do contato ───────────────────────────────────────────────────────

  const fetchPhoto = useCallback(async (telefone?: string | null) => {
    if (!telefone) return;
    const numero = cleanPhone(telefone);
    if (!numero) return;
    if (fetchingPhotos.current.has(numero)) return;
    if (contactPhotos[numero] !== undefined) return;

    fetchingPhotos.current.add(numero);
    try {
      const res = await fetch(`/api/whatsapp/foto/${numero}`);
      const data = await res.json();
      setContactPhotos(prev => ({ ...prev, [numero]: data.pictureUrl || null }));
    } catch {
      setContactPhotos(prev => ({ ...prev, [numero]: null }));
    } finally {
      fetchingPhotos.current.delete(numero);
    }
  }, [contactPhotos]);

  // ── Conversas (polling 5s) ────────────────────────────────────────────────

  const fetchConversations = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await conversationService.getConversations();
      setConversations(data);
      setError(null);
      setSelectedChat(prev => (prev ? (data.find(c => String(c.id) === String(prev.id)) || prev) : (data[0] ?? null)));

      // Popula fotos conhecidas dos chats imediatamente
      const initialPhotos: Record<string, string | null> = {};
      data.forEach(chat => {
        const phone = (chat as any).telefone || chat.contato_telefone;
        const photo = (chat as any).foto_url || (chat as any).foto;
        const num = cleanPhone(phone);
        if (num && photo) {
          initialPhotos[num] = normalizePhotoUrl(photo);
        } else if (phone) {
          fetchPhoto(phone);
        }
      });
      if (Object.keys(initialPhotos).length > 0) {
        setContactPhotos(prev => ({ ...prev, ...initialPhotos }));
      }
    } catch {
      setError('Não foi possível carregar as conversas.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [fetchPhoto]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => fetchConversations(false), 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // ── Foto do chat selecionado ───────────────────────────────────────────────

  useEffect(() => {
    fetchPhoto(selectedChat?.contato_telefone);
  }, [selectedChat?.contato_telefone, fetchPhoto]);

  // ── Mensagens (polling 3s quando chat aberto) ─────────────────────────────

  useEffect(() => {
    if (!selectedChat) return;
    let mounted = true;

    const fetchMessages = async () => {
      try {
        const data = await conversationService.getMessages(selectedChat.id);
        if (mounted) setMessages(data);
      } catch (err) {
        console.error('[mensagens]', err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [selectedChat?.id]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Envio ─────────────────────────────────────────────────────────────────

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const text = (customText ?? newMessage).trim();
    if (!text || !selectedChat) return;

    setNewMessage('');

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversa_id: selectedChat.id,
      mensagem: text,
      de_mim: true,
      data: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      await conversationService.sendMessage(selectedChat.id, text);
      const updated = await conversationService.getMessages(selectedChat.id);
      setMessages(updated);
    } catch (err) {
      console.error('[sendMessage]', err);
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
  };

  // ── Excluir Conversa ───────────────────────────────────────────────────────

  const handleDeleteConversation = async () => {
    if (!chatToDelete) return;
    setIsDeleting(true);
    try {
      await conversationService.deleteConversation(chatToDelete.id);
      setConversations(prev => prev.filter(c => String(c.id) !== String(chatToDelete.id)));
      if (selectedChat?.id === chatToDelete.id) {
        setSelectedChat(null);
        setMessages([]);
      }
      setChatToDelete(null);
    } catch (err) {
      console.error('[deleteConversation]', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Filtro ────────────────────────────────────────────────────────────────

  const filteredConversations = conversations.filter(c =>
    displayName(c.contato_nome, c.contato_telefone).toLowerCase().includes(search.toLowerCase()) ||
    cleanPhone(c.contato_telefone).includes(search)
  );

  const quickReplies = [
    'Olá! Como posso ajudar você hoje?',
    'Recebemos sua mensagem e já estamos verificando para você.',
    'Temos horários disponíveis nesta semana. Deseja agendar?',
    'Agradecemos o contato! Ficamos à disposição.'
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-zinc-200/60 rounded-xl w-64" />
        <div className="h-[calc(100vh-170px)] min-h-[580px] bg-white rounded-2xl border border-zinc-200/80 flex">
          <div className="w-80 border-r border-zinc-200 p-4 space-y-3">
            <div className="h-8 bg-zinc-100 rounded-lg" />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-zinc-50 rounded-xl" />
            ))}
          </div>
          <div className="flex-1 p-6 space-y-4">
            <div className="h-12 bg-zinc-100 rounded-xl" />
            <div className="h-64 bg-zinc-50 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Sub Header / Telemetry ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
            <span>Conversas em Tempo Real</span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
              WHATSAPP API
            </span>
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Central de atendimento integrada com IA e sincronização direta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchConversations(true)}
            disabled={refreshing}
            className="px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Sincronizar conversas agora"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-600' : 'text-zinc-500'} />
            <span>{refreshing ? 'Sincronizando...' : 'Atualizar'}</span>
          </button>
          <button
            onClick={() => navigate('/contatos')}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            Ver Contatos
          </button>
        </div>
      </div>

      {/* ── Main Frame ── */}
      <div className="h-[calc(100vh-185px)] min-h-[580px] flex flex-col md:flex-row bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden">
        
        {/* ── Sidebar de Conversas ── */}
        <div className="w-full md:w-80 lg:w-88 border-r border-zinc-200/90 flex flex-col bg-zinc-50/40 shrink-0">
          
          {/* Header da Sidebar */}
          <div className="p-4 border-b border-zinc-200/80 bg-white">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-zinc-500">Inbox</span>
                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {filteredConversations.length}
                </span>
              </div>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Buscar por nome ou número..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Lista de Conversas */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {error && (
              <div className="p-5 text-center">
                <div className="bg-rose-50 border border-rose-200/80 text-rose-700 p-3 rounded-lg text-xs font-mono mb-3">
                  {error}
                </div>
                <button
                  onClick={() => fetchConversations(true)}
                  className="text-zinc-700 font-mono text-xs hover:text-zinc-950 underline cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            )}

            {!error && filteredConversations.length === 0 && (
              <div className="p-8 text-center text-zinc-400">
                <MessageSquare size={28} className="mx-auto mb-2 text-zinc-300" />
                <p className="text-xs font-medium text-zinc-500">Nenhuma conversa encontrada</p>
                <p className="text-[11px] text-zinc-400 font-mono mt-1">Aguardando novas mensagens</p>
              </div>
            )}

            {filteredConversations.map(chat => {
              const temp = getTempChip(chat.lead_temperature);
              const isActive = selectedChat?.id === chat.id;
              const phone = (chat as any).telefone || chat.contato_telefone;
              const numero = cleanPhone(phone);
              const foto = normalizePhotoUrl((chat as any).foto_url || (chat as any).foto || (numero ? contactPhotos[numero] : null));
              const nome = displayName(chat.contato_nome, phone);

              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`group w-full p-3.5 flex items-start gap-3 transition-colors cursor-pointer relative ${
                    isActive
                      ? 'bg-white border-l-2 border-emerald-500 shadow-2xs z-10'
                      : 'hover:bg-zinc-100/70'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      nome={nome}
                      foto={foto}
                      className="w-10 h-10 rounded-lg text-sm"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white bg-emerald-500" />
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`text-xs font-bold truncate ${isActive ? 'text-zinc-950' : 'text-zinc-800'}`}>
                        {nome}
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0 ml-1">
                        {chat.ultima_data ? format(safeDate(chat.ultima_data), 'HH:mm') : '--:--'}
                      </span>
                    </div>

                    <p className="font-mono text-[10px] text-zinc-400 mb-1">{numero}</p>

                    <p className="text-xs text-zinc-600 truncate font-normal leading-relaxed">
                      {chat.ultima_mensagem || 'Nenhuma mensagem recente'}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-100/60">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded ${temp.color}`}>
                          {temp.label}
                        </span>
                        {chat.status && (
                          <span className="text-[9px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200/80 px-1.5 py-0.2 rounded uppercase">
                            {chat.status}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatToDelete(chat);
                        }}
                        title="Excluir conversa"
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Chat Viewport ── */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {selectedChat ? (
            <>
              {/* Top Header do Chat Ativo */}
              <div className="h-16 border-b border-zinc-200/90 px-5 lg:px-6 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {(() => {
                    const phone = (selectedChat as any).telefone || selectedChat.contato_telefone;
                    const numero = cleanPhone(phone);
                    const foto = normalizePhotoUrl((selectedChat as any).foto_url || (selectedChat as any).foto || (numero ? contactPhotos[numero] : null));
                    const nome = displayName(selectedChat.contato_nome, phone);
                    return (
                      <Avatar
                        nome={nome}
                        foto={foto}
                        className="w-10 h-10 rounded-lg text-sm"
                      />
                    );
                  })()}
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-zinc-900 truncate">
                      {displayName(selectedChat.contato_nome, (selectedChat as any).telefone || selectedChat.contato_telefone)}
                    </h3>
                    <p className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-emerald-600 font-medium">WhatsApp Conectado</span>
                      <span className="text-zinc-300">•</span>
                      <span>{cleanPhone((selectedChat as any).telefone || selectedChat.contato_telefone)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/agenda')}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200/70 text-zinc-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    title="Ir para a Agenda"
                  >
                    <Calendar size={13} className="text-zinc-600" />
                    <span>Agendar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatToDelete(selectedChat)}
                    title="Excluir conversa"
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* AI Copilot Context Bar (Obsidian Theme) */}
              {showCopilotBanner && (
                <div className="mx-5 lg:mx-6 mt-3 p-3 bg-[#0A0D14] rounded-xl border border-zinc-800 text-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-emerald-400 shrink-0">
                      <Sparkles size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-semibold text-emerald-400 tracking-wider uppercase">
                          AI Copilot // Contexto
                        </span>
                        <span className="text-zinc-600 font-mono text-[9px]">•</span>
                        <span className="font-mono text-[9px] text-zinc-400">
                          {selectedChat.ultima_data
                            ? `Último contato ${format(safeDate(selectedChat.ultima_data), "dd/MM 'às' HH:mm", { locale: ptBR })}`
                            : 'Novo lead'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 truncate">
                        Conversando com <strong className="text-white font-medium">{displayName(selectedChat.contato_nome, selectedChat.contato_telefone)}</strong>. Atendimento orquestrado com resposta inteligente.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => setNewMessage('Olá! Recebemos sua mensagem e já estamos conferindo aqui para você.')}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-md font-mono text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap size={11} className="text-emerald-400" />
                      Sugerir Resposta
                    </button>
                    <button
                      onClick={() => setShowCopilotBanner(false)}
                      className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Fechar barra de contexto"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Área de Mensagens (Estilo Corporativo / Obsidian) */}
              <div className="flex-1 overflow-y-auto p-5 lg:p-6 space-y-3 bg-[#F8FAFC]">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2">
                    <MessageSquare size={32} className="text-zinc-300" />
                    <p className="text-xs font-mono">Nenhuma mensagem registrada nesta conversa.</p>
                  </div>
                )}

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.de_mim ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[75%] lg:max-w-[65%]">
                      <div
                        className={`p-3.5 rounded-2xl shadow-2xs ${
                          msg.de_mim
                            ? 'bg-zinc-900 text-zinc-100 rounded-tr-xs border border-zinc-800'
                            : 'bg-white text-zinc-800 rounded-tl-xs border border-zinc-200/90'
                        }`}
                      >
                        {/* Se a mensagem for ou contiver imagem anexada */}
                        {((msg as any).media_url || (msg as any).mediaUrl || (msg as any).foto) && (
                          <div className="mb-2">
                            <img
                              src={normalizePhotoUrl((msg as any).media_url || (msg as any).mediaUrl || (msg as any).foto)}
                              alt="Mídia"
                              referrerPolicy="no-referrer"
                              className="rounded-xl max-w-full max-h-72 object-cover cursor-pointer hover:opacity-95 transition"
                              onClick={() => window.open(normalizePhotoUrl((msg as any).media_url || (msg as any).mediaUrl || (msg as any).foto), '_blank')}
                            />
                          </div>
                        )}

                        {isImageUrl(msg.mensagem) ? (
                          <div className="my-1">
                            <img
                              src={normalizePhotoUrl(msg.mensagem)}
                              alt="Foto"
                              referrerPolicy="no-referrer"
                              className="rounded-xl max-w-full max-h-72 object-cover cursor-pointer hover:opacity-95 transition"
                              onClick={() => window.open(normalizePhotoUrl(msg.mensagem), '_blank')}
                            />
                          </div>
                        ) : (
                          <p className="text-xs leading-relaxed font-normal whitespace-pre-wrap selection:bg-zinc-700">
                            {msg.mensagem}
                          </p>
                        )}
                        <div
                          className={`flex items-center justify-end gap-1.5 mt-1 font-mono text-[10px] ${
                            msg.de_mim ? 'text-zinc-400' : 'text-zinc-400'
                          }`}
                        >
                          <span>{format(safeDate(msg.data), 'HH:mm')}</span>
                          {msg.de_mim && (
                            <CheckCheck size={13} className="text-emerald-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer / Barra de Envio */}
              <div className="p-4 bg-white border-t border-zinc-200/90 shrink-0 space-y-2.5">
                {/* Respostas Rápidas */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="font-mono text-[10px] text-zinc-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
                    <Zap size={11} className="text-emerald-500" />
                    Atalhos:
                  </span>
                  {quickReplies.map((qr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(undefined, qr)}
                      className="px-2.5 py-1 rounded-md bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200 text-[11px] whitespace-nowrap transition-colors cursor-pointer"
                    >
                      {qr}
                    </button>
                  ))}
                </div>

                {/* Form de Mensagem */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2 bg-zinc-50 p-1.5 rounded-xl border border-zinc-200 focus-within:ring-1 focus-within:ring-zinc-400 focus-within:bg-white transition-all"
                >
                  <input
                    type="text"
                    placeholder="Digite sua resposta ou use os atalhos acima..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage(e as any)}
                    className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-zinc-900 placeholder:text-zinc-400 px-3 py-2"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg flex items-center gap-1.5 text-xs font-semibold font-mono transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center bg-[#F8FAFC]">
              <div className="w-16 h-16 bg-white rounded-2xl border border-zinc-200 flex items-center justify-center mb-4 text-zinc-400 shadow-2xs">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-base font-bold text-zinc-900 tracking-tight mb-1">
                Selecione uma Conversa
              </h3>
              <p className="max-w-sm text-xs text-zinc-500 font-mono leading-relaxed">
                Escolha um contato na lista lateral para visualizar o histórico de mensagens, interagir via WhatsApp e utilizar o copilot de IA.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de Confirmação de Exclusão ── */}
      {chatToDelete && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-zinc-200">
            <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">Excluir Conversa</h3>
            <p className="text-xs text-zinc-600 font-medium leading-relaxed mb-5">
              Tem certeza que deseja excluir a conversa com{' '}
              <strong className="text-zinc-900 font-semibold">
                {displayName(chatToDelete.contato_nome, chatToDelete.contato_telefone)}
              </strong>
              ? O registro será removido da lista do painel.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setChatToDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer border border-zinc-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConversation}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsPage;

