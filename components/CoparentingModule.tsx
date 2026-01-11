
import React, { useState } from 'react';
import { Transaction, Visitation, TransactionType, Category } from '../types';

interface CoparentingModuleProps {
  transactions: Transaction[];
  visitations: Visitation[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddVisitation: (v: Omit<Visitation, 'id'>) => void;
  onDeleteVisitation: (id: string) => void;
  pensionAmount: number;
}

export const CoparentingModule: React.FC<CoparentingModuleProps> = ({ 
  transactions, 
  visitations, 
  onAddTransaction,
  onDeleteTransaction,
  onAddVisitation,
  onDeleteVisitation,
  pensionAmount 
}) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'visitation'>('expenses');
  const coparentingExpenses = transactions.filter(t => t.isCoparenting);

  return (
    <div className="glass rounded-[2.5rem] shadow-2xl shadow-indigo-100/20 dark:shadow-none overflow-hidden animate-in zoom-in-95 duration-500 border border-white/40 dark:border-slate-800">
      <div className="flex p-4 bg-white/50 dark:bg-slate-900/50 gap-2 border-b border-white/20 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-4 rounded-2xl text-xs font-black tracking-[0.2em] uppercase transition-all duration-300 ${activeTab === 'expenses' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg shadow-slate-200 dark:shadow-none' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          Gastos & Pensão
        </button>
        <button 
          onClick={() => setActiveTab('visitation')}
          className={`flex-1 py-4 rounded-2xl text-xs font-black tracking-[0.2em] uppercase transition-all duration-300 ${activeTab === 'visitation' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg shadow-slate-200 dark:shadow-none' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          Agenda Visitas
        </button>
      </div>

      <div className="p-10">
        {activeTab === 'expenses' ? (
          <div className="space-y-10">
            <div className="relative p-10 bg-gradient-to-br from-indigo-600 to-indigo-900 dark:from-indigo-700 dark:to-slate-900 rounded-[2rem] text-white shadow-2xl shadow-indigo-200 dark:shadow-none overflow-hidden border border-white/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Compromisso Mensal</p>
                  <h3 className="text-5xl font-black tracking-tighter">R$ {pensionAmount.toFixed(2)}</h3>
                  <p className="mt-2 text-indigo-100 text-sm font-medium opacity-80 italic">Referente à Pensão Alimentícia</p>
                </div>
                <button 
                  onClick={() => onAddTransaction({
                    date: new Date().toISOString().split('T')[0],
                    description: 'Pensão Alimentícia',
                    amount: pensionAmount,
                    type: TransactionType.EXPENSE,
                    category: Category.PENSION,
                    isCoparenting: true,
                    sharedPercentage: 100
                  })}
                  className="px-8 py-4 bg-white dark:bg-indigo-500 text-indigo-900 dark:text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-950/20 dark:shadow-none"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
               <h4 className="text-slate-900 dark:text-white text-lg font-black tracking-tight mb-2 transition-colors">Relatório de Transparência</h4>
               {coparentingExpenses.length === 0 ? (
                 <div className="p-12 text-center text-slate-300 dark:text-slate-700 font-bold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl transition-colors">Nenhum registro encontrado</div>
               ) : (
                 coparentingExpenses.map(t => (
                   <div key={t.id} className="flex items-center justify-between p-6 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-3xl hover:shadow-lg dark:hover:border-indigo-500/30 transition-all group">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors font-black shadow-sm">
                            {t.category[0]}
                         </div>
                         <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100 transition-colors">{t.description}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest transition-colors">{new Date(t.date).toLocaleDateString('pt-BR')} • {t.category}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                           <p className="text-lg font-black text-slate-900 dark:text-white transition-colors">R$ {t.amount.toFixed(2)}</p>
                           <p className="text-[10px] text-indigo-400 dark:text-indigo-500 font-black uppercase tracking-tighter">Cota: {t.sharedPercentage}%</p>
                        </div>
                        <button onClick={() => onDeleteTransaction(t.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2" title="Excluir"><DeleteIcon /></button>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        ) : (
          <div className="space-y-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {visitations.map(v => (
                 <div key={v.id} className="p-8 border border-indigo-50 dark:border-slate-700 rounded-[2rem] bg-indigo-50/20 dark:bg-slate-800/30 relative group hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors">
                   <div className="absolute top-6 right-8 flex items-center gap-3">
                     <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${v.status === 'Realizado' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                       {v.status}
                     </span>
                     <button onClick={() => onDeleteVisitation(v.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1" title="Excluir"><DeleteIcon /></button>
                   </div>
                   <p className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest mb-2 transition-colors">{new Date(v.date).toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                   <p className="text-xl font-black text-slate-900 dark:text-white mb-4 transition-colors">{new Date(v.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
                   <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-2xl text-sm text-slate-600 dark:text-slate-300 font-medium italic border border-white dark:border-slate-700 transition-all">
                      "{v.notes}"
                   </div>
                 </div>
               ))}
             </div>
             <button 
               onClick={() => onAddVisitation({
                 date: new Date().toISOString().split('T')[0],
                 status: 'Planejado',
                 notes: 'Anotar horários e lembretes aqui...'
               })}
               className="w-full py-8 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-slate-300 dark:text-slate-700 hover:text-indigo-400 dark:hover:text-indigo-500 hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:bg-indigo-50/10 dark:hover:bg-indigo-900/5 transition-all font-black uppercase tracking-[0.3em] text-xs"
             >
               + Agendar Nova Visita
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
