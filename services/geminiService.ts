
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export class GeminiService {
  /**
   * Consulta o assistente financeiro enviando o histórico completo para contexto.
   */
  static async askFinanceAssistant(prompt: string, context: string, history: { role: 'user' | 'assistant', content: string }[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Converte o histórico local para o formato de partes do Gemini
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Adiciona a pergunta atual
    contents.push({
      role: 'user',
      parts: [{ text: `CONTEXTO ATUAL DO SISTEMA: ${context}\n\nPERGUNTA DO USUÁRIO: ${prompt}` }]
    });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: "Você é um consultor financeiro de elite especializado em coparentalidade. Ajude o usuário a gerenciar gastos com os filhos, prazos de pensão e logística de visitas. Seja empático, técnico quando necessário e sempre focado no melhor interesse da criança. Responda em Português do Brasil.",
        temperature: 0.7,
        topP: 0.95,
      }
    });

    return response.text ?? "Desculpe, tive um problema ao processar sua solicitação.";
  }

  static async analyzeReceipt(base64Image: string): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Extraia o valor total, data e descrição deste recibo. Se for uma despesa compartilhada com filho, identifique." }
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
  }
}
