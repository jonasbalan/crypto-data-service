import { logger } from '../utils/logger';

export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SentimentData {
  timestamp: number;
  symbol: string;
  score: number;
  confidence: number;
  positive: number;
  negative: number;
  neutral: number;
  sources: number;
}

export interface TechnicalIndicator {
  timestamp: number;
  rsi: number;
  macd: number;
  signal: number;
  histogram: number;
  sma20: number;
  sma50: number;
  bollinger_upper: number;
  bollinger_lower: number;
}

class HistoricalDataService {
  private priceCache: Map<string, PriceData[]> = new Map();
  private sentimentCache: Map<string, SentimentData[]> = new Map();
  private technicalCache: Map<string, TechnicalIndicator[]> = new Map();

  /**
   * Gera dados históricos de preço simulados
   */
  generatePriceHistory(symbol: string, days: number = 30, basePrice: number = 50000): PriceData[] {
    const cacheKey = `${symbol}-${days}-${basePrice}`;
    
    if (this.priceCache.has(cacheKey)) {
      return this.priceCache.get(cacheKey)!;
    }

    const data: PriceData[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    let currentPrice = basePrice;
    
    for (let i = days; i >= 0; i--) {
      const timestamp = now - (i * dayMs);
      
      // Simular volatilidade realística
      const volatility = 0.05; // 5% de volatilidade diária
      const trend = Math.sin(i / 10) * 0.02; // Tendência suave
      const randomChange = (Math.random() - 0.5) * volatility;
      
      const priceChange = trend + randomChange;
      const newPrice = currentPrice * (1 + priceChange);
      
      // Gerar OHLC realístico
      const high = newPrice * (1 + Math.random() * 0.02);
      const low = newPrice * (1 - Math.random() * 0.02);
      const open = currentPrice;
      const close = newPrice;
      
      // Volume simulado
      const baseVolume = 1000000;
      const volumeVariation = Math.random() * 0.5 + 0.75; // 75% - 125% do volume base
      const volume = baseVolume * volumeVariation;
      
      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
      
      currentPrice = newPrice;
    }
    
    this.priceCache.set(cacheKey, data);
    logger.debug(`Generated ${data.length} price data points for ${symbol}`);
    
    return data;
  }

  /**
   * Gera dados históricos de sentimento simulados
   */
  generateSentimentHistory(symbol: string, days: number = 30): SentimentData[] {
    const cacheKey = `${symbol}-${days}`;
    
    if (this.sentimentCache.has(cacheKey)) {
      return this.sentimentCache.get(cacheKey)!;
    }

    const data: SentimentData[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let i = days; i >= 0; i--) {
      const timestamp = now - (i * dayMs);
      
      // Simular sentimento com tendências
      const baseSentiment = Math.sin(i / 7) * 0.3; // Ciclo semanal
      const noise = (Math.random() - 0.5) * 0.4;
      const score = Math.max(-1, Math.min(1, baseSentiment + noise));
      
      // Distribuir entre positivo, negativo e neutro
      const confidence = 0.6 + Math.random() * 0.3; // 60-90% de confiança
      
      let positive, negative, neutral;
      if (score > 0.1) {
        positive = 40 + score * 30 + Math.random() * 10;
        negative = 20 + Math.random() * 15;
        neutral = 100 - positive - negative;
      } else if (score < -0.1) {
        negative = 40 + Math.abs(score) * 30 + Math.random() * 10;
        positive = 20 + Math.random() * 15;
        neutral = 100 - positive - negative;
      } else {
        neutral = 50 + Math.random() * 20;
        positive = (100 - neutral) * (0.5 + Math.random() * 0.3);
        negative = 100 - neutral - positive;
      }
      
      const sources = Math.floor(50 + Math.random() * 100); // 50-150 fontes
      
      data.push({
        timestamp,
        symbol,
        score: Number(score.toFixed(3)),
        confidence: Number(confidence.toFixed(3)),
        positive: Number(positive.toFixed(1)),
        negative: Number(negative.toFixed(1)),
        neutral: Number(neutral.toFixed(1)),
        sources
      });
    }
    
    this.sentimentCache.set(cacheKey, data);
    logger.debug(`Generated ${data.length} sentiment data points for ${symbol}`);
    
    return data;
  }

  /**
   * Gera indicadores técnicos simulados
   */
  generateTechnicalIndicators(symbol: string, priceData: PriceData[]): TechnicalIndicator[] {
    const cacheKey = `${symbol}-tech-${priceData.length}`;
    
    if (this.technicalCache.has(cacheKey)) {
      return this.technicalCache.get(cacheKey)!;
    }

    const data: TechnicalIndicator[] = [];
    
    for (let i = 0; i < priceData.length; i++) {
      const price = priceData[i];
      
      // RSI simulado (0-100)
      const rsi = 30 + Math.random() * 40 + Math.sin(i / 5) * 15;
      
      // MACD simulado
      const macd = (Math.random() - 0.5) * price.close * 0.001;
      const signal = macd * (0.8 + Math.random() * 0.4);
      const histogram = macd - signal;
      
      // Médias móveis simuladas
      const sma20 = price.close * (0.98 + Math.random() * 0.04);
      const sma50 = price.close * (0.95 + Math.random() * 0.1);
      
      // Bandas de Bollinger simuladas
      const bollinger_upper = price.close * (1.02 + Math.random() * 0.02);
      const bollinger_lower = price.close * (0.98 - Math.random() * 0.02);
      
      data.push({
        timestamp: price.timestamp,
        rsi: Number(rsi.toFixed(2)),
        macd: Number(macd.toFixed(4)),
        signal: Number(signal.toFixed(4)),
        histogram: Number(histogram.toFixed(4)),
        sma20: Number(sma20.toFixed(2)),
        sma50: Number(sma50.toFixed(2)),
        bollinger_upper: Number(bollinger_upper.toFixed(2)),
        bollinger_lower: Number(bollinger_lower.toFixed(2))
      });
    }
    
    this.technicalCache.set(cacheKey, data);
    logger.debug(`Generated ${data.length} technical indicators for ${symbol}`);
    
    return data;
  }

  /**
   * Obtém dados de preço para um símbolo
   */
  async getPriceData(symbol: string, timeRange: string = '30d'): Promise<PriceData[]> {
    const days = this.parseTimeRange(timeRange);
    const basePrice = this.getBasePrice(symbol);
    
    return this.generatePriceHistory(symbol, days, basePrice);
  }

  /**
   * Obtém dados de sentimento para um símbolo
   */
  async getSentimentData(symbol: string, timeRange: string = '30d'): Promise<SentimentData[]> {
    const days = this.parseTimeRange(timeRange);
    
    return this.generateSentimentHistory(symbol, days);
  }

  /**
   * Obtém indicadores técnicos para um símbolo
   */
  async getTechnicalData(symbol: string, timeRange: string = '30d'): Promise<TechnicalIndicator[]> {
    const priceData = await this.getPriceData(symbol, timeRange);
    
    return this.generateTechnicalIndicators(symbol, priceData);
  }

  /**
   * Converte string de tempo em número de dias
   */
  private parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/(\d+)([hdwmy])/);
    if (!match) return 30;
    
    const [, num, unit] = match;
    const value = parseInt(num);
    
    switch (unit) {
      case 'h': return Math.max(1, Math.floor(value / 24));
      case 'd': return value;
      case 'w': return value * 7;
      case 'm': return value * 30;
      case 'y': return value * 365;
      default: return 30;
    }
  }

  /**
   * Obtém preço base para diferentes símbolos
   */
  private getBasePrice(symbol: string): number {
    const prices: { [key: string]: number } = {
      'BTC': 109000,
      'ETH': 3200,
      'SOL': 98,
      'XRP': 0.52,
      'ADA': 0.45,
      'DOT': 8.5,
      'LINK': 15.2,
      'UNI': 12.8
    };
    
    return prices[symbol.replace('USDT', '')] || 100;
  }

  /**
   * Limpa cache de dados
   */
  clearCache(): void {
    this.priceCache.clear();
    this.sentimentCache.clear();
    this.technicalCache.clear();
    logger.info('Historical data cache cleared');
  }
}

export const historicalDataService = new HistoricalDataService(); 