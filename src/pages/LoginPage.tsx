import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { Terminal, Mail, Lock, Loader2, ShieldCheck } from 'lucide-react';

const LoginPage: React.FC<{ login: (user: any, token: string) => void }> = ({ login }) => {
  const [email, setEmail] = useState('admin@atendepromax.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.login(email, password);
      login(data.user, data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans relative">
      {/* Subtle engineer grid background */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      />

      <div className="w-full max-w-md bg-zinc-950/90 rounded-2xl shadow-2xl border border-zinc-800 p-8 sm:p-10 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-zinc-900 border border-zinc-700/90 rounded-xl flex items-center justify-center mb-3.5 shadow-sm">
            <Terminal className="text-emerald-400" size={24} />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">AtendeProMax</h1>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
              v2.8
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1 font-mono">Enterprise AI WhatsApp Gateway</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
              E-mail de Acesso
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
              Chave / Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg font-semibold text-xs tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Autenticar no Sistema'}
          </button>
        </form>

        {/* Demo hints */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center font-mono text-[11px] text-zinc-500 space-y-1">
          <p>Credenciais padrão carregadas para demonstração</p>
        </div>
      </div>

      {/* Fixed Author Credit Card */}
      <div className="mt-8 flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 shadow-lg relative z-10">
        <img 
          src="/author-magno.jpg" 
          alt="Magno Marques" 
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-lg object-cover grayscale contrast-125 ring-1 ring-zinc-700"
        />
        <div className="text-left font-mono">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <span>Magno Marques</span>
            <ShieldCheck size={13} className="text-emerald-400" />
          </div>
          <span className="text-[10px] text-zinc-500 block">Lead Software Engineer & Autor</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
