
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
   * Limpa a string de resposta para garantir um JSON puro.
   */
  private static cleanJsonString(input: string): string {
    // Remove blocos de código markdown e espaços em branco extras
    let cleaned = input.replace(/```json/g, "").replace(/```/g, "").trim();
    // Tenta encontrar o primeiro '[' e o último ']' para isolar o array caso haja lixo ao redor
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
    }
    return cleaned;
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
          systemInstruction: `Você é o FamilyFinance AI, especialista em coparentalidade e finanças. 
          CONTEXTO: ${context}. Responda em Português do Brasil com tom profissional e empático.`,
          temperature: 0.7,
        }
      });

      return response.text || "Desculpe, não consegui processar sua resposta agora.";
    } catch (error: any) {
      console.error("Erro na Gemini API (Chat):", error);
      return "Ocorreu um erro técnico ao tentar falar com a IA.";
    }
  }

  /**
   * Analisa extratos usando Gemini 3 Pro com Thinking para máxima precisão de OCR.
   */
  static async parseStatement(input: StatementInput): Promise<any[]> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentYear = new Date().getFullYear();
      
      const parts: any[] = [];
      
      if (input.text) {
        parts.push({ text: `Extraia transações deste extrato em texto: "${input.text}"` });
      } else if (input.file) {
        parts.push({
          inlineData: {
            mimeType: input.file.mimeType,
            data: input.file.data
          }
        });
        parts.push({ text: "Analise este documento bancário. Ignore o layout visual e foque em extrair a lista de transações (Data, Descrição, Valor)." });
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts },
        config: {
          thinkingConfig: { thinkingBudget: 4000 }, // Habilita o raciocínio para layouts complexos
          systemInstruction: `Você é um motor de OCR bancário especializado em extratos brasileiros (Itaú, Bradesco, Santander, BB, Caixa, Nubank, Inter).
          
          SUA TAREFA:
          1. Identificar TODAS as transações financeiras.
          2. Ignorar saldos, limites, rodapés e propagandas.
          3. Converter datas para o formato ISO AAAA-MM-DD (Ano atual: ${currentYear}).
          4. Categorizar inteligentemente (Alimentação, Saúde, Educação, Lazer, Habitação, Transporte, Contas Fixas, Pensão de Alimentos, Outros).
          5. 'type' deve ser 'RECEITA' para créditos e 'DESPESA' para débitos.
          6. 'amount' deve ser um número positivo (a distinção será pelo 'type').
          
          REGRAS DE OURO:
          - Se o documento tiver colunas, leia linha por linha.
          - Se houver dúvida sobre o valor, use o valor numérico mais provável.
          - RESPONDA APENAS O ARRAY JSON. SEM MARKDOWN. SEM TEXTO ADICIONAL.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "Data no formato AAAA-MM-DD" },
                description: { type: Type.STRING, description: "Descrição limpa da transação" },
                amount: { type: Type.NUMBER, description: "Valor absoluto (sem sinal)" },
                type: { type: Type.STRING, description: "RECEITA ou DESPESA" },
                category: { type: Type.STRING, description: "Categoria da transação" }
              },
              required: ["date", "description", "amount", "type", "category"]
            }
          }
        }
      });
      
      const rawResponse = response.text;
      console.debug("Raw Gemini Response:", rawResponse); // LOG DE DEPURAÇÃO

      if (!rawResponse) {
        throw new Error("A IA retornou uma resposta vazia.");
      }

      const sanitizedJson = this.cleanJsonString(rawResponse);
      return JSON.parse(sanitizedJson);
    } catch (error: any) {
      console.error("Erro no parser multimodal (Gemini):", error);
      
      // Mensagem de erro mais rica para o usuário
      if (error.message?.includes("Safety")) {
        throw new Error("O documento foi bloqueado pelos filtros de segurança da IA. Tente carregar uma versão sem dados sensíveis como CPF exposto.");
      }
      
      throw new Error("Não foi possível processar este documento. Verifique se o PDF está legível ou tente copiar o texto e colar na área de texto abaixo.");
    }
  }
}
