import { CacheService } from './cacheService';

interface SentimentData {
  timestamp: number;
  symbol: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  source: string;
  text: string;
  price?: number;
}

interface SentimentSummary {
  symbol: string;
  totalAnalyses: number;
  averageScore: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  averageConfidence: number;
  lastUpdated: number;
  trend: 'improving' | 'declining' | 'stable';
  sources: string[];
}

interface SentimentAlert {
  id: string;
  symbol: string;
  type: 'sentiment_spike' | 'sentiment_drop' | 'high_volatility' | 'correlation_change';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
  data: any;
}

interface SentimentTrend {
  symbol: string;
  timeRange: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  change: number;
  data: Array<{
    timestamp: number;
    score: number;
    volume: number;
  }>;
}

interface CorrelationData {
  symbol: string;
  timeRange: string;
  correlation: number;
  strength: 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong';
  direction: 'positive' | 'negative';
  dataPoints: number;
  lastUpdated: number;
}

interface SourceStatistics {
  source: string;
  totalAnalyses: number;
  averageScore: number;
  averageConfidence: number;
  lastUpdate: number;
  reliability: number;
}

export class SentimentService {
  private cacheService: CacheService;
  private cachePrefix = 'sentiment:';
  private cacheTTL = 300; // 5 minutos

  constructor() {
    this.cacheService = CacheService.getInstance();
  }

  async getSentimentAnalysis(
    symbol: string,
    timeRange: string,
    limit: number = 100
  ): Promise<SentimentData[]> {
    const cacheKey = `${this.cachePrefix}analysis:${symbol}:${timeRange}:${limit}`;
    
    try {
      // Tentar buscar do cache
      const cached = await this.cacheService.get<SentimentData[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Gerar dados mock para desenvolvimento
      const mockData = this.generateMockSentimentData(symbol, timeRange, limit);

      // Cachear resultado
      await this.cacheService.set(cacheKey, mockData, this.cacheTTL);

      return mockData;
    } catch (error) {
      console.error('Erro ao buscar análise de sentimento:', error);
      return [];
    }
  }

  async getSentimentSummary(symbol: string): Promise<SentimentSummary> {
    const cacheKey = `${this.cachePrefix}summary:${symbol}`;
    
    try {
      // Tentar buscar do cache
      const cached = await this.cacheService.get<SentimentSummary>(cacheKey);
      if (cached) {
        return cached;
      }

      // Buscar dados das últimas 24 horas
      const data = await this.getSentimentAnalysis(symbol, '24h', 1000);

      if (data.length === 0) {
        throw new Error('Dados insuficientes para gerar resumo');
      }

      // Calcular métricas
      const totalAnalyses = data.length;
      const averageScore = data.reduce((sum, item) => sum + item.score, 0) / totalAnalyses;
      const averageConfidence = data.reduce((sum, item) => sum + item.confidence, 0) / totalAnalyses;

      // Distribuição de sentimento
      const sentimentDistribution = {
        positive: data.filter(item => item.sentiment === 'positive').length,
        negative: data.filter(item => item.sentiment === 'negative').length,
        neutral: data.filter(item => item.sentiment === 'neutral').length
      };

      // Calcular tendência
      const trend = this.calculateTrend(data);

      // Fontes únicas
      const sources = [...new Set(data.map(item => item.source))];

      const summary: SentimentSummary = {
        symbol,
        totalAnalyses,
        averageScore,
        sentimentDistribution,
        averageConfidence,
        lastUpdated: Date.now(),
        trend,
        sources
      };

      // Cachear resultado
      await this.cacheService.set(cacheKey, summary, this.cacheTTL);

      return summary;
    } catch (error) {
      console.error('Erro ao gerar resumo de sentimento:', error);
      throw error;
    }
  }

  async getSentimentAlerts(limit: number = 10): Promise<SentimentAlert[]> {
    const cacheKey = `${this.cachePrefix}alerts:${limit}`;
    
    try {
      // Tentar buscar do cache
      const cached = await this.cacheService.get<SentimentAlert[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const alerts: SentimentAlert[] = [];

      // Buscar alertas para principais criptomoedas
      const symbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL'];

      for (const symbol of symbols) {
        const symbolAlerts = await this.generateAlertsForSymbol(symbol);
        alerts.push(...symbolAlerts);
      }

      // Ordenar por severidade e timestamp
      alerts.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.timestamp - a.timestamp;
      });

      const limitedAlerts = alerts.slice(0, limit);

      // Cachear resultado
      await this.cacheService.set(cacheKey, limitedAlerts, this.cacheTTL);

      return limitedAlerts;
    } catch (error) {
      console.error('Erro ao buscar alertas de sentimento:', error);
      return [];
    }
  }

