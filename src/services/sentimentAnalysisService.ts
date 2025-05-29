import Redis from 'ioredis';

export interface SentimentData {
  id: string;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // -1 a 1
  confidence: number; // 0 a 1
  timestamp: number;
  source: string;
  symbol?: string;
  keywords: string[];
  impact: 'high' | 'medium' | 'low';
}

export interface SentimentTrend {
  timestamp: number;
  positive: number;
  negative: number;
  neutral: number;
  averageScore: number;
  volume: number;
}

export interface SentimentMetrics {
  overall: {
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    confidence: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  bySymbol: Record<string, {
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    count: number;
    change24h: number;
  }>;
  bySource: Record<string, {
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    count: number;
    reliability: number;
  }>;
  trends: SentimentTrend[];
  alerts: SentimentAlert[];
}

export interface SentimentAlert {
  id: string;
  type: 'sudden_change' | 'extreme_sentiment' | 'volume_spike';
  severity: 'high' | 'medium' | 'low';
  message: string;
  timestamp: number;
  symbol?: string;
  data: any;
}

export interface SentimentFilter {
  symbols?: string[];
  sources?: string[];
  sentiment?: ('positive' | 'negative' | 'neutral')[];
  dateRange?: {
    start: number;
    end: number;
  };
  minConfidence?: number;
  impact?: ('high' | 'medium' | 'low')[];
}

class SentimentAnalysisService {
  private static instance: SentimentAnalysisService;
  private sentimentData: SentimentData[] = [];
  private trends: SentimentTrend[] = [];
  private alerts: SentimentAlert[] = [];
  private redis?: Redis;

  private constructor() {
    this.initializeRedis();
    this.generateMockData();
    this.startTrendCalculation();
  }

  public static getInstance(): SentimentAnalysisService {
    if (!SentimentAnalysisService.instance) {
      SentimentAnalysisService.instance = new SentimentAnalysisService();
    }
    return SentimentAnalysisService.instance;
  }

  private async initializeRedis() {
    if (process.env.SKIP_REDIS_CONNECTION === 'true' || process.env.SKIP_DATABASE_CONNECTION === 'true') {
      console.log('🚫 Redis desabilitado para análise de sentimento (modo sem Docker)');
      return;
    }

    try {
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      redis.on('error', (err: any) => {
        console.error('Redis connection error (sentiment):', err);
      });
      this.redis = redis;
      console.log('✅ Redis conectado para análise de sentimento');
    } catch (error) {
      console.warn('⚠️ Redis não disponível para análise de sentimento:', error);
    }
  }

  private generateMockData() {
    const symbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT'];
    const sources = ['CoinDesk', 'CoinTelegraph', 'Decrypt', 'The Block', 'CryptoNews'];
    const sentiments: ('positive' | 'negative' | 'neutral')[] = ['positive', 'negative', 'neutral'];
    
    // Gerar dados dos últimos 7 dias
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < 500; i++) {
      const timestamp = sevenDaysAgo + Math.random() * (now - sevenDaysAgo);
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      
      let score = 0;
      if (sentiment === 'positive') {
        score = 0.1 + Math.random() * 0.9; // 0.1 a 1.0
      } else if (sentiment === 'negative') {
        score = -0.1 - Math.random() * 0.9; // -0.1 a -1.0
      } else {
        score = (Math.random() - 0.5) * 0.2; // -0.1 a 0.1
      }

      this.sentimentData.push({
        id: `sentiment_${i}`,
        text: this.generateMockText(sentiment, symbol),
        sentiment,
        score,
        confidence: 0.6 + Math.random() * 0.4,
        timestamp,
        source,
        symbol,
        keywords: this.generateKeywords(sentiment, symbol),
        impact: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
      });
    }

    console.log(`📊 Gerados ${this.sentimentData.length} dados de sentimento mock`);
  }

