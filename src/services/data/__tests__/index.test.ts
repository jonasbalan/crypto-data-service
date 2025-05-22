import { DataService, PriceData, VolumeData, OrderBookData } from '../index';

describe('DataService', () => {
  let dataService: DataService;

  beforeEach(() => {
    dataService = DataService.getInstance();
  });

  describe('getPrices', () => {
    it('should return empty array when no prices exist', async () => {
      const prices = await dataService.getPrices('BTC/USD');
      expect(prices).toEqual([]);
    });

    it('should return prices for a symbol', async () => {
      const priceData: PriceData = {
        symbol: 'BTC/USD',
        price: 50000,
        timestamp: Date.now()
      };
      dataService.updatePrice(priceData);
      const prices = await dataService.getPrices('BTC/USD');
      expect(prices).toHaveLength(1);
      expect(prices[0]).toEqual(priceData);
    });
  });

  describe('getVolume', () => {
    it('should return empty array when no volumes exist', async () => {
      const volumes = await dataService.getVolume('BTC/USD');
      expect(volumes).toEqual([]);
    });

    it('should return volumes for a symbol', async () => {
      const volumeData: VolumeData = {
        symbol: 'BTC/USD',
        volume: 1000,
        timestamp: Date.now()
      };
      dataService.updateVolume(volumeData);
      const volumes = await dataService.getVolume('BTC/USD');
      expect(volumes).toHaveLength(1);
      expect(volumes[0]).toEqual(volumeData);
    });
  });

  describe('getOrderBook', () => {
    it('should return null when no order book exists', async () => {
      const orderBook = await dataService.getOrderBook('BTC/USD');
      expect(orderBook).toBeNull();
    });

    it('should return order book for a symbol', async () => {
      const orderBookData: OrderBookData = {
        symbol: 'BTC/USD',
        bids: [[49000, 1], [48900, 2]],
        asks: [[51000, 1], [51100, 2]],
        timestamp: Date.now()
      };
      dataService.updateOrderBook(orderBookData);
      const orderBook = await dataService.getOrderBook('BTC/USD');
      expect(orderBook).toEqual(orderBookData);
    });
  });
}); 