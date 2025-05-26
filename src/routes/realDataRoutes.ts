import { Router, Request, Response } from 'express';
import { exchangeDataManager } from '../services/exchangeClients';
import { newsCollector } from '../services/newsCollector';
import { logger } from '../utils/logger';

const router = Router();

// Middleware de cache simples (sem dependência externa)
const cache = new Map<string, { data: any; timestamp: number }>();

const cacheMiddleware = (ttlSeconds: number) => {
  return (req: Request, res: Response, next: any) => {
    const key = req.originalUrl;
    const cached = cache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < (ttlSeconds * 1000)) {
      logger.info(`Cache HIT: ${key}`);
      return res.json(cached.data);
    }
    
    // Interceptar res.json para armazenar no cache
    const originalJson = res.json;
    res.json = function(body: any) {
      cache.set(key, {
        data: body,
        timestamp: Date.now()
      });
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * @swagger
 * /api/real/crypto/{symbol}:
 *   get:
 *     summary: Obter dados em tempo real de uma criptomoeda
 *     tags: [Real Data]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda (ex: BTC, ETH)
 *     responses:
 *       200:
 *         description: Dados da criptomoeda obtidos com sucesso
 *       404:
 *         description: Criptomoeda não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/crypto/:symbol', cacheMiddleware(30), async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    logger.info(`Buscando dados reais para ${symbol}`);

    const cryptoData = await exchangeDataManager.getCryptoData(symbol);
    
    if (!cryptoData) {
      return res.status(404).json({
        error: 'Criptomoeda não encontrada',
        symbol,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: cryptoData,
      timestamp: new Date().toISOString(),
      source: 'exchange_apis'
    });
  } catch (error: any) {
    logger.error(`Erro ao buscar dados para ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/real/trending:
 *   get:
 *     summary: Obter criptomoedas em tendência com dados reais
 *     tags: [Real Data]
 *     responses:
 *       200:
 *         description: Lista de criptomoedas em tendência
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/trending', cacheMiddleware(120), async (req: Request, res: Response) => {
  try {
    logger.info('Buscando criptomoedas em tendência');

    const trendingData = await exchangeDataManager.getTrendingCoinsWithData();

    // Converter para formato compatível
    const formattedData = trendingData.map(coin => ({
      symbol: coin.symbol,
      sentiment: coin.change24h > 0 ? 'bullish' : coin.change24h < 0 ? 'bearish' : 'neutral',
      change24h: coin.change24h,
      price: coin.price,
      volume24h: coin.volume24h,
      lastUpdate: coin.lastUpdate
    }));

    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      timestamp: new Date().toISOString(),
      source: 'exchange_apis'
    });
  } catch (error: any) {
    logger.error('Erro ao buscar trending coins:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/real/multiple:
 *   post:
 *     summary: Obter dados de múltiplas criptomoedas
 *     tags: [Real Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbols:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Dados de múltiplas criptomoedas
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/multiple', cacheMiddleware(30), async (req: Request, res: Response) => {
  try {
    const { symbols } = req.body;

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        error: 'Parâmetros inválidos',
        message: 'Campo "symbols" deve ser um array de strings',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Buscando dados para múltiplas moedas: ${symbols.join(', ')}`);

    const cryptoData = await exchangeDataManager.getMultipleCryptoData(symbols);

    res.json({
      success: true,
      data: cryptoData,
      count: cryptoData.length,
      requestedSymbols: symbols,
      timestamp: new Date().toISOString(),
      source: 'exchange_apis'
    });
  } catch (error: any) {
    logger.error('Erro ao buscar múltiplos dados crypto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/real/news:
 *   get:
 *     summary: Obter notícias recentes de criptomoedas
 *     tags: [Real Data]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Limite de notícias a retornar
 *     responses:
 *       200:
 *         description: Lista de notícias recentes
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/news', cacheMiddleware(300), async (req: Request, res: Response) => {  
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    logger.info(`Buscando ${limit} notícias recentes`);

    const news = await newsCollector.getNews();
    const limitedNews = news.slice(0, limit);

    res.json({
      success: true,
      data: limitedNews,
      count: limitedNews.length,
      total: news.length,
      timestamp: new Date().toISOString(),
      source: 'news_aggregator'
    });
  } catch (error: any) {
    logger.error('Erro ao buscar notícias:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/real/news/{symbol}:
 *   get:
 *     summary: Obter notícias específicas de uma criptomoeda
 *     tags: [Real Data]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 15
 *     responses:
 *       200:
 *         description: Notícias específicas da criptomoeda
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/news/:symbol', cacheMiddleware(300), async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit as string) || 15;
    
    logger.info(`Buscando notícias para ${symbol}`);

    const news = await newsCollector.getNews(symbol);
    const limitedNews = news.slice(0, limit);

    res.json({
      success: true,
      data: limitedNews,
      count: limitedNews.length,
      symbol,
      timestamp: new Date().toISOString(),
      source: 'news_aggregator'
    });
  } catch (error: any) {
    logger.error(`Erro ao buscar notícias para ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/real/sentiment/market:
 *   get:
 *     summary: Obter análise de sentimento geral do mercado
 *     tags: [Real Data]
 *     responses:
 *       200:
 *         description: Análise de sentimento do mercado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/sentiment/market', cacheMiddleware(600), async (req: Request, res: Response) => {
  try {
    logger.info('Analisando sentimento geral do mercado');

    const sentiment = await newsCollector.getMarketSentiment();

    res.json({
      success: true,
      data: {
        sentiment: sentiment.sentiment,
        score: sentiment.score,
        keywords: sentiment.keywords,
        analysis_time: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'sentiment_analyzer'
    });
  } catch (error: any) {
    logger.error('Erro ao analisar sentimento do mercado:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/real/sentiment/{symbol}:
 *   get:
 *     summary: Obter análise de sentimento de uma criptomoeda específica
 *     tags: [Real Data]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *     responses:
 *       200:
 *         description: Análise de sentimento da criptomoeda
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/sentiment/:symbol', cacheMiddleware(300), async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    logger.info(`Analisando sentimento para ${symbol}`);

    const [sentiment, cryptoData, news] = await Promise.all([
      newsCollector.getCoinSentiment(symbol),
      exchangeDataManager.getCryptoData(symbol),
      newsCollector.getNews(symbol)
    ]);

    res.json({
      success: true,
      data: {
        symbol,
        sentiment: sentiment.sentiment,
        score: sentiment.score,
        keywords: sentiment.keywords,
        price_data: cryptoData,
        related_news_count: news.length,
        analysis_time: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'sentiment_analyzer'
    });
  } catch (error: any) {
    logger.error(`Erro ao analisar sentimento para ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/real/stats:
 *   get:
 *     summary: Obter estatísticas dos sistemas de dados reais
 *     tags: [Real Data]
 *     responses:
 *       200:
 *         description: Estatísticas dos sistemas
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const exchangeStats = exchangeDataManager.getCacheStats();
    const newsStats = newsCollector.getCacheStats();
    const cacheStats = {
      size: cache.size,
      entries: Array.from(cache.keys())
    };

    res.json({
      success: true,
      data: {
        exchange_cache: exchangeStats,
        news_cache: newsStats,
        api_cache: cacheStats,
        system_health: {
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          node_version: process.version
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 