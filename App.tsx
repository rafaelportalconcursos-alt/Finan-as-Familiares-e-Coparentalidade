
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState, Transaction, Visitation, TransactionType, Category, Goal, LegalDocument } from './types';
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
  
  const [globalModal, setGlobalModal] = useState<'transaction' | 'visitation' | 'goal' | 'document' | 'pension' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const isInitialMount = useRef(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    if ("vibrate" in navigator) {
      if (type === 'error') navigator.vibrate([100, 50, 100]);
      else navigator.vibrate(50);
    }
    setTimeout(() => setToast(null), 3000);
  }, []);

  const saveToCloud = useCallback(async (dataToSave: AppState) => {
    setSyncStatus('saving');
    try {
      const { error } = await supabase
        .from('user_state')
        .upsert({ id: 'rafael-user-01', state: dataToSave });
      
      if (error) throw error;
      setSyncStatus('synced');
    } catch (err) {
      console.error("Erro ao sincronizar:", err);
      setSyncStatus('error');
    }
  }, []);

  useEffect(() => {
    const initLoad = async () => {
      let loadedState: Partial<AppState> | null = null;
      try {
        const { data } = await supabase.from('user_state').select('state').eq('id', 'rafael-user-01').single();
        if (data?.state) {
          loadedState = data.state;
        }
      } catch (err) {
        console.warn("Supabase offline, tentando local...");
      }
      if (!loadedState) {
        const local = localStorage.getItem('family_finance_v3');
        if (local) {
          try { loadedState = JSON.parse(local); } catch (e) { console.error(e); }
        }
      }
      if (loadedState) {
        setState(prev => ({
          ...prev,
          ...loadedState,
          transactions: loadedState.transactions || prev.transactions || [],
          visitations: loadedState.visitations || prev.visitations || [],
          documents: loadedState.documents || prev.documents || [],
          goals: loadedState.goals || prev.goals || [],
        }));
        setSyncStatus('synced');
      }
    };
    initLoad();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    localStorage.setItem('family_finance_v3', JSON.stringify(state));
    const handler = setTimeout(() => saveToCloud(state), 15000);
    return () => clearTimeout(handler);
  }, [state, saveToCloud]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const addOrUpdateTransaction = (t: Omit<Transaction, 'id'> | Transaction) => {
    if ('id' in t) {
      setState(prev => ({
        ...prev,
        transactions: (prev.transactions || []).map(item => item.id === t.id ? (t as Transaction) : item)
      }));
      showNotification("Atualizado com sucesso!");
    } else {
      const newTransaction = { ...t, id: crypto.randomUUID(), uniqueKey: `${t.date}_${t.amount}_${t.description}` };
      setState(prev => ({
        ...prev,
        transactions: [newTransaction, ...(prev.transactions || [])],
        childSupportStatus: t.category === Category.PENSION ? 'Pago' : prev.childSupportStatus
      }));
      showNotification("Novo registro salvo!");
    }
  };

  const addOrUpdateVisitation = (v: Omit<Visitation, 'id'> | Visitation) => {
    if ('id' in v) {
      setState(prev => ({ ...prev, visitations: (prev.visitations || []).map(item => item.id === v.id ? (v as Visitation) : item) }));
      showNotification("Agenda atualizada!");
    } else {
      setState(prev => ({ ...prev, visitations: [{ ...v, id: crypto.randomUUID() }, ...(prev.visitations || [])] }));
      showNotification("Visita agendada!");
    }
  };

  const updateState = (newData: Partial<AppState>) => setState(prev => ({ ...prev, ...newData }));
  
  const deleteTransaction = (id: string) => {
    setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
    showNotification("Registro removido.", "info");
  };

  const filteredTransactions = useMemo(() => {
    return (state.transactions || []).filter(t => {
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
      const response = await GeminiService.askFinanceAssistant(userMsg.content, `Usuário: ${state.user.name}, Filha: ${state.child.name}, Meta: ${state.goals[0]?.name || 'Nenhuma'}`, chatMessages.slice(-8));
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: "Desculpe, tive um problema ao processar sua solicitação." }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-200">
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[350] animate-in slide-in-from-top-4">
          <div className="px-6 py-4 glass rounded-full shadow-2xl flex items-center gap-4 border-indigo-500/20">
            <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-indigo-500 shadow-[0_0_10px_#6366f1]'}`}></div>
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}

      {isImportOpen && (
        <ImportModule 
          existingTransactions={state.transactions} 
          onConfirm={(newT) => { updateState({ transactions: [...newT, ...state.transactions] }); setIsImportOpen(false); showNotification("Extrato importado com sucesso!"); }} 
          onCancel={() => setIsImportOpen(false)} 
        />
      )}

      <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[200]">
        <div className="relative">
          {isFabOpen && (
            <div className="absolute bottom-20 right-0 flex flex-col items-end gap-3 animate-in slide-in-from-bottom-4">
              <FabSubButton onClick={() => { setEditItem(null); setGlobalModal('goal'); setIsFabOpen(false); }} label="Nova Meta" icon={<TargetIcon />} color="bg-amber-500" />
              <FabSubButton onClick={() => { setEditItem(null); setGlobalModal('visitation'); setIsFabOpen(false); }} label="Agenda" icon={<CalendarIcon />} color="bg-indigo-500" />
              <FabSubButton onClick={() => { setEditItem(null); setGlobalModal('transaction'); setIsFabOpen(false); }} label="Lançamento" icon={<PlusIcon />} color="bg-rose-500" />
            </div>
          )}
          <button 
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all ${isFabOpen ? 'bg-slate-800 rotate-45' : 'bg-indigo-600 shadow-indigo-500/30 hover:scale-110 active:scale-95'}`}
          >
            <PlusIcon size={28} />
          </button>
        </div>
      </div>

      <div className="flex-1 pb-24 md:pb-0 md:pl-24">
        <aside className="fixed left-6 top-6 bottom-6 w-20 glass rounded-[2.5rem] hidden md:flex flex-col items-center py-10 z-50">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black mb-12 shadow-lg shadow-indigo-500/20 cursor-pointer" onClick={() => setActiveTab('painel')}>FF</div>
          <nav className="flex-1 flex flex-col gap-8">
            <NavIcon active={activeTab === 'painel'} onClick={() => setActiveTab('painel')} icon={<DashboardIcon />} />
            <NavIcon active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} icon={<FinanceIcon />} />
            <NavIcon active={activeTab === 'alice'} onClick={() => setActiveTab('alice')} icon={<ChildIcon />} />
            <NavIcon active={activeTab === 'ajuda'} onClick={() => setActiveTab('ajuda')} icon={<AiIcon />} />
            <NavIcon active={activeTab === 'configuracoes'} onClick={() => setActiveTab('configuracoes')} icon={<SettingsIcon />} />
          </nav>
        </aside>

        <nav className="fixed bottom-6 left-6 right-6 h-16 glass rounded-2xl flex md:hidden z-50 px-2 items-center border-t border-white/5">
          <MobileTab active={activeTab === 'painel'} onClick={() => setActiveTab('painel')} icon={<DashboardIcon />} />
          <MobileTab active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} icon={<FinanceIcon />} />
          <MobileTab active={activeTab === 'alice'} onClick={() => setActiveTab('alice')} icon={<ChildIcon />} />
          <MobileTab active={activeTab === 'ajuda'} onClick={() => setActiveTab('ajuda')} icon={<AiIcon />} />
          <MobileTab active={activeTab === 'configuracoes'} onClick={() => setActiveTab('configuracoes')} icon={<SettingsIcon />} />
        </nav>

        <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-16">
          {activeTab === 'painel' && (
            <Dashboard 
              transactions={state.transactions} goals={state.goals} pensionStatus={state.childSupportStatus} 
              nextVisit={state.visitations.find(v => v.status === 'Planejado')?.date || null} 
              onDeleteGoal={(id) => updateState({ goals: state.goals.filter(g => g.id !== id) })} 
              onAddGoal={(g) => updateState({ goals: [...state.goals, { ...g, id: crypto.randomUUID() }] })} 
              onEditGoal={(g) => { setEditItem(g); setGlobalModal('goal'); }}
              onAddTransaction={addOrUpdateTransaction} spendingLimit={state.settings.spendingLimit} 
              onExport={() => showNotification("Exportando relatório...", "info")} 
            />
          )}

          {activeTab === 'financeiro' && (
             <div className="animate-in fade-in duration-500 space-y-10">
               <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight text-white">Extrato</h2>
                    <p className="text-slate-400 mt-1 uppercase text-[10px] font-black tracking-widest">Controle total de entradas e saídas</p>
                  </div>
                  <button onClick={() => setIsImportOpen(true)} className="px-6 py-3 bg-indigo-500/10 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition">Importar OFX/Texto</button>
               </div>
               
               <div className="glass p-6 md:p-10 rounded-[3rem] space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <input type="text" value={financeSearch} onChange={(e) => setFinanceSearch(e.target.value)} placeholder="Pesquisar..." className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 pl-12 text-sm text-white focus:border-indigo-500 outline-none" />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><SearchIcon size={18} /></div>
                    </div>
                    <select value={financeCategory} onChange={(e) => setFinanceCategory(e.target.value as any)} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-sm font-bold text-slate-400 focus:border-indigo-500 outline-none appearance-none">
                      <option value="TODOS">Todas as Categorias</option>
                      {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredTransactions.length === 0 ? (
                      <div className="py-20 text-center text-slate-600 font-black uppercase tracking-widest text-[10px]">Nenhum registro encontrado</div>
                    ) : (
                      filteredTransactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 group hover:border-indigo-500/30 transition-all">
                          <div className="flex gap-4 items-center">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800/50 text-slate-400'}`}>
                               {t.type === TransactionType.INCOME ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            </div>
                            <div>
                              <p className="text-sm font-black text-white">{t.description}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.date} • {t.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className={`text-sm font-black ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-slate-100'}`}>
                              R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => { setEditItem(t); setGlobalModal('transaction'); }} className="p-2.5 text-slate-500 hover:text-indigo-400 rounded-xl hover:bg-white/5"><EditIcon size={18} /></button>
                              <button onClick={() => deleteTransaction(t.id)} className="p-2.5 text-slate-500 hover:text-rose-500 rounded-xl hover:bg-white/5"><TrashIcon size={18} /></button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
               </div>
             </div>
          )}

          {activeTab === 'alice' && (
            <CoparentingModule 
              child={state.child} transactions={state.transactions} visitations={state.visitations} documents={state.documents}
              onAddTransaction={addOrUpdateTransaction} onDeleteTransaction={deleteTransaction} 
              onEditTransaction={(t) => { setEditItem(t); setGlobalModal('transaction'); }}
              onAddVisitation={addOrUpdateVisitation} onEditVisitation={(v) => { setEditItem(v); setGlobalModal('visitation'); }}
              onDeleteVisitation={(id) => setState(p => ({ ...p, visitations: p.visitations.filter(v => v.id !== id) }))} 
              onAddDocument={(d) => updateState({ documents: [...state.documents, { ...d, id: crypto.randomUUID() }] })}
              onEditDocument={(d) => { setEditItem(d); setGlobalModal('document'); }}
              onDeleteDocument={(id) => setState(p => ({ ...p, documents: p.documents.filter(d => d.id !== id) }))}
              onUpdateChild={(data) => setState(p => ({ ...p, child: { ...p.child, ...data } }))} 
              onEditPension={() => setGlobalModal('pension')} pensionAmount={state.monthlyPensionAmount} pensionStatus={state.childSupportStatus} 
            />
          )}

          {activeTab === 'ajuda' && (
            <div className="animate-in fade-in duration-500 glass rounded-[3.5rem] h-[calc(100vh-200px)] flex flex-col overflow-hidden">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><AiIcon /></div>
                  <div>
                    <h4 className="font-black text-white">Assistente Financeiro</h4>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Online • Inteligência Gemini 3 Pro</p>
                  </div>
                </div>
                <button onClick={() => setChatMessages([])} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Limpar Chat</button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center max-w-sm mx-auto gap-4">
                    <AiIcon size={48} />
                    <p className="text-xs font-black uppercase tracking-[0.2em]">Olá Rafael. Como posso ajudar com suas finanças ou coparentalidade hoje?</p>
                  </div>
                )}
                {chatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-6 rounded-[2rem] text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-900 border border-white/5 text-slate-200 shadow-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isLoading && <div className="text-[10px] font-black text-indigo-400 animate-pulse tracking-widest ml-4">PROCESSANDO...</div>}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleChatSubmit} className="p-8 bg-slate-900/50 flex gap-4">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Pergunte sobre seus gastos, metas ou acordos..." className="flex-1 bg-black/50 border border-white/10 p-5 rounded-2xl outline-none focus:border-indigo-500 text-white text-sm" />
                <button type="submit" disabled={isLoading} className="w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center shrink-0 disabled:opacity-50">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'configuracoes' && (
            <Settings 
              state={state} onUpdateState={updateState} 
              onResetData={() => { if(confirm("Deseja apagar todos os dados permanentemente?")) { updateState(INITIAL_STATE); showNotification("Todos os dados foram resetados."); } }} 
              onShowSql={() => saveToCloud(state)} syncStatus={syncStatus} 
            />
          )}
        </main>
      </div>

      {globalModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass max-w-md w-full p-10 rounded-[3rem] border-white/10 shadow-3xl">
            {globalModal === 'transaction' && (
              <>
                <h3 className="text-xl font-black text-white mb-8 uppercase tracking-tight">{editItem ? 'Editar Lançamento' : 'Novo Registro'}</h3>
                <TransactionForm initialData={editItem} onClose={() => { setGlobalModal(null); setEditItem(null); }} onSubmit={(t: any) => { addOrUpdateTransaction(t); setGlobalModal(null); setEditItem(null); }} />
              </>
            )}
            {globalModal === 'visitation' && (
              <>
                <h3 className="text-xl font-black text-white mb-8 uppercase tracking-tight">Agendar Visita</h3>
                <VisitationForm initialData={editItem} onClose={() => { setGlobalModal(null); setEditItem(null); }} onSubmit={(v: any) => { addOrUpdateVisitation(v); setGlobalModal(null); setEditItem(null); }} />
              </>
            )}
            {globalModal === 'pension' && (
              <>
                <h3 className="text-xl font-black text-white mb-8 uppercase tracking-tight text-center">Valor da Pensão</h3>
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); const val = (e.target as any).pension.value; updateState({ monthlyPensionAmount: parseFloat(val) || 0 }); setGlobalModal(null); showNotification("Acordo de pensão atualizado."); }}>
                  <input name="pension" required type="number" step="any" defaultValue={state.monthlyPensionAmount} className="w-full p-6 bg-black/40 border border-white/10 rounded-2xl text-white text-3xl font-black outline-none focus:border-indigo-500 text-center" />
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setGlobalModal(null)} className="flex-1 py-4 font-black uppercase text-slate-500 text-xs">Cancelar</button>
                    <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Salvar</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-componentes ---
