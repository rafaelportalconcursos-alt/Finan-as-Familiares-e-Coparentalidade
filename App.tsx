
import React, { useState, useEffect } from 'react';
import { AppState, Transaction, Visitation, TransactionType, Category } from './types';
import { INITIAL_STATE } from './constants';
import { Dashboard } from './components/Dashboard';
import { CoparentingModule } from './components/CoparentingModule';
import { GeminiService } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'finance' | 'coparenting' | 'ai'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Persistence and Theme sync
  useEffect(() => {
    const saved = localStorage.getItem('family_finance_modern_v1');
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar dados", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('family_finance_modern_v1', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: Math.random().toString(36).substr(2, 9) };
    setState(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
      childSupportStatus: t.category === Category.PENSION ? 'Pago' : prev.childSupportStatus
    }));
  };

  const addVisitation = (v: Omit<Visitation, 'id'>) => {
    const newVisitation = { ...v, id: Math.random().toString(36).substr(2, 9) };
    setState(prev => ({
      ...prev,
      visitations: [newVisitation, ...prev.visitations]
    }));
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user' as const, content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    try {
      const balance = state.transactions.reduce((acc, t) => acc + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);
      const context = `Saldo: R$ ${balance.toFixed(2)}. Pensão: R$ ${state.monthlyPensionAmount.toFixed(2)}. Status: ${state.childSupportStatus}. Visitas registradas: ${state.visitations.length}.`;
      const response = await GeminiService.askFinanceAssistant(chatInput, context);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, tive um problema de conexão. Poderia tentar de novo?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const nextVisit = state.visitations
    .filter(v => v.status === 'Planejado')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]?.date || null;

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-24 flex flex-col font-sans transition-colors duration-500">
      {/* Dynamic Floating Sidebar */}
      <aside className="fixed left-6 top-6 bottom-6 w-20 bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] flex flex-col items-center py-10 z-50 hidden md:flex shadow-2xl shadow-slate-900/40 border border-slate-800">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-900 font-black mb-12 shadow-lg scale-110">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        
        <nav className="flex-1 flex flex-col gap-8">
          <NavIcon active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<DashboardIcon />} />
          <NavIcon active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<FinanceIcon />} />
          <NavIcon active={activeTab === 'coparenting'} onClick={() => setActiveTab('coparenting')} icon={<ChildIcon />} />
          <NavIcon active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<AiIcon />} />
        </nav>

        <div className="mt-auto flex flex-col gap-6">
           <button 
             onClick={toggleTheme}
             className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors flex items-center justify-center"
           >
             {theme === 'light' ? <MoonIcon /> : <SunIcon />}
           </button>
           <div className="w-10 h-10 rounded-full border-2 border-slate-700 p-0.5 overflow-hidden">
              <div className="w-full h-full bg-indigo-500 rounded-full"></div>
           </div>
        </div>
      </aside>

      {/* Content Wrapper */}
      <main className="flex-1 px-6 md:px-16 pt-12 pb-24 max-w-7xl mx-auto w-full">
        <header className="mb-16 flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 dark:text-indigo-400">
               {activeTab === 'dashboard' && 'Panorama Geral'}
               {activeTab === 'finance' && 'Fluxo Econômico'}
               {activeTab === 'coparenting' && 'Centro de Coparentalidade'}
               {activeTab === 'ai' && 'Assistência Inteligente'}
            </h2>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter transition-colors">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Marcos</span>
            </h1>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={toggleTheme}
               className="md:hidden w-14 h-14 glass rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-sm transition-all active:scale-95"
             >
               {theme === 'light' ? <MoonIcon /> : <SunIcon />}
             </button>
             <button className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-sm hover:scale-105 transition active:scale-95">
               <BellIcon />
             </button>
             <button className="hidden md:flex items-center gap-3 px-6 glass rounded-2xl font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white border-2 border-white dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition shadow-sm">
                Relatórios
             </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard 
            transactions={state.transactions} 
            goals={state.goals} 
            pensionStatus={state.childSupportStatus}
            nextVisit={nextVisit}
          />
        )}

        {activeTab === 'finance' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
            <div className="glass p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100/20 dark:shadow-none border border-white/40 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.2em] text-[10px] mb-8">Novo Lançamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Descrição</label>
                  <input type="text" placeholder="Ex: Mercado" className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none font-bold text-slate-800 dark:text-white transition-all" id="desc" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Valor</label>
                  <input type="number" placeholder="R$" className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none font-bold text-slate-800 dark:text-white transition-all" id="val" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Categoria</label>
                  <select className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none font-bold text-slate-600 dark:text-slate-300 appearance-none transition-all" id="cat">
                    {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button 
                  onClick={() => {
                    const desc = (document.getElementById('desc') as HTMLInputElement).value;
                    const val = parseFloat((document.getElementById('val') as HTMLInputElement).value);
                    const cat = (document.getElementById('cat') as HTMLSelectElement).value as Category;
                    if (desc && val) {
                      addTransaction({ date: new Date().toISOString().split('T')[0], description: desc, amount: val, type: TransactionType.EXPENSE, category: cat, isCoparenting: [Category.PENSION, Category.EDUCATION, Category.HEALTH].includes(cat) });
                      (document.getElementById('desc') as HTMLInputElement).value = '';
                      (document.getElementById('val') as HTMLInputElement).value = '';
                    }
                  }}
                  className="bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-indigo-700 transition active:scale-95 shadow-xl shadow-indigo-200 dark:shadow-none mt-auto py-5"
                >
                  Registrar
                </button>
              </div>
            </div>

            <div className="glass rounded-[2.5rem] shadow-xl shadow-slate-100/20 dark:shadow-none overflow-hidden border border-white/40 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Data</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Descrição</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Categoria</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {state.transactions.map(t => (
                      <tr key={t.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                        <td className="p-8 text-sm text-slate-400 dark:text-slate-500 font-bold">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-8 font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{t.description}</td>
                        <td className="p-8">
                          <span className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 shadow-sm">{t.category}</span>
                        </td>
                        <td className={`p-8 font-black text-right text-lg ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                          {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'coparenting' && (
          <CoparentingModule 
            transactions={state.transactions} 
            visitations={state.visitations}
            onAddTransaction={addTransaction}
            onAddVisitation={addVisitation}
            pensionAmount={state.monthlyPensionAmount}
          />
        )}

        {activeTab === 'ai' && (
          <div className="glass rounded-[2.5rem] shadow-2xl shadow-indigo-100/20 dark:shadow-none h-[750px] flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-700 border border-white/40 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100 dark:shadow-none">
                  <AiIcon />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Concierge Financeiro</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm"></div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Consultor Ativo</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
              {chatMessages.length === 0 && (
                <div className="text-center py-20 space-y-6">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-indigo-500 mb-4 animate-bounce">
                    <AiIcon />
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-3xl tracking-tighter">Como posso organizar <br/>seu dia hoje?</h4>
                  <p className="text-slate-400 dark:text-slate-500 font-medium max-w-sm mx-auto text-sm">Analiso seus gastos com a filha, dou dicas de investimento ou apenas tiro dúvidas rápidas sobre seu saldo.</p>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-xl ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-100' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700 shadow-slate-100 dark:shadow-none'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] rounded-bl-none text-indigo-300 font-black tracking-widest text-[10px] uppercase animate-pulse">
                    Otimizando resposta...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex gap-4">
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Pergunte sobre seus gastos ou pensão..."
                className="flex-1 p-5 border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-700 dark:text-white transition-all shadow-inner"
              />
              <button type="submit" className="bg-slate-900 dark:bg-indigo-600 text-white p-6 rounded-2xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition active:scale-95 shadow-xl shadow-slate-200 dark:shadow-none">
                <SendIcon />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Modern Bottom Nav for Mobile */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 glass rounded-[2rem] flex md:hidden z-50 px-4 items-center shadow-2xl shadow-indigo-200/50 border border-white/40 dark:border-slate-800">
        <MobileTab active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<DashboardIcon />} />
        <MobileTab active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<FinanceIcon />} />
        <MobileTab active={activeTab === 'coparenting'} onClick={() => setActiveTab('coparenting')} icon={<ChildIcon />} />
        <MobileTab active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<AiIcon />} />
      </nav>
    </div>
  );
};

const NavIcon = ({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: any }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/30 scale-110' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
    {icon}
  </button>
);

const MobileTab = ({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: any }) => (
  <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 ${active ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-300 dark:text-slate-600'}`}>
    <div className={`p-2 rounded-xl`}>{icon}</div>
  </button>
);

const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
const FinanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const ChildIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const AiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;

export default App;
