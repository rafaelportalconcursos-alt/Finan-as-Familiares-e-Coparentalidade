
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
   * Consulta o assistente financeiro com tratamento robusto de histórico.
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
          systemInstruction: `Você é o FamilyFinance AI, um consultor financeiro de elite especializado em coparentalidade e gestão de economia familiar. 
          CONTEXTO DO USUÁRIO: ${context}. 
          
          SUAS DIRETRIZES:
          1. Forneça conselhos financeiros baseados em dados reais de mercado e boas práticas de economia doméstica.
          2. Seja extremamente sensível a questões de coparentalidade, priorizando o bem-estar da criança.
          3. Ajude a calcular rateios de despesas extras e planejar metas de longo prazo.
          4. Responda em Português do Brasil.`,
          temperature: 0.6
        }
      });

      return response.text || "Desculpe, não consegui processar sua resposta agora.";
    } catch (error: any) {
      console.error("Erro na Gemini API:", error);
      return "Ocorreu um erro técnico ao tentar falar com a IA.";
    }
  }

  /**
   * Analisa extratos (Texto ou PDF) e extrai transações usando Gemini 3 Flash.
   */
  static async parseStatement(input: StatementInput): Promise<any[]> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentYear = new Date().getFullYear();
      
      const parts: any[] = [];
      
      if (input.text) {
        parts.push({ text: `Analise este extrato e extraia as transações: "${input.text}"` });
      } else if (input.file) {
        parts.push({
          inlineData: {
            mimeType: input.file.mimeType,
            data: input.file.data
          }
        });
        parts.push({ text: "Analise este documento de extrato e extraia todas as transações financeiras." });
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          systemInstruction: `Você é um especialista em OCR e análise de dados bancários.
          Extraia transações identificando: data (AAAA-MM-DD), descrição limpa, valor absoluto, tipo (RECEITA/DESPESA) e categoria.
          Ignore saldos anteriores, limites de crédito ou publicidade.
          Categorias sugeridas: Alimentação, Saúde, Educação, Lazer, Habitação, Transporte, Contas Fixas, Pensão de Alimentos, Outros.
          Ano padrão: ${currentYear}.
          Retorne estritamente um ARRAY JSON.`,
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
      
      const text = response.text || "[]";
      return JSON.parse(text);
    } catch (error) {
      console.error("Erro no parser multimodal:", error);
      throw new Error("Não foi possível processar este documento. Verifique se o arquivo está legível.");
    }
  }
}
