
import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { GeminiService, StatementInput } from '../services/geminiService';

interface ImportModuleProps {
  existingTransactions: Transaction[];
  onConfirm: (newTransactions: Transaction[]) => void;
  onCancel: () => void;
}

export const ImportModule: React.FC<ImportModuleProps> = ({ existingTransactions, onConfirm, onCancel }) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [rawText, setRawText] = useState('');
  const [pendingFile, setPendingFile] = useState<{ data: string, mimeType: string, name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{ transaction: Transaction; isDuplicate: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUniqueKey = (t: any) => {
    const d = t.date || '';
    const v = Math.abs(t.amount || 0).toFixed(2);
    const desc = (t.description || '').toLowerCase().trim();
    return `${d}_${v}_${desc}`;
  };

  const existingKeys = new Set(existingTransactions.map(t => t.uniqueKey || generateUniqueKey(t)));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("O arquivo é muito grande (Máx 5MB).");
      return;
    }

    setError(null);
    const reader = new FileReader();
    setIsProcessing(true);

    if (file.type === 'application/pdf') {
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result && result.includes(',')) {
          setPendingFile({ data: result.split(',')[1], mimeType: file.type, name: file.name });
          setRawText('');
        }
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        setRawText(event.target?.result as string);
        setPendingFile(null);
        setIsProcessing(false);
      };
      reader.readAsText(file);
    }
  };

  const handleProcess = async () => {
    if (!rawText.trim() && !pendingFile) return;
    setIsProcessing(true);
    setError(null);
    
    try {
      const input: StatementInput = pendingFile 
        ? { file: { data: pendingFile.data, mimeType: pendingFile.mimeType } }
        : { text: rawText };

      const results = await GeminiService.parseStatement(input);
      
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error("A IA leu o documento mas não encontrou transações. Verifique se o documento é realmente um extrato.");
      }

      const processed = results.map((item: any) => {
        const trans: Transaction = {
          id: crypto.randomUUID(),
          date: item.date,
          description: item.description,
          amount: Math.abs(item.amount),
          type: item.type === 'RECEITA' ? TransactionType.INCOME : TransactionType.EXPENSE,
          category: (item.category as Category) || Category.OTHER,
          isCoparenting: [Category.PENSION, Category.EDUCATION, Category.HEALTH].includes(item.category as Category),
          uniqueKey: generateUniqueKey(item)
        };
        
        return {
          transaction: trans,
          isDuplicate: existingKeys.has(trans.uniqueKey!)
        };
      });

      setParsedData(processed);
      setStep('preview');
    } catch (e: any) {
      setError(e.message || "Erro desconhecido. Tente usar a opção de colar texto.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="glass w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[3.5rem] shadow-[0_32px_120px_rgba(0,0,0,0.8)] border-white/10 overflow-hidden bg-slate-900/40">
        
        <header className="p-10 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-3xl font-black text-white tracking-tighter">Importação Inteligente</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Motor Pro Ultra (16k Budget)</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-4 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {error && (
            <div className="mb-8 p-8 bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] animate-in slide-in-from-top-4">
              <div className="flex items-center gap-5 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-rose-500/20">!</div>
                <h4 className="font-black text-rose-500 uppercase text-sm tracking-tight">Falha no Processamento</h4>
              </div>
              <p className="text-xs text-rose-400/80 leading-relaxed ml-15">{error}</p>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-10">
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt,.csv" onChange={handleFileUpload} />
              
              <div 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`p-16 border-2 border-dashed rounded-[3rem] text-center transition-all cursor-pointer group ${pendingFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5'}`}
              >
                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 transition-all shadow-inner ${pendingFile ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-indigo-500/20 text-indigo-500'}`}>
                  {pendingFile ? (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  )}
                </div>
                <h4 className="text-2xl font-black text-white mb-3">
                  {pendingFile ? pendingFile.name : 'Carregar Extrato Bancário'}
                </h4>
                <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Utilizamos IA multimodal de última geração para converter qualquer PDF bancário em dados organizados.
                </p>
                {pendingFile && <button onClick={(e) => { e.stopPropagation(); setPendingFile(null); }} className="mt-6 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Remover Arquivo</button>}
              </div>

              {!pendingFile && (
                <div className="relative pt-6">
                  <div className="absolute -top-1 left-8 px-4 bg-slate-900 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Ou Cole o Texto do Banco</div>
                  <textarea 
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Abra seu extrato, copie o texto e cole aqui..."
                    className="w-full h-44 p-10 bg-black/40 border border-white/10 rounded-[2.5rem] outline-none focus:border-indigo-500 text-sm font-medium text-white shadow-inner custom-scrollbar placeholder:text-slate-700"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-8 bg-emerald-500/10 p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl">
                <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-emerald-500/20">
                  {parsedData.filter(d => !d.isDuplicate).length}
                </div>
                <div>
                  <p className="text-xl font-black text-white tracking-tight">Análise Concluída com Sucesso</p>
                  <p className="text-xs font-bold text-slate-400">
                    Mapeamos {parsedData.length} itens. {parsedData.filter(d => d.isDuplicate).length} duplicados detectados.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {parsedData.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all ${item.isDuplicate ? 'bg-slate-900/40 border-white/5 opacity-40' : 'bg-white/5 border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5'}`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${item.isDuplicate ? 'bg-slate-800 text-slate-500' : (item.transaction.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')}`}>
                        {item.isDuplicate ? '✓' : (item.transaction.type === TransactionType.INCOME ? '+' : '-')}
                      </div>
                      <div className="max-w-[200px] md:max-w-md">
                        <p className={`font-black text-sm md:text-base tracking-tight truncate ${item.isDuplicate ? 'text-slate-500' : 'text-white'}`}>{item.transaction.description}</p>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">{item.transaction.date} • {item.transaction.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-base md:text-xl font-black ${item.transaction.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-white'}`}>
                        R$ {item.transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="p-10 border-t border-white/5 bg-white/5 flex justify-end gap-6 items-center">
          {isProcessing && (
            <div className="flex-1 flex items-center gap-4 ml-4">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
              </div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">IA Pensando...</span>
            </div>
          )}
          
          <button 
            onClick={step === 'preview' ? () => setStep('input') : onCancel}
            className="px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all"
          >
            {step === 'preview' ? 'Ajustar Arquivo' : 'Sair'}
          </button>
          
          <button 
            onClick={step === 'input' ? handleProcess : () => onConfirm(parsedData.filter(d => !d.isDuplicate).map(d => d.transaction))}
            disabled={isProcessing || (step === 'input' && !rawText.trim() && !pendingFile)}
            className={`px-14 py-5 bg-indigo-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(79,70,229,0.3)] hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50`}
          >
            {step === 'input' ? 'Iniciar Análise Pro' : 'Confirmar Importação'}
          </button>
        </footer>
      </div>
    </div>
  );
};
