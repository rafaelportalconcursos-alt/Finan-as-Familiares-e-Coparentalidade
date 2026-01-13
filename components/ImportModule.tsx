
import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, Category } from '../types';
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
  const [fileType, setFileType] = useState<'pdf' | 'ofx' | 'csv' | 'txt' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{ transaction: Transaction; isDuplicate: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUniqueKey = (t: Transaction) => {
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

    const extension = file.name.split('.').pop()?.toLowerCase();
    setError(null);
    setIsProcessing(true);

    try {
      if (extension === 'pdf') {
        setFileType('pdf');
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPDF(arrayBuffer);
        setRawText(text);
      } else if (extension === 'ofx') {
        setFileType('ofx');
        const text = await file.text();
        setRawText(text);
      } else if (extension === 'csv') {
        setFileType('csv');
        const text = await file.text();
        setRawText(text);
      } else {
        setFileType('txt');
        const text = await file.text();
        setRawText(text);
      }
    } catch (err) {
      setError("Erro ao ler o arquivo. Certifique-se de que ele não está corrompido ou protegido.");
    } finally {
      setIsProcessing(false);
    }
  };

  const parseOFX = (text: string): Transaction[] => {
    const transactions: Transaction[] = [];
    const transactionBlocks = text.split('<STMTTRN>');
    
    transactionBlocks.shift(); 

    transactionBlocks.forEach(block => {
      const amountMatch = block.match(/<TRNAMT>([\d.-]+)/);
      const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
      const memoMatch = block.match(/<MEMO>([^<|\n]+)/);
      const nameMatch = block.match(/<NAME>([^<|\n]+)/);

      if (amountMatch && dateMatch) {
        const amount = parseFloat(amountMatch[1]);
        const dateStr = dateMatch[1]; 
        const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        const description = (memoMatch ? memoMatch[1] : nameMatch ? nameMatch[1] : 'Transação OFX').trim();

        transactions.push({
          id: crypto.randomUUID(),
          date: formattedDate,
          description: description,
          amount: Math.abs(amount),
          type: amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
          category: Category.OTHER,
          isCoparenting: false
        });
      }
    });

    return transactions;
  };

  const parseStatementLocally = (text: string): Transaction[] => {
    if (text.includes('<OFX>') || text.includes('<STMTTRN>')) {
      return parseOFX(text);
    }

    const transactions: Transaction[] = [];
    const lines = text.split('\n');
    
    const noiseKeywords = [
      'saldo', 'total', 'extrato', 'período', 'agência', 'conta', 'página', 
      'limite', 'bloqueado', 'provisionado', 'demonstrativo', 'investimentos',
      'resumo', 'rendimento', 'aplicação', 'resgate', 'mês de'
    ];

    const dateRegex = /(\d{2}\/\d{2}(?:\/\d{2,4})?)/;
    const valueRegex = /(?:R\$\s*)?(-?\s*[\d.]{1,12},\d{2})(\s*[DC])?/i;

    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      const isNoise = noiseKeywords.some(keyword => lowerLine.includes(keyword));
      if (isNoise) return;

      const dateMatch = line.match(dateRegex);
      const valueMatch = line.match(valueRegex);

      if (dateMatch && valueMatch) {
        const dateStr = dateMatch[1];
        const valuePart = valueMatch[1];
        const indicator = valueMatch[2]?.trim().toUpperCase();

        let cleanValue = valuePart.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        let amount = parseFloat(cleanValue);

        if (isNaN(amount) || Math.abs(amount) < 0.01) return;

        const isExpense = amount < 0 || indicator === 'D' || 
          (lowerLine.includes('débito') && indicator !== 'C') ||
          lowerLine.includes('pix enviado') ||
          lowerLine.includes('pagamento');
        
        let description = line
          .replace(dateStr, '')
          .replace(valuePart, '')
          .replace(indicator || '', '')
          .replace(/R\$/g, '')
          .replace(/[",;]/g, ' ') 
          .replace(/[-+]/g, '')
          .trim();

        if (description.length > 1) {
          const currentYear = new Date().getFullYear();
          let formattedDate = dateStr;
          
          if (dateStr.length === 5) {
            const [d, m] = dateStr.split('/');
            formattedDate = `${currentYear}-${m}-${d}`;
          } else {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              formattedDate = `${year}-${parts[1]}-${parts[0]}`;
            }
          }

          transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            description: description.substring(0, 55).replace(/\s+/g, ' '),
            amount: Math.abs(amount),
            type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
            category: Category.OTHER,
            isCoparenting: false
          });
        }
      }
    });

    return transactions;
  };

  const handleProcess = () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setError(null);
    
    try {
      const results = parseStatementLocally(rawText);
      
      if (results.length === 0) {
        throw new Error("Não conseguimos identificar transações. Verifique se o formato do arquivo é compatível.");
      }

      const processed = results.map(trans => {
        const key = generateUniqueKey(trans);
        return {
          transaction: { ...trans, uniqueKey: key },
          isDuplicate: existingKeys.has(key)
        };
      });

      setParsedData(processed);
      setStep('preview');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDateChange = (index: number, newDate: string) => {
    setParsedData(prev => {
      const newData = [...prev];
      const updatedTrans = { ...newData[index].transaction, date: newDate };
      const newKey = generateUniqueKey(updatedTrans);
      newData[index] = {
        transaction: { ...updatedTrans, uniqueKey: newKey },
        isDuplicate: existingKeys.has(newKey)
      };
      return newData;
    });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="glass w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[3.5rem] shadow-[0_32px_120px_rgba(0,0,0,0.8)] border-white/10 overflow-hidden bg-slate-900/40">
        
        <header className="p-10 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-3xl font-black text-white tracking-tighter">Multi-Importador</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Suporte: PDF, OFX, CSV e TXT</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-4 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {error && (
            <div className="mb-8 p-8 bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] animate-in slide-in-from-top-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white font-black">!</div>
                <h4 className="font-black text-rose-500 uppercase text-[10px] tracking-widest">Falha na Leitura</h4>
              </div>
              <p className="text-xs text-rose-400/80 leading-relaxed font-bold">{error}</p>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-10">
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.ofx,.csv,.txt" onChange={handleFileUpload} />
              
              {!rawText ? (
                <div 
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  className="p-16 border-2 border-dashed rounded-[3rem] text-center transition-all cursor-pointer group border-white/10 bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5"
                >
                  <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 bg-indigo-500/20 text-indigo-500 group-hover:scale-110 transition-transform shadow-inner">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <h4 className="text-2xl font-black text-white mb-3">Selecione seu Arquivo</h4>
                  <div className="flex justify-center gap-3">
                    {['PDF', 'OFX', 'CSV', 'TXT'].map(f => (
                       <span key={f} className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black text-slate-500 border border-white/5 uppercase tracking-widest">{f}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in">
                  <div className="flex justify-between items-center px-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Formato: {fileType}</span>
                    </div>
                    <button onClick={() => { setRawText(''); setFileType(null); setError(null); }} className="text-[10px] font-black text-rose-500 uppercase hover:underline">Trocar Arquivo</button>
                  </div>
                  <div className="relative">
                    <textarea 
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      className="w-full h-64 p-8 bg-black/40 border border-white/10 rounded-[2.5rem] outline-none text-xs font-mono text-slate-400 shadow-inner overflow-y-auto leading-relaxed focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-white uppercase tracking-widest">Registros Detectados ({parsedData.length})</h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[8px] font-black text-slate-500 uppercase">Receitas</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div><span className="text-[8px] font-black text-slate-500 uppercase">Despesas</span></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {parsedData.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-5 rounded-[2rem] border transition-all ${item.isDuplicate ? 'bg-slate-950/50 border-white/5 opacity-30 grayscale' : 'bg-white/5 border-white/10 hover:border-indigo-500/40 shadow-sm'}`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${item.transaction.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {item.transaction.type === TransactionType.INCOME ? '+' : '-'}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-black text-sm text-white tracking-tight">{item.transaction.description}</p>
                          {item.isDuplicate && <span className="text-[7px] font-black bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full uppercase">Duplicado</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <input 
                            type="date" 
                            value={item.transaction.date} 
                            onChange={(e) => handleDateChange(idx, e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg px-2 py-0.5 text-[10px] font-black text-slate-400 uppercase outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                    <p className={`text-base font-black ${item.transaction.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-white'}`}>
                      R$ {item.transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="p-10 border-t border-white/5 bg-white/5 flex justify-end gap-6 items-center">
          {isProcessing && <span className="text-[10px] font-black text-indigo-400 uppercase animate-pulse mr-auto ml-4">Lendo Arquivo...</span>}
          
          <button onClick={step === 'preview' ? () => setStep('input') : onCancel} className="px-8 py-5 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">
            {step === 'preview' ? 'Voltar' : 'Cancelar'}
          </button>

          {rawText && step === 'input' && (
            <button 
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-14 py-5 bg-indigo-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              Organizar Dados
            </button>
          )}

          {step === 'preview' && (
            <button 
              onClick={() => onConfirm(parsedData.filter(d => !d.isDuplicate).map(d => d.transaction))}
              className="px-14 py-5 bg-emerald-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(16,185,129,0.3)] hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all"
            >
              Importar {parsedData.filter(d => !d.isDuplicate).length} Itens
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
