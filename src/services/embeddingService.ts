import axios from 'axios';
import { logger } from '../utils/logger';
import { cacheService } from './cacheService';
import { ollamaService } from './ollamaService';

interface OpenAIEmbeddingRequest {
  input: string;
  model: string;
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
}

export class EmbeddingService {
  private static instance: EmbeddingService;
  private apiKey: string;
  private baseUrl: string;
  private modelName: string;
  private cacheTTL: number = 86400; // 24 horas em segundos
  private embeddingService: string;

  private constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.baseUrl = 'https://api.openai.com/v1';
    this.modelName = 'text-embedding-3-small';
    this.embeddingService = process.env.EMBEDDING_SERVICE || 'openai';
  }

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  public async getEmbedding(text: string): Promise<number[]> {
    try {
      // Gerar chave de cache baseada no texto e no serviço de embedding
      const cacheKey = `embedding:${this.embeddingService}:${this.hashString(text)}`;
      
      // Tentar obter do cache primeiro
      const cachedEmbedding = await cacheService.get<number[]>(cacheKey);
      if (cachedEmbedding) {
        logger.debug('Embedding encontrado no cache');
        return cachedEmbedding;
      }

      // Se não estiver no cache, gerar novo embedding
      let embedding: number[];
      
      if (this.embeddingService === 'ollama') {
        embedding = await this.getOllamaEmbedding(text);
      } else {
        embedding = await this.getOpenAIEmbedding(text);
      }
      
      // Armazenar no cache
      await cacheService.set(cacheKey, embedding, this.cacheTTL);
      
      return embedding;
    } catch (error) {
      logger.error('Erro ao gerar embedding:', error);
      // Fallback para vetor aleatório em caso de erro (apenas para desenvolvimento)
      return this.generateRandomVector(1536);
    }
  }

  private async getOpenAIEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('API key da OpenAI não encontrada. Configure a variável de ambiente OPENAI_API_KEY.');
    }

    const request: OpenAIEmbeddingRequest = {
      input: text,
      model: this.modelName
    };

    const response = await axios.post<OpenAIEmbeddingResponse>(
      `${this.baseUrl}/embeddings`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0].embedding;
    }
    
    throw new Error('Resposta da OpenAI inválida');
  }

  private async getOllamaEmbedding(text: string): Promise<number[]> {
    return await ollamaService.getEmbedding(text);
  }

  private generateRandomVector(dimensions: number): number[] {
    return Array(dimensions).fill(0).map(() => Math.random());
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converter para 32bit integer
    }
    return hash.toString(16);
  }
}

export const embeddingService = EmbeddingService.getInstance(); 