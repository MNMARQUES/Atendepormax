import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { atendenteService } from '../services/api';
import { Agendamento, Servico, Profissional } from '../types';
import {
  Calendar as CalendarIcon, Clock, User, CheckCircle2, XCircle,
  Search, Plus, ChevronRight, ChevronLeft, LayoutGrid, List,
  CalendarDays, Scissors, Phone, Trash2, Check, RefreshCw,
  Sparkles, MessageSquare, ArrowRight, Filter
} from 'lucide-react';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, addDays, subDays, addWeeks, subWeeks, addMonths,
  subMonths, isSameDay, isSameMonth, getHours, getMinutes, isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

// Parser seguro para datas ISO
const parseSafeDate = (isoString?: string | null): Date => {
  if (!isoString) return new Date();
  const d = new Date(isoString);
  return isNaN(d.getTime()) ? new Date() : d;
};

// ── Paletas de cores para diferenciação visual por Profissional ──
export interface ProfessionalTheme {
  id: string;
  label: string;
  bg: string;
  hoverBg: string;
  border: string;
  borderAccent: string;
  text: string;
  darkText: string;
  badgeBg: string;
  badgeText: string;
  dot: string;
  accentBg: string;
}

const PROFESSIONAL_PALETTES: ProfessionalTheme[] = [
  {
    id: 'emerald',
    label: 'Esmeralda',
    bg: 'bg-emerald-50/95',
    hoverBg: 'hover:bg-emerald-100',
    border: 'border-emerald-200',
    borderAccent: 'border-l-emerald-600',
    text: 'text-emerald-950',
    darkText: 'text-emerald-700',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    dot: 'bg-emerald-500',
    accentBg: 'bg-emerald-600',
  },
  {
    id: 'indigo',
    label: 'Índigo',
    bg: 'bg-indigo-50/95',
    hoverBg: 'hover:bg-indigo-100',
    border: 'border-indigo-200',
    borderAccent: 'border-l-indigo-600',
    text: 'text-indigo-950',
    darkText: 'text-indigo-700',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    dot: 'bg-indigo-500',
    accentBg: 'bg-indigo-600',
  },
  {
    id: 'amber',
    label: 'Âmbar',
    bg: 'bg-amber-50/95',
    hoverBg: 'hover:bg-amber-100',
    border: 'border-amber-200',
    borderAccent: 'border-l-amber-500',
    text: 'text-amber-950',
    darkText: 'text-amber-700',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    dot: 'bg-amber-500',
    accentBg: 'bg-amber-500',
  },
  {
    id: 'purple',
    label: 'Roxo',
    bg: 'bg-purple-50/95',
    hoverBg: 'hover:bg-purple-100',
    border: 'border-purple-200',
    borderAccent: 'border-l-purple-600',
    text: 'text-purple-950',
    darkText: 'text-purple-700',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    dot: 'bg-purple-500',
    accentBg: 'bg-purple-600',
  },
  {
    id: 'rose',
    label: 'Rosa',
    bg: 'bg-rose-50/95',
    hoverBg: 'hover:bg-rose-100',
    border: 'border-rose-200',
    borderAccent: 'border-l-rose-500',
    text: 'text-rose-950',
    darkText: 'text-rose-700',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    dot: 'bg-rose-500',
    accentBg: 'bg-rose-500',
  },
  {
    id: 'cyan',
    label: 'Ciano',
    bg: 'bg-cyan-50/95',
    hoverBg: 'hover:bg-cyan-100',
    border: 'border-cyan-200',
    borderAccent: 'border-l-cyan-600',
    text: 'text-cyan-950',
    darkText: 'text-cyan-700',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-800',
    dot: 'bg-cyan-500',
    accentBg: 'bg-cyan-600',
  },
  {
    id: 'orange',
    label: 'Laranja',
    bg: 'bg-orange-50/95',
    hoverBg: 'hover:bg-orange-100',
    border: 'border-orange-200',
    borderAccent: 'border-l-orange-500',
    text: 'text-orange-950',
    darkText: 'text-orange-700',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    dot: 'bg-orange-500',
    accentBg: 'bg-orange-500',
  },
];

