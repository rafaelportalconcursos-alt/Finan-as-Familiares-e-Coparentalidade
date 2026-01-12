
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

  const generateUniqueKey = (t: any) => {
    // Normaliza a data e descrição para gerar uma chave de hash consistente
    const d = t.date || '';
    const v = Math.abs(t.amount || 0).toFixed(2);
    const desc = (t.description || '').toLowerCase().trim();
    return `${d}_${v}_${desc}`;
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
          uniqueKey: generateUniqueKey(item)
        };
        
        return {
          transaction: trans,
          isDuplicate: existingKeys.has(trans.uniqueKey!)
        };
      });

      setParsedData(processed);
      setStep('preview');
    } catch (e) {
      alert("Houve um erro na análise do extrato. Tente copiar o texto novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalConfirm = () => {
    const toAdd = parsedData.filter(d => !d.isDuplicate).map(d => d.transaction);
    onConfirm(toAdd);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-md">
      <div className="glass w-full max-w-4xl max-h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl border-white/10 overflow-hidden">
        
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Importação Inteligente</h3>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Anti-Duplicidade Ativado</p>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-500 hover:text-white transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 'input' ? (
            <div className="space-y-6">
              <div className="p-10 border-2 border-dashed border-white/10 rounded-[2rem] text-center bg-white/5 group hover:border-indigo-500/50 transition-all">
                <div className="w-16 h-16 bg-indigo-500/20 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <h4 className="font-black text-white mb-1">Importar de Arquivo ou Texto</h4>
                <p className="text-xs text-slate-400">Arraste seu OFX/CSV ou cole o texto do extrato bancário abaixo.</p>
              </div>

              <div className="space-y-3">
                <textarea 
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Cole aqui o texto copiado do seu extrato (Ex: 15/06 SUPERMERCADO R$ 120,00)"
                  className="w-full h-48 p-6 bg-black/40 border border-white/10 rounded-[2rem] outline-none focus:border-indigo-500 text-sm font-medium transition-all text-white placeholder:text-slate-600"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-lg">
                  {parsedData.filter(d => !d.isDuplicate).length}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Lançamentos identificados com sucesso!</p>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    {parsedData.filter(d => d.isDuplicate).length} duplicados foram ignorados automaticamente.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {parsedData.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${item.isDuplicate ? 'bg-slate-900/40 border-white/5 opacity-40' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.isDuplicate ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                        {item.isDuplicate ? '✕' : '+'}
                      </div>
                      <div>
                        <p className={`font-black text-sm ${item.isDuplicate ? 'line-through text-slate-500' : 'text-white'}`}>{item.transaction.description}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">{item.transaction.date} • {item.transaction.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black ${item.transaction.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-white'}`}>
                        {item.transaction.type === TransactionType.INCOME ? '+' : '-'} R$ {item.transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {item.isDuplicate && <span className="text-[8px] font-black text-rose-500 uppercase">Já Cadastrado</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="p-8 border-t border-white/5 bg-white/5 flex justify-end gap-4">
          <button 
            onClick={step === 'preview' ? () => setStep('input') : onCancel}
            className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition"
          >
            {step === 'preview' ? 'Voltar' : 'Cancelar'}
          </button>
          
          <button 
            onClick={step === 'input' ? handleProcessText : handleFinalConfirm}
            disabled={isProcessing || (step === 'input' && !rawText.trim())}
            className={`px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-3`}
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              step === 'input' ? 'Analisar com IA' : 'Confirmar Importação'
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};
