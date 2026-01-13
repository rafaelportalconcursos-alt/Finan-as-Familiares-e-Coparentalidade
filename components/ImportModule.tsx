
import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { GeminiService } from '../services/geminiService';

interface ImportModuleProps {
  existingTransactions: Transaction[];
  onConfirm: (newTransactions: Transaction[]) => void;
  onCancel: () => void;
}

export const ImportModule: React.FC<ImportModuleProps> = ({ existingTransactions, onConfirm, onCancel }) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [rawText, setRawText] = useState('');
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

    setIsProcessing(true);
    setError(null);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      setIsProcessing(false);
    };

    reader.onerror = () => {
      setError("Falha ao ler o arquivo. Tente copiar e colar o texto.");
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const handleProcessText = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setError(null);
    
    try {
      const results = await GeminiService.parseStatementText(rawText);
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error("Nenhuma transação encontrada no texto fornecido.");
      }

      const processed = results.map((item: any) => {
        const trans: Transaction = {
          id: crypto.randomUUID(),
          date: item.date,
          description: item.description,
          amount: Math.abs(item.amount),
          type: item.type === 'RECEITA' ? TransactionType.INCOME : TransactionType.EXPENSE,
          category: item.category as Category,
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
      setError(e.message || "Erro na análise. Verifique se o texto contém dados de extrato.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalConfirm = () => {
    const toAdd = parsedData.filter(d => !d.isDuplicate).map(d => d.transaction);
    onConfirm(toAdd);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="glass w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.5)] border-white/10 overflow-hidden">
        
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Importação de Extrato</h3>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              IA de Processamento Bancário
            </p>
          </div>
          <button onClick={onCancel} className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
              <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white font-black text-lg">!</div>
              <p className="text-xs font-bold text-rose-500">{error}</p>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-8">
              <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.csv,.ofx" onChange={handleFileUpload} />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-12 border-2 border-dashed border-white/10 rounded-[2.5rem] text-center bg-white/5 group hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer"
              >
                <div className="w-20 h-20 bg-indigo-500/20 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <h4 className="text-xl font-black text-white mb-2">Selecionar Arquivo Bancário</h4>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">Arraste seu arquivo .OFX, .CSV ou .TXT aqui ou clique para buscar no dispositivo.</p>
              </div>

              <div className="relative">
                <div className="absolute -top-3 left-6 px-3 bg-slate-900 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ou Cole o Texto</div>
                <textarea 
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Copie as linhas do seu extrato do app do banco e cole aqui..."
                  className="w-full h-48 p-8 bg-black/40 border border-white/10 rounded-[2.5rem] outline-none focus:border-indigo-500 text-sm font-medium transition-all text-white placeholder:text-slate-700 shadow-inner"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-6 bg-indigo-500/10 p-6 rounded-[2rem] border border-indigo-500/20 shadow-xl">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                  {parsedData.filter(d => !d.isDuplicate).length}
                </div>
                <div>
                  <p className="text-lg font-black text-white tracking-tight">Análise Concluída</p>
                  <p className="text-xs font-bold text-slate-400">
                    <span className="text-indigo-400">{parsedData.filter(d => d.isDuplicate).length} transações</span> já existem no seu histórico e serão ignoradas.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {parsedData.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all ${item.isDuplicate ? 'bg-slate-900/40 border-white/5 opacity-40 grayscale' : 'bg-white/5 border-white/10 hover:border-indigo-500/30 shadow-lg'}`}>
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${item.isDuplicate ? 'bg-slate-800 text-slate-500' : (item.transaction.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')}`}>
                        {item.isDuplicate ? '✓' : (item.transaction.type === TransactionType.INCOME ? '+' : '-')}
                      </div>
                      <div>
                        <p className={`font-black text-base tracking-tight ${item.isDuplicate ? 'text-slate-500' : 'text-white'}`}>{item.transaction.description}</p>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.transaction.date} • {item.transaction.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black ${item.transaction.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-white'}`}>
                        R$ {item.transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {item.isDuplicate && <span className="text-[9px] font-black text-rose-500 uppercase bg-rose-500/10 px-2 py-0.5 rounded-lg mt-1 inline-block">Já Importado</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="p-8 border-t border-white/5 bg-white/5 flex justify-end gap-6">
          <button 
            onClick={step === 'preview' ? () => setStep('input') : onCancel}
            className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all"
          >
            {step === 'preview' ? 'Voltar para Início' : 'Fechar'}
          </button>
          
          <button 
            onClick={step === 'input' ? handleProcessText : handleFinalConfirm}
            disabled={isProcessing || (step === 'input' && !rawText.trim())}
            className={`px-12 py-5 bg-indigo-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-4`}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                Processando...
              </>
            ) : (
              step === 'input' ? 'Analisar com IA' : 'Finalizar Importação'
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};
