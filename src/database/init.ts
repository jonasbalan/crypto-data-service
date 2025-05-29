import mongoose from 'mongoose';
import { Pinecone } from '@pinecone-database/pinecone';
import Redis from 'ioredis';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { logger } from '../utils/logger';

// Cliente do MongoDB
let mongoClient: typeof mongoose | null = null;

// Cliente do Pinecone (banco de dados vetorial)
let pineconeClient: Pinecone | null = null;

// Cliente do Milvus (banco de dados vetorial local)
let milvusClient: MilvusClient | null = null;

// Cliente do Redis para cache
let redisClient: Redis | null = null;

/**
 * Inicializa todas as conexões com bancos de dados
 */
export async function initializeDatabases(): Promise<void> {
  try {
    // Inicializar MongoDB
    await initializeMongo();
    
    // Inicializar banco vetorial (Pinecone ou Milvus)
    await initializeVectorDB();
    
    // Inicializar Redis para cache
    await initializeRedis();
    
    logger.info('Todas as conexões com bancos de dados estabelecidas com sucesso');
  } catch (error) {
    logger.error('Erro ao inicializar bancos de dados:', error);
    throw error;
  }
}

/**
 * Inicializa a conexão com MongoDB
 */
async function initializeMongo(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-data';
    
    mongoClient = await mongoose.connect(mongoUri);
    
    logger.info('Conexão com MongoDB estabelecida com sucesso');
  } catch (error) {
    logger.error('Erro ao conectar ao MongoDB:', error);
    throw error;
  }
}

/**
 * Inicializa o banco vetorial: Pinecone (cloud) ou Milvus (local)
 */
async function initializeVectorDB(): Promise<void> {
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  
  if (pineconeApiKey) {
    try {
      pineconeClient = new Pinecone({ 
        apiKey: pineconeApiKey,
        environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp'
      });
      const indexName = process.env.PINECONE_INDEX || 'crypto-vectors';
      
      // Tentar obter o índice - se não existir, será criado
      try {
        await pineconeClient.describeIndex(indexName);
        logger.info(`Índice Pinecone ${indexName} já existe`);
      } catch (error) {
        logger.info(`Criando índice Pinecone: ${indexName}`);
        await pineconeClient.createIndex({
          name: indexName,
          dimension: 1536,
          metric: 'cosine'
        });
      }
      
      logger.info('Conexão com Pinecone estabelecida com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar Pinecone:', error);
      throw error;
    }
  } else {
    // Usar Milvus como banco vetorial local
    try {
      const milvusHost = process.env.VECTOR_DB_HOST || 'localhost';
      const milvusPort = process.env.VECTOR_DB_PORT || '19530';
      const milvusAddress = `${milvusHost}:${milvusPort}`;
      
      milvusClient = new MilvusClient({ address: milvusAddress });
      
      // Testar conexão com retry
      let retries = 3;
      while (retries > 0) {
        try {
          await milvusClient.showCollections();
          logger.info(`Conexão com Milvus estabelecida com sucesso em ${milvusAddress}`);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            throw error;
          }
          logger.warn(`Tentativa de conexão com Milvus falhou, tentando novamente em 5 segundos... (${retries} tentativas restantes)`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      logger.error('Erro ao conectar ao Milvus:', error);
      throw error;
    }
  }
}

/**
 * Inicializa o cliente Redis para cache
 */
async function initializeRedis(): Promise<void> {
  // Se estiver com SKIP_DATABASE_CONNECTION ativado, não tenta conectar realmente
  if (process.env.SKIP_DATABASE_CONNECTION === 'true') {
    logger.info('SKIP_DATABASE_CONNECTION está ativado, ignorando conexão com Redis');
    return;
  }
  
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    logger.info(`Tentando conectar ao Redis em: ${redisUrl}`);
    
    redisClient = new Redis(redisUrl);
    
    // Verificar conexão
    await redisClient.ping();
    
    logger.info('Conexão com Redis estabelecida com sucesso');
  } catch (error) {
    logger.error('Erro ao conectar ao Redis:', error);
    // Não lançamos o erro aqui para evitar que o serviço falhe se apenas o Redis não estiver disponível
    logger.info('Continuando sem conexão ao Redis.');
  }
}

// Exporta os clientes para uso em outros módulos
export function getMongoClient(): typeof mongoose {
  if (!mongoClient) {
    throw new Error('Cliente MongoDB não foi inicializado');
  }
  return mongoClient;
}

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    throw new Error('Cliente Pinecone não foi inicializado');
  }
  return pineconeClient;
}

export function getMilvusClient(): MilvusClient {
  if (!milvusClient) {
    throw new Error('Cliente Milvus não foi inicializado');
  }
  return milvusClient;
}

export function getRedisClient(): Redis | null {
  if (process.env.SKIP_REDIS_CONNECTION === 'true' || process.env.SKIP_DATABASE_CONNECTION === 'true') {
    return null;
  }
  if (!redisClient) {
    throw new Error('Cliente Redis não foi inicializado');
  }
  return redisClient;
}

// Função principal de inicialização
export async function initializeDatabase(): Promise<void> {
  try {
    if (process.env.SKIP_DATABASE_CONNECTION === 'true') {
      logger.info('SKIP_DATABASE_CONNECTION está ativado, ignorando inicialização de bancos de dados');
      return;
    }
    
    // Inicializa o Redis
    await initializeRedis();

    logger.info('Inicialização de banco de dados concluída');
  } catch (error) {
    logger.error('Erro na inicialização do banco de dados:', error);
    // Não terminamos o processo em caso de erro, apenas registramos
    logger.info('Continuando a execução do servidor apesar de erros na inicialização do banco de dados');
  }
} 