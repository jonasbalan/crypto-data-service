import { getMilvusClient, initializeDatabases } from '../database/init';
import { logger } from '../utils/logger';

async function insertTestData() {
  try {
    // Inicializar banco de dados
    await initializeDatabases();
    
    const milvus = getMilvusClient();
    const collectionName = 'crypto_vectors';

    // Criar coleção se não existir
    try {
      await milvus.createCollection({
        collection_name: collectionName,
        fields: [
          {
            name: 'id',
            data_type: 'VarChar',
            is_primary_key: true,
            max_length: 100
          },
          {
            name: 'vector',
            data_type: 'FloatVector',
            dim: 1536
          },
          {
            name: 'symbol',
            data_type: 'VarChar',
            max_length: 10
          },
          {
            name: 'type',
            data_type: 'VarChar',
            max_length: 20
          },
          {
            name: 'timestamp',
            data_type: 'VarChar',
            max_length: 30
          },
          {
            name: 'metadata',
            data_type: 'JSON'
          }
        ]
      });
      logger.info(`Coleção ${collectionName} criada com sucesso`);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        logger.info(`Coleção ${collectionName} já existe`);
      } else {
        throw error;
      }
    }

    // Criar índice para busca por similaridade
    try {
      await milvus.createIndex({
        collection_name: collectionName,
        field_name: 'vector',
        index_type: 'IVF_FLAT',
        metric_type: 'COSINE',
        params: { nlist: 1024 }
      });
      logger.info('Índice criado com sucesso');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        logger.info('Índice já existe');
      } else {
        throw error;
      }
    }

    // Dados de exemplo
    const testData = [
      {
        id: 'BTC:price:1',
        vector: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
        symbol: 'BTC',
        type: 'price',
        timestamp: new Date().toISOString(),
        metadata: {
          price: 50000,
          volume24h: 25000000000,
          change24h: 2.5
        }
      },
      {
        id: 'ETH:price:1',
        vector: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
        symbol: 'ETH',
        type: 'price',
        timestamp: new Date().toISOString(),
        metadata: {
          price: 3000,
          volume24h: 15000000000,
          change24h: 1.8
        }
      },
      {
        id: 'BTC:social:1',
        vector: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
        symbol: 'BTC',
        type: 'social',
        timestamp: new Date().toISOString(),
        metadata: {
          sentiment: 0.75,
          postCount: 15000,
          engagementScore: 0.85
        }
      }
    ];

    // Normalizar vetores
    const normalizedData = testData.map(data => {
      const magnitude = Math.sqrt(data.vector.reduce((sum, val) => sum + val * val, 0));
      return {
        ...data,
        vector: data.vector.map(val => val / magnitude)
      };
    });

    // Inserir dados
    await milvus.insert({
      collection_name: collectionName,
      data: normalizedData
    });

    logger.info('Dados de teste inseridos com sucesso');

    // Carregar coleção
    await milvus.loadCollection({
      collection_name: collectionName
    });

    logger.info('Coleção carregada com sucesso');

  } catch (error) {
    logger.error('Erro ao inserir dados de teste:', error);
    throw error;
  }
}

// Executar script
insertTestData()
  .then(() => {
    logger.info('Script concluído com sucesso');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Erro ao executar script:', error);
    process.exit(1);
  }); 