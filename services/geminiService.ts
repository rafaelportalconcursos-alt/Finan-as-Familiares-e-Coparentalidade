
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

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

      if (lastRole === 'user' && contents.length > 0) {
        contents[contents.length - 1].parts[0].text += `\n\nNova dúvida: ${prompt}`;
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
          systemInstruction: `Você é o FamilyFinance AI, um consultor financeiro de elite especializado em coparentalidade. 
          CONTEXTO ATUAL DO USUÁRIO: ${context}. 
          Responda sempre em Português do Brasil, de forma concisa, empática e técnica. 
          Ajude o usuário a entender seus gastos, economizar para o futuro do filho e manter a harmonia na gestão compartilhada.`,
          temperature: 0.7,
        }
      });

      return response.text || "Desculpe, não consegui processar sua resposta agora.";
    } catch (error: any) {
      console.error("Erro na Gemini API:", error);
      return "Ocorreu um erro técnico ao tentar falar com a IA. Verifique sua conexão ou tente novamente mais tarde.";
    }
  }

  /**
   * Parser de extratos: Transforma texto bruto em transações financeiras.
   * Suporta diversos formatos de bancos brasileiros (Itaú, Nubank, Bradesco, BB, Inter, etc).
   */
  static async parseStatementText(rawText: string): Promise<any[]> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentYear = new Date().getFullYear();
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ text: `Aja como um processador de extratos bancários brasileiros de alta precisão. 
          Sua tarefa é extrair as transações financeiras deste texto bruto:
          "${rawText}"
          
          REGRAS CRÍTICAS:
          1. Retorne APENAS um array JSON.
          2. Se a data não tiver ano, use "${currentYear}".
          3. Identifique o tipo: 
             - DESPESA: Valores negativos, termos como "PAGTO", "DÉBITO", "COMPRA CARTÃO", "PIX ENVIADO", "SAQUE", "IOF", "TARIFA".
             - RECEITA: Valores positivos, "DEPÓSITO", "CRÉDITO", "SALÁRIO", "PIX RECEBIDO", "ESTORNO".
          4. Categorize em: Alimentação, Saúde, Educação, Lazer, Habitação, Transporte, Contas Fixas, Pensão de Alimentos, Outros.
          5. Converta valores para números positivos absolutos.
          6. Ignore cabeçalhos, saldos totais, limites de crédito ou propagandas presentes no texto.` }]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "Formato AAAA-MM-DD" },
                description: { type: Type.STRING, description: "Descrição limpa da transação" },
                amount: { type: Type.NUMBER, description: "Valor absoluto (ex: 150.50)" },
                type: { type: Type.STRING, description: "RECEITA ou DESPESA" },
                category: { type: Type.STRING, description: "Categoria sugerida" }
              },
              required: ["date", "description", "amount", "type", "category"]
            }
          }
        }
      });
      
      const text = response.text?.trim() || "[]";
      return JSON.parse(text);
    } catch (error) {
      console.error("Erro no parser de extrato:", error);
      throw new Error("A IA não conseguiu ler este formato de extrato. Tente copiar e colar o texto manualmente.");
    }
  }
}
