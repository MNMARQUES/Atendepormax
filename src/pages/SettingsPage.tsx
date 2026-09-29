import React, { useState, useEffect } from 'react';
import { settingsService, whatsappService } from '../services/api';
import { Settings, Save, Loader2, Globe, Key, Smartphone, Sparkles, Building2, CheckCircle2, QrCode, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    name: 'AtendeProMax',
    plan: 'FREE',
    aiPrompt: 'Você é um assistente prestativo.',
    evolutionApiUrl: '',
    evolutionApiKey: '',
    evolutionInstanceName: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // WhatsApp Connection State
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [status, setStatus] = useState('Desconectado');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsService.getSettings();
        setSettings(data);
        if (data.evolutionInstanceName) {
          checkStatus(data);
        }
      } catch (err) {
        console.warn('Configuração não disponível - Usando padrões');
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();

    // Poll for status every 5 seconds
    const interval = setInterval(() => {
      if (settings?.evolutionInstanceName) {
        checkStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [settings?.evolutionInstanceName]);

  const checkStatus = async (currentSettings = settings) => {
    if (!currentSettings?.evolutionInstanceName) return;
    setCheckingStatus(true);
    try {
      const data = await whatsappService.getStatus();
      setConnectionStatus(data);
      
      // 🚀 Versão completa recomendada: data.state || data.status
      const conectado = (data.state === 'open' || data.status === 'open' || data.instance?.state === 'open');
      
      if (conectado) {
        setQrCode(null);
        setStatus('Conectado');
      } else {
        setStatus('Desconectado');
      }
    } catch (err) {
      console.error('Error checking status:', err);
      setStatus('Desconectado');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError('');
    try {
      await settingsService.updateSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    setConnecting(true);
    setError('');
    setQrCode(null);
    try {
      const data = await whatsappService.getConnectQR();
      // Evolution API returns QR code in base64 or code
      const state = (data.instance?.state || data.state || data.status || '').toLowerCase();
      const isConnected = state === 'open' || state === 'connected';

      if (isConnected) {
        setQrCode(null);
        setError('');
        setStatus('Conectado');
      } else if (data.base64) {
        setQrCode(data.base64);
      } else if (data.code) {
        setQrCode(data.code);
      } else if (data.qrcode) {
        setQrCode(data.qrcode);
      } else {
        console.log('WhatsApp connection response:', data);
        setError('Resposta inesperada da API. Verifique o console.');
      }
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      const apiDetails = err.response?.data?.details;
      setError(apiDetails ? `${apiError}: ${JSON.stringify(apiDetails)}` : (apiError || 'Erro ao conectar com WhatsApp'));
    } finally {
      setConnecting(false);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  const isWhatsAppConnected = (
    connectionStatus?.state === 'open' || 
    connectionStatus?.status === 'open' || 
    connectionStatus?.instance?.state === 'open' ||
    connectionStatus?.instance?.state === 'connected' ||
    connectionStatus?.state === 'connected' ||
    connectionStatus?.status === 'connected'
  );

  const isWhatsAppConnecting = (
    connectionStatus?.instance?.state === 'connecting' || 
    connectionStatus?.state === 'connecting' ||
    connectionStatus?.status === 'connecting'
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurações</h1>
          <p className="text-slate-500 font-medium">Gerencie sua empresa e integrações</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6 pb-12">
            {/* Company Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Building2 size={20} />
                </div>
                <h2 className="text-lg font-black text-slate-900">Dados da Empresa</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Empresa</label>
                  <input 
                    type="text" 
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano Atual</label>
                  <div className="px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm text-slate-500 font-bold flex items-center justify-between">
                    <span className="uppercase tracking-widest">{settings.plan}</span>
                    <span className="text-indigo-600 text-[10px]">Upgrade</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-400" />
                  Instruções para a IA (Personalidade)
                </label>
                <textarea 
                  value={settings.aiPrompt}
                  onChange={(e) => setSettings({ ...settings, aiPrompt: e.target.value })}
                  rows={4}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                />
              </div>
            </motion.div>

            {/* Evolution API Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Smartphone size={20} />
                </div>
                <h2 className="text-lg font-black text-slate-900">Integração WhatsApp (Evolution API)</h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL da API</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={settings.evolutionApiUrl || ''}
                      onChange={(e) => setSettings({ ...settings, evolutionApiUrl: e.target.value })}
                      placeholder="https://sua-api.com"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        value={settings.evolutionApiKey || ''}
                        onChange={(e) => setSettings({ ...settings, evolutionApiKey: e.target.value })}
                        placeholder="Sua API Key"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Instância</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        value={settings.evolutionInstanceName || ''}
                        onChange={(e) => setSettings({ ...settings, evolutionInstanceName: e.target.value })}
                        placeholder="Ex: AtendePro"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : success ? <CheckCircle2 size={20} /> : <Save size={20} />}
                {saving ? 'Salvando...' : success ? 'Salvo com Sucesso!' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>

        {/* Connection Sidebar */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6 sticky top-8"
          >
            <div className="text-center space-y-4">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto ${
                isWhatsAppConnected ? 'bg-emerald-50 text-emerald-600' : 
                isWhatsAppConnecting ? 'bg-amber-50 text-amber-600' :
                'bg-slate-50 text-slate-400'
              }`}>
                <Smartphone size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Status da Conexão</h3>
                <p className="text-slate-500 text-xs font-medium">
                  {isWhatsAppConnecting ? 'Conectando...' : status}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {isWhatsAppConnected ? (
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex flex-col items-center gap-4">
                  <CheckCircle2 className="text-emerald-600" size={48} />
                  <div className="text-center">
                    <p className="text-xs font-black text-emerald-900 uppercase tracking-widest">Instância Ativa</p>
                    <p className="text-[10px] text-emerald-600 font-bold">{settings.evolutionInstanceName}</p>
                  </div>
                  <button 
                    onClick={() => checkStatus()}
                    disabled={checkingStatus}
                    className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={checkingStatus ? 'animate-spin' : ''} size={12} />
                    Atualizar Status
                  </button>
                </div>
              ) : qrCode ? (
                <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
                  <div className="bg-white p-2 rounded-xl shadow-sm">
                    <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                    Escaneie o QR Code no seu WhatsApp
                  </p>
                  <button 
                    onClick={handleConnectWhatsApp}
                    className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                  >
                    <RefreshCw size={12} />
                    Atualizar QR Code
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleConnectWhatsApp}
                  disabled={connecting}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {connecting ? <Loader2 className="animate-spin" size={20} /> : <QrCode size={20} />}
                  {connecting ? 'Gerando...' : 'Conectar WhatsApp'}
                </button>
              )}

              <div className="p-4 bg-indigo-50 rounded-2xl">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Instruções</h4>
                <ol className="text-[10px] text-indigo-900/70 space-y-1 list-decimal list-inside font-medium">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Toque em Menu ou Configurações</li>
                  <li>Selecione Aparelhos Conectados</li>
                  <li>Toque em Conectar um Aparelho</li>
                  <li>Aponte a câmera para este QR Code</li>
                </ol>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
