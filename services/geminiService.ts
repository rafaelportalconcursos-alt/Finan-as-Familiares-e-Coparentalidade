
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export class GeminiService {
  /**
   * Consulta o assistente financeiro usando o modelo Flash para maior velocidade e estabilidade.
   */
  static async askFinanceAssistant(prompt: string, context: string, history: { role: 'user' | 'assistant', content: string }[]): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Converte o histórico local para o formato de partes do Gemini (user/model)
      const contents: any[] = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Adiciona a instrução de contexto e a pergunta atual como a última mensagem do usuário
      contents.push({
        role: 'user',
        parts: [{ text: `CONTEXTO DO SISTEMA:\n${context}\n\nPERGUNTA DO USUÁRIO: ${prompt}` }]
      });

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: "Você é um consultor financeiro de elite especializado em coparentalidade (FamilyFinance). Seu objetivo é ajudar pais a gerenciarem gastos com filhos, pensões e visitas de forma harmoniosa e organizada. Seja empático, prático e direto. Responda sempre em Português do Brasil.",
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        }
      });

      if (!response.text) {
        console.warn("Gemini retornou uma resposta vazia ou foi bloqueado por filtros de segurança.");
        return "Desculpe, não consegui processar essa informação agora. Tente perguntar de outra forma.";
      }

      return response.text;
    } catch (error) {
      console.error("Erro detalhado na chamada da Gemini API:", error);
      throw error; // Repassa para o App.tsx tratar a UI
    }
  }

  /**
   * Analisa imagens de recibos/comprovantes.
   */
  static async analyzeReceipt(base64Image: string): Promise<any> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Analise este comprovante. Extraia: descrição do gasto, valor total, data (AAAA-MM-DD) e se parece ser um gasto relacionado a crianças (escola, saúde, lazer infantil)." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING },
              isChildRelated: { type: Type.BOOLEAN }
            },
            required: ["description", "amount", "date"]
          }
        }
      });
      
      return JSON.parse(response.text ?? '{}');
    } catch (error) {
      console.error("Erro ao analisar recibo com IA:", error);
      return null;
    }
  }
}
