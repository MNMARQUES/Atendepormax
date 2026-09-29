import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactService } from '../services/api';
import { Contact } from '../types';
import {
  MessageSquare,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  X,
  Phone,
  Calendar,
  Users,
  ChevronRight,
  ChevronLeft,
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Remove sufixo :XX do JID do WhatsApp e caracteres não numéricos
function cleanPhone(value?: string | null): string {
  if (!value) return '';
  return value.split(':')[0].replace(/\D/g, '');
}

// Retorna nome legível: se nome for número ou inválido, usa telefone limpo
function displayName(nome?: string | null, telefone?: string | null): string {
  if (!nome || nome === 'undefined' || nome === 'null') return cleanPhone(telefone) || 'Contato';
  if (/^\d+[:\-]?\d*$/.test(nome.trim())) return cleanPhone(telefone) || cleanPhone(nome) || 'Contato';
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

const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const API = (import.meta as any).env?.VITE_API_URL || '/api';

    const fetchPhoto = async (telefone: string, id: string | number) => {
      try {
        const numero = cleanPhone(telefone);
        if (!numero) return;
        const token = localStorage.getItem('atendepromax_token') || '';
        const res = await fetch(`${API}/whatsapp/foto/${numero}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.pictureUrl) {
          setPhotos(prev => ({ ...prev, [String(id)]: normalizePhotoUrl(data.pictureUrl) }));
        }
      } catch {
        // silencioso
      }
    };

    const fetchContacts = async () => {
      try {
        const token = localStorage.getItem('atendepromax_token');
        const res = await fetch(`${API}/contatos`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error('Erro HTTP');

        const data = await res.json();
        let list: Contact[] = [];

        if (Array.isArray(data)) {
          list = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.contatos)) {
          list = data.contatos;
        } else if (data && typeof data === 'object' && Array.isArray(data.leads)) {
          list = data.leads;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          list = data.data;
        }

        setContacts(list);

        // Preenche fotos que já vieram no objeto de contato imediatamente
        const initialPhotos: Record<string, string | null> = {};
        list.forEach(c => {
          const photo = (c as any).foto_url || (c as any).foto;
          if (photo) {
            initialPhotos[String(c.id)] = normalizePhotoUrl(photo);
          }
        });
        if (Object.keys(initialPhotos).length > 0) {
          setPhotos(prev => ({ ...prev, ...initialPhotos }));
        }

        // Carregar/atualizar fotos em background
        list.forEach(c => fetchPhoto(c.telefone, c.id));
      } catch (err) {
        console.error('ERRO REAL CONTATOS:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);
    try {
      await contactService.deleteContact(contactToDelete.id);
      setContacts(prev => prev.filter(c => String(c.id) !== String(contactToDelete.id)));
      setContactToDelete(null);
    } catch (err) {
      console.error('[deleteContact]', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactPhone.trim()) return;
    setIsCreating(true);
    try {
      const created = await contactService.createContact({
        nome: newContactName.trim() || newContactPhone.trim(),
        telefone: newContactPhone.trim()
      });
      if (created) {
        setContacts(prev => [created, ...prev]);
      }
      setIsCreateModalOpen(false);
      setNewContactName('');
      setNewContactPhone('');
    } catch (err) {
      console.error('[createContact]', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportCSV = () => {
    if (contacts.length === 0) return;
    const headers = 'ID,Nome,Telefone,Data de Criacao\n';
    const rows = contacts.map(c =>
      `"${c.id}","${displayName(c.nome, c.telefone)}","${cleanPhone(c.telefone)}","${c.criado_em || ''}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contatos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredContacts = contacts.filter(l => {
    if (!search) return true;
    const name = displayName(l.nome, l.telefone).toLowerCase();
    const phone = cleanPhone(l.telefone);
    return name.includes(search.toLowerCase()) || phone.includes(search);
  });

  if (loading) return (
    <div className="animate-pulse space-y-8">
      <div className="h-20 bg-slate-100 rounded-3xl w-full" />
      <div className="h-96 bg-slate-50 rounded-3xl w-full" />
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Contatos</h1>
          <p className="text-slate-400 font-medium flex items-center gap-2">
            <Users size={16} />
            Gerencie todos os clientes que entraram em contato via WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-6 py-3 bg-white text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all border border-slate-200 flex items-center gap-2 cursor-pointer"
          >
            <Download size={18} />
            Exportar CSV
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            Novo Contato
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-6 py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
            <Filter size={18} />
            Filtros
          </button>
          <select className="flex-1 md:flex-none px-6 py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold text-sm outline-none border-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer">
            <option>Mais recentes</option>
            <option>Mais antigos</option>
            <option>Ordem alfabética</option>
          </select>
        </div>
      </div>

      {/* Contatos Table */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Contato</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Telefone</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Data de Entrada</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium">
                    Nenhum contato encontrado.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => {
                  const nome = displayName(contact.nome, contact.telefone);
                  const telefone = cleanPhone(contact.telefone);
                  return (
                    <tr key={contact.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          {(() => {
                            const photoUrl = normalizePhotoUrl(photos[String(contact.id)] || (contact as any).foto_url || (contact as any).foto);
                            return photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={nome}
                                referrerPolicy="no-referrer"
                                onError={() => setPhotos(prev => ({ ...prev, [String(contact.id)]: null }))}
                                className="w-12 h-12 rounded-2xl object-cover group-hover:scale-110 transition-transform"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg group-hover:scale-110 transition-transform text-center uppercase">
                                {nome[0] || '?'}
                              </div>
                            );
                          })()}
                          <div>
                            <p className="font-black text-slate-900 tracking-tight">{nome}</p>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">ID: {contact.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                          <Phone size={14} className="text-indigo-400" />
                          {telefone}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                          <Calendar size={14} className="text-indigo-400" />
                          {contact.criado_em ? format(new Date(contact.criado_em), "dd 'de' MMM, yyyy", { locale: ptBR }) : '--'}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                          Ativo
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => navigate('/conversations')}
                            title="Abrir Conversa"
                            className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                          >
                            <MessageSquare size={18} />
                          </button>
                          <button
                            onClick={() => setContactToDelete(contact)}
                            title="Excluir Contato"
                            className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mostrando {filteredContacts.length} de {contacts.length} contatos</p>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-indigo-600 disabled:opacity-30" disabled>
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 bg-indigo-600 text-white rounded-lg text-xs font-black">1</button>
            </div>
            <button className="p-2 text-slate-400 hover:text-indigo-600 disabled:opacity-30" disabled>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal de Confirmação de Exclusão de Contato ── */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Excluir Contato</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
              Tem certeza que deseja excluir o contato{' '}
              <strong className="text-slate-800 font-bold">
                {displayName(contactToDelete.nome, contactToDelete.telefone)}
              </strong>
              ? O contato será removido da listagem.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setContactToDelete(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteContact}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Novo Contato ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserPlus size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-900">Novo Contato</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Nome do Contato
                </label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5511999999999"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newContactPhone.trim()}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? 'Cadastrando...' : 'Salvar Contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
