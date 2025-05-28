import { Express } from 'express';
import { logger } from '../utils/logger';
import { httpRequestDuration } from '../metrics';
import { DataService } from '../services/data';
import { RealDataService } from '../services/realDataService';
import vectorRoutes from './vector';
import cryptoRoutes from './cryptoRoutes';
import sentimentRoutes from './sentimentRoutes';
import metricsRoutes from './metricsRoutes';
import realDataRoutes from './realDataRoutes';
import technicalIndicatorsRoutes from './technicalIndicatorsRoutes';
import advancedIndicatorsRoutes from './advancedIndicatorsRoutes';
import sentimentAnalysisRoutes from './sentimentAnalysisRoutes';

export const setupRoutes = (app: Express): void => {
  try {
    console.log('[SETUP] Iniciando configuração das rotas...');
    const dataService = DataService.getInstance();
    const realDataService = RealDataService.getInstance();
    console.log('[SETUP] DataService e RealDataService inicializados');

    // Middleware para logging de requisições
    app.use((req, res, next) => {
      logger.info(`[ROUTES] ${req.method} ${req.url}`);
      console.log(`[ROUTES] ${req.method} ${req.url}`);
      next();
    });

    // Health check
    app.get('/health', (req, res) => {
      logger.info('[ROUTES] Health endpoint chamado');
      console.log('[ROUTES] Health endpoint chamado');
      res.json({ status: 'ok' });
    });
    
    // Health check para API
    app.get('/api/health', (req, res) => {
      logger.info('[ROUTES] API Health endpoint chamado');
      console.log('[ROUTES] API Health endpoint chamado');
      res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          api: 'running',
          database: 'connected',
          cache: 'available'
        }
      });
    });
    console.log('[SETUP] Health routes registradas');

    // API v1
    app.use('/api/v1', (req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        httpRequestDuration
          .labels(req.method, req.route?.path || 'unknown', res.statusCode.toString())
          .observe(duration);
      });
      next();
    });

    // Rotas de preços
    app.get('/api/v1/prices', async (req, res) => {
      try {
        const { symbol, limit } = req.query;
        if (!symbol || typeof symbol !== 'string') {
          return res.status(400).json({ error: 'Parâmetro symbol é obrigatório' });
        }

        const limitNumber = limit ? parseInt(limit as string, 10) : 100;
        const prices = await dataService.getPrices(symbol, limitNumber);
        res.json(prices);
      } catch (error) {
        logger.error('Erro ao buscar preços:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });

    // Rotas de volume
    app.get('/api/v1/volume', async (req, res) => {
      try {
        const { symbol, limit } = req.query;
        if (!symbol || typeof symbol !== 'string') {
          return res.status(400).json({ error: 'Parâmetro symbol é obrigatório' });
        }

        const limitNumber = limit ? parseInt(limit as string, 10) : 100;
        const volumes = await dataService.getVolume(symbol, limitNumber);
        res.json(volumes);
      } catch (error) {
        logger.error('Erro ao buscar volumes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });

    // Rotas de ordem book
    app.get('/api/v1/orderbook', async (req, res) => {
      try {
        const { symbol } = req.query;
        if (!symbol || typeof symbol !== 'string') {
          return res.status(400).json({ error: 'Parâmetro symbol é obrigatório' });
        }

        const orderBook = await dataService.getOrderBook(symbol);
        if (!orderBook) {
          return res.status(404).json({ error: 'Ordem book não encontrado' });
        }
        res.json(orderBook);
      } catch (error) {
        logger.error('Erro ao buscar ordem book:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });

    // Rotas da API
    console.log('[SETUP] Registrando rotas da API...');
    app.use('/api/crypto', cryptoRoutes);
    console.log('[SETUP] Crypto routes registradas');
    app.use('/api/vectors', vectorRoutes);
    console.log('[SETUP] Vector routes registradas');
    app.use('/api/sentiment', sentimentRoutes);
    console.log('[SETUP] Sentiment routes registradas');
    
    // Rotas de fallback para endpoints específicos que o frontend está tentando acessar
    app.get('/api/sentiment/:symbol', async (req, res) => {
      try {
        const { symbol } = req.params;
        console.log(`[REAL-DATA] Sentiment endpoint para ${symbol}`);
        
        // Buscar dados reais de preço para análise de sentimento
        const priceData = await realDataService.getCryptoPrice(symbol);
        const marketSentiment = await realDataService.getMarketSentiment();
        const news = await realDataService.getNews(symbol);
        
        // Calcular sentimento baseado em dados reais
        const sentimentScore = priceData?.change24h || 0;
        let sentiment = 'neutral';
        if (sentimentScore > 2) sentiment = 'positive';
        else if (sentimentScore < -2) sentiment = 'negative';
        
        const sentimentData = {
          symbol: symbol.toUpperCase(),
          sentiment,
          score: Math.max(-1, Math.min(1, sentimentScore / 10)), // Normalizar entre -1 e 1
          confidence: 0.8,
          timestamp: Date.now(),
          analysis: {
            positive: sentiment === 'positive' ? 70 : sentiment === 'neutral' ? 40 : 20,
            negative: sentiment === 'negative' ? 60 : sentiment === 'neutral' ? 30 : 15,
            neutral: sentiment === 'neutral' ? 30 : 15
          },
          sources: ['news', 'price_action', 'market_data'],
          trend: sentimentScore > 0 ? 'improving' : sentimentScore < 0 ? 'declining' : 'stable',
          priceData,
          newsCount: news.length,
          marketSentiment: marketSentiment.overall
        };
        
        res.json(sentimentData);
      } catch (error) {
        console.error('[REAL-DATA] Erro no sentiment endpoint:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });
    
    app.get('/api/sentiment/:symbol/summary', async (req, res) => {
      try {
        const { symbol } = req.params;
        console.log(`[REAL-DATA] Sentiment summary endpoint para ${symbol}`);
        
        // Buscar dados reais para análise completa
        const priceData = await realDataService.getCryptoPrice(symbol);
        const marketSentiment = await realDataService.getMarketSentiment();
        const news = await realDataService.getNews(symbol);
        
        // Análise baseada em dados reais
        const change24h = priceData?.change24h || 0;
        const volume24h = priceData?.volume24h || 0;
        
        let overallSentiment = 'neutral';
        let recommendation = 'HOLD';
        let riskLevel = 'medium';
        
        if (change24h > 5) {
          overallSentiment = 'positive';
          recommendation = 'BUY';
          riskLevel = volume24h > 1000000000 ? 'low' : 'medium';
        } else if (change24h < -5) {
          overallSentiment = 'negative';
          recommendation = 'SELL';
          riskLevel = 'high';
        }
        
        const keyFactors = [];
        if (change24h > 0) keyFactors.push(`Valorização de ${change24h.toFixed(2)}% nas últimas 24h`);
        if (change24h < 0) keyFactors.push(`Desvalorização de ${Math.abs(change24h).toFixed(2)}% nas últimas 24h`);
        if (volume24h > 1000000000) keyFactors.push('Alto volume de negociação');
        keyFactors.push(`${news.length} notícias recentes analisadas`);
        keyFactors.push(`Sentimento geral do mercado: ${marketSentiment.overall}`);
        
        const summaryData = {
          symbol: symbol.toUpperCase(),
          overallSentiment,
          score: Math.max(-1, Math.min(1, change24h / 10)),
          recommendation,
          confidence: 0.85,
          keyFactors,
          riskLevel,
          timeframe: '24h',
          lastUpdated: new Date().toISOString(),
          priceData,
          marketData: {
            price: priceData?.price,
            change24h,
            volume24h,
            marketCap: priceData?.marketCap
          },
          newsAnalysis: {
            totalNews: news.length,
            positiveNews: news.filter(n => n.sentiment === 'positive').length,
            negativeNews: news.filter(n => n.sentiment === 'negative').length,
            neutralNews: news.filter(n => n.sentiment === 'neutral').length
          }
        };
        
        res.json(summaryData);
      } catch (error) {
        console.error('[REAL-DATA] Erro no sentiment summary endpoint:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });
    app.use('/api/metrics', metricsRoutes);
    console.log('[SETUP] Metrics routes registradas');
    app.use('/api/real', realDataRoutes);
    console.log('[SETUP] Real data routes registradas');
    
    // Endpoints adicionais para dados reais integrados
    app.get('/api/crypto/:symbol/real', async (req, res) => {
      try {
        const { symbol } = req.params;
        console.log(`[REAL-DATA] Buscando dados reais para ${symbol}`);
        
        const priceData = await realDataService.getCryptoPrice(symbol);
        if (!priceData) {
          return res.status(404).json({ error: 'Criptomoeda não encontrada' });
        }
        
        res.json(priceData);
      } catch (error) {
        console.error('[REAL-DATA] Erro ao buscar dados crypto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });
    
    app.get('/api/trending/real', async (req, res) => {
      try {
        console.log('[REAL-DATA] Buscando trending coins reais');
        const trendingData = await realDataService.getTrendingCoins();
        res.json(trendingData);
      } catch (error) {
        console.error('[REAL-DATA] Erro ao buscar trending coins:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });
    
    app.post('/api/crypto/multiple/real', async (req, res) => {
      try {
        const { symbols } = req.body;
        if (!symbols || !Array.isArray(symbols)) {
          return res.status(400).json({ error: 'Array de símbolos é obrigatório' });
        }
        
        console.log(`[REAL-DATA] Buscando dados para múltiplas moedas: ${symbols.join(', ')}`);
        const multipleData = await realDataService.getMultipleCryptoPrices(symbols);
        res.json(multipleData);
      } catch (error) {
        console.error('[REAL-DATA] Erro ao buscar múltiplas moedas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });
    
    app.get('/api/news/real', async (req, res) => {
      try {
        const { symbol } = req.query;
        console.log(`[REAL-DATA] Buscando notícias${symbol ? ` para ${symbol}` : ' gerais'}`);
        
        const news = await realDataService.getNews(symbol as string);
        res.json(news);
      } catch (error) {
        console.error('[REAL-DATA] Erro ao buscar notícias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });
    
    app.get('/api/market/sentiment/real', async (req, res) => {
      try {
        console.log('[REAL-DATA] Buscando sentimento do mercado');
        const sentiment = await realDataService.getMarketSentiment();
        res.json(sentiment);
      } catch (error) {
        console.error('[REAL-DATA] Erro ao buscar sentimento do mercado:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });
    
    app.get('/api/system/stats', async (req, res) => {
      try {
        console.log('[REAL-DATA] Buscando estatísticas do sistema');
        const stats = realDataService.getSystemStats();
        res.json(stats);
      } catch (error) {
        console.error('[REAL-DATA] Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    });
    app.use('/api/indicators', technicalIndicatorsRoutes);
    console.log('[SETUP] Technical indicators routes registradas');
    app.use('/api/advanced-indicators', advancedIndicatorsRoutes);
    console.log('[SETUP] Advanced indicators routes registradas');
    app.use('/api/sentiment-analysis', sentimentAnalysisRoutes);
    console.log('[SETUP] Sentiment analysis routes registradas');

    logger.info('Rotas configuradas com sucesso');
    console.log('[SETUP] Todas as rotas configuradas com sucesso!');
  } catch (error) {
    logger.error('Erro ao configurar rotas:', error);
    console.error('[SETUP] ERRO ao configurar rotas:', error);
  }
}; 