  async getSentimentTrends(timeRange: string): Promise<SentimentTrend[]> {
    const cacheKey = `${this.cachePrefix}trends:${timeRange}`;
    
    try {
      // Tentar buscar do cache
      const cached = await this.cacheService.get<SentimentTrend[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const symbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL'];
      const trends: SentimentTrend[] = [];

      for (const symbol of symbols) {
        const data = await this.getSentimentAnalysis(symbol, timeRange, 500);
        
        if (data.length > 0) {
          const trend = this.calculateSentimentTrend(symbol, timeRange, data);
          trends.push(trend);
        }
      }

      // Cachear resultado
      await this.cacheService.set(cacheKey, trends, this.cacheTTL);

      return trends;
    } catch (error) {
      console.error('Erro ao buscar tendências de sentimento:', error);
      return [];
    }
  }

  async getPriceSentimentCorrelation(symbol: string, timeRange: string): Promise<CorrelationData> {
    const cacheKey = `${this.cachePrefix}correlation:${symbol}:${timeRange}`;
    
    try {
      // Tentar buscar do cache
      const cached = await this.cacheService.get<CorrelationData>(cacheKey);
      if (cached) {
        return cached;
      }

      const sentimentData = await this.getSentimentAnalysis(symbol, timeRange, 200);
      
      if (sentimentData.length < 10) {
        throw new Error('Dados insuficientes para calcular correlação');
      }

      // Filtrar apenas dados com preço
      const dataWithPrice = sentimentData.filter(item => item.price !== undefined);
      
      if (dataWithPrice.length < 10) {
        throw new Error('Dados de preço insuficientes para calcular correlação');
      }

      // Calcular correlação
      const correlation = this.calculateCorrelation(
        dataWithPrice.map(item => item.score),
        dataWithPrice.map(item => item.price!)
      );

      const correlationData: CorrelationData = {
        symbol,
        timeRange,
        correlation,
        strength: this.getCorrelationStrength(correlation),
        direction: correlation >= 0 ? 'positive' : 'negative',
        dataPoints: dataWithPrice.length,
        lastUpdated: Date.now()
      };

      // Cachear resultado
      await this.cacheService.set(cacheKey, correlationData, this.cacheTTL);

      return correlationData;
    } catch (error) {
      console.error('Erro ao calcular correlação preço-sentimento:', error);
      throw error;
    }
  }

  async getSourceStatistics(): Promise<SourceStatistics[]> {
    const cacheKey = `${this.cachePrefix}sources`;
    
    try {
      // Tentar buscar do cache
      const cached = await this.cacheService.get<SourceStatistics[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const sources = ['twitter', 'reddit', 'news', 'telegram', 'discord'];
      const statistics: SourceStatistics[] = [];

      for (const source of sources) {
        // Gerar estatísticas mock
        const stats: SourceStatistics = {
          source,
          totalAnalyses: Math.floor(Math.random() * 1000) + 100,
          averageScore: (Math.random() - 0.5) * 2,
          averageConfidence: Math.random() * 0.3 + 0.7,
          lastUpdate: Date.now() - Math.floor(Math.random() * 3600000),
          reliability: Math.random() * 0.3 + 0.7
        };
        statistics.push(stats);
      }

      // Cachear resultado
      await this.cacheService.set(cacheKey, statistics, this.cacheTTL);

      return statistics;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de fontes:', error);
      return [];
    }
  }

  private generateMockSentimentData(symbol: string, timeRange: string, limit: number): SentimentData[] {
    const data: SentimentData[] = [];
    const now = Date.now();
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const interval = timeRangeMs / limit;

    const sources = ['twitter', 'reddit', 'news', 'telegram'];
    const sentiments: ('positive' | 'negative' | 'neutral')[] = ['positive', 'negative', 'neutral'];

    for (let i = 0; i < limit; i++) {
      const timestamp = now - (i * interval);
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      const score = sentiment === 'positive' ? Math.random() * 0.8 + 0.2 :
                   sentiment === 'negative' ? Math.random() * -0.8 - 0.2 :
                   (Math.random() - 0.5) * 0.4;

      data.push({
        timestamp,
        symbol,
        sentiment,
        score,
        confidence: Math.random() * 0.3 + 0.7,
        source: sources[Math.floor(Math.random() * sources.length)],
        text: `Mock sentiment analysis for ${symbol}`,
        price: Math.random() * 50000 + 20000
      });
    }

    return data.sort((a, b) => b.timestamp - a.timestamp);
  }

  private getTimeRangeMs(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private calculateTrend(data: SentimentData[]): 'improving' | 'declining' | 'stable' {
    if (data.length < 2) return 'stable';

    const recentData = data.slice(0, Math.floor(data.length / 3));
    const olderData = data.slice(-Math.floor(data.length / 3));

    const recentAvg = recentData.reduce((sum, item) => sum + item.score, 0) / recentData.length;
    const olderAvg = olderData.reduce((sum, item) => sum + item.score, 0) / olderData.length;

    const change = recentAvg - olderAvg;

    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  private async generateAlertsForSymbol(symbol: string): Promise<SentimentAlert[]> {
    const alerts: SentimentAlert[] = [];
    
    // Gerar alertas mock
    if (Math.random() > 0.7) {
      alerts.push({
        id: `alert_${symbol}_${Date.now()}`,
        symbol,
        type: 'sentiment_spike',
        severity: 'medium',
        message: `Pico de sentimento positivo detectado para ${symbol}`,
        timestamp: Date.now(),
        data: { change: 0.3 }
      });
    }

    return alerts;
  }

  private calculateSentimentTrend(symbol: string, timeRange: string, data: SentimentData[]): SentimentTrend {
    const groupedData = this.groupDataByInterval(data, timeRange);
    const scores = groupedData.map(item => item.score);
    const trendValue = this.calculateLinearTrend(scores);

    return {
      symbol,
      timeRange,
      trend: trendValue > 0.1 ? 'bullish' : trendValue < -0.1 ? 'bearish' : 'neutral',
      strength: Math.abs(trendValue),
      change: trendValue,
      data: groupedData
    };
  }

  private groupDataByInterval(data: SentimentData[], timeRange: string): Array<{ timestamp: number; score: number; volume: number }> {
    const intervalMs = this.getIntervalMs(timeRange);
    const groups: { [key: number]: SentimentData[] } = {};

    data.forEach(item => {
      const intervalStart = Math.floor(item.timestamp / intervalMs) * intervalMs;
      if (!groups[intervalStart]) {
        groups[intervalStart] = [];
      }
      groups[intervalStart].push(item);
    });

    return Object.entries(groups).map(([timestamp, items]) => ({
      timestamp: parseInt(timestamp),
      score: items.reduce((sum, item) => sum + item.score, 0) / items.length,
      volume: items.length
    })).sort((a, b) => a.timestamp - b.timestamp);
  }

  private getIntervalMs(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 5 * 60 * 1000; // 5 minutos
      case '4h': return 15 * 60 * 1000; // 15 minutos
      case '24h': return 60 * 60 * 1000; // 1 hora
      case '7d': return 6 * 60 * 60 * 1000; // 6 horas
      case '30d': return 24 * 60 * 60 * 1000; // 1 dia
      default: return 60 * 60 * 1000;
    }
  }

  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getCorrelationStrength(correlation: number): 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong' {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return 'very_strong';
    if (abs >= 0.6) return 'strong';
    if (abs >= 0.4) return 'moderate';
    if (abs >= 0.2) return 'weak';
    return 'very_weak';
  }
}

export const sentimentService = new SentimentService(); 