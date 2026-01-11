
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Goal, Category } from '../types';
import { 
  ResponsiveContainer, Tooltip, 
  XAxis, YAxis, CartesianGrid, 
  AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  goals: Goal[];
  pensionStatus: string;
  nextVisit: string | null;
  onDeleteGoal: (id: string) => void;
  onAddGoal: (g: Omit<Goal, 'id'>) => void;
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  spendingLimit: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#06b6d4'];

// Utilitário para formatar data sem interferência de fuso horário
const formatDateSafe = (dateStr: string) => {
  if (!dateStr) return '--/--/----';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  goals, 
  pensionStatus, 
  nextVisit, 
  onDeleteGoal,
  onAddGoal,
  onAddTransaction,
  spendingLimit 
}) => {
  const [showValues, setShowValues] = useState(true);
  const [period, setPeriod] = useState<'Hoje' | 'Semana' | 'Mês'>('Mês');
  const [modalType, setModalType] = useState<'income' | 'expense' | 'goal' | null>(null);
  
  // Form States
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<Category>(Category.OTHER);

  const isDark = window.document.documentElement.classList.contains('dark');

  const stats = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    return { totalIncome, totalExpenses, balance, savingsRate };
  }, [transactions]);

  const categoryData = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => {
        const existing = acc.find(item => item.name === t.category);
        if (existing) {
          existing.value += t.amount;
        } else {
          acc.push({ name: t.category, value: t.amount });
        }
        return acc;
      }, [] as { name: string, value: number }[])
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const comparisonData = useMemo(() => [
    { name: 'Geral', Receitas: stats.totalIncome, Despesas: stats.totalExpenses }
  ], [stats]);

  const timelineData = useMemo(() => [
    { day: '01', saldo: stats.balance * 0.7 },
    { day: '08', saldo: stats.balance * 0.85 },
    { day: '15', saldo: stats.balance * 0.6 },
    { day: '22', saldo: stats.balance * 0.92 },
    { day: 'Hoje', saldo: stats.balance },
  ], [stats.balance]);

  const formatCurrency = (val: number) => {
    if (!showValues) return '••••••';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formAmount);
    if (!formDesc || isNaN(amount) || amount <= 0) return;

    if (modalType === 'income' || modalType === 'expense') {
      onAddTransaction({
        date: new Date().toLocaleDateString('en-CA'), // Formato YYYY-MM-DD local
        description: formDesc,
        amount: amount,
        type: modalType === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE,
        category: formCategory,
        isCoparenting: formCategory === Category.PENSION || formCategory === Category.EDUCATION || formCategory === Category.HEALTH
      });
    } else if (modalType === 'goal') {
      onAddGoal({
        name: formDesc,
        targetAmount: amount,
        currentAmount: 0
      });
    }

    setModalType(null);
    setFormDesc('');
    setFormAmount('');
    setFormCategory(Category.OTHER);
  };

  const handleExportData = () => {
    const headers = ["Data", "Descrição", "Valor", "Tipo", "Categoria"];
    const rows = transactions.map(t => [
      formatDateSafe(t.date),
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount.toString(),
      t.type,
      t.category
    ]);

    const csvContent = "\ufeff" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `financeiro_${new Date().toLocaleDateString('en-CA')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const alerts = useMemo(() => {
    const list = [];
    if (stats.balance < 500) list.push({ type: 'warning', text: 'Saldo abaixo de R$ 500,00. Atenção!' });
    if (spendingLimit > 0 && stats.totalExpenses > spendingLimit) list.push({ type: 'danger', text: 'Você ultrapassou seu limite de gastos mensal!' });
    if (pensionStatus === 'Pendente') list.push({ type: 'info', text: 'Lembrete: Pagamento da pensão pendente.' });
    if (nextVisit) list.push({ type: 'success', text: `Próxima visita agendada para ${formatDateSafe(nextVisit)}.` });
    return list;
  }, [stats, spendingLimit, pensionStatus, nextVisit]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      
      {/* Modal Genérico para Ações */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass max-w-md w-full p-8 rounded-[2.5rem] shadow-2xl border-white/20 dark:border-slate-800 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">
              {modalType === 'income' ? 'Nova Receita' : modalType === 'expense' ? 'Nova Despesa' : 'Novo Objetivo'}
            </h3>
            <form onSubmit={handleActionSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={formDesc} 
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ex: Aluguel, Freelance, etc."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  value={formAmount} 
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {modalType !== 'goal' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as Category)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    {Object.values(Category).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setModalType(null)}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none transition hover:bg-indigo-700"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cabeçalho & Ações Rápidas */}
      <section className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
        <div className="glass p-2 rounded-3xl shadow-sm border-white/20 dark:border-slate-800 flex items-center gap-2">
           <button 
            onClick={() => setShowValues(!showValues)}
            className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-500"
            title={showValues ? "Ocultar Valores" : "Mostrar Valores"}
           >
             {showValues ? <EyeOffIcon /> : <EyeIcon />}
           </button>
           <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>
           {['Hoje', 'Semana', 'Mês'].map(p => (
             <button 
              key={p} 
              onClick={() => setPeriod(p as any)}
              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {p}
             </button>
           ))}
        </div>
        
        <div className="flex flex-wrap gap-4">
           <QuickAction onClick={() => setModalType('income')} icon={<PlusIcon />} label="Receita" color="bg-emerald-500" />
           <QuickAction onClick={() => setModalType('expense')} icon={<MinusIcon />} label="Despesa" color="bg-rose-500" />
           <QuickAction onClick={() => setModalType('goal')} icon={<TargetIcon />} label="Meta" color="bg-indigo-500" />
           <QuickAction onClick={handleExportData} icon={<ExportIcon />} label="Exportar" color="bg-slate-700" />
        </div>
      </section>

      {/* KPIs Dinâmicos */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Saldo Total" value={formatCurrency(stats.balance)} change="+1.2%" positive={stats.balance > 0} icon={<WalletIcon />} />
        <KPICard title="Entradas" value={formatCurrency(stats.totalIncome)} change="+8.4%" positive={true} icon={<TrendingUpIcon />} />
        <KPICard title="Saídas" value={formatCurrency(stats.totalExpenses)} change="-2.1%" positive={false} icon={<TrendingDownIcon />} />
        <KPICard title="Taxa de Economia" value={`${stats.savingsRate.toFixed(1)}%`} change="Meta: 20%" positive={stats.savingsRate >= 20} icon={<SavingsIcon />} />
      </section>

      {/* Alertas */}
      {alerts.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {alerts.map((alert, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-500 delay-${idx * 100} ${
              alert.type === 'danger' ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/10 dark:border-rose-900/30' :
              alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/10 dark:border-amber-900/30' :
              alert.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/10 dark:border-emerald-800/30' :
              'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-900/10 dark:border-indigo-800/30'
            }`}>
              <div className="shrink-0"><InfoIcon size={16} /></div>
              <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{alert.text}</p>
            </div>
          ))}
        </section>
      )}

      {/* Gráficos */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-8 rounded-[2.5rem] shadow-xl border-white/40 dark:border-slate-800">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Evolução do Saldo</h3>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-500 rounded-full"></div><span className="text-[10px] font-bold text-slate-400 uppercase">Saldo</span></div>
              </div>
           </div>
           {/* Fixed height parent for Recharts */}
           <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorSaldoArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', backgroundColor: isDark ? '#1e293b' : '#fff' }} />
                  <Area type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSaldoArea)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="glass p-8 rounded-[2.5rem] shadow-xl border-white/40 dark:border-slate-800 flex flex-col">
           <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-10">Comparativo</h3>
           <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: isDark ? '#1e293b' : '#fff' }} />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                  <Bar dataKey="Receitas" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
                  <Bar dataKey="Despesas" fill="#f43f5e" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </section>

      {/* Categorias & Metas */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
        <div className="glass p-8 rounded-[2.5rem] shadow-xl border-white/40 dark:border-slate-800">
           <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-8">Gastos por Categoria</h3>
           <div className="space-y-6">
              {categoryData.length === 0 ? (
                <p className="text-center py-10 text-slate-400 font-bold italic">Nenhum gasto registrado.</p>
              ) : (
                categoryData.map((cat, i) => {
                  const percentage = stats.totalExpenses > 0 ? (cat.value / stats.totalExpenses) * 100 : 0;
                  return (
                    <div key={cat.name} className="space-y-2">
                       <div className="flex justify-between items-end">
                          <div>
                             <span className="text-sm font-black text-slate-800 dark:text-white">{cat.name}</span>
                             <span className="ml-2 text-[10px] font-bold text-slate-400">{formatCurrency(cat.value)}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-500">{percentage.toFixed(0)}%</span>
                       </div>
                       <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          ></div>
                       </div>
                    </div>
                  )
                })
              )}
           </div>
        </div>

        <div className="glass p-8 rounded-[2.5rem] shadow-xl border-white/40 dark:border-slate-800 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Metas Ativas</h3>
            <button onClick={() => setModalType('goal')} className="text-[10px] font-black uppercase text-indigo-500 hover:scale-105 active:scale-95 transition">Nova Meta</button>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin">
            {goals.length === 0 ? (
               <p className="text-center py-10 text-slate-400 font-bold italic">Nenhuma meta ativa.</p>
            ) : (
              goals.map(goal => (
                <div key={goal.id} className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-black text-slate-800 dark:text-white leading-none mb-1">{goal.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}</p>
                    </div>
                    <button onClick={() => onDeleteGoal(goal.id)} className="text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><DeleteIcon /></button>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

// Sub-components
const KPICard = ({ title, value, change, positive, icon }: { title: string, value: string, change: string, positive: boolean, icon: any }) => (
  <div className="glass p-6 rounded-3xl shadow-xl border-white/20 dark:border-slate-800 relative group overflow-hidden hover:translate-y-[-4px] transition-all duration-300">
    <div className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-125 transition-all duration-700 ${positive ? 'text-emerald-500' : 'text-rose-500'}`}>
      {icon}
    </div>
    <div className="flex justify-between items-start mb-6">
      <div className={`p-3 rounded-2xl ${positive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'} shadow-sm`}>
        {icon}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {change}
      </span>
    </div>
    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</p>
    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h3>
  </div>
);

const QuickAction = ({ icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-3 px-6 py-3 glass rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-all border border-white dark:border-slate-700 active:scale-95 group"
  >
    <div className={`w-8 h-8 ${color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition`}>
      {icon}
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{label}</span>
  </button>
);

// Icons
const EyeIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const PlusIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const MinusIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TargetIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const ExportIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const InfoIcon = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const WalletIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>;
const TrendingUpIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const TrendingDownIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
// Fix: Complete truncated SavingsIcon and add missing DeleteIcon
const SavingsIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>;
const DeleteIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
