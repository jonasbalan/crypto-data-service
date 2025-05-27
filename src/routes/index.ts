import { Express } from 'express';
import { logger } from '../utils/logger';
import { httpRequestDuration } from '../metrics';
import { DataService } from '../services/data';
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
    console.log('[SETUP] DataService inicializado');

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
    console.log('[SETUP] Health route registrada');

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
    app.use('/api/metrics', metricsRoutes);
    console.log('[SETUP] Metrics routes registradas');
    app.use('/api/real', realDataRoutes);
    console.log('[SETUP] Real data routes registradas');
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