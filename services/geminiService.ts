
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export class GeminiService {
  static async askFinanceAssistant(prompt: string, context: string, history: { role: 'user' | 'assistant', content: string }[]): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const formattedHistory: any[] = [];
      for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        const role = msg.role === 'user' ? 'user' : 'model';
        if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === role) continue;
        formattedHistory.push({ role: role, parts: [{ text: msg.content }] });
      }
      if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') formattedHistory.pop();

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `Você é o FamilyFinance AI, um consultor financeiro. CONTEXTO: ${context}.`,
          temperature: 0.7,
        },
        history: formattedHistory
      });

      const result = await chat.sendMessage({ message: prompt });
      return result.text || "Sem resposta.";
    } catch (error: any) {
      console.error("Erro na Gemini API:", error);
      throw error;
    }
  }

  /**
   * Transforma texto bruto de extrato em JSON estruturado
   */
  static async parseStatementText(rawText: string): Promise<any[]> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ text: `Extraia as transações financeiras deste texto de extrato. Converta para JSON. 
          Para cada transação inclua:
          - date (no formato YYYY-MM-DD)
          - description (string clara)
          - amount (número positivo)
          - type (RECEITA ou DESPESA)
          - category (Escolha a mais adequada entre: Alimentação, Saúde, Educação, Lazer, Habitação, Transporte, Contas Fixas, Pensão de Alimentos, Outros)
          
          Texto do Extrato:
          ${rawText}` }]
        },
        config: {
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
      
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Erro ao processar extrato com IA:", error);
      return [];
    }
  }
}
