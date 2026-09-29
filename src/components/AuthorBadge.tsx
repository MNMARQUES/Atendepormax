import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  CheckCircle2, 
  X, 
  Code2, 
  Layers, 
  ExternalLink,
  Activity,
  Server,
  GitBranch,
  Sparkles
} from 'lucide-react';

interface AuthorBadgeProps {
  collapsed?: boolean;
}

export const AuthorBadge: React.FC<AuthorBadgeProps> = ({ collapsed = false }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Fixed Sidebar Author Area */}
      <div 
        onClick={() => setShowModal(true)}
        className={`group cursor-pointer rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/80 ${
          collapsed ? 'flex justify-center p-2' : 'flex items-center gap-3'
        }`}
        title="Arquiteto do Sistema: Magno Marques (Clique para detalhes de engenharia)"
      >
        {/* Avatar with Status Pulse */}
        <div className="relative shrink-0">
          <img
            src="/author-magno.jpg"
            alt="Magno Marques - Software Engineer"
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-lg object-cover ring-1 ring-zinc-700/80 grayscale contrast-125 transition-all group-hover:grayscale-0 group-hover:ring-emerald-500/50"
            onError={(e) => {
              // fallback if needed
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
            }}
          />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-zinc-200 group-hover:text-white">
                Magno Marques
              </span>
              <ShieldCheck size={12} className="shrink-0 text-emerald-400" />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
              <span className="truncate">Software Engineer</span>
              <span>•</span>
              <span className="text-emerald-400/90 font-medium">Autor</span>
            </div>
          </div>
        )}
      </div>

      {/* Engineer & Architecture Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
            {/* Top Bar / Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/50 px-6 py-4">
              <div className="flex items-center gap-2.5 font-mono text-xs text-zinc-400">
                <Terminal size={15} className="text-emerald-400" />
                <span>system.architect // info</span>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
              {/* Author Profile Card */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 rounded-xl border border-zinc-800/90 bg-zinc-900/30 p-5">
                <img
                  src="/author-magno.jpg"
                  alt="Magno Marques"
                  referrerPolicy="no-referrer"
                  className="h-24 w-24 rounded-xl object-cover ring-2 ring-zinc-700/80 shadow-lg contrast-110 shrink-0"
                />
                <div className="space-y-1.5 text-center sm:text-left min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg font-bold text-white tracking-tight">Magno Marques</h3>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Autor & Arquiteto
                    </span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400">
                    Lead Software Engineer & System Architect
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed pt-1">
                    Responsável pelo projeto, engenharia de software e arquitetura do 
                    <strong className="text-white"> AtendeProMax</strong> — plataforma de automação 
                    inteligente para atendimento WhatsApp com orquestração de IA em tempo real.
                  </p>
                </div>
              </div>

              {/* Engineering Specs & Stack */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Cpu size={13} className="text-cyan-400" />
                    Especificações de Engenharia
                  </h4>
                  <span className="font-mono text-[10px] text-zinc-500">release 2.8.4-prod</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                      <Server size={14} className="text-emerald-400" />
                      Backend & API Proxy
                    </div>
                    <p className="mt-1 text-[11px] font-mono text-zinc-400">
                      Node.js Express + TSX • Middleware Zero-Latency
                    </p>
                  </div>

                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                      <Layers size={14} className="text-sky-400" />
                      Frontend Architecture
                    </div>
                    <p className="mt-1 text-[11px] font-mono text-zinc-400">
                      React 18 + Vite • Tailwind Neutral Design System
                    </p>
                  </div>

                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                      <Activity size={14} className="text-amber-400" />
                      WhatsApp Engine
                    </div>
                    <p className="mt-1 text-[11px] font-mono text-zinc-400">
                      Evolution API v2 • Webhooks assíncronos
                    </p>
                  </div>

                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                      <Sparkles size={14} className="text-purple-400" />
                      Multi-Agent AI Core
                    </div>
                    <p className="mt-1 text-[11px] font-mono text-zinc-400">
                      Prompt Compiler • Context Scoring • Multi-Persona
                    </p>
                  </div>
                </div>
              </div>

              {/* System Diagnostics & Telemetry */}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-zinc-400 text-[11px]">
                  <span>HEALTH_CHECK_STATUS</span>
                  <span className="text-emerald-400">100% OPERATIONAL</span>
                </div>
                <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] text-zinc-300">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">CLUSTER REGION</span>
                    <span>sa-east-1 (SP)</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">AVG LATENCY</span>
                    <span>34ms (HTTP/2)</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">SECURITY LEVEL</span>
                    <span>AES-256 JWT RBAC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-800/80 bg-zinc-900/70 px-6 py-3.5 flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span>Projetado & Desenvolvido por Magno Marques</span>
              <button
                onClick={() => setShowModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-sans font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