  private generateMockText(sentiment: string, symbol: string): string {
    const positiveTexts = [
      `${symbol} shows strong bullish momentum with institutional adoption`,
      `Major breakthrough in ${symbol} technology drives investor confidence`,
      `${symbol} reaches new all-time high amid positive market sentiment`,
      `Analysts predict significant growth for ${symbol} in coming months`
    ];

    const negativeTexts = [
      `${symbol} faces regulatory challenges causing market uncertainty`,
      `Technical analysis suggests ${symbol} may experience correction`,
      `${symbol} drops significantly following negative market news`,
      `Concerns over ${symbol} scalability issues affect investor sentiment`
    ];

    const neutralTexts = [
      `${symbol} maintains stable price levels amid mixed market signals`,
      `Market analysis shows ${symbol} consolidating in current range`,
      `${symbol} trading volume remains consistent with recent patterns`,
      `Technical indicators for ${symbol} show neutral market conditions`
    ];

    switch (sentiment) {
      case 'positive':
        return positiveTexts[Math.floor(Math.random() * positiveTexts.length)];
      case 'negative':
        return negativeTexts[Math.floor(Math.random() * negativeTexts.length)];
      default:
        return neutralTexts[Math.floor(Math.random() * neutralTexts.length)];
    }
  }

  private generateKeywords(sentiment: string, symbol: string): string[] {
    const baseKeywords = [symbol.toLowerCase(), 'crypto', 'blockchain'];
    
    const positiveKeywords = ['bullish', 'growth', 'adoption', 'breakthrough', 'surge'];
    const negativeKeywords = ['bearish', 'decline', 'regulatory', 'concerns', 'drop'];
    const neutralKeywords = ['stable', 'consolidation', 'analysis', 'market', 'trading'];

    switch (sentiment) {
      case 'positive':
        return [...baseKeywords, ...positiveKeywords.slice(0, 2)];
      case 'negative':
        return [...baseKeywords, ...negativeKeywords.slice(0, 2)];
      default:
        return [...baseKeywords, ...neutralKeywords.slice(0, 2)];
    }
  }

  private startTrendCalculation() {
    // Calcular tendências a cada 5 minutos
    setInterval(() => {
      this.calculateTrends();
      this.detectAlerts();
    }, 5 * 60 * 1000);

    // Calcular tendências iniciais
    this.calculateTrends();
  }

  private calculateTrends() {
    const now = Date.now();
    const intervals = 24; // 24 horas de dados
    const intervalDuration = 60 * 60 * 1000; // 1 hora

    this.trends = [];

    for (let i = 0; i < intervals; i++) {
      const endTime = now - (i * intervalDuration);
      const startTime = endTime - intervalDuration;

      const intervalData = this.sentimentData.filter(
        item => item.timestamp >= startTime && item.timestamp < endTime
      );

      if (intervalData.length > 0) {
        const positive = intervalData.filter(item => item.sentiment === 'positive').length;
        const negative = intervalData.filter(item => item.sentiment === 'negative').length;
        const neutral = intervalData.filter(item => item.sentiment === 'neutral').length;
        const total = intervalData.length;

        const averageScore = intervalData.reduce((sum, item) => sum + item.score, 0) / total;

        this.trends.unshift({
          timestamp: startTime,
          positive: (positive / total) * 100,
          negative: (negative / total) * 100,
          neutral: (neutral / total) * 100,
          averageScore,
          volume: total
        });
      }
    }

    // Manter apenas as últimas 24 horas
    this.trends = this.trends.slice(0, intervals);
  }

