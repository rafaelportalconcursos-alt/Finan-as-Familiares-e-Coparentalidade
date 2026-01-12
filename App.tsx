
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState, Transaction, Visitation, TransactionType, Category, Goal } from './types';
import { INITIAL_STATE } from './constants';
import { Dashboard } from './components/Dashboard';
import { CoparentingModule } from './components/CoparentingModule';
import { Settings } from './components/Settings';
import { ImportModule } from './components/ImportModule';
import { GeminiService } from './services/geminiService';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'painel' | 'financeiro' | 'alice' | 'ajuda' | 'configuracoes'>('painel');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string, role: 'user' | 'assistant', content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'offline'>('synced');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [financeSearch, setFinanceSearch] = useState('');
  const [financeCategory, setFinanceCategory] = useState<Category | 'TODOS'>('TODOS');
  
  const [globalModal, setGlobalModal] = useState<'transaction' | 'visitation' | 'goal' | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const isInitialMount = useRef(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Notificação Visual
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    if ("vibrate" in navigator) {
      if (type === 'error') navigator.vibrate([100, 50, 100]);
      else navigator.vibrate(50);
    }
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Lógica de Salvamento na Nuvem (Supabase)
  const saveToCloud = useCallback(async (dataToSave: AppState) => {
    setSyncStatus('saving');
    try {
      const { error } = await supabase
        .from('user_state')
        .upsert({ id: 'rafael-user-01', state: dataToSave });
      
      if (error) throw error;
      setSyncStatus('synced');
    } catch (err) {
      console.error("Erro ao sincronizar com Supabase:", err);
      setSyncStatus('error');
    }
  }, []);

  // Sincronização Manual
  const handleManualSync = async () => {
    showNotification("Iniciando sincronização forçada...", "info");
    await saveToCloud(state);
    if (syncStatus !== 'error') showNotification("Dados sincronizados com sucesso!");
    else showNotification("Falha na sincronização. Verifique sua conexão.", "error");
  };

  // Carregamento Inicial
  useEffect(() => {
    const initLoad = async () => {
      // 1. Tenta carregar do LocalStorage (Rápido)
      const local = localStorage.getItem('family_finance_v3');
      if (local) {
        try {
          setState(JSON.parse(local));
        } catch (e) {
          console.error("Erro ao ler LocalStorage", e);
        }
      }

      // 2. Tenta carregar do Supabase (Mais atualizado)
      try {
        const { data, error } = await supabase
          .from('user_state')
          .select('state')
          .eq('id', 'rafael-user-01')
          .single();
        
        if (data?.state) {
          setState(data.state);
          localStorage.setItem('family_finance_v3', JSON.stringify(data.state));
        }
        setSyncStatus('synced');
      } catch (err) {
        console.warn("Supabase não disponível, operando em modo offline.");
        setSyncStatus('offline');
      }
    };
    initLoad();
  }, []);

  // Auto-Save com Debounce
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Salva no LocalStorage imediatamente para segurança do usuário
    localStorage.setItem('family_finance_v3', JSON.stringify(state));

    // Debounce de 3 segundos para o Supabase (evita excesso de escritas)
    const handler = setTimeout(() => {
      saveToCloud(state);
    }, 3000);

    return () => clearTimeout(handler);
  }, [state, saveToCloud]);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const uniqueKey = `${t.date}_${t.amount.toFixed(2)}_${t.description.toLowerCase().trim()}`;
    const newTransaction = { ...t, id: crypto.randomUUID(), uniqueKey };
    setState(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
      childSupportStatus: t.category === Category.PENSION ? 'Pago' : prev.childSupportStatus
    }));
    showNotification("Lançamento efetuado!");
  };

  const updateState = (newData: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...newData }));
  };

  const deleteTransaction = (id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
    showNotification("Lançamento removido.", "info");
  };

  const filteredTransactions = useMemo(() => {
    return state.transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(financeSearch.toLowerCase());
      const matchesCategory = financeCategory === 'TODOS' || t.category === financeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [state.transactions, financeSearch, financeCategory]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;
    
    const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    try {
      const balance = state.transactions.reduce((acc, t) => acc + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);
      const context = `Usuario: ${state.user.name}, Saldo: R$ ${balance}, Pensão: R$ ${state.monthlyPensionAmount}, Filha: ${state.child.name}.`;
      const response = await GeminiService.askFinanceAssistant(userMsg.content, context, chatMessages.slice(-6));
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { 
        id: crypto.randomUUID(), role: 'assistant', content: "Ops! Tive um problema técnico para acessar a IA. Tente novamente em alguns segundos." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-500 ${state.settings.theme === 'dark' ? 'dark' : ''}`}>
      {toast && (
        <div className="fixed top-6 left-6 right-6 z-[250] flex justify-center animate-in slide-in-from-top-full duration-500">
          <div className={`w-full max-w-sm px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' : 
            toast.type === 'error' ? 'bg-rose-600/90 border-rose-400 text-white' : 
            'bg-slate-900/90 border-slate-700 text-white'
          }`}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
            </div>
            <span className="text-xs font-bold leading-tight">{toast.message}</span>
          </div>
        </div>
      )}

      {isImportOpen && (
        <ImportModule existingTransactions={state.transactions} onConfirm={(newT) => { updateState({ transactions: [...newT, ...state.transactions] }); setIsImportOpen(false); showNotification(`${newT.length} registros importados.`); }} onCancel={() => setIsImportOpen(false)} />
      )}

      {/* Botão de Ação Flutuante (FAB) */}
      <div className="fixed bottom-32 right-8 md:bottom-12 md:right-12 z-[100] flex flex-col items-end gap-4">
        {isFabOpen && (
          <div className="flex flex-col items-end gap-3 mb-2 animate-in slide-in-from-bottom-4 duration-300">
            <FabSubButton onClick={() => { handleManualSync(); setIsFabOpen(false); }} label="Sincronizar Nuvem" icon={<CloudIcon />} color="bg-emerald-600" />
            <FabSubButton onClick={() => { setGlobalModal('visitation'); setIsFabOpen(false); }} label="Agendar Visita" icon={<CalendarIcon />} color="bg-indigo-500" />
            <FabSubButton onClick={() => { setGlobalModal('goal'); setIsFabOpen(false); }} label="Nova Meta" icon={<TargetIcon />} color="bg-amber-500" />
            <FabSubButton onClick={() => { setGlobalModal('transaction'); setIsFabOpen(false); }} label="Novo Gasto" icon={<PlusIcon />} color="bg-rose-500" />
          </div>
        )}
        <button 
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 transform ${isFabOpen ? 'bg-slate-900 rotate-45 scale-90' : 'bg-indigo-600 hover:scale-110'}`}
        >
          <PlusIcon size={32} />
        </button>
      </div>

      {/* Modais Globais */}
      {globalModal === 'transaction' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="glass max-w-md w-full p-10 rounded-[3rem] shadow-2xl border-white/10 dark:border-slate-800 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tight">Novo Lançamento</h3>
            <TransactionForm onClose={() => setGlobalModal(null)} onSubmit={(t) => { addTransaction(t); setGlobalModal(null); }} />
          </div>
        </div>
      )}

      {globalModal === 'visitation' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="glass max-w-md w-full p-10 rounded-[3rem] shadow-2xl border-white/10 dark:border-slate-800 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tight">Agendar Visita</h3>
            <VisitationForm onClose={() => setGlobalModal(null)} onSubmit={(v) => { setState(p => ({...p, visitations: [{...v, id: crypto.randomUUID()}, ...p.visitations]})); setGlobalModal(null); showNotification("Visita agendada!"); }} />
          </div>
        </div>
      )}

      <div className="flex-1 pb-24 md:pb-0 md:pl-24 bg-slate-50 dark:bg-black transition-colors">
        <aside className="fixed left-6 top-6 bottom-6 w-20 bg-slate-900 rounded-[2.5rem] hidden md:flex flex-col items-center py-10 z-50 border border-slate-800 shadow-2xl">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-900 font-black mb-12 shadow-lg cursor-pointer" onClick={() => setActiveTab('painel')}>FF</div>
          <nav className="flex-1 flex flex-col gap-10">
            <NavIcon active={activeTab === 'painel'} onClick={() => setActiveTab('painel')} icon={<DashboardIcon />} />
            <NavIcon active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} icon={<FinanceIcon />} />
            <NavIcon active={activeTab === 'alice'} onClick={() => setActiveTab('alice')} icon={<ChildIcon />} />
            <NavIcon active={activeTab === 'ajuda'} onClick={() => setActiveTab('ajuda')} icon={<AiIcon />} />
            <NavIcon active={activeTab === 'configuracoes'} onClick={() => setActiveTab('configuracoes')} icon={<SettingsIcon />} />
          </nav>
        </aside>

        <main className="max-w-7xl mx-auto px-6 md:px-16 pt-12 pb-12 w-full">
          <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Family Finance AI</span>
                <div className="flex items-center gap-2">
                   <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`}></span>
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                     {syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'saving' ? 'Salvando...' : 'Erro na Nuvem'}
                   </span>
                </div>
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Olá, {state.user.name.split(' ')[0]}</h1>
            </div>
          </header>

          {activeTab === 'painel' && (
            <Dashboard 
              transactions={state.transactions} goals={state.goals} pensionStatus={state.childSupportStatus} 
              nextVisit={state.visitations.find(v => v.status === 'Planejado')?.date || null} 
              onDeleteGoal={(id) => updateState({ goals: state.goals.filter(g => g.id !== id) })} 
              onAddGoal={(g) => updateState({ goals: [...state.goals, { ...g, id: crypto.randomUUID() }] })} 
              onAddTransaction={addTransaction} spendingLimit={state.settings.spendingLimit} 
              onExport={() => {}} 
            />
          )}

          {activeTab === 'financeiro' && (
             <div className="animate-in fade-in duration-500 space-y-10">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Gestão de Transações</h3>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => {}} className="flex-1 md:flex-none px-6 py-3 glass text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition shadow-sm border border-white/5">Exportar CSV</button>
                    <button onClick={() => setIsImportOpen(true)} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition shadow-xl">Importar Extrato</button>
                  </div>
               </div>
               <div className="glass p-8 rounded-[3rem] border-white/5 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={financeSearch} onChange={(e) => setFinanceSearch(e.target.value)} placeholder="Pesquisar..." className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" />
                    <select value={financeCategory} onChange={(e) => setFinanceCategory(e.target.value as any)} className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none appearance-none cursor-pointer">
                      <option value="TODOS">Todas as Categorias</option>
                      {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredTransactions.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/30 rounded-[2rem] border border-slate-100 dark:border-white/5 group hover:border-indigo-500/30 transition-all">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{t.description}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.date} • {t.category}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className={`text-lg font-black ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                            {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button onClick={() => deleteTransaction(t.id)} className="p-2 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                            <TrashIcon size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
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
              onDeleteTransaction={deleteTransaction} 
              onAddVisitation={(v) => setState(p => ({...p, visitations: [{...v, id: crypto.randomUUID()}, ...p.visitations]}))} 
              onDeleteVisitation={(id) => setState(p => ({ ...p, visitations: p.visitations.filter(v => v.id !== id) }))} 
              onUpdateChild={(data) => setState(p => ({ ...p, child: { ...p.child, ...data } }))} 
              pensionAmount={state.monthlyPensionAmount} 
              pensionStatus={state.childSupportStatus} 
            />
          )}

          {activeTab === 'ajuda' && (
            <div className="glass rounded-[3rem] h-[calc(100vh-250px)] max-h-[750px] flex flex-col overflow-hidden border-white/5 shadow-2xl">
              <div className="p-10 border-b border-white/5 flex items-center gap-5">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white"><AiIcon /></div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-lg">Family Finance AI</h4>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Inteligência Artificial Ativa</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-slate-50/20 dark:bg-black/20 custom-scrollbar">
                {chatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[85%] p-6 rounded-[2.5rem] text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-white/5'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isLoading && <div className="p-6 bg-white/5 rounded-2xl w-24 animate-pulse">Pensando...</div>}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleChatSubmit} className="p-8 border-t border-white/5 flex gap-4">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Tire suas dúvidas financeiras aqui..." className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-white/10 p-5 rounded-[2rem] outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-medium shadow-inner" />
                <button type="submit" disabled={isLoading} className="p-6 bg-indigo-600 text-white rounded-full shadow-lg hover:scale-105 transition">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'configuracoes' && (
            <Settings 
              state={state} 
              onUpdateState={updateState} 
              onResetData={() => { if(confirm("Deseja apagar todos os dados locais?")) { updateState(INITIAL_STATE); showNotification("Configurações resetadas.", "info"); } }} 
              onShowSql={handleManualSync} 
              syncStatus={syncStatus} 
            />
          )}
        </main>
      </div>
    </div>
  );
};

