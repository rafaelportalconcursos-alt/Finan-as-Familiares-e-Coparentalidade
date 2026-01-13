
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
   * Sanitiza a resposta da IA para garantir que seja um JSON válido.
   */
  private static cleanJsonString(input: string): string {
    return input
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
  }

  /**
   * Consulta o assistente financeiro (Gemini 3 Pro).
   */
  static async askFinanceAssistant(prompt: string, context: string, history: { role: 'user' | 'assistant', content: string }[]): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const contents: any[] = [];
      
      let lastRole = '';
      for (const msg of history) {
        const currentRole = msg.role === 'user' ? 'user' : 'model';
        if (currentRole !== lastRole) {
          contents.push({
            role: currentRole,
            parts: [{ text: msg.content }]
          });
          lastRole = currentRole;
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: contents,
        config: {
          systemInstruction: `Você é o FamilyFinance AI, especialista em coparentalidade. 
          CONTEXTO: ${context}. Responda em Português do Brasil.`,
          temperature: 0.6,
        }
      });

      return response.text || "Desculpe, não consegui processar sua resposta agora.";
    } catch (error: any) {
      console.error("Erro na Gemini API:", error);
      return "Ocorreu um erro técnico ao tentar falar com a IA.";
    }
  }

  /**
   * Analisa extratos usando Gemini 3 Pro (para melhor OCR e análise de tabelas em PDF).
   */
  static async parseStatement(input: StatementInput): Promise<any[]> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentYear = new Date().getFullYear();
      
      const parts: any[] = [];
      
      if (input.text) {
        parts.push({ text: `Analise as transações deste texto: "${input.text}"` });
      } else if (input.file) {
        parts.push({
          inlineData: {
            mimeType: input.file.mimeType,
            data: input.file.data
          }
        });
        parts.push({ text: "Analise detalhadamente este documento PDF. Extraia todas as transações da tabela de extrato bancário." });
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Upgrade para Pro para garantir extração perfeita de documentos
        contents: { parts },
        config: {
          systemInstruction: `Você é um sistema de OCR bancário de alta precisão.
          OBJETIVO: Extrair transações de extratos PDF/Texto.
          REGRAS:
          1. Localize a data (AAAA-MM-DD), descrição e valor.
          2. Classifique o tipo como 'RECEITA' ou 'DESPESA'.
          3. Categorize entre: Alimentação, Saúde, Educação, Lazer, Habitação, Transporte, Contas Fixas, Pensão de Alimentos, Outros.
          4. Se o ano estiver ausente, use ${currentYear}.
          5. Ignore linhas de 'Saldo Anterior', 'Total', 'Investimentos' ou propagandas.
          6. Ignore sinais negativos nos valores, use o campo 'type' para indicar se é saída.
          7. RETORNE APENAS O ARRAY JSON, sem explicações.`,
          responseMimeType: "application/json",
          responseSchema: {
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
        }
      });
      
      const rawText = response.text || "[]";
      const sanitizedJson = this.cleanJsonString(rawText);
      return JSON.parse(sanitizedJson);
    } catch (error: any) {
      console.error("Erro no parser multimodal:", error);
      if (error.message?.includes("fetch")) {
        throw new Error("Erro de conexão. Verifique sua internet.");
      }
      throw new Error("A IA não conseguiu ler este formato de PDF. Tente copiar o texto do PDF e colar na área de texto.");
    }
  }
}
