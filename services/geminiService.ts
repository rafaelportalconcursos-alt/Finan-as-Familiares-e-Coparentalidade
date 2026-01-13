
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export class GeminiService {
  /**
   * Consulta o assistente financeiro com tratamento robusto de histórico.
   * Utiliza o modelo Pro para raciocínio financeiro complexo.
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
          3. Ajude a calcular rateios de despesas extras e planejar metas de longo prazo (faculdade, intercâmbio, etc).
          4. Use um tom profissional, porém acolhedor e empático.
          5. Responda em Português do Brasil.`,
          temperature: 0.6,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      return response.text || "Desculpe, não consegui processar sua resposta agora.";
    } catch (error: any) {
      console.error("Erro na Gemini API:", error);
      return "Ocorreu um erro técnico ao tentar falar com a IA. Por favor, tente novamente em alguns instantes.";
    }
  }

  /**
   * Parser de extratos: Transforma texto bruto em transações financeiras usando o modelo Flash.
   */
  static async parseStatementText(rawText: string): Promise<any[]> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentYear = new Date().getFullYear();
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ text: `Analise este extrato bancário e extraia as transações:
          "${rawText}"` }]
        },
        config: {
          systemInstruction: `Você é um sistema de processamento de OCR e dados bancários.
          Extraia transações identificando: data (AAAA-MM-DD), descrição limpa, valor absoluto, tipo (RECEITA/DESPESA) e categoria.
          Ignore saldos, taxas de cheque especial ou informações de marketing.
          Use o ano ${currentYear} se não houver no texto.`,
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
      console.error("Erro no parser de extrato:", error);
      throw new Error("Não foi possível ler este extrato. Certifique-se de que copiou o texto corretamente.");
    }
  }
}
