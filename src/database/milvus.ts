import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { milvusConfig } from '../config/milvus';
import { logger } from '../utils/logger';

class MilvusService {
  private client!: MilvusClient;
  private isConnected: boolean = false;
  private skipConnection: boolean = process.env.SKIP_DATABASE_CONNECTION === 'true';

  constructor() {
    // Usar o nome do serviço Docker em vez do localhost
    const host = process.env.MILVUS_HOST || 'milvus';
    const port = process.env.MILVUS_PORT || milvusConfig.port;
    
    logger.info(`Configurando cliente Milvus para conectar a ${host}:${port}`);
    
    this.client = new MilvusClient({
      address: `${host}:${port}`,
      username: milvusConfig.username,
      password: milvusConfig.password
    });
  }

  async connect(): Promise<void> {
    // Se devemos pular a conexão com bancos de dados
    if (this.skipConnection) {
      logger.info('SKIP_DATABASE_CONNECTION está ativado, ignorando conexão com Milvus');
      this.isConnected = true;
      return;
    }
    
    try {
      logger.info('Tentando conectar ao Milvus...');
      await this.client.connect('5000');
      this.isConnected = true;
      logger.info('Conectado ao Milvus com sucesso');
    } catch (error) {
      logger.error('Erro ao conectar ao Milvus:', error);
      // Não lançamos o erro para permitir que o aplicativo continue
      this.isConnected = false;
      logger.info('Continuando sem conexão ao Milvus');
    }
  }

  async createCollection(): Promise<void> {
    if (!this.isConnected || this.skipConnection) {
      logger.info('Milvus não conectado ou em modo skip, ignorando createCollection');
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
      // Não lançamos o erro para permitir que o aplicativo continue
    }
  }

  async insert(vectors: number[][], ids: string[], metadata: any[]): Promise<void> {
    if (!this.isConnected || this.skipConnection) {
      logger.info(`Milvus não conectado ou em modo skip, ignorando inserção de ${vectors.length} vetores`);
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
      // Não lançamos o erro para permitir que o aplicativo continue
    }
  }

  async search(vector: number[], limit: number = 10): Promise<any> {
    if (!this.isConnected || this.skipConnection) {
      logger.info('Milvus não conectado ou em modo skip, retornando resultados vazios para search');
      return {
        status: { code: 0, message: 'success' },
        results: []
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
      // Retornar resultados vazios em caso de erro
      return {
        status: { code: 0, message: 'success' },
        results: []
      };
    }
  }

  async close(): Promise<void> {
    if (!this.isConnected || this.skipConnection) {
      return;
    }
    
    try {
      await this.client.closeConnection();
      this.isConnected = false;
      logger.info('Conexão com Milvus fechada');
    } catch (error) {
      logger.error('Erro ao fechar conexão com Milvus:', error);
    }
  }

  async getCollectionStats(): Promise<any> {
    if (!this.isConnected || this.skipConnection) {
      logger.info('Milvus não conectado ou em modo skip, retornando estatísticas vazias');
      return {
        row_count: 0,
        data_size: 0,
        index_size: 0,
        status: 'unavailable'
      };
    }
    
    try {
      const stats = await this.client.getCollectionStats({
        collection_name: milvusConfig.collectionName
      });
      return stats;
    } catch (error) {
      logger.error('Erro ao obter estatísticas da collection:', error);
      return {
        row_count: 0,
        data_size: 0,
        index_size: 0,
        status: 'error'
      };
    }
  }
}

export const milvusService = new MilvusService(); 