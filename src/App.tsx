import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  Menu, 
  X, 
  TrendingUp, 
  Bot, 
  Building2, 
  Sparkles,
  BookOpen,
  Activity,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { AuthorBadge } from './components/AuthorBadge';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ConversationsPage from './pages/ConversationsPage';
import ContactsPage from './pages/ContactsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import AtendentePage from './pages/AtendentePage';
import CatalogoPage from './pages/CatalogoPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import CompaniesPage from './pages/CompaniesPage';
import { Company } from './types';
import { companyService } from './services/api';

// --- Company Context ---
interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  companies: Company[];
  refreshCompanies: () => void;
}

const CompanyContext = React.createContext<CompanyContextType | undefined>(undefined);

const useCompany = () => {
  const context = React.useContext(CompanyContext);
  if (!context) throw new Error('useCompany must be used within a CompanyProvider');
  return context;
};

const CompanyProvider: React.FC<{ children: React.ReactNode; user: any }> = ({ children, user }) => {
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  const refreshCompanies = async () => {
    if (user?.role === 'admin') {
      try {
        const data = await companyService.getCompanies();
        setCompanies(data);
        
        const storedId = localStorage.getItem('atendepromax_selected_company');
        if (storedId) {
          const found = data.find((c: Company) => c.id === storedId);
          if (found) setSelectedCompanyState(found);
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      }
    }
  };

  useEffect(() => {
    refreshCompanies();
  }, [user]);

  const setSelectedCompany = (company: Company | null) => {
    setSelectedCompanyState(company);
    if (company) {
      localStorage.setItem('atendepromax_selected_company', company.id);
    } else {
      localStorage.removeItem('atendepromax_selected_company');
    }
    // Reload page to refresh all data with new company header
    window.location.reload();
  };

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, companies, refreshCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
};

// --- Auth Context Mock ---
const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('atendepromax_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData: any, token: string) => {
    localStorage.setItem('atendepromax_user', JSON.stringify(userData));
    localStorage.setItem('atendepromax_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('atendepromax_user');
    localStorage.removeItem('atendepromax_token');
    setUser(null);
  };

  return { user, login, logout, loading };
};

// --- Layout Component ---
const Layout: React.FC<{ children: React.ReactNode; logout: () => void; user: any }> = ({ children, logout, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { selectedCompany, setSelectedCompany, companies } = useCompany();

  const navSections = [
    {
      title: 'OPERAÇÕES',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Conversas', icon: MessageSquare, path: '/conversas' },
        { name: 'Agenda', icon: Calendar, path: '/agenda' },
        { name: 'Contatos', icon: Users, path: '/contatos' },
        { name: 'Catálogo & Serviços', icon: BookOpen, path: '/catalogo' },
      ]
    },
    {
      title: 'AUTOMAÇÃO & IA',
      items: [
        { name: 'Atendentes AI', icon: Bot, path: '/atendente' },
        { name: 'Criar Agente', icon: Sparkles, path: '/atendente?wizard=true' },
      ]
    }
  ];

  if (user?.role === 'admin') {
    navSections.push({
      title: 'GERENCIAMENTO',
      items: [
        { name: 'Empresas', icon: Building2, path: '/empresas' },
        { name: 'Equipe', icon: Users, path: '/equipe' },
        { name: 'Configurações', icon: Settings, path: '/configuracoes' },
      ]
    });
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-zinc-900 antialiased selection:bg-zinc-800 selection:text-white">
      {/* Sidebar - Precision Dark Obsidian */}
      <aside className={`bg-[#0A0D14] text-zinc-200 border-r border-zinc-800/80 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col z-20 shrink-0`}>
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-zinc-800/80 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-100 group-hover:border-zinc-500 transition-colors shadow-xs">
              <Terminal size={17} className="text-emerald-400" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-white">AtendeProMax</span>
                  <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    v2.8
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">AI AUTOMATION HUB</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-zinc-800">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {sidebarOpen && (
                <p className="px-3 pb-1 text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path || (item.path.includes('?') && location.pathname + location.search === item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={!sidebarOpen ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                      isActive 
                        ? 'bg-zinc-900 text-white border border-zinc-700/70 shadow-xs' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                    } ${!sidebarOpen ? 'justify-center px-0' : ''}`}
                  >
                    <item.icon size={17} className={isActive ? 'text-emerald-400' : 'text-zinc-400'} />
                    {sidebarOpen && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Fixed Author Section for Magno Marques */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 space-y-2">
          {/* Author Badge */}
          <AuthorBadge collapsed={!sidebarOpen} />

          {/* Logout button */}
          <button 
            onClick={logout}
            title={!sidebarOpen ? 'Sair' : undefined}
            className={`flex items-center gap-2.5 px-3 py-1.5 w-full text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-mono transition-colors ${
              !sidebarOpen ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut size={15} />
            {sidebarOpen && <span>Encerrar Sessão</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar - Engineer Grade Header */}
        <header className="h-16 bg-white border-b border-zinc-200/90 px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              title="Alternar barra lateral"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            
            {/* System Status Indicators */}
            <div className="hidden md:flex items-center gap-3 font-mono text-[11px] text-zinc-600 pl-2 border-l border-zinc-200">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-zinc-700 font-medium">Gateway: 200 OK</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200/80">
                <Activity size={12} className="text-emerald-600" />
                <span>WhatsApp: Conectado</span>
              </div>
            </div>

            {/* Company Selector for Admin */}
            {user?.role === 'admin' && (
              <div className="flex items-center gap-2 ml-2 pl-3 border-l border-zinc-200">
                <Building2 size={16} className="text-zinc-400 shrink-0" />
                <select 
                  value={selectedCompany?.id || ''}
                  onChange={(e) => {
                    const company = companies.find(c => c.id === e.target.value);
                    setSelectedCompany(company || null);
                  }}
                  className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-700 outline-none focus:ring-1 focus:ring-zinc-400 transition-all min-w-[190px]"
                >
                  <option value="">Modo Administrador (Geral)</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Author Credit Pill */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-mono">
              <img 
                src="/author-magno.jpg" 
                alt="Magno Marques" 
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full object-cover grayscale contrast-125 ring-1 ring-zinc-300"
              />
              <span className="text-[11px] text-zinc-500">Engenharia:</span>
              <span className="font-semibold text-zinc-800">Magno Marques</span>
            </div>

            <button className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-3 border-l border-zinc-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-zinc-900">{user?.name || 'Usuário'}</p>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  {user?.role === 'admin' ? 'Administrador' : 'Agente'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-100 flex items-center justify-center font-mono text-xs font-bold border border-zinc-700 uppercase shadow-xs">
                {(user?.name || 'U').charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const { user, login, logout, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage login={login} /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
        <Route 
          path="/*" 
          element={
            user ? (
              <CompanyProvider user={user}>
                <Layout logout={logout} user={user}>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/conversas" element={<ConversationsPage />} />
                    <Route path="/contatos" element={<ContactsPage />} />
                    <Route path="/agenda" element={<AppointmentsPage />} />
                    <Route path="/catalogo" element={<CatalogoPage />} />
                    <Route path="/atendente" element={<AtendentePage />} />
                    <Route path="/empresas" element={user.role === 'admin' ? <CompaniesPage /> : <Navigate to="/" />} />
                    <Route path="/equipe" element={user.role === 'admin' ? <UsersPage /> : <Navigate to="/" />} />
                    <Route path="/configuracoes" element={user.role === 'admin' ? <SettingsPage /> : <Navigate to="/" />} />
                  </Routes>
                </Layout>
              </CompanyProvider>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;