  private detectAlerts() {
    const recentData = this.sentimentData.filter(
      item => item.timestamp > Date.now() - (60 * 60 * 1000) // Última hora
    );

    if (recentData.length === 0) return;

    // Detectar mudanças bruscas no sentimento
    const currentAverage = recentData.reduce((sum, item) => sum + item.score, 0) / recentData.length;
    const previousHourData = this.sentimentData.filter(
      item => item.timestamp > Date.now() - (2 * 60 * 60 * 1000) && 
              item.timestamp <= Date.now() - (60 * 60 * 1000)
    );

    if (previousHourData.length > 0) {
      const previousAverage = previousHourData.reduce((sum, item) => sum + item.score, 0) / previousHourData.length;
      const change = Math.abs(currentAverage - previousAverage);

      if (change > 0.3) { // Mudança significativa
        this.alerts.push({
          id: `alert_${Date.now()}`,
          type: 'sudden_change',
          severity: change > 0.5 ? 'high' : 'medium',
          message: `Mudança brusca no sentimento detectada: ${change > 0 ? 'melhoria' : 'deterioração'} de ${(change * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          data: { currentAverage, previousAverage, change }
        });
      }
    }

    // Detectar sentimento extremo
    const extremeItems = recentData.filter(item => Math.abs(item.score) > 0.8);
    if (extremeItems.length > recentData.length * 0.3) { // Mais de 30% extremo
      this.alerts.push({
        id: `alert_extreme_${Date.now()}`,
        type: 'extreme_sentiment',
        severity: 'high',
        message: `Sentimento extremo detectado: ${extremeItems.length} de ${recentData.length} itens`,
        timestamp: Date.now(),
        data: { extremeCount: extremeItems.length, totalCount: recentData.length }
      });
    }

    // Manter apenas os últimos 50 alertas
    this.alerts = this.alerts.slice(-50);
  }

  // Métodos públicos da API

  public async getSentimentMetrics(filter?: SentimentFilter): Promise<SentimentMetrics> {
    let filteredData = this.sentimentData;

    // Aplicar filtros
    if (filter) {
      if (filter.symbols?.length) {
        filteredData = filteredData.filter(item => 
          filter.symbols!.includes(item.symbol || '')
        );
      }

      if (filter.sources?.length) {
        filteredData = filteredData.filter(item => 
          filter.sources!.includes(item.source)
        );
      }

      if (filter.sentiment?.length) {
        filteredData = filteredData.filter(item => 
          filter.sentiment!.includes(item.sentiment)
        );
      }

      if (filter.dateRange) {
        filteredData = filteredData.filter(item => 
          item.timestamp >= filter.dateRange!.start && 
          item.timestamp <= filter.dateRange!.end
        );
      }

      if (filter.minConfidence) {
        filteredData = filteredData.filter(item => 
          item.confidence >= filter.minConfidence!
        );
      }

      if (filter.impact?.length) {
        filteredData = filteredData.filter(item => 
          filter.impact!.includes(item.impact)
        );
      }
    }

    // Calcular métricas gerais
    const totalItems = filteredData.length;
    if (totalItems === 0) {
      return {
        overall: {
          sentiment: 'neutral',
          score: 0,
          confidence: 0,
          trend: 'stable'
        },
        bySymbol: {},
        bySource: {},
        trends: this.trends,
        alerts: this.alerts
      };
    }

    const averageScore = filteredData.reduce((sum, item) => sum + item.score, 0) / totalItems;
    const averageConfidence = filteredData.reduce((sum, item) => sum + item.confidence, 0) / totalItems;
    
    let overallSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (averageScore > 0.1) overallSentiment = 'positive';
    else if (averageScore < -0.1) overallSentiment = 'negative';

    // Calcular tendência
    const recentData = filteredData.filter(item => item.timestamp > Date.now() - (24 * 60 * 60 * 1000));
    const olderData = filteredData.filter(item => 
      item.timestamp <= Date.now() - (24 * 60 * 60 * 1000) && 
      item.timestamp > Date.now() - (48 * 60 * 60 * 1000)
    );

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentData.length > 0 && olderData.length > 0) {
      const recentAvg = recentData.reduce((sum, item) => sum + item.score, 0) / recentData.length;
      const olderAvg = olderData.reduce((sum, item) => sum + item.score, 0) / olderData.length;
      const change = recentAvg - olderAvg;
      
      if (change > 0.05) trend = 'improving';
      else if (change < -0.05) trend = 'declining';
    }

    // Métricas por símbolo
    const bySymbol: Record<string, any> = {};
    const symbols = [...new Set(filteredData.map(item => item.symbol).filter(Boolean))];
    
    symbols.forEach(symbol => {
      const symbolData = filteredData.filter(item => item.symbol === symbol);
      const symbolScore = symbolData.reduce((sum, item) => sum + item.score, 0) / symbolData.length;
      
      let symbolSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (symbolScore > 0.1) symbolSentiment = 'positive';
      else if (symbolScore < -0.1) symbolSentiment = 'negative';

      // Calcular mudança 24h
      const recent24h = symbolData.filter(item => item.timestamp > Date.now() - (24 * 60 * 60 * 1000));
      const previous24h = symbolData.filter(item => 
        item.timestamp <= Date.now() - (24 * 60 * 60 * 1000) && 
        item.timestamp > Date.now() - (48 * 60 * 60 * 1000)
      );

      let change24h = 0;
      if (recent24h.length > 0 && previous24h.length > 0) {
        const recentAvg = recent24h.reduce((sum, item) => sum + item.score, 0) / recent24h.length;
        const previousAvg = previous24h.reduce((sum, item) => sum + item.score, 0) / previous24h.length;
        change24h = ((recentAvg - previousAvg) / Math.abs(previousAvg)) * 100;
      }

      bySymbol[symbol!] = {
        sentiment: symbolSentiment,
        score: symbolScore,
        count: symbolData.length,
        change24h
      };
    });

    // Métricas por fonte
    const bySource: Record<string, any> = {};
    const sources = [...new Set(filteredData.map(item => item.source))];
    
    sources.forEach(source => {
      const sourceData = filteredData.filter(item => item.source === source);
      const sourceScore = sourceData.reduce((sum, item) => sum + item.score, 0) / sourceData.length;
      
      let sourceSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (sourceScore > 0.1) sourceSentiment = 'positive';
      else if (sourceScore < -0.1) sourceSentiment = 'negative';

      // Calcular confiabilidade baseada na consistência
      const variance = sourceData.reduce((sum, item) => sum + Math.pow(item.score - sourceScore, 2), 0) / sourceData.length;
      const reliability = Math.max(0, 1 - variance); // Menor variância = maior confiabilidade

      bySource[source] = {
        sentiment: sourceSentiment,
        score: sourceScore,
        count: sourceData.length,
        reliability
      };
    });

    return {
      overall: {
        sentiment: overallSentiment,
        score: averageScore,
        confidence: averageConfidence,
        trend
      },
      bySymbol,
      bySource,
      trends: this.trends,
      alerts: this.alerts
    };
  }

  public async getSentimentData(filter?: SentimentFilter, limit = 100, offset = 0): Promise<{
    data: SentimentData[];
    total: number;
    hasMore: boolean;
  }> {
    let filteredData = [...this.sentimentData];

    // Aplicar filtros (mesmo código do método anterior)
    if (filter) {
      if (filter.symbols?.length) {
        filteredData = filteredData.filter(item => 
          filter.symbols!.includes(item.symbol || '')
        );
      }

      if (filter.sources?.length) {
        filteredData = filteredData.filter(item => 
          filter.sources!.includes(item.source)
        );
      }

      if (filter.sentiment?.length) {
        filteredData = filteredData.filter(item => 
          filter.sentiment!.includes(item.sentiment)
        );
      }

      if (filter.dateRange) {
        filteredData = filteredData.filter(item => 
          item.timestamp >= filter.dateRange!.start && 
          item.timestamp <= filter.dateRange!.end
        );
      }

      if (filter.minConfidence) {
        filteredData = filteredData.filter(item => 
          item.confidence >= filter.minConfidence!
        );
      }

      if (filter.impact?.length) {
        filteredData = filteredData.filter(item => 
          filter.impact!.includes(item.impact)
        );
      }
    }

    // Ordenar por timestamp (mais recente primeiro)
    filteredData.sort((a, b) => b.timestamp - a.timestamp);

    const total = filteredData.length;
    const paginatedData = filteredData.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      data: paginatedData,
      total,
      hasMore
    };
  }

  public async getSentimentTrends(hours = 24): Promise<SentimentTrend[]> {
    return this.trends.slice(0, hours);
  }

  public async getSentimentAlerts(limit = 20): Promise<SentimentAlert[]> {
    return this.alerts.slice(-limit).reverse(); // Mais recentes primeiro
  }

  public async addSentimentData(data: Omit<SentimentData, 'id' | 'timestamp'>): Promise<SentimentData> {
    const newData: SentimentData = {
      ...data,
      id: `sentiment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.sentimentData.push(newData);

    // Manter apenas os últimos 10000 itens
    if (this.sentimentData.length > 10000) {
      this.sentimentData = this.sentimentData.slice(-10000);
    }

    // Cache no Redis se disponível
    if (this.redis) {
      try {
        await this.redis.lpush('sentiment:data', JSON.stringify(newData));
        await this.redis.ltrim('sentiment:data', 0, 9999); // Manter últimos 10000
      } catch (error) {
        console.warn('Erro ao salvar sentimento no Redis:', error);
      }
    }

    return newData;
  }

  public getAvailableSymbols(): string[] {
    return [...new Set(this.sentimentData.map(item => item.symbol).filter(Boolean) as string[])];
  }

  public getAvailableSources(): string[] {
    return [...new Set(this.sentimentData.map(item => item.source))];
  }
}

export const sentimentAnalysisService = SentimentAnalysisService.getInstance(); 