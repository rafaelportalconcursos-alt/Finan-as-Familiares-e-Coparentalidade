
import React, { useState, useMemo } from 'react';
import { Transaction, Visitation, TransactionType, Category, ChildData, LegalDocument } from '../types';

interface CoparentingModuleProps {
  child: ChildData;
  transactions: Transaction[];
  visitations: Visitation[];
  documents: LegalDocument[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddVisitation: (v: Omit<Visitation, 'id'>) => void;
  onEditVisitation: (v: Visitation) => void;
  onDeleteVisitation: (id: string) => void;
  onAddDocument: (d: Omit<LegalDocument, 'id'>) => void;
  onEditDocument: (d: LegalDocument) => void;
  onDeleteDocument: (id: string) => void;
  onUpdateChild: (data: Partial<ChildData>) => void;
  onEditPension: () => void;
  pensionAmount: number;
  pensionStatus: string;
}

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
  documents = [],
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onAddVisitation,
  onEditVisitation,
  onDeleteVisitation,
  onAddDocument,
  onEditDocument,
  onDeleteDocument,
  onUpdateChild,
  onEditPension,
  pensionAmount,
  pensionStatus
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'visitation' | 'pension' | 'extra' | 'documents'>('summary');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(child.name);
  
  const extraExpenses = useMemo(() => 
    (transactions || []).filter(t => t.isCoparenting && t.category !== Category.PENSION), 
    [transactions]
  );
  
