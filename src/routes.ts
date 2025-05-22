import { Express } from 'express';
import healthCheckRoutes from './apis/routes/healthCheck';
import vectorRoutes from './apis/routes/vector';
import analysisRoutes from './apis/routes/analysis';
import realtimeRoutes from './apis/routes/realtime';
import exchangeRoutes from './apis/routes/exchange';
import predictionRoutes from './apis/routes/prediction';
import { logger } from './utils/logger';

export const setupRoutes = (app: Express): void => {
  try {
    // Configurar rotas
    app.use('/api/health', healthCheckRoutes);
    app.use('/api/vector', vectorRoutes);
    app.use('/api/analysis', analysisRoutes);
    app.use('/api/realtime', realtimeRoutes);
    app.use('/api/exchange', exchangeRoutes);
    app.use('/api/prediction', predictionRoutes);
    
    // Rota de fallback
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint não encontrado' });
    });
    
    logger.info('Rotas configuradas com sucesso');
  } catch (error) {
    logger.error('Erro ao configurar rotas:', error);
  }
}; 