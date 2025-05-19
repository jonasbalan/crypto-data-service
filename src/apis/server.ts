import express, { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { requestDebugMiddleware, startTimer, endTimer, checkMemoryUsage } from '../utils/debug';
import cryptoRoutes from './routes/crypto';
import vectorRoutes from './routes/vector';
import analyticsRoutes from './routes/analytics';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';

// Criar aplicação Express
const app = express();
let httpServer: any = null;
let io: Server | null = null;

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
    
    // Configurar Socket.IO para dados em tempo real
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    // Configurar eventos do Socket.IO
    setupSocketIO(io);
    
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
 * Configura eventos do Socket.IO
 * @param io Instância do Socket.IO
 */
function setupSocketIO(io: Server): void {
  // Configurar conexões de clientes
  io.on('connection', (socket) => {
    logger.info(`Novo cliente Socket.IO conectado: ${socket.id}`);
    
    // Evento de subscrição em dados de criptomoedas
    socket.on('subscribe', (symbols: string[]) => {
      if (Array.isArray(symbols)) {
        symbols.forEach(symbol => {
          logger.debug(`Cliente ${socket.id} subscreveu em ${symbol}`);
          socket.join(`crypto:${symbol}`);
        });
      }
    });
    
    // Evento de cancelamento de subscrição
    socket.on('unsubscribe', (symbols: string[]) => {
      if (Array.isArray(symbols)) {
        symbols.forEach(symbol => {
          logger.debug(`Cliente ${socket.id} cancelou subscrição em ${symbol}`);
          socket.leave(`crypto:${symbol}`);
        });
      }
    });
    
    // Evento de desconexão
    socket.on('disconnect', () => {
      logger.info(`Cliente Socket.IO desconectado: ${socket.id}`);
    });
  });
  
  // Configurar assinante Redis para encaminhar atualizações de preço
  setupRedisSubscriber();
}

/**
 * Configura assinante Redis para encaminhar mensagens para Socket.IO
 */
async function setupRedisSubscriber(): Promise<void> {
  try {
    // Criar cliente Redis dedicado para subscrição
    const redisSubscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Criar cliente Redis separado para publicação
    const redisPublisher = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Assinar em canais relevantes
    await redisSubscriber.subscribe('crypto:price:update');
    await redisSubscriber.subscribe('crypto:trade:new');
    await redisSubscriber.subscribe('crypto:transaction:new');
    
    // Configurar handler de mensagens
    redisSubscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        
        switch (channel) {
          case 'crypto:price:update':
            if (data.symbol && io) {
              io.to(`crypto:${data.symbol}`).emit('price_update', data);
            }
            break;
            
          case 'crypto:trade:new':
            if (data.symbol && io) {
              io.to(`crypto:${data.symbol}`).emit('trade', data);
            }
            break;
            
          case 'crypto:transaction:new':
            if (data.blockchain && io) {
              io.to(`blockchain:${data.blockchain}`).emit('transaction', data);
            }
            break;
        }
      } catch (error) {
        logger.error('Erro ao processar mensagem Redis:', error);
      }
    });
    
    // Exportar o cliente de publicação para uso em outros módulos
    (global as any).redisPublisher = redisPublisher;
    
    logger.info('Assinante Redis configurado para eventos em tempo real');
  } catch (error) {
    logger.error('Erro ao configurar assinante Redis:', error);
    throw error;
  }
}

/**
 * Finaliza o servidor API
 */
export async function shutdownApiServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!httpServer) {
      resolve();
      return;
    }
    
    httpServer.close((err: Error) => {
      if (err) {
        logger.error('Erro ao finalizar servidor API:', err);
        reject(err);
      } else {
        logger.info('Servidor API finalizado com sucesso');
        resolve();
      }
    });
  });
} 