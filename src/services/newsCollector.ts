import axios from 'axios';
import Parser from 'rss-parser';
import { logger } from '../utils/logger';

interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: Date;
  source: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
  keywords?: string[];
}

interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  keywords: string[];
}

class NewsAPIClient {
  private apiKey: string | undefined;
  private baseUrl = 'https://newsapi.org/v2';

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY;
  }

  async getCryptoNews(symbol?: string): Promise<NewsItem[]> {
    if (!this.apiKey) {
      logger.warn('NEWS_API_KEY não configurada, pulando NewsAPI');
      return [];
    }

    try {
      const query = symbol ? `${symbol} cryptocurrency` : 'cryptocurrency bitcoin ethereum';
      const response = await axios.get(`${this.baseUrl}/everything`, {
        params: {
          q: query,
          language: 'pt',
          sortBy: 'publishedAt',
          pageSize: 20,
          apiKey: this.apiKey
        },
        timeout: 10000
      });

      return response.data.articles.map((article: any) => ({
        title: article.title,
        description: article.description || '',
        link: article.url,
        pubDate: new Date(article.publishedAt),
        source: 'NewsAPI'
      }));
    } catch (error: any) {
      logger.error('Erro ao buscar notícias da NewsAPI:', error.message);
      return [];
    }
  }
}

class RSSFeedClient {
  private parser: Parser;
  private feeds = [
    {
      name: 'CoinDesk',
      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
      priority: 1
    },
    {
      name: 'Cointelegraph',
      url: 'https://cointelegraph.com/rss',
      priority: 1
    },
    {
      name: 'Decrypt',
      url: 'https://decrypt.co/feed',
      priority: 2
    },
    {
      name: 'Bitcoin Magazine',
      url: 'https://bitcoinmagazine.com/.rss/full/',
      priority: 2
    },
    {
      name: 'The Block',
      url: 'https://www.theblock.co/rss.xml',
      priority: 1
    },
    {
      name: 'CryptoNews',
      url: 'https://cryptonews.com/news/feed/',
      priority: 3
    }
  ];

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Crypto-Data-Service/1.0'
      }
    });
  }

  async getFeedNews(feedUrl: string, sourceName: string): Promise<NewsItem[]> {
    try {
      const feed = await this.parser.parseURL(feedUrl);
      
      return feed.items.slice(0, 10).map(item => ({
        title: item.title || '',
        description: item.contentSnippet || item.content || '',
        link: item.link || '',
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        source: sourceName
      }));
    } catch (error: any) {
      logger.error(`Erro ao buscar feed ${sourceName}:`, error.message);
      return [];
    }
  }

  async getAllFeeds(): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];
    
    const promises = this.feeds.map(async (feed) => {
      try {
        const news = await this.getFeedNews(feed.url, feed.name);
        return news;
      } catch (error) {
        logger.error(`Erro no feed ${feed.name}:`, error);
        return [];
      }
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allNews.push(...result.value);
      }
    });

    // Ordenar por data (mais recentes primeiro)
    return allNews.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  }
}

class SentimentAnalyzer {
  private positiveWords = [
    'alta', 'subida', 'ganho', 'lucro', 'valorização', 'crescimento', 'otimista',
    'bullish', 'positivo', 'sucesso', 'aumento', 'rally', 'pump', 'moon',
    'breakthrough', 'adoption', 'mainstream', 'institutional', 'partnership'
  ];

  private negativeWords = [
    'queda', 'baixa', 'perda', 'prejuízo', 'desvalorização', 'crash', 'bear',
    'bearish', 'negativo', 'declínio', 'dump', 'correção', 'volatilidade',
    'regulamentação', 'ban', 'proibição', 'hack', 'scam', 'bubble'
  ];

  analyzeSentiment(text: string): SentimentAnalysis {
    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    const foundKeywords: string[] = [];

    // Contar palavras positivas
    this.positiveWords.forEach(word => {
      if (lowerText.includes(word)) {
        positiveCount++;
        foundKeywords.push(word);
      }
    });

    // Contar palavras negativas
    this.negativeWords.forEach(word => {
      if (lowerText.includes(word)) {
        negativeCount++;
        foundKeywords.push(word);
      }
    });

    // Calcular score e sentimento
    const totalWords = positiveCount + negativeCount;
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let score = 0;

    if (totalWords > 0) {
      score = (positiveCount - negativeCount) / totalWords;
      
      if (score > 0.1) {
        sentiment = 'positive';
      } else if (score < -0.1) {
        sentiment = 'negative';
      }
    }

    return {
      sentiment,
      score: Math.abs(score),
      keywords: foundKeywords
    };
  }