const UNASSIGNED_THEME: ProfessionalTheme = {
  id: 'slate',
  label: 'Não Atribuído',
  bg: 'bg-slate-50/95',
  hoverBg: 'hover:bg-slate-100',
  border: 'border-slate-200',
  borderAccent: 'border-l-slate-400',
  text: 'text-slate-800',
  darkText: 'text-slate-600',
  badgeBg: 'bg-slate-200',
  badgeText: 'text-slate-700',
  dot: 'bg-slate-400',
  accentBg: 'bg-slate-500',
};

// Atribuição estável e determinística de tema por profissional
const getProfTheme = (
  profId?: number | null,
  profName?: string | null,
  profList: Profissional[] = []
): ProfessionalTheme => {
  if (!profId && !profName) return UNASSIGNED_THEME;

  // 1. Procura na lista de profissionais carregada do banco
  let index = -1;
  if (profId) {
    index = profList.findIndex(p => Number(p.id) === Number(profId));
  }
  if (index === -1 && profName) {
    index = profList.findIndex(
      p => (p.nome || '').toLowerCase().trim() === profName.toLowerCase().trim()
    );
  }
  if (index !== -1) {
    return PROFESSIONAL_PALETTES[index % PROFESSIONAL_PALETTES.length];
  }

  // 2. Caso não esteja na lista, gera um hash estável pelo nome ou ID
  const key = String(profId || profName || '');
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  return PROFESSIONAL_PALETTES[positiveHash % PROFESSIONAL_PALETTES.length];
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  agendado:   { label: 'Agendado',   bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200' },
  confirmado: { label: 'Confirmado', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  concluido:  { label: 'Concluído',  bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400',   border: 'border-slate-200' },
  cancelado:  { label: 'Cancelado',  bg: 'bg-rose-50',    text: 'text-rose-700',   dot: 'bg-rose-500',   border: 'border-rose-200' },
  pendente:   { label: 'Pendente',   bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500',  border: 'border-amber-200' },
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8h → 20h

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const AppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Agendamento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [profFilter, setProfFilter] = useState<string>('todos');
  const [selectedApp, setSelectedApp] = useState<Agendamento | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Modal Novo Agendamento
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newForm, setNewForm] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    servico_id: '',
    profissional_id: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: '14:00',
    observacao: '',
  });

  // Carregar dados
  const fetchAppointments = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const [appData, srvData, profData] = await Promise.all([
        atendenteService.getAgendamentos().catch(() => []),
        atendenteService.getServicos().catch(() => []),
        atendenteService.getProfissionais().catch(() => []),
      ]);
      const srvList: Servico[] = Array.isArray(srvData) ? srvData : [];
      const profList: Profissional[] = Array.isArray(profData) ? profData : [];
      const rawApps: Agendamento[] = Array.isArray(appData) ? appData : [];

      const enriched = rawApps.map(a => {
        const prof = profList.find(p => Number(p.id) === Number(a.profissional_id));
        const srv = srvList.find(s => Number(s.id) === Number(a.servico_id));
        return {
          ...a,
          profissional_nome: prof?.nome || a.profissional_nome || 'Profissional',
          servico_nome: a.servico_nome || srv?.nome || (a.servico_id === 1 ? 'Extração de Dente' : a.servico_id === 3 ? 'Obturação' : a.servico_id === 4 ? 'Canal' : 'Limpeza Dental'),
          servico_duracao: a.servico_duracao || (a as any).duracao_minutos || srv?.duracao_minutos || 30,
          cliente_nome: a.cliente_nome || (a as any).contato_nome || a.contato?.nome || 'Cliente',
          cliente_telefone: a.cliente_telefone || (a as any).contato_telefone || a.contato?.telefone || '',
        };
      });

      setAppointments(enriched);
      setServicos(srvList);
      setProfissionais(profList);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    const timer = setInterval(() => {
      fetchAppointments(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchAppointments]);

  // Cálculos para o Mês
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Segunda
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Cálculos para a Semana
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i)); // Seg → Dom
  }, [currentDate]);

  // Contagem de agendamentos por profissional para a legenda
  const profCounts = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach(a => {
      const key = a.profissional_id
        ? String(a.profissional_id)
        : a.profissional_nome
        ? `nome:${a.profissional_nome.toLowerCase()}`
        : 'sem';
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [appointments]);

  // Agendamentos filtrados
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      const s = search.toLowerCase();
      const matchSearch =
        !search ||
        (a.cliente_nome || '').toLowerCase().includes(s) ||
        (a.cliente_telefone || '').includes(s) ||
        (a.servico_nome || '').toLowerCase().includes(s) ||
        (a.profissional_nome || '').toLowerCase().includes(s);

      const matchStatus = statusFilter === 'todos' || a.status === statusFilter;

      let matchProf = true;
      if (profFilter !== 'todos') {
        if (profFilter === 'sem') {
          matchProf = !a.profissional_id && !a.profissional_nome;
        } else {
          const matchById = a.profissional_id && String(a.profissional_id) === profFilter;
          const matchByName =
            a.profissional_nome &&
            a.profissional_nome.toLowerCase().trim() === profFilter.toLowerCase().trim();
          matchProf = Boolean(matchById || matchByName);
        }
      }

      return matchSearch && matchStatus && matchProf;
    });
  }, [appointments, search, statusFilter, profFilter]);

  // Função auxiliar para agendamentos por dia
  const getAppointmentsForDay = useCallback(
    (day: Date) => {
      return filteredAppointments.filter(a => {
        try {
          return isSameDay(parseSafeDate(a.data_hora), day);
        } catch {
          return false;
        }
      });
    },
    [filteredAppointments]
  );

  // Próximo agendamento futuro
  const nextAppointment = useMemo(() => {
    const now = new Date();
    const future = appointments
      .filter(a => {
        const d = parseSafeDate(a.data_hora);
        return d >= now && a.status !== 'cancelado';
      })
      .sort((a, b) => parseSafeDate(a.data_hora).getTime() - parseSafeDate(b.data_hora).getTime());
    return future[0] || null;
  }, [appointments]);

  // Navegação
  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(d => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => subDays(d, 7));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(d => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addDays(d, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleJumpToDate = (targetDate: Date) => {
    setCurrentDate(targetDate);
    setViewMode('week');
  };

  // Ações de status
  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await atendenteService.updateAgendamentoStatus(id, newStatus);
      setAppointments(prev =>
        prev.map(a => (a.id === id ? { ...a, status: newStatus as any } : a))
      );
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp(prev => (prev ? { ...prev, status: newStatus as any } : null));
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Salvar novo agendamento
  const handleCreateAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.cliente_nome.trim() || !newForm.data || !newForm.hora) {
      alert('Preencha o nome do cliente, data e horário.');
      return;
    }

    setIsSaving(true);
    try {
      const data_hora = `${newForm.data}T${newForm.hora}:00.000Z`;
      const servicoObj = servicos.find(s => String(s.id) === String(newForm.servico_id));
      const profObj = profissionais.find(p => String(p.id) === String(newForm.profissional_id));

      const payload = {
        cliente_nome: newForm.cliente_nome,
        cliente_telefone: newForm.cliente_telefone,
        servico_id: newForm.servico_id ? Number(newForm.servico_id) : null,
        servico_nome: servicoObj?.nome || null,
        servico_preco: servicoObj?.preco || null,
        servico_duracao: servicoObj?.duracao_minutos || 60,
        profissional_id: newForm.profissional_id ? Number(newForm.profissional_id) : null,
        profissional_nome: profObj?.nome || null,
        data_hora,
        status: 'confirmado',
        observacao: newForm.observacao || 'Agendamento manual',
      };

      const created = await atendenteService.saveAgendamento(payload);
      setAppointments(prev => [created, ...prev]);
      setShowNewModal(false);
      setNewForm({
        cliente_nome: '',
        cliente_telefone: '',
        servico_id: '',
        profissional_id: '',
        data: format(new Date(), 'yyyy-MM-dd'),
        hora: '14:00',
        observacao: '',
      });
      setCurrentDate(new Date(data_hora));
    } catch (err) {
      console.error('Erro ao salvar agendamento:', err);
      alert('Não foi possível salvar o agendamento.');
    } finally {
      setIsSaving(false);
    }
  };

  const monthLabel = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-12 bg-slate-200/60 rounded-2xl w-72" />
        <div className="h-[600px] bg-slate-100/70 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Header Principal ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Agenda</h1>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
              {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''} no banco
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Visualização de horários com diferenciação de cores e identificação de cada profissional.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botão de sincronizar manual */}
          <button
            onClick={() => fetchAppointments()}
            disabled={isRefreshing}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs flex items-center gap-1.5 text-xs font-semibold"
            title="Recarregar agendamentos do banco"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-indigo-600' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          {/* Toggle de visualização (Mês, Semana, Lista) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/70">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'month'
                  ? 'bg-white shadow-xs text-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarDays size={14} />
              Mês
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'week'
                  ? 'bg-white shadow-xs text-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={14} />
              Semana
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white shadow-xs text-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List size={14} />
              Lista
            </button>
          </div>

          {/* Botão Novo Agendamento */}
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
          >
            <Plus size={15} />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* ── Banner de Próximo Agendamento ── */}
      {nextAppointment && (
        (() => {
          const profTheme = getProfTheme(
            nextAppointment.profissional_id,
            nextAppointment.profissional_nome,
            profissionais
          );
          return (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl ${profTheme.accentBg} text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-black/10`}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">
                      Próximo Agendamento:
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {nextAppointment.cliente_nome || 'Cliente'}
                    </span>
                    {/* Badge destacado do profissional */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${profTheme.badgeBg} ${profTheme.badgeText} ${profTheme.border}`}>
                      <span className={`w-2 h-2 rounded-full ${profTheme.dot}`} />
                      Profissional: {nextAppointment.profissional_nome || 'Não Atribuído'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1 flex-wrap">
                    <Clock size={12} className="text-indigo-500" />
                    {format(parseSafeDate(nextAppointment.data_hora), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    {nextAppointment.servico_nome && (
                      <span className="text-slate-500 font-medium">
                        · Serviço: <strong>{nextAppointment.servico_nome}</strong>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleJumpToDate(parseSafeDate(nextAppointment.data_hora))}
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-xs ml-auto sm:ml-0"
                >
                  Ver no Calendário
                  <ArrowRight size={13} />
                </button>
                <button
                  onClick={() => setSelectedApp(nextAppointment)}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Detalhes
                </button>
              </div>
            </div>
          );
        })()
      )}

      {/* ── LEGENDA DE PROFISSIONAIS (Cores e Filtros Rápidos) ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-slate-500" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Legenda por Profissional
            </span>
            <span className="text-[11px] text-slate-400">
              (Clique em um profissional para filtrar a agenda)
            </span>
          </div>

          {profFilter !== 'todos' && (
            <button
              onClick={() => setProfFilter('todos')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 self-start sm:self-auto"
            >
              <XCircle size={13} />
              Limpar filtro de profissional
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão Todos */}
          <button
            onClick={() => setProfFilter('todos')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              profFilter === 'todos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Todos os Profissionais</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {appointments.length}
            </span>
          </button>

          {/* Chips de cada Profissional cadastrado */}
          {profissionais.map(prof => {
            const theme = getProfTheme(prof.id, prof.nome, profissionais);
            const count = (prof.id && profCounts[String(prof.id)]) || (prof.nome && profCounts[`nome:${prof.nome.toLowerCase()}`]) || 0;
            const isSelected = profFilter === String(prof.id) || profFilter.toLowerCase() === prof.nome.toLowerCase();

            return (
              <button
                key={prof.id}
                onClick={() => setProfFilter(isSelected ? 'todos' : String(prof.id))}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                  isSelected
                    ? `${theme.badgeBg} ${theme.badgeText} ring-2 ring-indigo-500 shadow-xs border-indigo-300`
                    : `${theme.bg} ${theme.darkText} ${theme.border} hover:opacity-90`
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${theme.dot} ring-2 ring-white`} />
                <span>{prof.nome}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${theme.badgeBg} ${theme.badgeText}`}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Chip para não atribuído / sem profissional, caso exista */}
          {(profCounts['sem'] || 0) > 0 && (
            <button
              onClick={() => setProfFilter(profFilter === 'sem' ? 'todos' : 'sem')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                profFilter === 'sem'
                  ? 'bg-slate-300 text-slate-900 ring-2 ring-slate-500'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Sem Profissional</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200">
                {profCounts['sem']}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Barra de Navegação e Filtro de Status ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        {/* Controles de Navegação no Tempo */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-all border border-slate-200/60"
              title="Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-bold rounded-xl text-slate-700 hover:bg-slate-100 transition-all border border-slate-200/60"
            >
              Hoje
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-all border border-slate-200/60"
              title="Próximo"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <h2 className="text-base font-black text-slate-800 capitalize tracking-tight">
            {monthLabel}
          </h2>
        </div>

        {/* Busca e Filtro de Status */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar cliente, serviço..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
            />
          </div>

          {/* Filtros de Status */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {['todos', 'confirmado', 'agendado', 'concluido', 'cancelado'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all whitespace-nowrap ${
                  statusFilter === s
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          1. VISUALIZAÇÃO MENSAL (MONTH VIEW)
      ══════════════════════════════════════════════════════════ */}
      {viewMode === 'month' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* Dias da semana no topo (Seg a Dom) */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center">
            {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(day => (
              <div key={day} className="py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-500 border-r border-slate-200/60 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Grid de Dias do Mês */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {monthDays.map(day => {
              const dayAppointments = getAppointmentsForDay(day);
              const inCurrentMonth = isSameMonth(day, currentDate);
              const today = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleJumpToDate(day)}
                  className={`min-h-[135px] p-2 transition-all group flex flex-col justify-between hover:bg-slate-50/70 cursor-pointer ${
                    !inCurrentMonth ? 'bg-slate-50/30 text-slate-300' : 'bg-white text-slate-800'
                  } ${today ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/20' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        today
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : !inCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-700 group-hover:bg-slate-100'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-900 text-white">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  {/* Lista de cards de agendamento no dia com diferenciação visual por profissional */}
                  <div className="space-y-1.5 mt-1.5 flex-1 overflow-y-auto max-h-[120px] pr-0.5">
                    {dayAppointments.map(app => {
                      const theme = getProfTheme(app.profissional_id, app.profissional_nome, profissionais);

                      return (
                        <div
                          key={app.id}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedApp(app);
                          }}
                          className={`p-2 rounded-xl border border-l-4 text-left transition-all hover:scale-[1.02] shadow-xs cursor-pointer ${theme.bg} ${theme.border} ${theme.borderAccent} ${theme.hoverBg}`}
                        >
                          {/* Topo do card: Profissional em destaque com tag colorida e horário */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black truncate ${theme.badgeBg} ${theme.badgeText}`}>
                              <User size={10} className="shrink-0" />
                              <span className="truncate">{app.profissional_nome || 'Sem Profissional'}</span>
                            </span>
                            <span className="text-[10px] font-black text-slate-600 shrink-0">
                              {format(parseSafeDate(app.data_hora), 'HH:mm')}
                            </span>
                          </div>

                          {/* Nome do Cliente */}
                          <p className={`font-bold text-xs truncate ${theme.text}`}>
                            {app.cliente_nome || 'Cliente'}
                          </p>

                          {/* Serviço agendado */}
                          {app.servico_nome && (
                            <p className={`text-[10px] font-semibold opacity-90 truncate mt-0.5 flex items-center gap-1 ${theme.darkText}`}>
                              <Scissors size={9} className="shrink-0" />
                              {app.servico_nome}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          2. VISUALIZAÇÃO SEMANAL (WEEK VIEW)
      ══════════════════════════════════════════════════════════ */}
      {viewMode === 'week' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* Cabeçalho dos 7 dias da semana */}
          <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: '70px repeat(7, 1fr)' }}>
            <div className="border-r border-slate-200 bg-slate-50/60" />
            {weekDays.map(day => {
              const today = isToday(day);
              const appsCount = getAppointmentsForDay(day).length;
              return (
                <div
                  key={day.toISOString()}
                  className={`py-3 px-2 text-center border-r border-slate-200 last:border-r-0 ${
                    today ? 'bg-indigo-50/60' : 'bg-white'
                  }`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-wider ${today ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {format(day, 'EEE', { locale: ptBR })}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className={`text-base font-black ${today ? 'text-indigo-600' : 'text-slate-800'}`}>
                      {format(day, 'd')}
                    </span>
                    {appsCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grade horária */}
          <div className="relative overflow-y-auto" style={{ maxHeight: '640px' }}>
            <div className="grid" style={{ gridTemplateColumns: '70px repeat(7, 1fr)' }}>
              {/* Coluna com as horas */}
              <div className="flex flex-col bg-slate-50/40 border-r border-slate-100">
                {HOURS.map(h => (
                  <div key={h} className="h-16 border-b border-slate-100 flex items-start justify-end pr-2.5 pt-1.5">
                    <span className="text-[11px] font-bold text-slate-400">{h}:00</span>
                  </div>
                ))}
              </div>

              {/* Colunas dos dias */}
              {weekDays.map(day => {
                const dayApps = getAppointmentsForDay(day);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`relative border-r border-slate-100 last:border-r-0 ${
                      today ? 'bg-indigo-50/10' : ''
                    }`}
                    style={{ height: `${HOURS.length * 64}px` }}
                  >
                    {/* Linhas das horas */}
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className="absolute w-full border-b border-slate-100"
                        style={{ top: `${(h - 8) * 64}px`, height: '64px' }}
                      />
                    ))}

                    {/* Agendamentos na coluna semanal com a cor do profissional */}
                    {dayApps.map(app => {
                      const d = parseSafeDate(app.data_hora);
                      const h = getHours(d) - 8;
                      const m = getMinutes(d);
                      const topPx = Math.max(0, h * 64 + (m / 60) * 64);
                      const durationMinutes = Number(app.servico_duracao) || 60;
                      const heightPx = Math.max(56, (durationMinutes / 60) * 64);
                      const theme = getProfTheme(app.profissional_id, app.profissional_nome, profissionais);

                      return (
                        <button
                          key={app.id}
                          onClick={() => setSelectedApp(app)}
                          className={`absolute left-1 right-1 rounded-xl p-2.5 text-left transition-all hover:scale-[1.02] hover:z-20 shadow-md border border-l-4 ${theme.bg} ${theme.border} ${theme.borderAccent} overflow-hidden flex flex-col justify-between`}
                          style={{ top: `${topPx}px`, height: `${heightPx}px`, zIndex: 10 }}
                        >
                          <div>
                            {/* Nome do Profissional com badge destacado */}
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black truncate ${theme.badgeBg} ${theme.badgeText}`}>
                                <User size={10} className="shrink-0" />
                                <span className="truncate">{app.profissional_nome || 'Sem profissional'}</span>
                              </span>
                              <span className="text-[10px] font-black text-slate-700 shrink-0">
                                {format(d, 'HH:mm')}
                              </span>
                            </div>

                            <p className={`text-xs font-black truncate ${theme.text}`}>
                              {app.cliente_nome || 'Cliente'}
                            </p>

                            {app.servico_nome && (
                              <p className={`text-[10px] font-semibold opacity-90 truncate mt-0.5 flex items-center gap-1 ${theme.darkText}`}>
                                <Scissors size={9} className="shrink-0" />
                                {app.servico_nome}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 pt-1 border-t border-black/5 mt-auto">
                            <span>{durationMinutes} min</span>
                            <span className="uppercase text-[8px] font-black tracking-wider px-1.5 py-0.2 bg-white/80 rounded-md border border-black/5">
                              {app.status}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          3. VISUALIZAÇÃO EM LISTA (LIST VIEW)
      ══════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <CalendarIcon size={44} className="mb-3 text-slate-300" />
              <p className="font-bold text-slate-700">Nenhum agendamento encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Verifique os filtros ou busque por outro termo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Cliente</th>
                    <th className="px-4 py-3.5">Profissional Responsável</th>
                    <th className="px-4 py-3.5">Serviço</th>
                    <th className="px-4 py-3.5">Data & Hora</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredAppointments.map(app => {
                    const d = parseSafeDate(app.data_hora);
                    const theme = getProfTheme(app.profissional_id, app.profissional_nome, profissionais);

                    return (
                      <tr
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                              {(app.cliente_nome || 'C')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-xs sm:text-sm">{app.cliente_nome || 'Cliente'}</p>
                              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone size={10} />
                                {app.cliente_telefone || '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Coluna do Profissional com badge e cor */}
                        <td className="px-4 py-3.5 text-xs">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border ${theme.badgeBg} ${theme.badgeText} ${theme.border}`}>
                            <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
                            {app.profissional_nome || 'Não atribuído'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {app.servico_nome ? (
                            <span className="flex items-center gap-1.5 font-medium">
                              <Scissors size={12} className="text-indigo-400" />
                              {app.servico_nome}
                            </span>
                          ) : '—'}
                        </td>

                        <td className="px-4 py-3.5 text-xs">
                          <p className="font-bold text-slate-800">
                            {format(d, 'dd/MM/yyyy')}
                          </p>
                          <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock size={10} />
                            {format(d, 'HH:mm')}
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          <StatusBadge status={app.status} />
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedApp(app);
                            }}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          4. DRAWER LATERAL DE DETALHES DO AGENDAMENTO
      ══════════════════════════════════════════════════════════ */}
      {selectedApp && (
        (() => {
          const profTheme = getProfTheme(
            selectedApp.profissional_id,
            selectedApp.profissional_nome,
            profissionais
          );

          return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end">
              <div
                className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
                onClick={() => setSelectedApp(null)}
              />
              <div className="relative bg-white w-full sm:w-[420px] sm:h-full rounded-t-3xl sm:rounded-none shadow-2xl p-6 sm:p-8 space-y-6 overflow-y-auto z-10 animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Detalhes do Agendamento</h2>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                {/* Cabeçalho do Cliente */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-md shadow-indigo-200">
                    {(selectedApp.cliente_nome || 'C')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-lg">{selectedApp.cliente_nome || 'Cliente'}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                      <Phone size={12} className="text-slate-400" />
                      {selectedApp.cliente_telefone || 'Sem telefone'}
                    </p>
                  </div>
                </div>

                {/* Card de Destaque do Profissional com sua Cor */}
                <div className={`p-4 rounded-2xl border ${profTheme.bg} ${profTheme.border} flex items-center justify-between gap-3`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${profTheme.accentBg} text-white flex items-center justify-center font-black text-base shadow-xs`}>
                      <User size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Profissional Responsável</p>
                      <p className={`text-sm font-black ${profTheme.text}`}>
                        {selectedApp.profissional_nome || 'Não atribuído'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${profTheme.badgeBg} ${profTheme.badgeText}`}>
                    {profTheme.label}
                  </span>
                </div>

                {/* Grid de Informações */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                      <Scissors size={12} className="text-indigo-500" /> Serviço
                    </p>
                    <p className="text-sm font-bold text-slate-800">{selectedApp.servico_nome || 'Não especificado'}</p>
                    {selectedApp.servico_preco && (
                      <p className="text-xs font-semibold text-emerald-600 mt-1">
                        R$ {Number(selectedApp.servico_preco).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                      <Clock size={12} className="text-indigo-500" /> Duração
                    </p>
                    <p className="text-sm font-bold text-slate-800">{Number(selectedApp.servico_duracao) || 60} minutos</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                      <CalendarIcon size={12} className="text-indigo-500" /> Data
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {format(parseSafeDate(selectedApp.data_hora), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                      <Clock size={12} className="text-indigo-500" /> Horário
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {format(parseSafeDate(selectedApp.data_hora), 'HH:mm')}
                    </p>
                  </div>
                </div>

                {/* Observações */}
                {selectedApp.observacao && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Observações
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {selectedApp.observacao}
                    </p>
                  </div>
                )}

                {/* Status atual */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">Status Atual</span>
                  <StatusBadge status={selectedApp.status} />
                </div>

                {/* Ações de Status */}
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alterar Situação</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={isUpdatingStatus || selectedApp.status === 'confirmado'}
                      onClick={() => handleUpdateStatus(selectedApp.id!, 'confirmado')}
                      className="py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-all disabled:opacity-40"
                    >
                      <Check size={14} />
                      Confirmar
                    </button>
                    <button
                      disabled={isUpdatingStatus || selectedApp.status === 'concluido'}
                      onClick={() => handleUpdateStatus(selectedApp.id!, 'concluido')}
                      className="py-2.5 px-3 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-all disabled:opacity-40"
                    >
                      <CheckCircle2 size={14} />
                      Concluir
                    </button>
                  </div>

                  <button
                    disabled={isUpdatingStatus || selectedApp.status === 'cancelado'}
                    onClick={() => handleUpdateStatus(selectedApp.id!, 'cancelado')}
                    className="w-full py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-rose-100 transition-all disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                    Cancelar Agendamento
                  </button>

                  {/* Botão de abrir conversa no chat */}
                  <button
                    onClick={() => {
                      setSelectedApp(null);
                      navigate('/conversas');
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-2"
                  >
                    <MessageSquare size={14} />
                    Abrir Mensagens / WhatsApp
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* ══════════════════════════════════════════════════════════
          5. MODAL DE NOVO AGENDAMENTO MANUAL
      ══════════════════════════════════════════════════════════ */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowNewModal(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">Novo Agendamento</h3>
                <p className="text-xs text-slate-400 mt-0.5">Cadastre um agendamento com profissional e serviço</p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAgendamento} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    value={newForm.cliente_nome}
                    onChange={e => setNewForm({ ...newForm, cliente_nome: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Telefone WhatsApp</label>
                  <input
                    type="text"
                    placeholder="5521999999999"
                    value={newForm.cliente_telefone}
                    onChange={e => setNewForm({ ...newForm, cliente_telefone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Serviço</label>
                  <select
                    value={newForm.servico_id}
                    onChange={e => setNewForm({ ...newForm, servico_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">Selecione um serviço...</option>
                    {servicos.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nome} (R$ {Number(s.preco).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Profissional *</label>
                  <select
                    value={newForm.profissional_id}
                    onChange={e => setNewForm({ ...newForm, profissional_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">Selecione um profissional...</option>
                    {profissionais.map(p => {
                      const theme = getProfTheme(p.id, p.nome, profissionais);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.nome} (Cor: {theme.label})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Data *</label>
                  <input
                    type="date"
                    required
                    value={newForm.data}
                    onChange={e => setNewForm({ ...newForm, data: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Horário *</label>
                  <input
                    type="time"
                    required
                    value={newForm.hora}
                    onChange={e => setNewForm({ ...newForm, hora: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Observação</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais do agendamento..."
                  value={newForm.observacao}
                  onChange={e => setNewForm({ ...newForm, observacao: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
