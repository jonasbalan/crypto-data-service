import { logger } from '../utils/logger';
import { milvusService } from '../database/milvus';
import { embeddingService } from './embeddingService';
import { VectorMetadata } from '../types/vector';

export class VectorProcessor {
  private static instance: VectorProcessor;

  private constructor() {}

  public static getInstance(): VectorProcessor {
    if (!VectorProcessor.instance) {
      VectorProcessor.instance = new VectorProcessor();
    }
    return VectorProcessor.instance;
  }

  public async processMarketData(data: any[]): Promise<void> {
    try {
      const vectors: number[][] = [];
      const metadata: VectorMetadata[] = [];
      const ids: string[] = [];

      for (const item of data) {
        // Normalizar dados
        const normalizedData = this.normalizeData(item);
        
        // Gerar texto para embedding
        const embeddingText = this.generateEmbeddingText(item);

        // Obter embedding usando o serviço
        const vector = await embeddingService.getEmbedding(embeddingText);
        
        // Criar metadata
        const metadataItem: VectorMetadata = {
          symbol: item.symbol,
          timestamp: item.timestamp,
          price: item.price,
          volume: item.volume
        };

        vectors.push(vector);
        metadata.push(metadataItem);
        ids.push(`${item.symbol}_${item.timestamp}`);
      }

      // Inserir no Milvus
      await milvusService.insert(vectors, ids, metadata);
      logger.info(`Processados ${vectors.length} vetores com sucesso`);
    } catch (error) {
      logger.error('Erro ao processar dados do mercado:', error);
      throw error;
    }
  }

  private normalizeData(data: any): any {
    // Implementar normalização de dados
    return {
      price: data.price / 1000000, // Normalizar preço
      volume: data.volume / 1000000000, // Normalizar volume
      timestamp: data.timestamp / 1000000000000 // Normalizar timestamp
    };
  }

  private generateEmbeddingText(data: any): string {
    // Gerar texto descritivo para embedding
    return `Moeda: ${data.symbol}, Preço: ${data.price}, Volume: ${data.volume}, Timestamp: ${data.timestamp}`;
  }
}

export const vectorProcessor = VectorProcessor.getInstance(); 