  analyzeMultipleTexts(texts: string[]): SentimentAnalysis {
    const analyses = texts.map(text => this.analyzeSentiment(text));
    
    const totalScore = analyses.reduce((sum, analysis) => sum + analysis.score, 0);
    const avgScore = totalScore / analyses.length;
    
    const sentimentCounts = {
      positive: analyses.filter(a => a.sentiment === 'positive').length,
      negative: analyses.filter(a => a.sentiment === 'negative').length,
      neutral: analyses.filter(a => a.sentiment === 'neutral').length
    };

    let overallSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    if (sentimentCounts.positive > sentimentCounts.negative && sentimentCounts.positive > sentimentCounts.neutral) {
      overallSentiment = 'positive';
    } else if (sentimentCounts.negative > sentimentCounts.positive && sentimentCounts.negative > sentimentCounts.neutral) {
      overallSentiment = 'negative';
    }

    const allKeywords = analyses.flatMap(a => a.keywords);
    const uniqueKeywords = [...new Set(allKeywords)];

    return {
      sentiment: overallSentiment,
      score: avgScore,
      keywords: uniqueKeywords
    };
  }
}

export class NewsCollector {
  private newsAPI: NewsAPIClient;
  private rssClient: RSSFeedClient;
  private sentimentAnalyzer: SentimentAnalyzer;
  private cache: Map<string, { data: NewsItem[]; timestamp: number }> = new Map();
  private readonly cacheTTL = 300000; // 5 minutos

  constructor() {
    this.newsAPI = new NewsAPIClient();
    this.rssClient = new RSSFeedClient();
    this.sentimentAnalyzer = new SentimentAnalyzer();
  }

  private getCacheKey(symbol?: string): string {
    return `news_${symbol || 'general'}`;
  }

  private getFromCache(key: string): NewsItem[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: NewsItem[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async getNews(symbol?: string): Promise<NewsItem[]> {
    const cacheKey = this.getCacheKey(symbol);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      logger.info(`Coletando notícias${symbol ? ` para ${symbol}` : ''}`);
      
      const [apiNews, rssNews] = await Promise.all([
        this.newsAPI.getCryptoNews(symbol),
        this.rssClient.getAllFeeds()
      ]);

      let allNews = [...apiNews, ...rssNews];

      // Filtrar por símbolo se especificado
      if (symbol) {
        const symbolLower = symbol.toLowerCase();
        allNews = allNews.filter(news => 
          news.title.toLowerCase().includes(symbolLower) ||
          news.description.toLowerCase().includes(symbolLower)
        );
      }

      // Remover duplicatas baseado no título
      const uniqueNews = allNews.filter((news, index, self) =>
        index === self.findIndex(n => n.title === news.title)
      );

      // Adicionar análise de sentimento
      const newsWithSentiment = uniqueNews.map(news => {
        const analysis = this.sentimentAnalyzer.analyzeSentiment(
          `${news.title} ${news.description}`
        );
        return {
          ...news,
          sentiment: analysis.sentiment,
          sentimentScore: analysis.score,
          keywords: analysis.keywords
        };
      });

      // Ordenar por data e limitar
      const sortedNews = newsWithSentiment
        .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
        .slice(0, 50);

      this.setCache(cacheKey, sortedNews);
      
      logger.info(`Coletadas ${sortedNews.length} notícias`);
      return sortedNews;

    } catch (error) {
      logger.error('Erro ao coletar notícias:', error);
      return [];
    }
  }

  async getMarketSentiment(): Promise<SentimentAnalysis> {
    try {
      const news = await this.getNews();
      const recentNews = news.filter(n => 
        Date.now() - n.pubDate.getTime() < 24 * 60 * 60 * 1000 // últimas 24h
      );

      const texts = recentNews.map(n => `${n.title} ${n.description}`);
      return this.sentimentAnalyzer.analyzeMultipleTexts(texts);
    } catch (error) {
      logger.error('Erro ao analisar sentimento do mercado:', error);
      return {
        sentiment: 'neutral',
        score: 0,
        keywords: []
      };
    }
  }

  async getCoinSentiment(symbol: string): Promise<SentimentAnalysis> {
    try {
      const news = await this.getNews(symbol);
      const texts = news.map(n => `${n.title} ${n.description}`);
      return this.sentimentAnalyzer.analyzeMultipleTexts(texts);
    } catch (error) {
      logger.error(`Erro ao analisar sentimento de ${symbol}:`, error);
      return {
        sentiment: 'neutral',
        score: 0,
        keywords: []
      };
    }
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache de notícias limpo');
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

export const newsCollector = new NewsCollector(); 