import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { milvusConfig } from '../config/milvus';
import { logger } from '../utils/logger';

class MilvusService {
  private client: MilvusClient;
  private isConnected: boolean = false;
  private skipConnection: boolean = process.env.SKIP_DATABASE_CONNECTION === 'true';

  constructor() {
    this.client = new MilvusClient({
      address: `${milvusConfig.host}:${milvusConfig.port}`,
      username: milvusConfig.username,
      password: milvusConfig.password
    });
    
    if (this.skipConnection) {
      logger.info('MilvusService: Operando em modo de simulação (SKIP_DATABASE_CONNECTION=true)');
    }
  }

  async connect(): Promise<void> {
    // Se estiver em modo de simulação, não tenta conectar realmente
    if (this.skipConnection) {
      this.isConnected = true;
      logger.info('MilvusService: Simulando conexão ao Milvus (modo mock)');
      return;
    }
    
    try {
      await this.client.connect('5000');
      this.isConnected = true;
      logger.info('Conectado ao Milvus com sucesso');
    } catch (error) {
      logger.error('Erro ao conectar ao Milvus:', error);
      throw error;
    }
  }

  async createCollection(): Promise<void> {
    // Se estiver em modo de simulação, não cria collection
    if (this.skipConnection) {
      logger.info('MilvusService: Simulando criação de collection (modo mock)');
      return;
    }
    
    try {
      const exists = await this.client.hasCollection({
        collection_name: milvusConfig.collectionName
      });

      if (!exists) {
        await this.client.createCollection({
          collection_name: milvusConfig.collectionName,
          fields: [
            {
              name: 'id',
              data_type: 'VarChar',
              is_primary_key: true,
              max_length: 100
            },
            {
              name: 'embedding',
              data_type: 'FloatVector',
              dim: milvusConfig.dimension
            },
            {
              name: 'metadata',
              data_type: 'JSON'
            }
          ]
        });

        await this.client.createIndex({
          collection_name: milvusConfig.collectionName,
          field_name: 'embedding',
          index_type: milvusConfig.indexType,
          metric_type: milvusConfig.metricType,
          params: { nlist: milvusConfig.nlist }
        });

        logger.info('Collection criada com sucesso');
      }
    } catch (error) {
      logger.error('Erro ao criar collection:', error);
      throw error;
    }
  }

  async insert(vectors: number[][], ids: string[], metadata: any[]): Promise<void> {
    // Se estiver em modo de simulação, não insere realmente
    if (this.skipConnection) {
      logger.info(`MilvusService: Simulando inserção de ${vectors.length} vetores (modo mock)`);
      return;
    }
    
    try {
      await this.client.insert({
        collection_name: milvusConfig.collectionName,
        fields_data: ids.map((id, index) => ({
          id,
          embedding: vectors[index],
          metadata: metadata[index]
        }))
      });
    } catch (error) {
      logger.error('Erro ao inserir dados:', error);
      throw error;
    }
  }

  async search(vector: number[], limit: number = 10): Promise<any> {
    // Se estiver em modo de simulação, retorna dados simulados
    if (this.skipConnection) {
      logger.info('MilvusService: Simulando busca de vetores (modo mock)');
      return {
        status: { code: 0, message: 'success' },
        results: Array(limit).fill(0).map((_, index) => ({
          id: `mock_id_${index}`,
          score: 0.9 - (index * 0.05),
          metadata: { mock: true }
        }))
      };
    }
    
    try {
      const results = await this.client.search({
        collection_name: milvusConfig.collectionName,
        vector,
        limit,
        output_fields: ['id', 'metadata']
      });
      return results;
    } catch (error) {
      logger.error('Erro ao buscar dados:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // Se estiver em modo de simulação, não faz nada
    if (this.skipConnection) {
      this.isConnected = false;
      logger.info('MilvusService: Simulando fechamento de conexão (modo mock)');
      return;
    }
    
    if (this.isConnected) {
      await this.client.closeConnection();
      this.isConnected = false;
      logger.info('Conexão com Milvus fechada');
    }
  }

  async getCollectionStats(): Promise<any> {
    // Se estiver em modo de simulação, retorna estatísticas simuladas
    if (this.skipConnection) {
      logger.info('MilvusService: Simulando estatísticas de collection (modo mock)');
      return {
        row_count: 1000,
        data_size: 1024 * 1024 * 10, // 10MB simulados
        index_size: 1024 * 1024 * 2,  // 2MB simulados
        status: 'normal'
      };
    }
    
    try {
      const stats = await this.client.getCollectionStats({
        collection_name: milvusConfig.collectionName
      });
      return stats;
    } catch (error) {
      logger.error('Erro ao obter estatísticas da collection:', error);
      throw error;
    }
  }
}

export const milvusService = new MilvusService(); 