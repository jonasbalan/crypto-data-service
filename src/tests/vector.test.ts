import request from 'supertest';
import { app } from '../index';
import { milvusService } from '../database/milvus';
import { VectorMetadata } from '../types/vector';

describe('Vector Operations', () => {
  const testVector = Array(1536).fill(0).map(() => Math.random());
  const testMetadata: VectorMetadata = {
    symbol: 'BTC',
    timestamp: Date.now(),
    price: 50000,
    volume: 1000000
  };

  beforeAll(async () => {
    await milvusService.connect();
    await milvusService.createCollection();
  });

  afterAll(async () => {
    await milvusService.close();
  });

  describe('POST /api/vectors/insert', () => {
    it('deve inserir vetores com sucesso', async () => {
      const response = await request(app)
        .post('/api/vectors/insert')
        .send({
          vectors: [testVector],
          metadata: [testMetadata]
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Vetores inseridos com sucesso');
      expect(response.body).toHaveProperty('count', 1);
    });

    it('deve retornar erro para dados inválidos', async () => {
      const response = await request(app)
        .post('/api/vectors/insert')
        .send({
          vectors: [testVector],
          metadata: [] // Metadata vazio
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/vectors/search', () => {
    it('deve buscar vetores com sucesso', async () => {
      const response = await request(app)
        .post('/api/vectors/search')
        .send({
          vector: testVector,
          limit: 5
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('deve retornar erro para vetor inválido', async () => {
      const response = await request(app)
        .post('/api/vectors/search')
        .send({
          vector: 'invalid',
          limit: 5
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 