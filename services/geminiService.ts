
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export interface StatementInput {
  text?: string;
  file?: {
    mimeType: string;
    data: string; // base64
  };
}

export class GeminiService {
  /**
   * Limpa a string de resposta para garantir um JSON puro.
   */
  private static cleanJsonString(input: string): string {
    let cleaned = input.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
    }
    return cleaned;
  }

  static async askFinanceAssistant(prompt: string, context: string, history: { role: 'user' | 'assistant', content: string }[]): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const contents: any[] = [];
      let lastRole = '';
      for (const msg of history) {
        const currentRole = msg.role === 'user' ? 'user' : 'model';
        if (currentRole !== lastRole) {
          contents.push({ role: currentRole, parts: [{ text: msg.content }] });
          lastRole = currentRole;
        }
      }
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: contents,
        config: {
          systemInstruction: `Você é o FamilyFinance AI. CONTEXTO: ${context}. Responda em PT-BR.`,
          temperature: 0.7,
        }
      });
      return response.text || "Sem resposta.";
    } catch (error) {
      return "Erro ao processar consulta.";
    }
  }

  /**
   * Motor de extração de alto desempenho para extratos bancários brasileiros.
   */
  static async parseStatement(input: StatementInput): Promise<any[]> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentYear = new Date().getFullYear();
      const parts: any[] = [];
      
      if (input.text) {
        parts.push({ text: `Texto do extrato: ${input.text}` });
      } else if (input.file) {
        parts.push({
          inlineData: {
            mimeType: input.file.mimeType,
            data: input.file.data
          }
        });
      }

      parts.push({ 
        text: `Extraia TODAS as transações deste documento bancário. 
        Instruções Críticas:
        1. Ignore dados pessoais (CPFs, Nomes de contas). 
        2. FOQUE apenas nas linhas de transação (Data, Histórico/Descrição, Valor).
        3. Identifique se o valor é Entrada (RECEITA) ou Saída (DESPESA).
        4. O ano padrão é ${currentYear}.
        5. Saída obrigatória: Objeto JSON contendo a propriedade "transactions" (Array).` 
      });

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts },
        config: {
          thinkingConfig: { thinkingBudget: 16000 }, // Budget massivo para análise de documentos densos
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    description: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    type: { type: Type.STRING },
                    category: { type: Type.STRING }
                  },
                  required: ["date", "description", "amount", "type", "category"]
                }
              }
            },
            required: ["transactions"]
          }
        }
      });
      
      const rawResponse = response.text;
      if (!rawResponse) throw new Error("IA não gerou resposta.");

      const sanitized = this.cleanJsonString(rawResponse);
      const parsed = JSON.parse(sanitized);
      
      return parsed.transactions || [];
    } catch (error: any) {
      console.error("DEBUG OCR:", error);
      
      if (error.message?.includes("Safety")) {
        throw new Error("Segurança: O documento contém dados excessivamente sensíveis que o banco impede de ler. Tente ocultar seu CPF e carregar novamente.");
      }
      
      throw new Error("A IA Pro não conseguiu mapear as colunas deste PDF. Alternativa: Abra o PDF, selecione todo o texto (Ctrl+A), copie e cole no campo de texto abaixo.");
    }
  }
}
