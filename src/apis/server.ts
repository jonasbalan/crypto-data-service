import express, { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { requestDebugMiddleware, startTimer, endTimer, checkMemoryUsage } from '../utils/debug';
import cryptoRoutes from './routes/crypto';
import vectorRoutes from './routes/vector';
import analyticsRoutes from './routes/analytics';
import { createServer } from 'http';
import { WebSocketService, websocketService } from '../services/websocket';
import Redis from 'ioredis';

// Criar aplicação Express
const app = express();
let httpServer: any = null;

// Verificar uso de memória periodicamente em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    checkMemoryUsage();
  }, 60000); // A cada 1 minuto
}

/**
 * Inicia o servidor API
 */
export async function startApiServer(): Promise<void> {
  try {
    startTimer('startApiServer');
    const PORT = process.env.PORT || 3000;
    
    // Middleware para parsing de JSON
    app.use(express.json());
    
    // Middleware para CORS
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        return res.status(200).json({});
      }
      next();
    });
    
    // Middleware para logging e debug
    app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.url}`);
      next();
    });
    
    // Middleware de debug apenas em ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      app.use(requestDebugMiddleware);
    }
    
    // Rota de verificação de saúde
    app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', timestamp: new Date() });
    });
    
    // Adicionar rota de debug apenas em ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      app.get('/debug/info', (req: Request, res: Response) => {
        res.status(200).json({
          environment: process.env.NODE_ENV,
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          timestamp: new Date()
        });
      });
    }
    
    // Rotas da API
    app.use('/api/crypto', cryptoRoutes);
    app.use('/api/vector', vectorRoutes);
    app.use('/api/analytics', analyticsRoutes);
    
    // Middleware para tratamento de erros
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error(`Erro na requisição: ${err.message}`, err.stack);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });
    
    // Criar servidor HTTP
    httpServer = createServer(app);
    
    // Inicializar WebSocket Service
    const wsService = new WebSocketService(httpServer);
    (global as any).websocketService = wsService;
    
    // Função para tentar iniciar o servidor em diferentes portas
    const tryStartServer = (port: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        httpServer.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            logger.warn(`Porta ${port} em uso, tentando próxima porta...`);
            resolve(tryStartServer(port + 1));
          } else {
            reject(err);
          }
        });
        
        httpServer.listen(port, () => {
          const duration = endTimer('startApiServer');
          logger.info(`Servidor API iniciado na porta ${port} em ${duration.toFixed(2)}ms`);
          logger.info(`WebSocket service ativo para atualizações em tempo real`);
          resolve();
        });
      });
    };
    
    // Iniciar servidor
    await tryStartServer(Number(PORT));
  } catch (error) {
    logger.error('Erro ao iniciar servidor API:', error);
    throw error;
  }
}

/**
 * Para o servidor API
 */
export async function shutdownApiServer(): Promise<void> {
  try {
    if ((global as any).websocketService) {
      (global as any).websocketService.stop();
    }
    
    if (httpServer) {
      httpServer.close();
      logger.info('Servidor API parado');
    }
  } catch (error) {
    logger.error('Erro ao parar servidor API:', error);
    throw error;
  }
} 