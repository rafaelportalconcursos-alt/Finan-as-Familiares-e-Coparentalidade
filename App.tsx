
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Transaction, Visitation, TransactionType, Category, Goal, ChildData } from './types';
import { INITIAL_STATE } from './constants';
import { Dashboard } from './components/Dashboard';
import { CoparentingModule } from './components/CoparentingModule';
import { Settings } from './components/Settings';
import { GeminiService } from './services/geminiService';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'painel' | 'financeiro' | 'alice' | 'ajuda' | 'configuracoes'>('painel');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string, role: 'user' | 'assistant', content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'setup_required'>('synced');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  const isInitialMount = useRef(true);

  // Função de Notificação/Toast com Vibração
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    
    // Feedback Háptico (Vibração no Celular)
    if ("vibrate" in navigator) {
      if (type === 'error') navigator.vibrate([100, 50, 100]);
      else navigator.vibrate(50);
    }

    // Tenta usar a notificação do sistema se permitida
    if (state.settings.notifications.push && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("FamilyFinance", { 
          body: message,
          icon: '/favicon.ico' 
        });
      } catch (e) {
        // Fallback para navegadores que exigem Service Workers para notificações
        console.info("Notificação de sistema silenciosa: " + message);
      }
    }

    setTimeout(() => setToast(null), 3500);
  }, [state.settings.notifications.push]);

  const migrateState = (data: any): AppState => {
    return {
      ...INITIAL_STATE,
      ...data,
      user: { ...INITIAL_STATE.user, ...(data?.user || {}) },
      child: { ...INITIAL_STATE.child, ...(data?.child || {}) },
      settings: { 
        ...INITIAL_STATE.settings, 
        ...(data?.settings || {}),
        notifications: {
          ...INITIAL_STATE.settings.notifications,
          ...(data?.settings?.notifications || {})
        }
      }
    };
  };

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_state')
        .select('state')
        .eq('id', 'rafael-user-01')
        .single();

      if (error) {
        if (error.code === '42P01') setSyncStatus('setup_required');
        else if (error.code !== 'PGRST116') throw error;
      } else if (data?.state) {
        setState(migrateState(data.state));
      }
      setSyncStatus('synced');
    } catch (err: any) {
      setSyncStatus('error');
    } finally {
      const saved = localStorage.getItem('family_finance_v3');
      if (saved && isInitialMount.current) {
        setState(prev => migrateState(JSON.parse(saved)));
      }
    }
  }, []);

  const handleManualSave = async () => {
    setSyncStatus('saving');
    setIsRefreshing(true);
    setIsFabOpen(false);
    
    try {
      localStorage.setItem('family_finance_v3', JSON.stringify(state));
      const { error } = await supabase
        .from('user_state')
        .upsert({ id: 'rafael-user-01', state: state });
      
      if (error) throw error;
      
      setSyncStatus('synced');
      showNotification("Sincronizado com Sucesso!", "success");
      setTimeout(() => setIsRefreshing(false), 800);
    } catch (err: any) {
      setSyncStatus('error');
      setIsRefreshing(false);
      showNotification("Erro na sincronização", "error");
    }
  };

  const handleSaveAndRefresh = async () => {
    setSyncStatus('saving');
    setIsRefreshing(true);
    setIsFabOpen(false);
    showNotification("Salvando antes de reiniciar...", "info");
    
    try {
      localStorage.setItem('family_finance_v3', JSON.stringify(state));
      await supabase
        .from('user_state')
        .upsert({ id: 'rafael-user-01', state: state });
      window.location.reload();
    } catch (err) {
      window.location.reload();
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    localStorage.setItem('family_finance_v3', JSON.stringify(state));

    const handler = setTimeout(async () => {
      if (syncStatus === 'setup_required' || isRefreshing) return;
      setSyncStatus('saving');
      try {
        await supabase
          .from('user_state')
          .upsert({ id: 'rafael-user-01', state: state });
        setSyncStatus('synced');
      } catch (err: any) {
        setSyncStatus('error');
      }
    }, 5000);

    return () => clearTimeout(handler);
  }, [state, syncStatus, isRefreshing]);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: crypto.randomUUID() };
    setState(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
      childSupportStatus: t.category === Category.PENSION ? 'Pago' : prev.childSupportStatus
    }));
    showNotification(`${t.type === TransactionType.INCOME ? 'Entrada' : 'Saída'} registrada`);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;
    
    const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: chatInput };
    const currentHistory = [...chatMessages];
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    try {
      const balance = state.transactions.reduce((acc, t) => acc + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);
      const context = `Usuário: ${state.user.name}. Saldo: R$ ${balance}. Pensão: R$ ${state.monthlyPensionAmount}. Filha: ${state.child.name}.`;
      const response = await GeminiService.askFinanceAssistant(chatInput, context, currentHistory);
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: response }]);
      showNotification("Nova mensagem da IA", "info");
    } catch (err) {
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: "Erro na conexão com o assistente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-500 ${state.settings.theme === 'dark' ? 'dark' : ''}`}>
      
      {/* Sistema de Toasts (Estilo Push Notification Mobile) */}
      {toast && (
        <div className="fixed top-6 left-6 right-6 z-[250] flex justify-center animate-in slide-in-from-top-full duration-500">
          <div className={`w-full max-w-sm px-6 py-4 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex items-center gap-4 border backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' : 
            toast.type === 'error' ? 'bg-rose-600/90 border-rose-400 text-white' : 
            'bg-slate-900/90 border-slate-700 text-white'
          }`}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
               {toast.type === 'success' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
               {toast.type === 'error' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
               {toast.type === 'info' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Aviso do Sistema</span>
              <span className="text-xs font-bold leading-tight">{toast.message}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 pb-24 md:pb-0 md:pl-24 bg-slate-50 dark:bg-black transition-colors">
        
        {/* Navegação Mobile */}
        <nav className="fixed bottom-6 left-6 right-6 h-20 glass rounded-[2rem] flex md:hidden z-50 px-4 items-center shadow-2xl">
          <MobileTab active={activeTab === 'painel'} onClick={() => setActiveTab('painel')} icon={<DashboardIcon />} />
          <MobileTab active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} icon={<FinanceIcon />} />
          <MobileTab active={activeTab === 'alice'} onClick={() => setActiveTab('alice')} icon={<ChildIcon />} />
          <MobileTab active={activeTab === 'ajuda'} onClick={() => setActiveTab('ajuda')} icon={<AiIcon />} />
          <MobileTab active={activeTab === 'configuracoes'} onClick={() => setActiveTab('configuracoes')} icon={<SettingsIcon />} />
        </nav>

        {/* Sidebar Desktop */}
        <aside className="fixed left-6 top-6 bottom-6 w-20 bg-slate-900 rounded-[2.5rem] hidden md:flex flex-col items-center py-10 z-50 border border-slate-800 shadow-2xl">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-900 font-black mb-12 shadow-lg">FF</div>
          <nav className="flex-1 flex flex-col gap-10">
            <NavIcon active={activeTab === 'painel'} onClick={() => setActiveTab('painel')} icon={<DashboardIcon />} title="Painel" />
            <NavIcon active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} icon={<FinanceIcon />} title="Financeiro" />
            <NavIcon active={activeTab === 'alice'} onClick={() => setActiveTab('alice')} icon={<ChildIcon />} title="Alice" />
            <NavIcon active={activeTab === 'ajuda'} onClick={() => setActiveTab('ajuda')} icon={<AiIcon />} title="IA Assistente" />
            <NavIcon active={activeTab === 'configuracoes'} onClick={() => setActiveTab('configuracoes')} icon={<SettingsIcon />} title="Configurações" />
          </nav>
        </aside>

        {/* FAB MENU */}
        <div className="fixed bottom-[110px] md:bottom-10 right-6 z-[100] flex flex-col items-end gap-4">
          {isFabOpen && (
            <div className="flex flex-col items-end gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
              <button 
                onClick={handleSaveAndRefresh}
                className="flex items-center gap-4 px-6 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 hover:scale-105 active:scale-95 transition-all group"
              >
                <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Atualizar Página</span>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl group-hover:rotate-12 transition-transform">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                </div>
              </button>

              <button 
                onClick={handleManualSave}
                disabled={isRefreshing}
                className="flex items-center gap-4 px-6 py-4 bg-indigo-600 text-white rounded-[2rem] shadow-2xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all group"
              >
                <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
                  {isRefreshing ? 'Salvando...' : 'Salvar Alteração'}
                </span>
                <div className={`p-2.5 bg-white/20 rounded-xl ${isRefreshing ? 'animate-spin' : ''}`}>
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                </div>
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-[0_20px_50px_rgba(99,102,241,0.4)] transition-all duration-500 relative ${isFabOpen ? 'bg-rose-500 rotate-45 scale-95 shadow-rose-500/40' : 'bg-indigo-600 hover:scale-110'}`}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {syncStatus === 'saving' && !isFabOpen && (
               <div className="absolute inset-0 rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
            )}
          </button>
        </div>

        <main className="max-w-7xl mx-auto px-6 md:px-16 pt-12 pb-12 w-full">
          <header className="mb-12 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">
                  {activeTab === 'painel' && 'Visão Geral'}
                  {activeTab === 'financeiro' && 'Gestão Financeira'}
                  {activeTab === 'alice' && 'Módulo Coparentalidade'}
                  {activeTab === 'ajuda' && 'Consultor de IA'}
                  {activeTab === 'configuracoes' && 'Preferências'}
                </span>
                <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`}></span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                Olá, {state.user.name.split(' ')[0]}
              </h1>
            </div>
          </header>

          {activeTab === 'painel' && (
            <Dashboard 
              transactions={state.transactions} 
              goals={state.goals} 
              pensionStatus={state.childSupportStatus}
              nextVisit={state.visitations.find(v => v.status === 'Planejado')?.date || null}
              onDeleteGoal={(id) => { setState(p => ({ ...p, goals: p.goals.filter(g => g.id !== id) })); showNotification("Meta removida"); }}
              onAddGoal={(g) => { setState(p => ({ ...p, goals: [...p.goals, { ...g, id: crypto.randomUUID() }] })); showNotification("Nova meta definida!"); }}
              onAddTransaction={addTransaction}
              spendingLimit={state.settings.spendingLimit}
            />
          )}

          {activeTab === 'financeiro' && (
             <div className="animate-in fade-in duration-500 space-y-10">
               <div className="glass p-10 rounded-[3rem] border-white/20 dark:border-slate-800">
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] text-[10px] mb-8">Registrar Lançamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <input type="text" placeholder="Descrição" className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" id="f-desc" />
                    <input type="number" placeholder="Valor (R$)" className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" id="f-val" />
                    <select className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" id="f-cat">
                      {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => {
                      const d = document.getElementById('f-desc') as HTMLInputElement;
                      const v = document.getElementById('f-val') as HTMLInputElement;
                      const c = document.getElementById('f-cat') as HTMLSelectElement;
                      if(d.value && v.value) {
                        addTransaction({
                          date: new Date().toLocaleDateString('en-CA'),
                          description: d.value,
                          amount: parseFloat(v.value),
                          type: TransactionType.EXPENSE,
                          category: c.value as Category,
                          isCoparenting: [Category.PENSION, Category.EDUCATION, Category.HEALTH].includes(c.value as Category)
                        });
                        d.value = ''; v.value = '';
                      }
                    }} className="bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-indigo-700 transition shadow-xl">Salvar</button>
                  </div>
               </div>

               <div className="glass p-8 rounded-[3rem] border-white/20 dark:border-slate-800">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Extrato de Movimentações</h3>
                  <div className="space-y-4">
                    {state.transactions.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/30 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:border-indigo-500/30 transition-all">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{t.description}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.category}</span>
                        </div>
                        <div className="flex items-center gap-8">
                          <span className={`text-lg font-black ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                            {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button onClick={() => {
                            setState(p => ({ ...p, transactions: p.transactions.filter(tr => tr.id !== t.id) }));
                            showNotification("Lançamento removido");
                          }} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {state.transactions.length === 0 && <p className="text-center py-20 text-slate-400 italic">Nenhum lançamento encontrado.</p>}
                  </div>
               </div>
             </div>
          )}

          {activeTab === 'alice' && (
            <CoparentingModule 
              child={state.child} 
              transactions={state.transactions} 
              visitations={state.visitations}
              onAddTransaction={addTransaction}
              onDeleteTransaction={(id) => {
                setState(p => ({ ...p, transactions: p.transactions.filter(t => t.id !== id) }));
                showNotification("Transação excluída");
              }}
              onAddVisitation={(v) => {
                setState(p => ({ ...p, visitations: [{...v, id: crypto.randomUUID()}, ...p.visitations] }));
                showNotification("Visita agendada!");
              }}
              onDeleteVisitation={(id) => {
                setState(p => ({ ...p, visitations: p.visitations.filter(v => v.id !== id) }));
                showNotification("Visita removida");
              }}
              onUpdateChild={(data) => {
                setState(p => ({ ...p, child: { ...p.child, ...data } }));
                showNotification("Dados de Alice atualizados");
              }}
              pensionAmount={state.monthlyPensionAmount}
              pensionStatus={state.childSupportStatus}
            />
          )}

          {activeTab === 'ajuda' && (
            <div className="glass rounded-[3rem] h-[750px] flex flex-col overflow-hidden border-white/20 dark:border-slate-800 shadow-2xl">
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg"><AiIcon /></div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-xl">IA Assistente</h4>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Consultoria Financeira Ativa</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-6">
                {chatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-6 rounded-[2.5rem] text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-800'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isLoading && <div className="text-[10px] font-black text-indigo-400 animate-pulse uppercase tracking-[0.3em]">IA está analisando seus dados...</div>}
              </div>
              <form onSubmit={handleChatSubmit} className="p-10 border-t border-slate-100 dark:border-slate-800 bg-white/10 dark:bg-slate-900/10 flex gap-4">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Digite sua dúvida financeira..." className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5 rounded-[2rem] outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-medium shadow-inner" />
                <button type="submit" className="p-6 bg-indigo-600 text-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'configuracoes' && (
            <Settings state={state} onUpdateState={(newData) => {
              setState(p => ({ ...p, ...newData }));
              showNotification("Preferências salvas");
            }} onResetData={() => { if(confirm('Excluir todos os dados?')) setState(INITIAL_STATE); }} onShowSql={() => {}} syncStatus={syncStatus} />
          )}
        </main>
      </div>
    </div>
  );
};

const NavIcon = ({ active, onClick, icon, title }: any) => (
  <button onClick={onClick} title={title} className={`p-4 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>{icon}</button>
);
const MobileTab = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`flex-1 flex justify-center p-3 rounded-2xl transition-all ${active ? 'bg-indigo-600/20 text-indigo-500 scale-110' : 'text-slate-400'}`}>{icon}</button>
);

const DashboardIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
const FinanceIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const ChildIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const AiIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>;
const SettingsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/></svg>;

export default App;
