
import React from 'react';
import { Transaction, TransactionType, Goal } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  goals: Goal[];
  pensionStatus: string;
  nextVisit: string | null;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#06b6d4'];

export const Dashboard: React.FC<DashboardProps> = ({ transactions, goals, pensionStatus, nextVisit }) => {
  const totalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const categoryData = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => {
      const existing = acc.find(item => item.name === t.category);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: t.category, value: t.amount });
      }
      return acc;
    }, [] as { name: string, value: number }[]);

  const isDark = window.document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-[2rem] shadow-xl shadow-indigo-100/20 dark:shadow-none relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-indigo-500/20 transition-colors"></div>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3">Patrimônio Líquido</p>
          <h2 className={`text-4xl font-black tracking-tighter ${balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <div className="mt-4 flex items-center gap-2">
             <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full font-bold">Fluxo Positivo</span>
          </div>
        </div>
        
        <div className="glass p-8 rounded-[2rem] shadow-xl shadow-slate-100/20 dark:shadow-none relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3">Status Coparentalidade</p>
          <div className="flex flex-col gap-2 mt-2">
            <span className={`w-fit px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 ${pensionStatus === 'Pago' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-none' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'}`}>
              Pensão: {pensionStatus}
            </span>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2 transition-colors">Próximo evento: {nextVisit ? new Date(nextVisit).toLocaleDateString('pt-BR') : "Livre"}</p>
          </div>
        </div>

        <div className="glass p-8 rounded-[2rem] shadow-xl shadow-slate-100/20 dark:shadow-none group hover:scale-[1.02] transition-transform duration-300 flex flex-col justify-between">
           <div>
             <p className="text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-1">Metas Ativas</p>
             <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{goals.length} objetivos</h3>
           </div>
           <div className="mt-4 bg-slate-100 dark:bg-slate-800 h-1.5 w-full rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full w-2/3 rounded-full"></div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-10 rounded-[2.5rem] shadow-xl shadow-slate-100/30 dark:shadow-none min-h-[400px]">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Distribuição de Gastos</h3>
             <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
             </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={100}
                  paddingAngle={10}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', 
                    padding: '16px',
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    color: isDark ? '#fff' : '#000'
                  }}
                  itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-10 rounded-[2.5rem] shadow-xl shadow-slate-100/30 dark:shadow-none overflow-y-auto max-h-[400px]">
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-8 transition-colors">Reservas e Objetivos</h3>
          <div className="space-y-8">
            {goals.map(goal => (
              <div key={goal.id} className="group">
                <div className="flex justify-between items-end mb-3">
                  <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{goal.name}</span>
                  <span className="text-slate-400 dark:text-slate-500 text-xs font-black">
                    {Math.round((goal.currentAmount / goal.targetAmount) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100/50 dark:bg-slate-800/50 rounded-full h-4 p-1 border border-white dark:border-slate-700 shadow-inner transition-all">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full rounded-full transition-all duration-1000 shadow-md shadow-indigo-100 dark:shadow-none" 
                    style={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-right transition-colors">Faltam R$ {(goal.targetAmount - goal.currentAmount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