// --- FAB Components ---
const FabSubButton = ({ onClick, label, icon, color }: any) => (
  <div className="flex items-center gap-3">
    <span className="px-3 py-1.5 bg-slate-900/80 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md">{label}</span>
    <button onClick={onClick} className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition ${color}`}>
      {icon}
    </button>
  </div>
);

const TransactionForm = ({ onClose, onSubmit }: any) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState(TransactionType.EXPENSE);
  const [cat, setCat] = useState(Category.OTHER);

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit({ date: new Date().toLocaleDateString('en-CA'), description: desc, amount: parseFloat(amount), type, category: cat, isCoparenting: false }); }}>
      <InputGroup label="Descrição" value={desc} onChange={setDesc} />
      <InputGroup label="Valor (R$)" type="number" value={amount} onChange={setAmount} />
      <div className="grid grid-cols-2 gap-4">
        <button type="button" onClick={() => setType(TransactionType.INCOME)} className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition ${type === TransactionType.INCOME ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-white/5 text-slate-500'}`}>Receita</button>
        <button type="button" onClick={() => setType(TransactionType.EXPENSE)} className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition ${type === TransactionType.EXPENSE ? 'border-rose-500 bg-rose-500/10 text-rose-500' : 'border-white/5 text-slate-500'}`}>Despesa</button>
      </div>
      <div className="flex gap-4">
        <button type="button" onClick={onClose} className="flex-1 py-5 text-[10px] font-black uppercase text-slate-500">Cancelar</button>
        <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase">Confirmar</button>
      </div>
    </form>
  );
};

const VisitationForm = ({ onClose, onSubmit }: any) => {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [loc, setLoc] = useState('Casa da Mãe');
  const [notes, setNotes] = useState('');

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit({ date, status: 'Planejado', location: loc, notes }); }}>
      <InputGroup label="Data" type="date" value={date} onChange={setDate} />
      <InputGroup label="Localização" value={loc} onChange={setLoc} />
      <InputGroup label="Notas" value={notes} onChange={setNotes} />
      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onClose} className="flex-1 py-5 text-[10px] font-black uppercase text-slate-500">Cancelar</button>
        <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase">Agendar</button>
      </div>
    </form>
  );
};

const InputGroup = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input required type={type} step="any" value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-4 bg-black/30 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500" />
  </div>
);

// --- Icons ---
const NavIcon = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`p-4 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>{icon}</button>
);
const MobileTab = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`flex-1 flex justify-center p-3 rounded-2xl transition-all ${active ? 'bg-indigo-600/20 text-indigo-500' : 'text-slate-400'}`}>{icon}</button>
);

const DashboardIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
const FinanceIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const ChildIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const AiIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>;
const SettingsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/></svg>;
const PlusIcon = ({ size = 24 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const CloudIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5-1.1-2.9-3.9-5-7.1-5-3.6 0-6.6 2.6-7.2 6.1C1.8 11.7 0 13.7 0 16c0 2.8 2.2 5 5 5h12.5"/><polyline points="12 12 12 18"/><polyline points="9 15 12 12 15 15"/></svg>;
const CalendarIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const TargetIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const TrashIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

export default App;
