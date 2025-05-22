import { config } from 'dotenv';

// Configurar variáveis de ambiente para teste
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.MILVUS_HOST = 'localhost';
process.env.MILVUS_PORT = '19530';
process.env.MILVUS_USERNAME = 'root';
process.env.MILVUS_PASSWORD = 'Milvus';
process.env.MILVUS_COLLECTION = 'crypto_vectors';
process.env.MILVUS_DIMENSION = '1536';
process.env.MILVUS_INDEX_TYPE = 'HNSW';
process.env.MILVUS_METRIC_TYPE = 'COSINE';
process.env.MILVUS_NLIST = '1024';
process.env.LOG_LEVEL = 'error';

// Configurar timeout global para testes
jest.setTimeout(30000);

// Limpar mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
}); 