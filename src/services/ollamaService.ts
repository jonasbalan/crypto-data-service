import axios from 'axios';
import { logger } from '../utils/logger';

interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface OllamaGenerationRequest {
  model: string;
  prompt: string;
  stream: boolean;
  system?: string;
}

interface OllamaGenerationResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export class OllamaService {
  private static instance: OllamaService;
  private baseUrl: string;
  private modelName: string;

  private constructor() {
    const host = process.env.OLLAMA_HOST || 'localhost';
    const port = process.env.OLLAMA_PORT || '11434';
    this.baseUrl = `http://${host}:${port}`;
    this.modelName = process.env.OLLAMA_MODEL || 'llama3';
  }

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  public async getEmbedding(text: string): Promise<number[]> {
    try {
      const request: OllamaEmbeddingRequest = {
        model: this.modelName,
        prompt: text
      };

      logger.info(`Solicitando embedding do Ollama para o modelo ${this.modelName}`);
      
      const response = await axios.post<OllamaEmbeddingResponse>(
        `${this.baseUrl}/api/embeddings`,
        request,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.embedding) {
        logger.info('Embedding obtido com sucesso do Ollama');
        return response.data.embedding;
      }
      
      throw new Error('Resposta do Ollama inválida');
    } catch (error) {
      logger.error('Erro ao gerar embedding com Ollama:', error);
      // Fallback para vetor aleatório em caso de erro (apenas para desenvolvimento)
      return this.generateRandomVector(1536);
    }
  }

  /**
   * Analisa o sentimento de um texto usando o modelo Ollama
   * @param text Texto para analisar
   * @returns Um objeto com o sentimento e score
   */
  public async analyzeSentiment(text: string): Promise<{
    sentiment: 'bullish' | 'bearish' | 'neutral';
    score: number;
    keywords: Array<{ word: string; sentiment: number }>;
  }> {
    try {
      const systemPrompt = `Você é um analista especializado em mercado de criptomoedas.
Analise o texto a seguir e determine o sentimento em relação à criptomoeda mencionada.
Classifique como "bullish" (positivo), "bearish" (negativo) ou "neutral" (neutro).
Forneça um score numérico entre -1 (extremamente negativo) e 1 (extremamente positivo).
Além disso, identifique até 5 palavras-chave e sua influência no sentimento.
Responda apenas no formato JSON abaixo:
{
  "sentiment": "bullish|bearish|neutral",
  "score": número entre -1 e 1,
  "keywords": [
    {"word": "palavra1", "sentiment": número entre -1 e 1},
    {"word": "palavra2", "sentiment": número entre -1 e 1}
  ]
}`;

      const request: OllamaGenerationRequest = {
        model: this.modelName,
        prompt: text,
        stream: false,
        system: systemPrompt
      };

      logger.info(`Solicitando análise de sentimento ao Ollama para: "${text.substring(0, 50)}..."`);
      
      const response = await axios.post<OllamaGenerationResponse>(
        `${this.baseUrl}/api/generate`,
        request,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos de timeout
        }
      );

      if (!response.data || !response.data.response) {
        throw new Error('Resposta do Ollama inválida na análise de sentimento');
      }
      
      // A resposta deve ser um JSON string
      const responseText = response.data.response.trim();
      
      try {
        // Tentar extrair o JSON da resposta
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseText;
        const result = JSON.parse(jsonString);
        
        logger.info(`Análise de sentimento concluída: ${result.sentiment} (${result.score})`);
        
        return {
          sentiment: result.sentiment,
          score: result.score,
          keywords: result.keywords || []
        };
      } catch (parseError) {
        logger.error('Erro ao parsear resposta JSON do Ollama:', parseError);
        logger.debug('Resposta recebida:', responseText);
        
        // Fallback: analisar o texto manualmente para determinar o sentimento
        return this.fallbackSentimentAnalysis(text);
      }
    } catch (error) {
      logger.error('Erro ao analisar sentimento com Ollama:', error);
      return this.fallbackSentimentAnalysis(text);
    }
  }

  /**
   * Método de fallback para análise de sentimento quando o Ollama falha
   */
  private fallbackSentimentAnalysis(text: string): {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    score: number;
    keywords: Array<{ word: string; sentiment: number }>;
  } {
    logger.warn('Usando fallback para análise de sentimento');
    
    // Lista de palavras positivas e negativas para análise básica
    const bullishWords = ['alta', 'subir', 'crescer', 'positivo', 'otimista', 'bull', 'bullish', 'ganho', 'moon', 'hodl', 'comprar'];
    const bearishWords = ['queda', 'cair', 'desvalorizar', 'negativo', 'pessimista', 'bear', 'bearish', 'perda', 'dump', 'vender'];
    
    // Converter para minúsculo para análise
    const lowerText = text.toLowerCase();
    
    // Contar ocorrências
    let bullishCount = 0;
    let bearishCount = 0;
    
    bullishWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) bullishCount += matches.length;
    });
    
    bearishWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) bearishCount += matches.length;
    });
    
    // Calcular score baseado na frequência relativa
    const totalWords = text.split(/\s+/).length;
    const bullishRatio = bullishCount / totalWords;
    const bearishRatio = bearishCount / totalWords;
    
    let score = (bullishRatio - bearishRatio) * 5; // Multiplicar por 5 para amplificar
    score = Math.max(Math.min(score, 1), -1); // Limitar entre -1 e 1
    
    // Determinar sentimento
    let sentiment: 'bullish' | 'bearish' | 'neutral';
    if (score > 0.2) {
      sentiment = 'bullish';
    } else if (score < -0.2) {
      sentiment = 'bearish';
    } else {
      sentiment = 'neutral';
    }
    
    // Extrair palavras-chave mais frequentes
    const words = lowerText.split(/\W+/).filter(w => w.length > 3);
    const wordCount: Record<string, number> = {};
    
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    const keywords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => {
        // Determinar sentimento da palavra
        let wordSentiment = 0;
        if (bullishWords.includes(word)) wordSentiment = 0.7;
        else if (bearishWords.includes(word)) wordSentiment = -0.7;
        
        return {
          word,
          sentiment: wordSentiment
        };
      });
    
    return { sentiment, score, keywords };
  }

  public async pullModel(): Promise<void> {
    try {
      logger.info(`Baixando modelo ${this.modelName} para o Ollama`);
      
      await axios.post(
        `${this.baseUrl}/api/pull`,
        { name: this.modelName },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 minutos de timeout para baixar o modelo
        }
      );
      
      logger.info(`Modelo ${this.modelName} baixado com sucesso`);
    } catch (error) {
      logger.error(`Erro ao baixar modelo ${this.modelName}:`, error);
      throw error;
    }
  }

  private generateRandomVector(dimensions: number): number[] {
    logger.warn('Gerando vetor aleatório como fallback');
    return Array(dimensions).fill(0).map(() => Math.random());
  }
}

export const ollamaService = OllamaService.getInstance(); 