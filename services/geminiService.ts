
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export class GeminiService {
  /**
   * Consulta o assistente financeiro com tratamento robusto de histórico.
   */
  static async askFinanceAssistant(prompt: string, context: string, history: { role: 'user' | 'assistant', content: string }[]): Promise<string> {
    try {
      // Initialize with named parameter
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const contents: any[] = [];
      
      // Map history roles: 'assistant' to 'model' as per Gemini generateContent requirements
      let lastRole = '';
      for (const msg of history) {
        const currentRole = msg.role === 'user' ? 'user' : 'model';
        // Avoid duplicate consecutive roles
        if (currentRole !== lastRole) {
          contents.push({
            role: currentRole,
            parts: [{ text: msg.content }]
          });
          lastRole = currentRole;
        }
      }

      // Append current user prompt
      if (lastRole === 'user' && contents.length > 0) {
        contents[contents.length - 1].parts[0].text += `\n\nNova dúvida: ${prompt}`;
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: prompt }]
        });
      }

      // Call generateContent with model, contents, and systemInstruction in config
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: `Você é o FamilyFinance AI, um consultor financeiro de elite especializado em coparentalidade. 
          CONTEXTO ATUAL DO USUÁRIO: ${context}. 
          Responda sempre em Português do Brasil, de forma concisa, empática e técnica.`,
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      // Correctly access .text property
      return response.text || "Desculpe, não consegui processar sua resposta agora. Por favor, tente novamente.";
    } catch (error: any) {
      console.error("Erro na Gemini API:", error);
      if (error.message?.includes('429')) return "Estou recebendo muitas requisições no momento. Por favor, aguarde um instante.";
      return "Ocorreu um erro técnico ao tentar falar com a IA. Verifique sua conexão.";
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
          parts: [{ text: `Aja como um processador de extratos bancários brasileiros. Extraia as transações deste texto bruto:
          "${rawText}"
          
          Regras:
          1. Retorne apenas JSON válido.
          2. Categorias permitidas: Alimentação, Saúde, Educação, Lazer, Habitação, Transporte, Contas Fixas, Pensão de Alimentos, Outros.
          3. Identifique se é RECEITA ou DESPESA com base no contexto bancário brasileiro.` }]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "Formato AAAA-MM-DD" },
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER, description: "Valor numérico absoluto" },
                type: { type: Type.STRING, description: "RECEITA ou DESPESA" },
                category: { type: Type.STRING }
              },
              required: ["date", "description", "amount", "type", "category"]
            }
          }
        }
      });
      
      // Access response.text property
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Erro no parser de extrato:", error);
      return [];
    }
  }
}
