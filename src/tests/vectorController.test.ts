import request from 'supertest';
import { app } from '../index';
import { milvusService } from '../database/milvus';

jest.mock('../database/milvus');

describe('VectorController', () => {
  const mockData = [
    {
      symbol: 'BTC',
      timestamp: 1646092800000,
      price: 50000000,
      volume: 1000000000
    }
  ];

  const mockVector = Array(1536).fill(0).map(() => Math.random());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/vectors/process', () => {
    it('deve processar dados com sucesso', async () => {
      const mockInsert = jest.spyOn(milvusService, 'insert').mockResolvedValue();

      const response = await request(app)
        .post('/api/vectors/process')
        .send({ data: mockData });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ message: 'Dados processados com sucesso' });
      expect(mockInsert).toHaveBeenCalled();
    });

    it('deve retornar erro para dados inválidos', async () => {
      const response = await request(app)
        .post('/api/vectors/process')
        .send({ data: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/vectors/search', () => {
    it('deve buscar vetores com sucesso', async () => {
      const mockResults = [
        { id: 'BTC_123', distance: 0.8, metadata: { symbol: 'BTC' } }
      ];
      jest.spyOn(milvusService, 'search').mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/vectors/search')
        .send({ vector: mockVector, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResults);
    });

    it('deve retornar erro para vetor inválido', async () => {
      const response = await request(app)
        .post('/api/vectors/search')
        .send({ vector: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/vectors/stats', () => {
    it('deve retornar estatísticas com sucesso', async () => {
      const mockStats = {
        row_count: 1000,
        partitions: [{ name: 'default', row_count: 1000 }]
      };
      jest.spyOn(milvusService, 'getCollectionStats').mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/vectors/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
    });

    it('deve lidar com erro ao obter estatísticas', async () => {
      jest.spyOn(milvusService, 'getCollectionStats')
        .mockRejectedValue(new Error('Erro de conexão'));

      const response = await request(app)
        .get('/api/vectors/stats');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 