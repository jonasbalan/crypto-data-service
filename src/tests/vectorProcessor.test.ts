import { vectorProcessor } from '../services/vectorProcessor';
import { milvusService } from '../database/milvus';
import { VectorMetadata } from '../types/vector';

jest.mock('../database/milvus');

describe('VectorProcessor', () => {
  const mockData = [
    {
      symbol: 'BTC',
      timestamp: 1646092800000,
      price: 50000000,
      volume: 1000000000
    },
    {
      symbol: 'ETH',
      timestamp: 1646092800000,
      price: 3000000,
      volume: 500000000
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processMarketData', () => {
    it('deve processar dados do mercado com sucesso', async () => {
      const mockInsert = jest.spyOn(milvusService, 'insert').mockResolvedValue();

      await vectorProcessor.processMarketData(mockData);

      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.arrayContaining([expect.any(Number)])
        ]),
        expect.arrayContaining([
          expect.stringMatching(/^(BTC|ETH)_\d+$/)
        ]),
        expect.arrayContaining([
          expect.objectContaining({
            symbol: expect.any(String),
            timestamp: expect.any(Number),
            price: expect.any(Number),
            volume: expect.any(Number)
          })
        ])
      );
    });

    it('deve normalizar dados corretamente', async () => {
      const mockInsert = jest.spyOn(milvusService, 'insert').mockResolvedValue();
      const testData = [{
        symbol: 'BTC',
        timestamp: 1646092800000,
        price: 50000000,
        volume: 1000000000
      }];

      await vectorProcessor.processMarketData(testData);

      const [vectors, ids, metadata] = mockInsert.mock.calls[0];
      
      expect(metadata[0]).toEqual({
        symbol: 'BTC',
        timestamp: 1646092800000,
        price: 50000000,
        volume: 1000000000
      });
    });

    it('deve gerar vetores com dimensão correta', async () => {
      const mockInsert = jest.spyOn(milvusService, 'insert').mockResolvedValue();
      const testData = [{
        symbol: 'BTC',
        timestamp: 1646092800000,
        price: 50000000,
        volume: 1000000000
      }];

      await vectorProcessor.processMarketData(testData);

      const [vectors] = mockInsert.mock.calls[0];
      expect(vectors[0]).toHaveLength(1536);
    });

    it('deve lidar com erro durante o processamento', async () => {
      const mockError = new Error('Erro de conexão');
      jest.spyOn(milvusService, 'insert').mockRejectedValue(mockError);

      await expect(vectorProcessor.processMarketData(mockData))
        .rejects
        .toThrow('Erro de conexão');
    });
  });
}); 