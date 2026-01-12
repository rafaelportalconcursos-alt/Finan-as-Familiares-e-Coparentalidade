
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export class GeminiService {
  /**
   * Consulta o assistente financeiro com tratamento robusto de histórico.
   */
  static async askFinanceAssistant(prompt: string, context: string, history: { role: 'user' | 'assistant', content: string }[]): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Sanitização rigorosa do histórico para o formato da API
      const contents: any[] = [];
      
      // 1. Instrução de Sistema embutida no primeiro turno
      contents.push({
        role: 'user',
        parts: [{ text: `Você é o FamilyFinance AI, um consultor financeiro de elite especializado em coparentalidade. 
          CONTEXTO DO USUÁRIO: ${context}. 
          Responda de forma concisa, empática e técnica.` }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: "Entendido. Como posso auxiliar na sua gestão financeira hoje?" }]
      });

      // 2. Adição do histórico real, garantindo alternância
      let lastRole = 'model';
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

      // 3. Adição da mensagem final do usuário
      if (lastRole === 'user') {
        // Se a última mensagem do histórico já foi do usuário, anexamos o novo prompt a ela ou removemos a anterior
        contents[contents.length - 1].parts[0].text += `\n\nNova pergunta: ${prompt}`;
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: prompt }]
        });
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 0 } // Desabilitado para latência menor em chat simples
        }
      });

      return response.text || "Desculpe, não consegui processar sua resposta agora.";
    } catch (error: any) {
      console.error("Erro na Gemini API:", error);
      if (error.message?.includes('429')) return "Estou recebendo muitas requisições. Por favor, aguarde um instante.";
      throw error;
    }
  }

  /**
   * Parser de extratos: Transforma texto bruto em transações financeiras.
   */
  static async parseStatementText(rawText: string): Promise<any[]> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ text: `Aja como um parser de extratos bancários. Extraia as transações deste texto:
          "${rawText}"
          
          Regras:
          1. Retorne apenas JSON válido.
          2. Categorias: Alimentação, Saúde, Educação, Lazer, Habitação, Transporte, Contas Fixas, Pensão de Alimentos, Outros.` }]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER, description: "Valor absoluto positivo" },
                type: { type: Type.STRING, description: "RECEITA ou DESPESA" },
                category: { type: Type.STRING }
              },
              required: ["date", "description", "amount", "type", "category"]
            }
          }
        }
      });
      
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Erro no parser de extrato:", error);
      return [];
    }
  }
}
