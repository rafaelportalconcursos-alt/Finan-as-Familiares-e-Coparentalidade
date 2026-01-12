
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Goal, Category } from '../types';
import { 
  ResponsiveContainer, Tooltip, 
  XAxis, YAxis, CartesianGrid, 
  AreaChart, Area, BarChart, Bar
} from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  goals: Goal[];
  pensionStatus: string;
  nextVisit: string | null;
  onDeleteGoal: (id: string) => void;
  onAddGoal: (g: Omit<Goal, 'id'>) => void;
  onEditGoal: (g: Goal) => void;
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
  onEditGoal,
  onAddTransaction,
  spendingLimit,
  onExport
}) => {
  const [showValues, setShowValues] = useState(true);

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
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700">
      
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        <KPICard title="Saldo Total" value={formatCurrency(stats.balance)} change="+1.2%" positive={stats.balance > 0} icon={<WalletIcon />} color="indigo" />
        <KPICard title="Entradas" value={formatCurrency(stats.totalIncome)} change="+8.4%" positive={true} icon={<TrendingUpIcon />} color="emerald" />
        <KPICard title="Saídas" value={formatCurrency(stats.totalExpenses)} change="-2.1%" positive={false} icon={<TrendingDownIcon />} color="rose" />
        <KPICard title="Economia" value={`${stats.savingsRate.toFixed(1)}%`} change="Meta: 20%" positive={stats.savingsRate >= 20} icon={<SavingsIcon />} color="amber" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-white/5 bg-slate-900/10">
           <h3 className="text-xl font-black mb-8 tracking-tight">Evolução do Saldo</h3>
           <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ day: 'Sem 1', saldo: 1500 }, { day: 'Sem 2', saldo: 2800 }, { day: 'Sem 3', saldo: 2400 }, { day: 'Hoje', saldo: stats.balance }]}>
                  <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="day" axisLine={false} tick={{fontSize: 9, fontWeight: 'black', fill: '#475569'}} dy={15} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }} />
                  <Area type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={5} fill="url(#colorSaldo)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="glass p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-white/5 bg-slate-900/10">
           <h3 className="text-xl font-black mb-10 tracking-tight">Balanço</h3>
           <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'Geral', Rec: stats.totalIncome, Desp: stats.totalExpenses }]} barGap={15}>
                  <XAxis dataKey="name" hide />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: '#0f172a' }} />
                  <Bar dataKey="Desp" fill="#f43f5e" radius={[12, 12, 12, 12]} barSize={25} />
                  <Bar dataKey="Rec" fill="#10b981" radius={[12, 12, 12, 12]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
        <div className="glass p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-white/5 min-h-[400px]">
           <h3 className="text-xl font-black mb-10 tracking-tight">Gastos por Categoria</h3>
           <div className="space-y-8">
              {categoryData.length === 0 ? (
                <p className="py-20 text-center opacity-30 italic font-black uppercase text-xs tracking-widest">Nenhum gasto registrado.</p>
              ) : (
                categoryData.slice(0, 5).map((cat, i) => (
                  <div key={cat.name} className="space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{cat.name}</span>
                        <span className="text-[11px] font-black text-white">{formatCurrency(cat.value)}</span>
                    </div>
                    <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(cat.value / Math.max(1, stats.totalExpenses)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>

        <div className="glass p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-white/5">
          <h3 className="text-xl font-black mb-10 tracking-tight">Objetivos Ativos</h3>
          <div className="space-y-6">
            {goals.map(goal => (
              <div key={goal.id} className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 group hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center mb-5">
                  <h4 className="font-black text-sm text-white tracking-tight">{goal.name}</h4>
                  <div className="flex items-center gap-4">
                     <span className="text-[10px] font-black text-slate-500 uppercase">R$ {goal.currentAmount.toLocaleString()} / {goal.targetAmount.toLocaleString()}</span>
                     <button onClick={() => onEditGoal(goal)} className="p-2 text-slate-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all"><EditIcon size={16} /></button>
                  </div>
                </div>
                <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-1000" style={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }}></div>
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
  const colorMap: any = { indigo: 'bg-indigo-500/10 text-indigo-500', emerald: 'bg-emerald-500/10 text-emerald-500', rose: 'bg-rose-500/10 text-rose-500', amber: 'bg-amber-500/10 text-amber-500' };
  return (
    <div className="glass p-6 md:p-10 rounded-[3rem] shadow-2xl border-white/5 hover:translate-y-[-6px] transition-all bg-slate-900/10">
      <div className="flex justify-between items-start mb-6 md:mb-10">
        <div className={`p-4 md:p-5 rounded-[1.5rem] shadow-inner ${colorMap[color]}`}>{icon}</div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${positive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>{change}</span>
      </div>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1.5">{title}</p>
      <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter">{value}</h3>
    </div>
  );
};

const EditIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const WalletIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>;
const TrendingUpIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const TrendingDownIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
const SavingsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>;

export default Dashboard;
