
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
  const [periodo, setPeriodo] = useState<'HOJE' | 'SEMANA' | 'MÊS'>('MÊS');
  const [modalType, setModalType] = useState<'income' | 'expense' | 'goal' | null>(null);
  
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
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

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

  const timelineData = useMemo(() => {
    return [
      { day: '01', saldo: stats.balance * 0.4 },
      { day: '08', saldo: stats.balance * 0.65 },
      { day: '15', saldo: stats.balance * 0.50 },
      { day: '22', saldo: stats.balance * 0.85 },
      { day: 'Hoje', saldo: stats.balance },
    ];
  }, [stats.balance]);

  const formatCurrency = (val: number) => {
    if (!showValues) return '••••••';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formAmount);
    if (!formDesc.trim() || isNaN(amount) || amount <= 0) return;

    if (modalType === 'income' || modalType === 'expense') {
      onAddTransaction({
        date: new Date().toLocaleDateString('en-CA'),
        description: formDesc.trim(),
        amount: amount,
        type: modalType === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE,
        category: formCategory,
        isCoparenting: [Category.PENSION, Category.EDUCATION, Category.HEALTH].includes(formCategory)
      });
    } else if (modalType === 'goal') {
      onAddGoal({
        name: formDesc.trim(),
        targetAmount: amount,
        currentAmount: 0
      });
    }

    setModalType(null);
    setFormDesc('');
    setFormAmount('');
    setFormCategory(Category.OTHER);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* Barra de Ações e Filtros solicitada */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Toggle de Visibilidade e Período */}
        <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-800 p-1.5 rounded-[2rem] glass">
          <button 
            onClick={() => setShowValues(!showValues)}
            className="p-3 text-slate-400 hover:text-white transition-colors"
          >
            {showValues ? <EyeIcon /> : <EyeOffIcon />}
          </button>
          
          <div className="w-[1px] h-6 bg-slate-800 mx-2"></div>
          
          <div className="flex gap-1">
            {(['HOJE', 'SEMANA', 'MÊS'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${
                  periodo === p 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap gap-3">
          <ActionButton 
            onClick={() => setModalType('income')}
            label="RECEITA"
            icon={<PlusIcon />}
            colorClass="bg-emerald-500"
          />
          <ActionButton 
            onClick={() => setModalType('expense')}
            label="DESPESA"
            icon={<MinusIcon />}
            colorClass="bg-rose-500"
          />
          <ActionButton 
            onClick={() => setModalType('goal')}
            label="META"
            icon={<TargetIcon />}
            colorClass="bg-indigo-500"
          />
          <ActionButton 
            onClick={() => {}}
            label="EXPORTAR"
            icon={<ExportIcon />}
            colorClass="bg-slate-700"
          />
        </div>
      </div>

      {/* Modal Genérico */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="glass max-w-md w-full p-8 rounded-[2.5rem] shadow-2xl border-white/20 dark:border-slate-800">
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
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Saldo Total" value={formatCurrency(stats.balance)} change="+1.2%" positive={stats.balance > 0} icon={<WalletIcon />} color="indigo" />
        <KPICard title="Entradas" value={formatCurrency(stats.totalIncome)} change="+8.4%" positive={true} icon={<TrendingUpIcon />} color="emerald" />
        <KPICard title="Saídas" value={formatCurrency(stats.totalExpenses)} change="-2.1%" positive={false} icon={<TrendingDownIcon />} color="rose" />
        <KPICard title="Economia" value={`${stats.savingsRate.toFixed(1)}%`} change="Meta: 20%" positive={stats.savingsRate >= 20} icon={<SavingsIcon />} color="amber" />
      </section>

      {/* Gráficos */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-8 rounded-[2.5rem] shadow-xl border-white/40 dark:border-slate-800">
           <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-8">Evolução do Saldo</h3>
           <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', backgroundColor: isDark ? '#1e293b' : '#fff' }} />
                  <Area type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSaldo)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="glass p-8 rounded-[2.5rem] shadow-xl border-white/40 dark:border-slate-800">
           <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-8">Balanço</h3>
           <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'Geral', Receitas: stats.totalIncome, Despesas: stats.totalExpenses }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: isDark ? '#1e293b' : '#fff' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                  <Bar dataKey="Receitas" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
                  <Bar dataKey="Despesas" fill="#f43f5e" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </section>

      {/* Categorias e Metas */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
        <div className="glass p-8 rounded-[2.5rem] shadow-xl border-white/40 dark:border-slate-800">
           <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-8">Gastos por Categoria</h3>
           <div className="space-y-6">
              {categoryData.length === 0 ? (
                <p className="text-center py-10 text-slate-400 font-bold italic">Nenhum gasto registrado.</p>
              ) : (
                categoryData.map((cat, i) => (
                  <div key={cat.name} className="space-y-2">
                     <div className="flex justify-between items-end">
                        <span className="text-sm font-black text-slate-800 dark:text-white">{cat.name}</span>
                        <span className="text-[10px] font-black text-slate-500">{formatCurrency(cat.value)}</span>
                     </div>
                     <div className="w-full bg-slate-100 dark:bg-slate-900/50 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${(cat.value / Math.max(1, stats.totalExpenses)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        ></div>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>

        <div className="glass p-8 rounded-[2.5rem] shadow-xl border-white/40 dark:border-slate-800">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Objetivos Ativos</h3>
            <button onClick={() => setModalType('goal')} className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-400">Nova Meta</button>
          </div>
          <div className="space-y-6">
            {goals.map(goal => (
              <div key={goal.id} className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-transparent hover:border-indigo-500/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-black text-slate-800 dark:text-white leading-none mb-1">{goal.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</p>
                  </div>
                  <button onClick={() => onDeleteGoal(goal.id)} className="text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><DeleteIcon /></button>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-950 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {goals.length === 0 && <p className="text-center py-10 text-slate-400 font-bold italic">Nenhuma meta ativa.</p>}
          </div>
        </div>
      </section>
    </div>
  );
};

const ActionButton = ({ onClick, label, icon, colorClass }: any) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-3 bg-slate-900/40 border border-slate-800 p-2 pr-5 rounded-2xl glass hover:bg-slate-800 transition-all group"
  >
    <div className={`p-2.5 rounded-xl ${colorClass} text-white shadow-lg`}>
      {icon}
    </div>
    <span className="text-[10px] font-black tracking-widest text-slate-300 group-hover:text-white">{label}</span>
  </button>
);

const KPICard = ({ title, value, change, positive, icon, color }: any) => {
  const colorMap: any = {
    indigo: 'bg-indigo-500/10 text-indigo-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    rose: 'bg-rose-500/10 text-rose-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="glass p-6 rounded-[2.5rem] shadow-xl border-white/20 dark:border-slate-800 hover:translate-y-[-4px] hover:shadow-2xl transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-[1.5rem] ${colorMap[color] || colorMap.indigo}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${positive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
          {change}
        </span>
      </div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h3>
    </div>
  );
};

const EyeIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const PlusIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const MinusIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TargetIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const ExportIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const WalletIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>;
const TrendingUpIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const TrendingDownIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
const SavingsIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>;
const DeleteIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
