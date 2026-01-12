
import React, { useState } from 'react';
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
  const [parsedData, setParsedData] = useState<{ transaction: Transaction; isDuplicate: boolean }[]>([]);

  const generateUniqueKey = (t: Partial<Transaction>) => {
    return `${t.date}_${t.amount}_${t.description?.toLowerCase().trim()}`;
  };

  const existingKeys = new Set(existingTransactions.map(t => t.uniqueKey || generateUniqueKey(t)));

  const handleProcessText = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    
    try {
      const results = await GeminiService.parseStatementText(rawText);
      const processed = results.map((item: any) => {
        const trans: Transaction = {
          id: crypto.randomUUID(),
          date: item.date,
          description: item.description,
          amount: Math.abs(item.amount),
          type: item.type === 'RECEITA' ? TransactionType.INCOME : TransactionType.EXPENSE,
          category: item.category as Category,
          isCoparenting: [Category.PENSION, Category.EDUCATION, Category.HEALTH].includes(item.category as Category),
          uniqueKey: `${item.date}_${Math.abs(item.amount)}_${item.description.toLowerCase().trim()}`
        };
        
        return {
          transaction: trans,
          isDuplicate: existingKeys.has(trans.uniqueKey!)
        };
      });

      setParsedData(processed);
      setStep('preview');
    } catch (e) {
      alert("Erro ao processar o texto. Tente copiar o extrato de forma mais clara.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalConfirm = () => {
    const toAdd = parsedData.filter(d => !d.isDuplicate).map(d => d.transaction);
    onConfirm(toAdd);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10 bg-black/80 backdrop-blur-lg">
      <div className="glass w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[3rem] shadow-2xl border-white/20 dark:border-slate-800 overflow-hidden">
        
        <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Importação Inteligente</h3>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">IA & Anti-Duplicidade</p>
          </div>
          <button onClick={onCancel} className="p-3 text-slate-400 hover:text-rose-500 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 'input' ? (
            <div className="space-y-6">
              <div className="p-10 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-center bg-slate-50/50 dark:bg-slate-900/20">
                <svg className="mx-auto mb-4 text-indigo-500" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <h4 className="font-black text-slate-800 dark:text-white mb-2">Arraste seu arquivo OFX ou CSV</h4>
                <p className="text-xs text-slate-400">Ou use a área abaixo para colar o texto copiado do seu banco.</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Colar texto do extrato (PDF/Web)</label>
                <textarea 
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Ex: 15/06 COMPRA SUPERMERCADO R$ 150,00..."
                  className="w-full h-48 p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] outline-none focus:border-indigo-500 text-sm font-medium transition-all"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Detectamos {parsedData.length} transações. {parsedData.filter(d => d.isDuplicate).length} já existem no sistema e serão ignoradas.
                </p>
              </div>

              <div className="space-y-3">
                {parsedData.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${item.isDuplicate ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 opacity-40' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.isDuplicate ? 'bg-slate-200 text-slate-400' : 'bg-emerald-500 text-white shadow-lg'}`}>
                        {item.isDuplicate ? '✓' : '+'}
                      </div>
                      <div>
                        <p className={`font-black text-sm ${item.isDuplicate ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>{item.transaction.description}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.transaction.date} • {item.transaction.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black ${item.transaction.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                        {item.transaction.type === TransactionType.INCOME ? '+' : '-'} R$ {item.transaction.amount.toLocaleString('pt-BR')}
                      </p>
                      {item.isDuplicate && <span className="text-[8px] font-black text-rose-500 uppercase">Duplicada</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-4">
          <button 
            onClick={step === 'preview' ? () => setStep('input') : onCancel}
            className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {step === 'preview' ? 'Voltar' : 'Cancelar'}
          </button>
          
          <button 
            onClick={step === 'input' ? handleProcessText : handleFinalConfirm}
            disabled={isProcessing || (step === 'input' && !rawText.trim())}
            className={`px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-3`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                IA Analisando...
              </>
            ) : (
              step === 'input' ? 'Analisar Extrato' : 'Confirmar Importação'
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};