const FabSubButton = ({ onClick, label, icon, color }: any) => (
  <div className="flex items-center gap-3">
    <span className="px-4 py-2 glass text-white rounded-xl text-[10px] font-black uppercase tracking-widest">{label}</span>
    <button onClick={onClick} className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition ${color}`}>{icon}</button>
  </div>
);

const NavIcon = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`p-4 rounded-2xl transition-all relative ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-600 hover:text-slate-300'}`}>
    {icon}
    {active && <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-400 rounded-full"></div>}
  </button>
);

const MobileTab = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`flex-1 flex justify-center p-3 rounded-xl transition-all ${active ? 'text-indigo-400' : 'text-slate-600'}`}>{icon}</button>
);

const TransactionForm = ({ onClose, onSubmit, initialData }: any) => {
  const [desc, setDesc] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [type, setType] = useState(initialData?.type || TransactionType.EXPENSE);
  const [cat, setCat] = useState(initialData?.category || Category.OTHER);

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...initialData, date: initialData?.date || new Date().toLocaleDateString('en-CA'), description: desc, amount: parseFloat(amount), type, category: cat }); }}>
      <input required type="text" placeholder="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl text-white outline-none focus:border-indigo-500" />
      <input required type="number" step="any" placeholder="Valor R$ 0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl text-white text-xl font-black outline-none focus:border-indigo-500" />
      <div className="flex gap-2">
        <button type="button" onClick={() => setType(TransactionType.EXPENSE)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${type === TransactionType.EXPENSE ? 'bg-rose-600 border-rose-600 text-white' : 'border-white/10 text-slate-500'}`}>Despesa</button>
        <button type="button" onClick={() => setType(TransactionType.INCOME)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${type === TransactionType.INCOME ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-white/10 text-slate-500'}`}>Receita</button>
      </div>
      <select value={cat} onChange={(e) => setCat(e.target.value as any)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl text-slate-400 outline-none text-sm font-bold">
        {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-black uppercase text-slate-500">Voltar</button>
        <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-xl">Salvar</button>
      </div>
    </form>
  );
};

const VisitationForm = ({ onClose, onSubmit, initialData }: any) => {
  const [date, setDate] = useState(initialData?.date || new Date().toLocaleDateString('en-CA'));
  const [loc, setLoc] = useState(initialData?.location || 'Casa da Mãe');
  const [notes, setNotes] = useState(initialData?.notes || '');

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...initialData, date, status: 'Planejado', location: loc, notes }); }}>
      <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl text-white" />
      <input required type="text" placeholder="Local" value={loc} onChange={(e) => setLoc(e.target.value)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl text-white text-sm" />
      <textarea placeholder="Notas..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl text-white text-sm min-h-[100px]" />
      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-black uppercase text-slate-500">Cancelar</button>
        <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-xl">Confirmar</button>
      </div>
    </form>
  );
};

// --- Icon components ---
const SearchIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const TrashIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const EditIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TargetIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const DashboardIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
const FinanceIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const ChildIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const AiIcon = ({ size = 22 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>;
const SettingsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/></svg>;
const PlusIcon = ({ size = 24 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const CalendarIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const TrendingUpIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const TrendingDownIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;

export default App;
