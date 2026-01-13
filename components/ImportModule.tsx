
import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { GeminiService } from '../services/geminiService';
import * as pdfjs from 'pdfjs-dist';

// Configurar o worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

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

  const extractTextFromPDF = async (data: ArrayBuffer): Promise<string> => {
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPDF(arrayBuffer);
        setRawText(text);
      } else {
        const text = await file.text();
        setRawText(text);
      }
    } catch (err) {
      setError("Erro ao ler o arquivo. Certifique-se de que não está protegido por senha.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcess = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setError(null);
    
    try {
      // Agora usamos a IA apenas para ESTRUTURAR o texto que já lemos localmente
      // Isso é muito mais confiável do que pedir para ela ler o arquivo
      const results = await GeminiService.parseStatement({ text: rawText });
      
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error("Não conseguimos identificar transações no texto extraído.");
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
      setError("A extração de texto funcionou, mas a organização falhou. Tente copiar e colar apenas as linhas das transações.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="glass w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[3.5rem] shadow-[0_32px_120px_rgba(0,0,0,0.8)] border-white/10 overflow-hidden bg-slate-900/40">
        
        <header className="p-10 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-3xl font-black text-white tracking-tighter">Importação Local</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Leitura Local Ativada (Normal)</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-4 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {error && (
            <div className="mb-8 p-8 bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] animate-in slide-in-from-top-4">
              <p className="text-xs text-rose-400/80 leading-relaxed">{error}</p>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-10">
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt,.csv" onChange={handleFileUpload} />
              
              {!rawText ? (
                <div 
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  className="p-16 border-2 border-dashed rounded-[3rem] text-center transition-all cursor-pointer group border-white/10 bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5"
                >
                  <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 bg-indigo-500/20 text-indigo-500 group-hover:scale-110 transition-transform">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <h4 className="text-2xl font-black text-white mb-3">Abrir PDF ou Texto</h4>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">O texto será extraído no seu computador para garantir máxima compatibilidade.</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in">
                  <div className="flex justify-between items-center px-4">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Texto Extraído com Sucesso</span>
                    <button onClick={() => setRawText('')} className="text-[10px] font-black text-rose-500 uppercase hover:underline">Limpar</button>
                  </div>
                  <textarea 
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full h-64 p-8 bg-black/40 border border-white/10 rounded-[2.5rem] outline-none text-xs font-mono text-slate-300 shadow-inner overflow-y-auto"
                  />
                  <p className="text-center text-[10px] text-slate-500 font-bold uppercase">Você pode editar o texto acima se houver erros na leitura do PDF.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in zoom-in-95">
              <div className="grid grid-cols-1 gap-4">
                {parsedData.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all ${item.isDuplicate ? 'bg-slate-900/40 border-white/5 opacity-40' : 'bg-white/5 border-white/10 hover:border-indigo-500/40'}`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.transaction.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {item.transaction.type === TransactionType.INCOME ? '+' : '-'}
                      </div>
                      <div>
                        <p className="font-black text-sm text-white">{item.transaction.description}</p>
                        <p className="text-[10px] font-black text-slate-600 uppercase mt-1">{item.transaction.date} • {item.transaction.category}</p>
                      </div>
                    </div>
                    <p className="text-lg font-black text-white">R$ {item.transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="p-10 border-t border-white/5 bg-white/5 flex justify-end gap-6 items-center">
          {isProcessing && <span className="text-[10px] font-black text-indigo-400 uppercase animate-pulse">Processando...</span>}
          <button onClick={onCancel} className="px-8 py-5 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Sair</button>
          {rawText && step === 'input' && (
            <button 
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-14 py-5 bg-indigo-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              Organizar Transações
            </button>
          )}
          {step === 'preview' && (
            <button 
              onClick={() => onConfirm(parsedData.filter(d => !d.isDuplicate).map(d => d.transaction))}
              className="px-14 py-5 bg-emerald-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl"
            >
              Confirmar Tudo
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
