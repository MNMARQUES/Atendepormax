import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/api';
import { DashboardMetrics } from '../types';
import { 
  MessageSquare, 
  Users, 
  Calendar, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Bot, 
  Zap, 
  Clock,
  LayoutDashboard,
  Sparkles,
  Terminal,
  Cpu,
  Activity,
  ShieldCheck,
  Server,
  Code2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await dashboardService.getMetrics();
        setMetrics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const chartData = [
    { name: 'Seg', value: 45, latency: 32 },
    { name: 'Ter', value: 52, latency: 35 },
    { name: 'Qua', value: 48, latency: 31 },
    { name: 'Qui', value: 61, latency: 38 },
    { name: 'Sex', value: 55, latency: 34 },
    { name: 'Sáb', value: 42, latency: 29 },
    { name: 'Dom', value: 38, latency: 28 },
  ];

  const MetricCard = ({ title, value, code, icon: Icon, trend, sub }: any) => (
    <div className="bg-white p-6 rounded-xl border border-zinc-200/90 shadow-xs hover:border-zinc-400/80 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 group-hover:text-zinc-950 transition-colors">
            <Icon size={18} />
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 block">{code}</span>
            <h3 className="text-xs font-semibold text-zinc-700">{title}</h3>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-[11px] font-mono font-medium ${trend >= 0 ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80' : 'text-rose-700 bg-rose-50 border border-rose-200/80'} px-2 py-0.5 rounded-md`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend >= 0 ? `+${trend}%` : `${trend}%`}
        </div>
      </div>
      
      <div className="flex items-baseline justify-between mt-2">
        <p className="text-3xl font-bold font-mono tracking-tight text-zinc-900">{value}</p>
        <span className="text-[11px] text-zinc-500 font-mono">{sub}</span>
      </div>
    </div>
  );

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-44 bg-zinc-200/70 rounded-xl w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Engineer Command Hub / System Status Banner */}
      <div className="relative overflow-hidden bg-[#0A0D14] rounded-2xl p-7 lg:p-8 text-white border border-zinc-800 shadow-lg">
        {/* Subtle technical background grid */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 bg-zinc-900/90 border border-zinc-700/80 px-3 py-1 rounded-full text-[11px] font-mono text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>CLUSTER LATAM-1 // ATIVO</span>
              <span className="text-zinc-600">|</span>
              <span className="text-emerald-400">LATENCY 32ms</span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Centro de Telemetria & IA</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                PROD v2.8.4
              </span>
            </h1>

            <p className="text-zinc-300 text-sm leading-relaxed">
              Pipeline autônomo de agentes WhatsApp orquestrado em tempo real. Identificação preditiva de intenção, agendamentos automáticos e sincronização contínua com banco de dados.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button 
                onClick={() => navigate('/atendente?wizard=true')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs"
              >
                <Sparkles size={14} />
                Deploy de Novo Agente
              </button>
              <button 
                onClick={() => navigate('/atendente')}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/90 rounded-lg font-mono text-xs transition-colors flex items-center gap-2"
              >
                <Cpu size={14} className="text-zinc-400" />
                Configurar Parâmetros IA
              </button>
            </div>
          </div>

          {/* Quick Metrics Console */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 w-full lg:w-72 font-mono shrink-0">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                <span>MSGS_PROCESSED</span>
                <Activity size={12} className="text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-white tracking-tight">124</p>
              <span className="text-[10px] text-zinc-500">Últimas 24h</span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                <span>AGENDAMENTOS_AUTO</span>
                <Calendar size={12} className="text-cyan-400" />
              </div>
              <p className="text-xl font-bold text-white tracking-tight">18</p>
              <span className="text-[10px] text-emerald-400">92% fechamento</span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                <span>VALOR_ESTIMADO</span>
                <TrendingUp size={12} className="text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-emerald-400 tracking-tight">R$ 3.200</p>
              <span className="text-[10px] text-zinc-500">Pipeline Aberto</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards - Clean Neutral High Contrast */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <MetricCard 
          code="METRIC_CONVERSATIONS"
          title="Sessões & Conversas" 
          value={metrics?.total_conversas || 0} 
          icon={MessageSquare} 
          trend={12}
          sub="threads ativas"
        />
        <MetricCard 
          code="METRIC_CONTACTS"
          title="Leads & Contatos" 
          value={metrics?.contatos || 0} 
          icon={Users} 
          trend={8}
          sub="base sincronizada"
        />
        <MetricCard 
          code="METRIC_SCHEDULES"
          title="Agendamentos Marcados" 
          value={metrics?.agendamentos || 0} 
          icon={Calendar} 
          trend={5}
          sub="calendário sincronizado"
        />
      </div>

      {/* Charts & System Intelligence Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Telemetry Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-zinc-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">Throughput de Atendimentos</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded">
                  7 DAYS
                </span>
              </div>
              <p className="text-zinc-500 text-xs mt-0.5">Volume horário de conversas e requisições processadas pela IA</p>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-lg border border-zinc-200/80 text-xs font-mono">
              <button className="px-3 py-1 bg-white text-zinc-900 font-semibold rounded-md shadow-xs">Semana</button>
              <button className="px-3 py-1 text-zinc-500 hover:text-zinc-900 transition-colors">Mês</button>
            </div>
          </div>
          
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="chartEmerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e4e4e7" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                  dy={8}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#090d14', 
                    borderRadius: '8px', 
                    border: '1px solid #27272a',
                    color: '#fafafa',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#chartEmerald)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-4 mt-2 border-t border-zinc-100 text-[11px] font-mono text-zinc-500">
            <span>● Throughput Médio: 48.7 msgs/dia</span>
            <span>Uptime do Dispatcher: 99.98%</span>
          </div>
        </div>

        {/* AI Diagnostics & Insights Console */}
        <div className="bg-[#0A0D14] p-6 rounded-xl text-zinc-200 border border-zinc-800 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-emerald-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                  AI Diagnostics // Log
                </h3>
              </div>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                  <span className="text-cyan-400">[PEAK_TRAFFIC]</span>
                  <span>14:00 - 18:00</span>
                </div>
                <p className="text-xs text-zinc-300 font-sans">
                  70% dos clientes confirmam agendamento no período da tarde. Sugestão: manter capacidade de slots disponíveis.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                  <span className="text-emerald-400">[HOT_OPPORTUNITY]</span>
                  <span>3 LEADS PENDENTES</span>
                </div>
                <p className="text-xs text-zinc-300 font-sans">
                  Interesse explícito em procedimentos de estética facial registrado. Agente IA pronto para disparar follow-up de fechamento.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                  <span className="text-amber-400">[SYSTEM_ALERT]</span>
                  <span>HANDOFF RATE: 4.2%</span>
                </div>
                <p className="text-xs text-zinc-300 font-sans">
                  95.8% dos atendimentos são resolvidos 100% via IA sem necessidade de intervenção humana.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Engine: Magno Marques v2.8</span>
            <button 
              onClick={() => navigate('/atendente')}
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
            >
              Ver Agentes →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
