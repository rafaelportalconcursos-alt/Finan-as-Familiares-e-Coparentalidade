
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'finance' | 'coparenting' | 'ai' | 'settings'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'auto') || 'light';
  });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string, role: 'user' | 'assistant', content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'setup_required'>('synced');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  
  const isInitialMount = useRef(true);

  const SQL_INSTRUCTIONS = `
CREATE TABLE user_state (
  id TEXT PRIMARY KEY,
  state JSONB
);
ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON user_state FOR ALL USING (true) WITH CHECK (true);
  `.trim();

  const migrateState = (data: any): AppState => {
    return {
      ...INITIAL_STATE,
      ...data,
      user: { ...INITIAL_STATE.user, ...(data.user || {}) },
      child: { ...INITIAL_STATE.child, ...(data.child || {}) },
      settings: { 
        ...INITIAL_STATE.settings, 
        ...(data.settings || {}),
        notifications: {
          ...INITIAL_STATE.settings.notifications,
          ...(data.settings?.notifications || {}),
          alerts: {
            ...INITIAL_STATE.settings.notifications.alerts,
            ...(data.settings?.notifications?.alerts || {})
          }
        }
      }
    };
  };

  const loadData = useCallback(async () => {
    let fetchedData: any = null;
    try {
      const { data, error } = await supabase
        .from('user_state')
        .select('state')
        .eq('id', 'marcos-user-01')
        .single();

      if (error) {
        if (error.message?.includes("Could not find the table") || error.code === '42P01') {
          setSyncStatus('setup_required');
          setErrorMessage("Tabela não encontrada no Supabase");
        } else if (error.code === 'PGRST116') {
          setSyncStatus('synced');
        } else {
          throw error;
        }
      } else if (data && data.state) {
        fetchedData = data;
        setState(migrateState(data.state));
        setSyncStatus('synced');
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.error("Erro Supabase:", err.message || err);
      setSyncStatus('error');
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError';
      setErrorMessage(isNetworkError 
        ? "Erro de conexão: Verifique sua internet ou se o Supabase está ativo." 
        : (err.message || "Erro desconhecido"));
    } finally {
      if (!fetchedData) {
        const saved = localStorage.getItem('family_finance_modern_v1');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setState(migrateState(parsed));
          } catch(e) {}
        }
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem('family_finance_modern_v1', JSON.stringify(state));
    if (syncStatus === 'setup_required') return;
    const timer = setTimeout(async () => {
      setSyncStatus('saving');
      try {
        const { error } = await supabase
          .from('user_state')
          .upsert({ id: 'marcos-user-01', state: state });
        if (error) throw error;
        setSyncStatus('synced');
        setErrorMessage(null);
      } catch (err: any) {
        if (err.message?.includes("Could not find the table")) {
          setSyncStatus('setup_required');
        } else {
          setSyncStatus('error');
          setErrorMessage(err.message === 'Failed to fetch' ? "Conexão perdida ao salvar." : (err.message || "Erro ao salvar"));
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [state, syncStatus]);

  useEffect(() => {
    const root = window.document.documentElement;
    const currentTheme = state.settings?.theme === 'auto' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : (state.settings?.theme || 'light');

    if (currentTheme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    
    setTheme(state.settings?.theme || 'light');
  }, [state.settings?.theme]);

  const toggleTheme = () => {
    const currentTheme = state.settings?.theme || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    updatePartialState({ settings: { ...state.settings, theme: newTheme as any } });
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: Math.random().toString(36).substr(2, 9) };
    setState(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
      childSupportStatus: t.category === Category.PENSION ? 'Pago' : prev.childSupportStatus
    }));
  };

  const addGoal = (g: Omit<Goal, 'id'>) => {
    const newGoal = { ...g, id: Math.random().toString(36).substr(2, 9) };
    setState(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal]
    }));
  };

  const deleteTransaction = (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento?")) {
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id)
      }));
    }
  };

  const addVisitation = (v: Omit<Visitation, 'id'>) => {
    const newVisitation = { ...v, id: Math.random().toString(36).substr(2, 9) };
    setState(prev => ({
      ...prev,
      visitations: [newVisitation, ...prev.visitations]
    }));
  };

  const deleteVisitation = (id: string) => {
    if (confirm("Deseja excluir este agendamento de visita?")) {
      setState(prev => ({
        ...prev,
        visitations: prev.visitations.filter(v => v.id !== id)
      }));
    }
  };

  const deleteGoal = (id: string) => {
    if (confirm("Deseja remover esta meta financeira?")) {
      setState(prev => ({
        ...prev,
        goals: prev.goals.filter(g => g.id !== id)
      }));
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsgId = Math.random().toString(36).substr(2, 9);
    const userMsg = { id: userMsgId, role: 'user' as const, content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    try {
      const balance = state.transactions.reduce((acc, t) => acc + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);
      const context = `Usuário: ${state.user.name}. Saldo: R$ ${balance.toFixed(2)}. Pensão: R$ ${state.monthlyPensionAmount.toFixed(2)}. Status: ${state.childSupportStatus}. Filha: ${state.child.name}.`;
      const responseText = await GeminiService.askFinanceAssistant(chatInput, context);
      
      const assistantMsgId = Math.random().toString(36).substr(2, 9);
      setChatMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: responseText }]);
    } catch (err) {
      const errorMsgId = Math.random().toString(36).substr(2, 9);
      setChatMessages(prev => [...prev, { id: errorMsgId, role: 'assistant', content: "Desculpe, tive um problema de conexão com a inteligência artificial." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChatMessage = (id: string) => {
    setChatMessages(prev => prev.filter(m => m.id !== id));
  };

  const clearChat = () => {
    if (confirm("Limpar toda a conversa?")) {
      setChatMessages([]);
    }
  };

  const resetData = () => {
    if (confirm("ATENÇÃO: Isso apagará TODOS os seus dados salvos localmente e na nuvem. Continuar?")) {
      setState(INITIAL_STATE);
      setChatMessages([]);
      localStorage.removeItem('family_finance_modern_v1');
    }
  };

  const updatePartialState = (newData: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...newData }));
  };

  const updateChild = (data: Partial<ChildData>) => {
    setState(prev => ({ ...prev, child: { ...prev.child, ...data } }));
  };

  const nextVisit = state.visitations
    .filter(v => v.status === 'Planejado')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]?.date || null;

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-24 flex flex-col font-sans transition-colors duration-500 overflow-x-hidden">
      {showSetupInstructions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="glass max-w-2xl w-full p-10 rounded-[2.5rem] shadow-2xl border-indigo-500/30 animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Configuração Necessária</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
              Para ativar a sincronização em nuvem, você precisa criar a tabela no seu projeto Supabase. 
              Vá em <strong>SQL Editor</strong> e execute o comando abaixo:
            </p>
            <pre className="bg-slate-900 text-indigo-300 p-6 rounded-2xl text-xs font-mono overflow-x-auto mb-8 border border-slate-800">
              {SQL_INSTRUCTIONS}
            </pre>
            <div className="flex justify-end gap-4">
               <button onClick={() => { navigator.clipboard.writeText(SQL_INSTRUCTIONS); alert("Copiado!"); }} className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase hover:bg-slate-200 transition">Copiar SQL</button>
               <button onClick={() => setShowSetupInstructions(false)} className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition">Entendido</button>
            </div>
          </div>
        </div>
      )}

      <aside className="fixed left-6 top-6 bottom-6 w-20 bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] flex flex-col items-center py-10 z-50 hidden md:flex shadow-2xl shadow-slate-900/40 border border-slate-800">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-900 font-black mb-12 shadow-lg scale-110">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <nav className="flex-1 flex flex-col gap-8">
          <NavIcon active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<DashboardIcon />} />
          <NavIcon active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<FinanceIcon />} />
          <NavIcon active={activeTab === 'coparenting'} onClick={() => setActiveTab('coparenting')} icon={<ChildIcon />} />
          <NavIcon active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<AiIcon />} />
          <NavIcon active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon />} />
        </nav>
        <div className="mt-auto flex flex-col gap-6">
           <button onClick={toggleTheme} title="Alternar Tema" className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors flex items-center justify-center">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</button>
           <div className="w-10 h-10 rounded-full border-2 border-slate-700 p-0.5 overflow-hidden"><div className="w-full h-full bg-indigo-500 rounded-full"></div></div>
        </div>
      </aside>

      <main className="flex-1 px-6 md:px-16 pt-12 pb-24 max-w-7xl mx-auto w-full">
        <header className="mb-16 flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 dark:text-indigo-400">
                 {activeTab === 'dashboard' && 'Panorama Geral'}
                 {activeTab === 'finance' && 'Fluxo Econômico'}
                 {activeTab === 'coparenting' && 'Minha Filha'}
                 {activeTab === 'ai' && 'Assistência Inteligente'}
                 {activeTab === 'settings' && 'Preferências do Sistema'}
              </h2>
              <div onClick={() => { if (syncStatus === 'setup_required') setShowSetupInstructions(true); if (syncStatus === 'error') loadData(); }} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all duration-300 group relative cursor-pointer shadow-sm ${syncStatus === 'synced' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100' : syncStatus === 'saving' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-100 dark:border-amber-800/50 animate-pulse' : syncStatus === 'setup_required' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-200 dark:border-indigo-800 hover:scale-105' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 border-rose-100 dark:border-rose-800/50 hover:bg-rose-100'}`}>
                <CloudIcon /> 
                {syncStatus === 'synced' ? 'Nuvem OK' : syncStatus === 'saving' ? 'Sincronizando' : syncStatus === 'setup_required' ? 'Configurar Nuvem' : 'Erro: Tentar De Novo'}
                 {errorMessage && (
                   <div className="absolute top-full left-0 mt-2 p-2 bg-slate-800 text-white rounded text-[8px] whitespace-normal w-48 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl border border-slate-700">{errorMessage}</div>
                 )}
              </div>
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter transition-colors">Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">{state.user?.name?.split(' ')[0] || 'Visitante'}</span></h1>
          </div>
          <div className="flex gap-4">
             <button onClick={toggleTheme} className="md:hidden w-14 h-14 glass rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-sm transition-all active:scale-95">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</button>
             <button className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-sm hover:scale-105 transition active:scale-95"><BellIcon /></button>
             <button className="hidden md:flex items-center gap-3 px-6 glass rounded-2xl font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white border-2 border-white dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition shadow-sm">Relatórios</button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard 
            transactions={state.transactions} 
            goals={state.goals} 
            pensionStatus={state.childSupportStatus} 
            nextVisit={nextVisit} 
            onDeleteGoal={deleteGoal}
            onAddGoal={addGoal}
            onAddTransaction={addTransaction}
            spendingLimit={state.settings?.spendingLimit || 0}
          />
        )}

        {activeTab === 'finance' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
            <div className="glass p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100/20 dark:shadow-none border border-white/40 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.2em] text-[10px] mb-8">Novo Lançamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex flex-col gap-2"><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Descrição</label><input type="text" placeholder="Ex: Mercado" className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none font-bold text-slate-800 dark:text-white transition-all" id="desc" /></div>
                <div className="flex flex-col gap-2"><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Valor</label><input type="number" placeholder="R$" className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none font-bold text-slate-800 dark:text-white transition-all" id="val" /></div>
                <div className="flex flex-col gap-2"><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Categoria</label><select className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none font-bold text-slate-600 dark:text-slate-300 appearance-none transition-all" id="cat">{Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <button onClick={() => { const descI = document.getElementById('desc') as HTMLInputElement; const valI = document.getElementById('val') as HTMLInputElement; const catS = document.getElementById('cat') as HTMLSelectElement; if (descI.value && valI.value) { addTransaction({ date: new Date().toLocaleDateString('en-CA'), description: descI.value, amount: parseFloat(valI.value), type: TransactionType.EXPENSE, category: catS.value as Category, isCoparenting: [Category.PENSION, Category.EDUCATION, Category.HEALTH].includes(catS.value as Category) }); descI.value = ''; valI.value = ''; } }} className="bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-indigo-700 transition active:scale-95 shadow-xl shadow-indigo-200 dark:shadow-none mt-auto py-5">Registrar</button>
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
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {state.transactions.map(t => {
                      const dateParts = t.date.split('-');
                      const displayDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : t.date;
                      return (
                        <tr key={t.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                          <td className="p-8 text-sm text-slate-400 dark:text-slate-500 font-bold">{displayDate}</td>
                          <td className="p-8 font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{t.description}</td>
                          <td className="p-8"><span className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 shadow-sm">{t.category}</span></td>
                          <td className={`p-8 font-black text-right text-lg ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>{t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="p-8 text-center">
                             <button onClick={() => deleteTransaction(t.id)} className="text-slate-300 hover:text-rose-500 transition-all p-2 hover:scale-125" title="Excluir"><DeleteIcon /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'coparenting' && (
          <CoparentingModule 
            child={state.child} 
            transactions={state.transactions} 
            visitations={state.visitations} 
            onAddTransaction={addTransaction} 
            onDeleteTransaction={deleteTransaction} 
            onAddVisitation={addVisitation} 
            onDeleteVisitation={deleteVisitation} 
            onUpdateChild={updateChild}
            pensionAmount={state.monthlyPensionAmount} 
            pensionStatus={state.childSupportStatus} 
          />
        )}

        {activeTab === 'ai' && (
          <div className="glass rounded-[2.5rem] shadow-2xl shadow-indigo-100/20 dark:shadow-none h-[750px] flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-700 border border-white/40 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100 dark:shadow-none"><AiIcon /></div>
                <div><h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Concierge Financeiro</h4><div className="flex items-center gap-1.5 mt-1"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm"></div><span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Consultor Ativo</span></div></div>
              </div>
              <button 
                onClick={clearChat}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all flex items-center justify-center"
                title="Limpar Conversa"
              >
                <TrashIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
              {chatMessages.length === 0 && (
                <div className="text-center py-20 space-y-6">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-indigo-500 mb-4 animate-bounce"><AiIcon /></div>
                  <h4 className="font-black text-slate-900 dark:text-white text-3xl tracking-tighter">Como posso organizar <br/>seu dia hoje?</h4>
                  <p className="text-slate-400 dark:text-slate-500 font-medium max-w-sm mx-auto text-sm">Analiso seus gastos com a filha, dou dicas de investimento ou apenas tiro dúvidas rápidas sobre seu saldo.</p>
                </div>
              )}
              {chatMessages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} group relative`}>
                  <div className={`max-w-[70%] p-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-xl ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-100' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700 shadow-slate-100 dark:shadow-none'}`}>
                    {m.content}
                  </div>
                  <button 
                    onClick={() => deleteChatMessage(m.id)}
                    className={`absolute -top-2 ${m.role === 'user' ? '-left-8' : '-right-8'} p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity`}
                    title="Excluir mensagem"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              ))}
              {isLoading && ( <div className="flex justify-start"><div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] rounded-bl-none text-indigo-300 font-black tracking-widest text-[10px] uppercase animate-pulse">Otimizando resposta...</div></div> )}
            </div>
            <form onSubmit={handleChatSubmit} className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex gap-4">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Pergunte sobre seus gastos ou pensão..." className="flex-1 p-5 border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-700 dark:text-white transition-all shadow-inner" />
              <button type="submit" className="bg-slate-900 dark:bg-indigo-600 text-white p-6 rounded-2xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition active:scale-95 shadow-xl shadow-slate-200 dark:shadow-none"><SendIcon /></button>
            </form>
          </div>
        )}

        {activeTab === 'settings' && (
          <Settings 
            state={state} 
            onUpdateState={updatePartialState} 
            onResetData={resetData}
            onShowSql={() => setShowSetupInstructions(true)}
            syncStatus={syncStatus}
          />
        )}
      </main>
      <nav className="fixed bottom-6 left-6 right-6 h-20 glass rounded-[2rem] flex md:hidden z-50 px-4 items-center shadow-2xl shadow-indigo-200/50 border border-white/40 dark:border-slate-800">
        <MobileTab active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<DashboardIcon />} />
        <MobileTab active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<FinanceIcon />} />
        <MobileTab active={activeTab === 'coparenting'} onClick={() => setActiveTab('coparenting')} icon={<ChildIcon />} />
        <MobileTab active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<AiIcon />} />
        <MobileTab active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon />} />
      </nav>
    </div>
  );
};

const NavIcon = ({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: any }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/30 scale-110' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>{icon}</button>
);
const MobileTab = ({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: any }) => (
  <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 ${active ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-300 dark:text-slate-600'}`}><div className={`p-2 rounded-xl`}>{icon}</div></button>
);
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
const FinanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const ChildIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const AiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
const CloudIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.1-3.9-4.5-.5-3.1-3.1-5.5-6.1-5.5-2.2 0-4.2 1.2-5.3 3-3 0-5.5 2.5-5.5 5.5S3.7 18.5 6.5 18.5H17.5"/></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;
const TrashIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
const DeleteIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

export default App;
