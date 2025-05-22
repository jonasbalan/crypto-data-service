import { Express } from 'express';
import { logger } from '../utils/logger';
import { httpRequestDuration } from '../metrics';
import { DataService } from '../services/data';
import vectorRoutes from './vector';
import cryptoRoutes from './cryptoRoutes';
import sentimentRoutes from './sentimentRoutes';

export const setupRoutes = (app: Express): void => {
  try {
    const dataService = DataService.getInstance();

    // Middleware para logging de requisições
    app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.url}`);
      next();
    });

    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

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
    app.use('/api/crypto', cryptoRoutes);
    app.use('/api/vectors', vectorRoutes);
    app.use('/api/sentiment', sentimentRoutes);

    // Fallback para rotas não encontradas
    app.use((req, res) => {
      res.status(404).json({ error: 'Rota não encontrada' });
    });

    logger.info('Rotas configuradas com sucesso');
  } catch (error) {
    logger.error('Erro ao configurar rotas:', error);
  }
}; 