  const pensionPayments = useMemo(() => 
    (transactions || []).filter(t => t.category === Category.PENSION), 
    [transactions]
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

  const daysToNextVisit = useMemo(() => {
    const planned = (visitations || []).filter(v => v.status === 'Planejado').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (planned.length === 0) return null;
    const diff = new Date(planned[0].date).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days < 0 ? 0 : days;
  }, [visitations]);

  const handleNameSave = () => {
    if (tempName.trim()) {
      onUpdateChild({ name: tempName.trim() });
    }
    setIsEditingName(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* Navegação Superior - Premium Mockup Style */}
      <div className="bg-slate-900/40 rounded-[2.5rem] p-2 flex border border-white/5 backdrop-blur-xl shadow-2xl overflow-x-auto no-scrollbar">
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
            className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-2.5 py-4 px-6 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 min-w-[100px] ${activeTab === tab.id ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_10px_30px_rgba(99,102,241,0.3)] scale-105' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'summary' && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            {/* Cabeçalho de Resumo Premium */}
            <div className="glass p-10 rounded-[3.5rem] shadow-xl border-white/5 flex flex-col lg:flex-row items-center gap-12 bg-slate-900/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -z-10"></div>
              
              <div className="relative shrink-0">
                <div className="w-44 h-44 bg-gradient-to-tr from-slate-950 to-slate-800 rounded-[4rem] flex items-center justify-center text-indigo-500 text-6xl font-black shadow-2xl border-4 border-white/10 overflow-hidden group">
                  {child.photo ? (
                    <img src={child.photo} alt={child.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  ) : (
                    <span className="animate-pulse">{child.name ? child.name[0] : '?'}</span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-indigo-600 border-4 border-slate-950 rounded-full flex items-center justify-center text-white shadow-xl ring-4 ring-indigo-500/20"><HeartIcon size={20} /></div>
              </div>

              <div className="flex-1 text-center lg:text-left space-y-6">
                <div>
                  <div className="flex items-center justify-center lg:justify-start gap-4 mb-3">
                    {isEditingName ? (
                      <input autoFocus value={tempName} onChange={(e) => setTempName(e.target.value)} onBlur={handleNameSave} onKeyDown={(e) => e.key === 'Enter' && handleNameSave()} className="text-5xl font-black bg-white/5 border-none rounded-2xl px-5 py-2 text-white max-w-[400px] outline-none focus:bg-white/10 shadow-inner" />
                    ) : (
                      <>
                        <h2 className="text-6xl font-black text-white tracking-tighter leading-none">{child.name}</h2>
                        <button onClick={() => { setTempName(child.name); setIsEditingName(true); }} className="p-3 text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-2xl transition-all shadow-sm"><EditIcon size={24} /></button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-center lg:justify-start gap-3">
                    <span className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px] bg-white/5 px-4 py-1.5 rounded-full border border-white/5">{calculateAge(child.birthDate)} ANOS</span>
                    <span className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px] bg-white/5 px-4 py-1.5 rounded-full border border-white/5">{formatDateSafe(child.birthDate)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
                   <div className="px-6 py-4 bg-slate-900/60 rounded-[1.8rem] border border-white/5 flex items-center gap-4 shadow-xl">
                      <div className={`w-3 h-3 rounded-full ${pensionStatus === 'Pago' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'} animate-pulse`}></div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">PENSÃO</span>
                        <span className="text-xs font-black text-white uppercase tracking-tighter">{pensionStatus}</span>
                      </div>
                   </div>
                   <div className="px-6 py-4 bg-slate-900/60 rounded-[1.8rem] border border-white/5 flex items-center gap-4 shadow-xl">
                      <CalendarIcon size={18} className="text-indigo-400" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">PRÓXIMA VISITA</span>
                        <span className="text-xs font-black text-white uppercase tracking-tighter">{daysToNextVisit !== null ? `EM ${daysToNextVisit} DIAS` : 'NÃO AGENDADA'}</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <SummaryCard title="Saúde e Bem-estar" icon={<HealthIcon />}>
                  <div className="space-y-4">
                    <InfoRow label="Pediatra" value={child.pediatrician || 'Dra. Helena'} />
                    <InfoRow label="Tipo Sanguíneo" value={child.bloodType || 'O+'} />
                    <InfoRow label="Alergias" value={child.allergies || 'Nenhuma registrada'} />
                    <div className="pt-4 flex gap-2">
                       <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[8px] font-black uppercase">Vacinas em dia</span>
                       <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg text-[8px] font-black uppercase">Plano Ativo</span>
                    </div>
                  </div>
               </SummaryCard>
               
               <SummaryCard title="Educação" icon={<EducationIcon />}>
                  <div className="space-y-4">
                    <InfoRow label="Instituição" value={child.school || 'Colégio Horizonte'} />
                    <InfoRow label="Ano Escolar" value="Maternal II" />
                    <InfoRow label="Entrada/Saída" value="08:00 - 12:30" />
                    <div className="pt-4">
                       <button className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">Ver Calendário Escolar <ChevronRightIcon size={10} /></button>
                    </div>
                  </div>
               </SummaryCard>

               <SummaryCard title="Cofre Digital" icon={<FileIcon />}>
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 p-4 bg-black/20 rounded-2xl border border-white/5">
                       <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500"><FileIcon size={20} /></div>
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-white">{(documents || []).length} Arquivos</span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase">Documentos Homologados</span>
                       </div>
                    </div>
                    <button onClick={() => setActiveTab('documents')} className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition shadow-xl shadow-indigo-500/20">Acessar Arquivos</button>
                  </div>
               </SummaryCard>
            </div>
          </div>
        )}

        {activeTab === 'visitation' && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
             <div className="flex justify-between items-center"><h3 className="text-2xl font-black text-white tracking-tight">Agenda de Visitas</h3><button onClick={() => onAddVisitation({ date: new Date().toLocaleDateString('en-CA'), status: 'Planejado', notes: '', location: 'Casa da Mãe' })} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition shadow-lg">+ Nova Visita</button></div>
             <div className="grid grid-cols-1 gap-4">
                {(visitations || []).map(v => (
                  <div key={v.id} className="glass p-6 rounded-[2.5rem] shadow-lg border-white/5 flex items-center gap-6 group bg-slate-900/10">
                     <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-3xl min-w-[100px] border border-white/5"><span className="text-[10px] font-black text-indigo-400 uppercase mb-1">{new Date(v.date).toLocaleDateString('pt-BR', { weekday: 'short' })}</span><span className="text-2xl font-black text-white">{v.date.split('-')[2]}</span><span className="text-[10px] font-black text-slate-500 uppercase">{new Date(v.date).toLocaleDateString('pt-BR', { month: 'short' })}</span></div>
                     <div className="flex-1"><span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${v.status === 'Realizado' ? 'bg-emerald-500 text-white' : 'bg-indigo-900/50 text-indigo-300'}`}>{v.status}</span><h4 className="font-black text-white mt-1">{v.location}</h4><p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">{v.notes}</p></div>
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => onEditVisitation(v)} className="p-3 text-slate-600 hover:text-indigo-400 rounded-xl"><EditIcon size={18} /></button><button onClick={() => onDeleteVisitation(v.id)} className="p-3 text-slate-600 hover:text-rose-500 rounded-xl"><TrashIcon size={18} /></button></div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'pension' && (
          <div className="space-y-8 animate-in slide-in-from-left-8 duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <h3 className="text-2xl font-black text-white tracking-tight">Controle de Pensão</h3>
                <div className="flex gap-4">
                   <button onClick={onEditPension} className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition">Editar Valor</button>
                   <button onClick={() => onAddTransaction({ date: new Date().toLocaleDateString('en-CA'), description: `Pensão ${new Date().toLocaleDateString('pt-BR', {month: 'long'})}`, amount: pensionAmount, type: TransactionType.EXPENSE, category: Category.PENSION, isCoparenting: true })} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition shadow-lg shadow-emerald-500/20">Lançar Pagamento</button>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass p-10 rounded-[3rem] border-white/5 bg-indigo-600/5 shadow-inner">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Valor Atual do Acordo</p>
                   <h4 className="text-5xl font-black text-white mb-6 tracking-tighter">R$ {pensionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                   <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase ${pensionStatus === 'Pago' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                      {pensionStatus === 'Pago' ? <CheckIcon size={12} /> : null} {pensionStatus}
                   </div>
                </div>
                
                <div className="glass p-10 rounded-[3rem] border-white/5 bg-slate-900/10 flex flex-col justify-center border-dashed">
                   <p className="text-xs text-slate-400 italic leading-relaxed">"A pensão alimentícia é um investimento no futuro da {child.name}. Mantenha os registros organizados para evitar conflitos e garantir a segurança financeira dela."</p>
                </div>
             </div>

             <div className="glass p-8 rounded-[3.5rem] border-white/5 space-y-6 bg-slate-900/10 overflow-hidden">
                <div className="flex justify-between items-center px-2">
                   <h4 className="text-sm font-black text-white uppercase tracking-widest">Histórico de Pagamentos</h4>
                   <span className="text-[9px] font-bold text-slate-500 uppercase">{pensionPayments.length} Registros</span>
                </div>
                {pensionPayments.length === 0 ? (
                  <div className="py-24 text-center opacity-20 uppercase font-black text-[10px] tracking-[0.3em] italic">Nenhum pagamento registrado.</div>
                ) : (
                  <div className="space-y-4">
                    {pensionPayments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-emerald-500/30 transition-all group">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><CheckIcon size={24} /></div>
                          <div>
                            <p className="font-black text-white text-base tracking-tight">{p.description}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{formatDateSafe(p.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <p className="font-black text-white text-lg">R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           <button onClick={() => onDeleteTransaction(p.id)} className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"><TrashIcon size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'extra' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
             <div className="flex justify-between items-center"><h3 className="text-2xl font-black text-white tracking-tight">Despesas Extras</h3><button onClick={() => onAddTransaction({ date: new Date().toLocaleDateString('en-CA'), description: 'Nova Despesa', amount: 0, type: TransactionType.EXPENSE, category: Category.OTHER, isCoparenting: true })} className="px-6 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition shadow-lg shadow-rose-500/20">+ Adicionar Gasto</button></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {extraExpenses.map(e => (
                  <div key={e.id} className="glass p-6 rounded-[2.5rem] border-white/5 flex justify-between items-center group bg-slate-900/10 hover:border-indigo-500/30 transition-all">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{e.category}</p>
                      <h4 className="font-black text-white text-base tracking-tight">{e.description}</h4>
                      <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-widest">{formatDateSafe(e.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white text-lg">R$ {e.amount.toLocaleString('pt-BR')}</p>
                      <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-all justify-end"><button onClick={() => onEditTransaction(e)} className="p-2 text-slate-600 hover:text-indigo-400"><EditIcon size={16} /></button><button onClick={() => onDeleteTransaction(e.id)} className="p-2 text-slate-600 hover:text-rose-500"><TrashIcon size={16} /></button></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="animate-in fade-in zoom-in-95 duration-500 space-y-10">
             <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white tracking-tight">Acordos e Documentos</h3>
                <button onClick={() => onAddDocument({ title: 'Novo Arquivo', date: new Date().toLocaleDateString('en-CA'), type: 'Legal' })} className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition">+ Fixar Documento</button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(documents || []).map(doc => (
                  <div key={doc.id} onClick={() => onEditDocument(doc)} className="glass p-2 rounded-[2.5rem] border-white/5 hover:bg-indigo-600/5 transition-all cursor-pointer group relative overflow-hidden bg-slate-900/10 flex flex-col h-full shadow-2xl">
                    <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden bg-black/40 shadow-inner">
                      {doc.fileUrl ? (
                        <img src={doc.fileUrl} alt={doc.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-indigo-500 opacity-30">
                          <FileIcon size={48} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                      <div className="absolute bottom-6 left-6 right-6">
                         <span className="px-2.5 py-1 bg-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-widest text-white mb-2 inline-block shadow-lg">{doc.type}</span>
                         <h4 className="font-black text-white text-lg tracking-tight leading-tight">{doc.title}</h4>
                      </div>
                    </div>
                    
                    <div className="p-6 flex justify-between items-center">
                       <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{formatDateSafe(doc.date)}</p>
                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                          <button onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-lg"><TrashIcon size={14} /></button>
                          <button className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg"><EditIcon size={14} /></button>
                       </div>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => onAddDocument({ title: 'Novo Arquivo', date: new Date().toLocaleDateString('en-CA'), type: 'Legal' })}
                  className="glass p-10 min-h-[300px] rounded-[2.5rem] border-dashed border-white/10 text-slate-600 hover:text-white hover:border-indigo-500/50 transition-all flex flex-col items-center justify-center gap-4 bg-slate-900/5 group shadow-2xl"
                >
                  <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all">
                    <PlusIcon size={32} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">+ Novo Arquivo</span>
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ title, icon, children }: any) => (
  <div className="glass p-8 rounded-[3.5rem] border-white/5 bg-slate-900/10 flex flex-col shadow-lg hover:border-white/10 transition-all group overflow-hidden">
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:bg-indigo-400/10 transition-all group-hover:scale-110 duration-500 shadow-inner">{icon}</div>
      <h4 className="font-black text-white text-xs uppercase tracking-[0.2em]">{title}</h4>
    </div>
    <div className="flex-1">
      {children}
    </div>
  </div>
);

const InfoRow = ({ label, value }: any) => (
  <div className="flex justify-between items-center py-3.5 border-b border-white/5 last:border-0"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span><span className="text-xs font-black text-white">{value}</span></div>
);

const HeartIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const CalendarIcon = ({ size = 20, className = "" }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const CashIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const TagIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const FileIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const HealthIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5v14M5 12h14"/></svg>;
const EducationIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>;
const CheckIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const EditIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const PlusIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const ChevronRightIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>;
