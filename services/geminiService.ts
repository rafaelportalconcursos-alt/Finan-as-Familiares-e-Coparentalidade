
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export class GeminiService {
  static async askFinanceAssistant(prompt: string, context: string): Promise<string> {
    // A chave é obtida automaticamente do ambiente de execução
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Dados atuais do usuário: ${context}\n\nPergunta: ${prompt}`,
      config: {
        systemInstruction: "Você é um consultor financeiro pessoal de elite especializado em coparentalidade (Módulo Minha Filha). Suas respostas devem ser em Português do Brasil, neutras, empáticas e focadas em organização financeira e bem-estar da criança. Use tom profissional e amigável.",
      }
    });
    return response.text ?? "Desculpe, não consegui processar sua pergunta.";
  }

  static async analyzeReceipt(base64Image: string): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Extraia o valor total, data e descrição deste recibo de despesa. Responda estritamente em JSON no formato solicitado." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING }
          },
          required: ["description", "amount", "date"]
        }
      }
    });
    return JSON.parse(response.text ?? '{}');
  }

  static async transcribeAudio(base64Audio: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      // Following guidelines for native audio tasks.
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/pcm;rate=16000', data: base64Audio } },
          { text: "Transcreva este áudio para texto em português. Foque em notas de saúde ou logística escolar." }
        ]
      }
    });
    return response.text ?? "";
  }
}
