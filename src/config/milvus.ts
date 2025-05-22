import { config } from 'dotenv';

config();

export const milvusConfig = {
  host: process.env.MILVUS_HOST || 'localhost',
  port: parseInt(process.env.MILVUS_PORT || '19530'),
  username: process.env.MILVUS_USERNAME || '',
  password: process.env.MILVUS_PASSWORD || '',
  collectionName: process.env.MILVUS_COLLECTION || 'crypto_data',
  dimension: 1536, // Dimensão padrão para embeddings
  indexType: 'IVF_FLAT',
  metricType: 'L2',
  nlist: 1024
}; 