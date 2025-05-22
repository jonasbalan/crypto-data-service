import { CacheService, cacheService } from '../services/cacheService';
import Redis from 'ioredis';

// Mock do Redis - precisamos defini-lo antes da importação ser avaliada
jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    quit: jest.fn()
  }));
  
  return mockRedis;
});

describe('CacheService', () => {
  let mockRedisInstance: any;
  
  // Reset do singleton e mocks
  beforeEach(() => {
    jest.clearAllMocks();
    // Forçar reset do singleton
    (CacheService as any).instance = undefined;
    
    // Obter a instância do mock
    const service = CacheService.getInstance();
    mockRedisInstance = (service as any).client;
    // Marcar como conectado
    (service as any).isConnected = true;
  });

  describe('set', () => {
    it('deve armazenar valor no cache', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');

      const service = CacheService.getInstance();
      await service.set('test-key', { data: 'test-value' });
      
      expect(mockRedisInstance.setex).toHaveBeenCalled();
      // Verificar se o prefixo foi aplicado corretamente
      expect(mockRedisInstance.setex.mock.calls[0][0]).toContain('test-key');
      // Verificar se os dados foram serializados corretamente
      expect(mockRedisInstance.setex.mock.calls[0][2]).toContain('test-value');
    });
    
    it('deve lidar com erros ao armazenar no cache', async () => {
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis error'));
      
      const service = CacheService.getInstance();
      // Deve retornar silenciosamente em caso de erro
      await expect(service.set('test-key', { data: 'test-value' })).resolves.toBeUndefined();
    });
  });

  describe('get', () => {
    it('deve retornar valor do cache quando existe', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({ data: 'cached-value' }));
      
      const service = CacheService.getInstance();
      const result = await service.get('test-key');
      
      expect(mockRedisInstance.get).toHaveBeenCalled();
      expect(result).toEqual({ data: 'cached-value' });
    });
    
    it('deve retornar null quando a chave não existe', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      
      const service = CacheService.getInstance();
      const result = await service.get('non-existent-key');
      
      expect(mockRedisInstance.get).toHaveBeenCalled();
      expect(result).toBeNull();
    });
    
    it('deve lidar com erros ao buscar do cache', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis error'));
      
      const service = CacheService.getInstance();
      const result = await service.get('test-key');
      
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('deve remover chave do cache', async () => {
      mockRedisInstance.del.mockResolvedValue(1);
      
      const service = CacheService.getInstance();
      await service.delete('test-key');
      
      expect(mockRedisInstance.del).toHaveBeenCalled();
    });
    
    it('deve lidar com erros ao remover do cache', async () => {
      mockRedisInstance.del.mockRejectedValue(new Error('Redis error'));
      
      const service = CacheService.getInstance();
      await expect(service.delete('test-key')).resolves.toBeUndefined();
    });
  });
}); 