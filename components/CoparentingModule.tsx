
import React, { useState, useMemo } from 'react';
import { Transaction, Visitation, TransactionType, Category, ChildData } from '../types';

interface CoparentingModuleProps {
  child: ChildData;
  transactions: Transaction[];
  visitations: Visitation[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddVisitation: (v: Omit<Visitation, 'id'>) => void;
  onDeleteVisitation: (id: string) => void;
  onUpdateChild: (data: Partial<ChildData>) => void;
  pensionAmount: number;
  pensionStatus: string;
}

// Utilitário para formatar data sem interferência de fuso horário
const formatDateSafe = (dateStr: string) => {
  if (!dateStr) return '--/--/----';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const CoparentingModule: React.FC<CoparentingModuleProps> = ({ 
  child,
  transactions, 
  visitations, 
  onAddTransaction,
  onDeleteTransaction,
  onAddVisitation,
  onDeleteVisitation,
  onUpdateChild,
  pensionAmount,
  pensionStatus
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'visitation' | 'pension' | 'extra' | 'documents'>('summary');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(child.name);
  
  const extraExpenses = useMemo(() => 
    transactions.filter(t => t.isCoparenting && t.category !== Category.PENSION), 
    [transactions]
  );
  
  const pensionPayments = useMemo(() => 
    transactions.filter(t => t.category === Category.PENSION), 
    [transactions]
  );

  const nextVisit = useMemo(() => 
    visitations
      .filter(v => v.status === 'Planejado')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0], 
    [visitations]
  );

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const [year, month, day] = birthDate.split('-').map(Number);
    const birth = new Date(year, month - 1, day);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleNameSave = () => {
    if (tempName.trim()) {
      onUpdateChild({ name: tempName.trim() });
    }
    setIsEditingName(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Navegação de Abas "Minha Filha" */}
      <div className="glass p-2 rounded-[2rem] shadow-sm flex flex-wrap gap-1 border-white/20 dark:border-slate-800">
        {[
          { id: 'summary', label: 'Resumo', icon: <HeartIcon /> },
          { id: 'visitation', label: 'Visitas', icon: <CalendarIcon /> },
          { id: 'pension', label: 'Pensão', icon: <CashIcon /> },
          { id: 'extra', label: 'Extras', icon: <TagIcon /> },
          { id: 'documents', label: 'Acordos', icon: <FileIcon /> }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'summary' && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            {/* Card Principal da Criança */}
            <div className="glass p-10 rounded-[3rem] shadow-xl border-white/40 dark:border-slate-800 flex flex-col md:flex-row items-center gap-10 bg-gradient-to-br from-white to-rose-50/30 dark:from-slate-900 dark:to-rose-900/5">
              <div className="relative">
                <div className="w-32 h-32 bg-rose-100 dark:bg-rose-900/40 rounded-[2.5rem] flex items-center justify-center text-rose-500 text-4xl font-black shadow-inner border-4 border-white dark:border-slate-800 overflow-hidden">
                  {child.photo ? (
                    <img src={child.photo} alt={child.name} className="w-full h-full object-cover" />
                  ) : (
                    child.name ? child.name[0] : '?'
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-white shadow-lg">
                  <HeartIcon size={16} />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                        className="text-3xl font-black bg-white/50 dark:bg-slate-800 border-none rounded-xl px-4 py-1 focus:ring-2 focus:ring-rose-500 outline-none text-slate-900 dark:text-white max-w-[200px]"
                      />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{child.name}</h2>
                      <button 
                        onClick={() => { setTempName(child.name); setIsEditingName(true); }}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        title="Editar nome"
                      >
                        <EditIcon size={20} />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                  {calculateAge(child.birthDate)} anos • {formatDateSafe(child.birthDate)}
                </p>
                <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
                   <span className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full text-[9px] font-black uppercase tracking-widest">Favorita</span>
                   <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest">Escola Integral</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                 <div className="p-6 bg-white dark:bg-slate-800/50 rounded-[2rem] text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pensão</p>
                    <span className={`text-xs font-black px-4 py-1.5 rounded-full ${pensionStatus === 'Pago' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>{pensionStatus}</span>
                 </div>
                 <div className="p-6 bg-white dark:bg-slate-800/50 rounded-[2rem] text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Próxima Visita</p>
                    <span className="text-xs font-black text-slate-900 dark:text-white">{nextVisit ? formatDateSafe(nextVisit.date).split('/').slice(0, 2).join('/') : 'Sem agenda'}</span>
                 </div>
              </div>
            </div>

            {/* Grid de Informações Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="glass p-8 rounded-[2.5rem] shadow-lg border-white/40 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Acordos de Visita</h3>
                    <button className="text-[9px] font-black uppercase text-indigo-500">Ver Termos</button>
                  </div>
                  <div className="space-y-4">
                     <AcordoItem label="Finais de semana alternados" active={true} />
                     <AcordoItem label="Metade das férias escolares" active={true} />
                     <AcordoItem label="Feriados pares com o pai" active={false} />
                     <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/30 flex items-start gap-3">
                        <InfoIcon size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                          Lembrete: O próximo feriado (Corpus Christi) é responsabilidade da mãe conforme acordo de 2024.
                        </p>
                     </div>
                  </div>
               </div>

               <div className="glass p-8 rounded-[2.5rem] shadow-lg border-white/40 dark:border-slate-800">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 tracking-tight">Saúde e Educação</h3>
                  <div className="space-y-4">
                     <InfoRow label="Pediatra" value={child.pediatrician || 'Não informado'} />
                     <InfoRow label="Escola" value={child.school || 'Não informado'} />
                     <InfoRow label="Tipo Sanguíneo" value={child.bloodType || 'Não informado'} />
                     <InfoRow label="Alergias" value={child.allergies || 'Não informado'} />
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'visitation' && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
             <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Agenda de Visitas</h3>
                <div className="flex gap-3">
                  <button className="px-6 py-3 glass text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition">Exportar PDF</button>
                  <button 
                    onClick={() => onAddVisitation({
                      date: new Date().toLocaleDateString('en-CA'),
                      status: 'Planejado',
                      notes: '',
                      location: 'Casa da Mãe',
                      pickupTime: '18:00',
                      returnTime: '18:00'
                    })}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition shadow-lg shadow-indigo-100 dark:shadow-none"
                  >
                    + Nova Visita
                  </button>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-4">
                {visitations.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 font-bold italic border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem]">Nenhuma visita agendada</div>
                ) : (
                  visitations.map(v => {
                    const dateParts = v.date.split('-');
                    const dateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
                    return (
                      <div key={v.id} className="glass p-6 rounded-[2.5rem] shadow-lg border-white/40 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-start md:items-center group hover:border-rose-200 dark:hover:border-rose-900 transition-colors">
                         <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl min-w-[100px] shadow-inner border border-slate-100 dark:border-slate-700">
                            <span className="text-[10px] font-black text-indigo-400 uppercase mb-1">{dateObj.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{dateParts[2]}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase">{dateObj.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                         </div>
                         <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${v.status === 'Realizado' ? 'bg-emerald-500 text-white' : v.status === 'Cancelado' ? 'bg-rose-500 text-white' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>{v.status}</span>
                              <h4 className="font-black text-slate-800 dark:text-white">{v.location || 'Local a definir'}</h4>
                            </div>
                            <div className="flex flex-wrap gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                               <div className="flex items-center gap-2"><ClockIcon size={12} /> {v.pickupTime || '--:--'} → {v.returnTime || '--:--'}</div>
                               {v.notes && <div className="flex items-center gap-2"><FileIcon size={12} /> {v.notes}</div>}
                            </div>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => onDeleteVisitation(v.id)} className="p-3 text-slate-300 hover:text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"><TrashIcon size={18} /></button>
                            <button className="p-3 text-slate-300 hover:text-indigo-500 transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl"><EditIcon size={18} /></button>
                         </div>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        )}

        {activeTab === 'pension' && (
          <div className="space-y-8 animate-in slide-in-from-left-8 duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Controle de Pensão</h3>
                <div className="p-4 glass rounded-2xl flex items-center gap-6">
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Mensal</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">R$ {pensionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   </div>
                   <div className="w-[1px] h-10 bg-slate-100 dark:bg-slate-800"></div>
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencimento</p>
                      <p className="text-xl font-black text-indigo-500">Dia 10</p>
                   </div>
                </div>
             </div>

             <div className="glass p-8 rounded-[2.5rem] border-white/40 dark:border-slate-800 shadow-xl overflow-hidden">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Histórico de Pagamentos</h4>
                <div className="space-y-4">
                   {pensionPayments.length === 0 ? (
                     <p className="py-10 text-center text-slate-400 font-bold italic">Nenhum registro encontrado.</p>
                   ) : (
                     pensionPayments.map(p => {
                       const dateParts = p.date.split('-');
                       const dateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
                       return (
                         <div key={p.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl group">
                            <div className="flex items-center gap-5">
                               <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center"><CheckIcon size={24} /></div>
                               <div>
                                  <p className="font-black text-slate-800 dark:text-white">{p.description}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">{dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                               </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                               <p className="font-black text-slate-900 dark:text-white">R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                               <button className="text-[8px] font-black uppercase tracking-widest text-indigo-500 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm hover:scale-105 transition">Comprovante</button>
                            </div>
                         </div>
                       );
                     })
                   )}
                </div>
             </div>
             
             <div className="flex justify-center pt-4">
                <button 
                  onClick={() => onAddTransaction({
                    date: new Date().toLocaleDateString('en-CA'),
                    description: `Pensão - ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}`,
                    amount: pensionAmount,
                    type: TransactionType.EXPENSE,
                    category: Category.PENSION,
                    isCoparenting: true,
                    sharedPercentage: 100
                  })}
                  className="px-10 py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] hover:scale-105 transition shadow-xl shadow-emerald-100 dark:shadow-none"
                >
                  Registrar Pagamento do Mês
                </button>
             </div>
          </div>
        )}

        {activeTab === 'extra' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
             <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Despesas Extras</h3>
                <button 
                  onClick={() => onAddTransaction({
                    date: new Date().toLocaleDateString('en-CA'),
                    description: 'Nova Despesa Extra',
                    amount: 0,
                    type: TransactionType.EXPENSE,
                    category: Category.OTHER,
                    isCoparenting: true,
                    sharedPercentage: 50
                  })}
                  className="px-6 py-3 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition shadow-lg shadow-rose-100 dark:shadow-none"
                >
                  + Adicionar Gasto
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {extraExpenses.length === 0 ? (
                  <div className="col-span-2 py-20 text-center text-slate-400 font-bold italic border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem]">Nenhum gasto extra registrado</div>
                ) : (
                  extraExpenses.map(e => (
                    <div key={e.id} className="glass p-6 rounded-[2.5rem] border-white/40 dark:border-slate-800 shadow-lg flex justify-between items-center hover:translate-y-[-2px] transition-all">
                       <div className="space-y-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{e.category}</p>
                          <h4 className="font-black text-slate-900 dark:text-white leading-tight">{e.description}</h4>
                          <p className="text-[10px] font-bold text-slate-400">{formatDateSafe(e.date)}</p>
                       </div>
                       <div className="text-right space-y-2">
                          <p className="text-xl font-black text-slate-900 dark:text-white">R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[8px] font-black uppercase tracking-widest">Comp. {e.sharedPercentage}%</span>
                          <button onClick={() => onDeleteTransaction(e.id)} className="block ml-auto text-slate-300 hover:text-rose-500 transition-colors"><TrashIcon size={16} /></button>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
             <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Documentos e Acordos</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DocumentCard title="Sentença Judicial" date="15/05/2023" type="PDF" color="bg-indigo-500" />
                <DocumentCard title="Acordo Extrajudicial" date="20/02/2024" type="DOCX" color="bg-rose-500" />
                <DocumentCard title="Plano de Saúde" date="10/01/2024" type="PDF" color="bg-emerald-500" />
             </div>
             <div className="glass p-10 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-4"><FileIcon size={32} /></div>
                <h4 className="font-black text-slate-900 dark:text-white mb-2">Anexar Novo Documento</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">Mantenha termos, decisões e comprovantes importantes centralizados e protegidos.</p>
                <button className="px-8 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition">Upload de Arquivo</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componentes Auxiliares
const AcordoItem = ({ label, active }: { label: string, active: boolean }) => (
  <div className="flex items-center gap-3">
    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${active ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
      <CheckIcon size={12} />
    </div>
    <span className={`text-xs font-bold ${active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 line-through'}`}>{label}</span>
  </div>
);

const InfoRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <span className="text-xs font-black text-slate-800 dark:text-white">{value}</span>
  </div>
);

const DocumentCard = ({ title, date, type, color }: { title: string, date: string, type: string, color: string }) => (
  <div className="glass p-6 rounded-[2rem] border-white/40 dark:border-slate-800 shadow-md hover:shadow-xl transition-all cursor-pointer group">
    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition`}>
      <FileIcon size={20} />
    </div>
    <h4 className="font-black text-slate-900 dark:text-white mb-1 group-hover:text-indigo-500 transition-colors">{title}</h4>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{date} • {type}</p>
  </div>
);

// Ícones
const HeartIcon = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const CalendarIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const CashIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const TagIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const FileIcon = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const ClockIcon = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const CheckIcon = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const InfoIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const TrashIcon = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
const EditIcon = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
