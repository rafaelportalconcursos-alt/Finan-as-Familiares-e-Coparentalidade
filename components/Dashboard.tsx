
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
  onExport: () => void;
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
  spendingLimit,
  onExport
}) => {
  const [showValues, setShowValues] = useState(true);
  const [periodo, setPeriodo] = useState<'HOJE' | 'SEMANA' | 'MÊS'>('MÊS');
  const isDark = true;

  const stats = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
    return { totalIncome, totalExpenses, balance, savingsRate };
  }, [transactions]);

  const categoryData = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => {
        const existing = acc.find(item => item.name === t.category);
        if (existing) existing.value += t.amount;
        else acc.push({ name: t.category, value: t.amount });
        return acc;
      }, [] as { name: string, value: number }[])
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const formatCurrency = (val: number) => {
    if (!showValues) return '••••';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      
      {/* Cards de KPI - 2 colunas no mobile, 4 no desktop */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <KPICard title="Saldo" value={formatCurrency(stats.balance)} change="+1.2%" positive={stats.balance > 0} icon={<WalletIcon />} color="indigo" />
        <KPICard title="Entradas" value={formatCurrency(stats.totalIncome)} change="+8.4%" positive={true} icon={<TrendingUpIcon />} color="emerald" />
        <KPICard title="Saídas" value={formatCurrency(stats.totalExpenses)} change="-2.1%" positive={false} icon={<TrendingDownIcon />} color="rose" />
        <KPICard title="Economia" value={`${stats.savingsRate.toFixed(0)}%`} change="20%" positive={stats.savingsRate >= 20} icon={<SavingsIcon />} color="amber" />
      </section>

      {/* Gráficos Principais */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 glass p-6 md:p-10 rounded-3xl shadow-xl">
           <h3 className="text-xl font-black mb-6">Evolução</h3>
           <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { day: 'S1', saldo: stats.balance * 0.4 },
                  { day: 'S2', saldo: stats.balance * 0.65 },
                  { day: 'S3', saldo: stats.balance * 0.50 },
                  { day: 'Hoje', saldo: stats.balance },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" axisLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={4} fill="rgba(99,102,241,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="glass p-6 md:p-10 rounded-3xl shadow-xl">
           <h3 className="text-xl font-black mb-6">Balanço</h3>
           <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'Geral', Rec: stats.totalIncome, Desp: stats.totalExpenses }]}>
                  <XAxis dataKey="name" hide />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b' }} />
                  <Bar dataKey="Rec" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
                  <Bar dataKey="Desp" fill="#f43f5e" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </section>

      {/* Categorias e Objetivos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
        <div className="glass p-6 md:p-10 rounded-3xl shadow-xl">
           <h3 className="text-xl font-black mb-8">Gastos por Categoria</h3>
           <div className="space-y-6">
              {categoryData.slice(0, 5).map((cat, i) => (
                <div key={cat.name} className="space-y-2">
                   <div className="flex justify-between items-end">
                      <span className="text-xs font-black opacity-80">{cat.name}</span>
                      <span className="text-[10px] font-black">{formatCurrency(cat.value)}</span>
                   </div>
                   <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(cat.value / Math.max(1, stats.totalExpenses)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="glass p-6 md:p-10 rounded-3xl shadow-xl">
          <h3 className="text-xl font-black mb-8">Objetivos Ativos</h3>
          <div className="space-y-4">
            {goals.map(goal => (
              <div key={goal.id} className="p-6 bg-black/20 rounded-3xl border border-white/5">
                <div className="flex justify-between mb-4">
                  <span className="font-black text-sm">{goal.name}</span>
                  <span className="text-[9px] font-black opacity-60 uppercase">{formatCurrency(goal.currentAmount)}</span>
                </div>
                <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const KPICard = ({ title, value, change, positive, icon, color }: any) => {
  const colorMap: any = {
    indigo: 'bg-indigo-500/10 text-indigo-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    rose: 'bg-rose-500/10 text-rose-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="glass p-4 md:p-8 rounded-[2rem] shadow-xl border-white/10 hover:translate-y-[-4px] transition-all">
      <div className="flex justify-between items-start mb-4 md:mb-8">
        <div className={`p-3 md:p-5 rounded-2xl ${colorMap[color] || colorMap.indigo}`}>{icon}</div>
        <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${positive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>{change}</span>
      </div>
      <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white truncate">{value}</h3>
    </div>
  );
};

const WalletIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>;
const TrendingUpIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const TrendingDownIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
const SavingsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>;

// Fix: Exporting Dashboard instead of App
export default Dashboard;
