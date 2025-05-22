import { logger } from '../../utils/logger';
import { httpRequestDuration } from '../../metrics';

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface VolumeData {
  symbol: string;
  volume: number;
  timestamp: number;
}

export interface OrderBookData {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

export class DataService {
  private static instance: DataService;
  private prices: Map<string, PriceData[]>;
  private volumes: Map<string, VolumeData[]>;
  private orderBooks: Map<string, OrderBookData[]>;

  private constructor() {
    this.prices = new Map();
    this.volumes = new Map();
    this.orderBooks = new Map();
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  public async getPrices(symbol: string, limit: number = 100): Promise<PriceData[]> {
    try {
      const start = Date.now();
      const prices = this.prices.get(symbol) || [];
      const result = prices.slice(-limit);
      
      const duration = (Date.now() - start) / 1000;
      httpRequestDuration
        .labels('GET', '/api/v1/prices', '200')
        .observe(duration);

      return result;
    } catch (error) {
      logger.error('Erro ao buscar preços:', error);
      throw error;
    }
  }

  public async getVolume(symbol: string, limit: number = 100): Promise<VolumeData[]> {
    try {
      const start = Date.now();
      const volumes = this.volumes.get(symbol) || [];
      const result = volumes.slice(-limit);
      
      const duration = (Date.now() - start) / 1000;
      httpRequestDuration
        .labels('GET', '/api/v1/volume', '200')
        .observe(duration);

      return result;
    } catch (error) {
      logger.error('Erro ao buscar volumes:', error);
      throw error;
    }
  }

  public async getOrderBook(symbol: string): Promise<OrderBookData | null> {
    try {
      const start = Date.now();
      const orderBooks = this.orderBooks.get(symbol) || [];
      const result = orderBooks[orderBooks.length - 1] || null;
      
      const duration = (Date.now() - start) / 1000;
      httpRequestDuration
        .labels('GET', '/api/v1/orderbook', '200')
        .observe(duration);

      return result;
    } catch (error) {
      logger.error('Erro ao buscar ordem book:', error);
      throw error;
    }
  }

  public updatePrice(data: PriceData): void {
    try {
      const prices = this.prices.get(data.symbol) || [];
      prices.push(data);
      this.prices.set(data.symbol, prices);
    } catch (error) {
      logger.error('Erro ao atualizar preço:', error);
      throw error;
    }
  }

  public updateVolume(data: VolumeData): void {
    try {
      const volumes = this.volumes.get(data.symbol) || [];
      volumes.push(data);
      this.volumes.set(data.symbol, volumes);
    } catch (error) {
      logger.error('Erro ao atualizar volume:', error);
      throw error;
    }
  }

  public updateOrderBook(data: OrderBookData): void {
    try {
      const orderBooks = this.orderBooks.get(data.symbol) || [];
      orderBooks.push(data);
      this.orderBooks.set(data.symbol, orderBooks);
    } catch (error) {
      logger.error('Erro ao atualizar ordem book:', error);
      throw error;
    }
  }
} 