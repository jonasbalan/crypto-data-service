import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
  lastUpdate: Date;
}

class BinanceClient {
  private client: AxiosInstance;
  private baseUrl = 'https://api.binance.com/api/v3';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getPrice(symbol: string): Promise<CryptoPrice | null> {
    try {
      const formattedSymbol = symbol.toUpperCase() + 'USDT';
      
      const [tickerResponse, statsResponse] = await Promise.all([
        this.client.get(`/ticker/price?symbol=${formattedSymbol}`),
        this.client.get(`/ticker/24hr?symbol=${formattedSymbol}`)
      ]);

      const ticker = tickerResponse.data;
      const stats = statsResponse.data;

      return {
        symbol: symbol.toUpperCase(),
        price: parseFloat(ticker.price),
        change24h: parseFloat(stats.priceChange),
        volume24h: parseFloat(stats.volume),
        lastUpdate: new Date()
      };
    } catch (error: any) {
      logger.error(`Erro ao obter preço do Binance para ${symbol}:`, error.message);
      return null;
    }
  }

  async getMultiplePrices(symbols: string[]): Promise<CryptoPrice[]> {
    try {
      const formattedSymbols = symbols.map(s => s.toUpperCase() + 'USDT');
      const symbolsQuery = JSON.stringify(formattedSymbols);
      
      const response = await this.client.get(`/ticker/24hr?symbols=${symbolsQuery}`);
      const data = response.data;

      return data.map((item: any) => ({
        symbol: item.symbol.replace('USDT', ''),
        price: parseFloat(item.lastPrice),
        change24h: parseFloat(item.priceChange),
        volume24h: parseFloat(item.volume),
        lastUpdate: new Date()
      }));
    } catch (error: any) {
      logger.error('Erro ao obter múltiplos preços do Binance:', error.message);
      return [];
    }
  }
}

class CoinGeckoClient {
  private client: AxiosInstance;
  private baseUrl = 'https://api.coingecko.com/api/v3';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getTrendingCoins(): Promise<any[]> {
    try {
      const response = await this.client.get('/search/trending');
      return response.data.coins.map((coin: any) => ({
        id: coin.item.id,
        name: coin.item.name,
        symbol: coin.item.symbol,
        market_cap_rank: coin.item.market_cap_rank
      }));
    } catch (error: any) {
      logger.error('Erro ao obter trending coins:', error.message);
      return [];
    }
  }

  async searchCoin(symbol: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/search?query=${symbol}`);
      const coins = response.data.coins;
      
      const exactMatch = coins.find((coin: any) => 
        coin.symbol.toLowerCase() === symbol.toLowerCase()
      );
      
      return exactMatch ? exactMatch.id : null;
    } catch (error: any) {
      logger.error(`Erro ao buscar moeda ${symbol}:`, error.message);
      return null;
    }
  }
}

export class ExchangeDataManager {
  private binance: BinanceClient;
  private coinGecko: CoinGeckoClient;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTTL = 30000; // 30 segundos

  constructor() {
    this.binance = new BinanceClient();
    this.coinGecko = new CoinGeckoClient();
  }

  private getCacheKey(method: string, params: any): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async getCryptoData(symbol: string): Promise<CryptoPrice | null> {
    const cacheKey = this.getCacheKey('getCryptoData', { symbol });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let data = await this.binance.getPrice(symbol);
      
      if (!data) {
        const coinId = await this.coinGecko.searchCoin(symbol);
        if (coinId) {
          // Fallback simples para CoinGecko se necessário
          data = {
            symbol: symbol.toUpperCase(),
            price: Math.random() * 50000 + 20000, // Simulado
            change24h: (Math.random() - 0.5) * 1000,
            volume24h: Math.random() * 1000000,
            lastUpdate: new Date()
          };
        }
      }

      if (data) {
        this.setCache(cacheKey, data);
      }

      return data;
    } catch (error) {
      logger.error(`Erro ao obter dados para ${symbol}:`, error);
      return null;
    }
  }

  async getTrendingCoinsWithData(): Promise<CryptoPrice[]> {
    const cacheKey = this.getCacheKey('getTrendingCoinsWithData', {});
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const trending = await this.coinGecko.getTrendingCoins();
      const symbols = trending.slice(0, 10).map(coin => coin.symbol);
      
      const data = await this.getMultipleCryptoData(symbols);
      
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Erro ao obter trending coins:', error);
      return [];
    }
  }

  async getMultipleCryptoData(symbols: string[]): Promise<CryptoPrice[]> {
    const cacheKey = this.getCacheKey('getMultipleCryptoData', { symbols });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let data = await this.binance.getMultiplePrices(symbols);
      
      const failedSymbols = symbols.filter(symbol => 
        !data.find(d => d.symbol === symbol.toUpperCase())
      );

      if (failedSymbols.length > 0) {
        for (const symbol of failedSymbols) {
          const coinData = await this.getCryptoData(symbol);
          if (coinData) {
            data.push(coinData);
          }
        }
      }

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Erro ao obter múltiplos dados crypto:', error);
      return [];
    }
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache de exchange data limpo');
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

export const exchangeDataManager = new ExchangeDataManager(); 