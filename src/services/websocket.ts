import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger';
import { exchangeDataManager } from './exchangeClients';
import { sentimentService } from './sentimentService';

export class WebSocketService {
  private io: Server;
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private sentimentUpdateInterval: NodeJS.Timeout | null = null;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3001",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Enviar dados iniciais
      this.sendInitialData(socket);

      // Eventos de subscrição
      socket.on('subscribe:prices', (symbols: string[]) => {
        socket.join('prices');
        logger.info(`Client ${socket.id} subscribed to prices: ${symbols.join(', ')}`);
      });

      socket.on('subscribe:sentiment', (symbols: string[]) => {
        socket.join('sentiment');
        logger.info(`Client ${socket.id} subscribed to sentiment: ${symbols.join(', ')}`);
      });

      socket.on('subscribe:system', () => {
        socket.join('system');
        logger.info(`Client ${socket.id} subscribed to system metrics`);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    // Iniciar atualizações automáticas
    this.startPriceUpdates();
    this.startSentimentUpdates();
    this.startSystemUpdates();
  }

  private async sendInitialData(socket: any): Promise<void> {
    try {
      // Enviar preços iniciais
      const symbols = ['BTC', 'ETH', 'SOL', 'XRP'];
      const prices = await exchangeDataManager.getMultipleCryptoData(symbols);
      socket.emit('prices:initial', prices);

      // Enviar sentimentos iniciais
      const sentimentTrends = await sentimentService.getSentimentTrends('24h');
      socket.emit('sentiment:initial', sentimentTrends);

      // Enviar métricas do sistema
      const systemMetrics = await this.getSystemMetrics();
      socket.emit('system:initial', systemMetrics);

    } catch (error) {
      logger.error('Error sending initial data:', error);
    }
  }

  private startPriceUpdates(): void {
    this.priceUpdateInterval = setInterval(async () => {
      try {
        const symbols = ['BTC', 'ETH', 'SOL', 'XRP'];
        const prices = await exchangeDataManager.getMultipleCryptoData(symbols);
        
        const priceData: any = {};
        prices.forEach(price => {
          priceData[price.symbol] = {
            price: price.price,
            change: (price.change24h / price.price) * 100,
            volume: price.volume24h,
            timestamp: Date.now()
          };
        });

        this.io.to('prices').emit('prices:update', priceData);
        logger.debug('Price updates sent to clients');

      } catch (error) {
        logger.error('Error updating prices:', error);
      }
    }, 5000); // Atualizar a cada 5 segundos
  }

  private startSentimentUpdates(): void {
    this.sentimentUpdateInterval = setInterval(async () => {
      try {
        const sentimentTrends = await sentimentService.getSentimentTrends('24h');
        this.io.to('sentiment').emit('sentiment:update', sentimentTrends);
        logger.debug('Sentiment updates sent to clients');

      } catch (error) {
        logger.error('Error updating sentiment:', error);
      }
    }, 30000); // Atualizar a cada 30 segundos
  }

  private startSystemUpdates(): void {
    setInterval(async () => {
      try {
        const metrics = await this.getSystemMetrics();
        this.io.to('system').emit('system:update', metrics);
        logger.debug('System metrics sent to clients');

      } catch (error) {
        logger.error('Error updating system metrics:', error);
      }
    }, 10000); // Atualizar a cada 10 segundos
  }

  private async getSystemMetrics(): Promise<any> {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    return {
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      cpu: Math.random() * 100, // Simulado - em produção usar biblioteca real
      timestamp: Date.now(),
      services: {
        api: { status: 'online', uptime: '99.98%', response: '45ms' },
        websocket: { status: 'online', uptime: '99.5%', response: '12ms' },
        database: { status: 'online', uptime: '100%', response: '8ms' },
        ollama: { status: 'warning', uptime: '98.7%', response: '120ms' },
        redis: { status: 'online', uptime: '99.9%', response: '3ms' }
      }
    };
  }

  public broadcastNotification(type: string, message: string, data?: any): void {
    this.io.emit('notification', {
      type,
      message,
      data,
      timestamp: Date.now()
    });
  }

  public stop(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
    if (this.sentimentUpdateInterval) {
      clearInterval(this.sentimentUpdateInterval);
    }
    this.io.close();
    logger.info('WebSocket service stopped');
  }
}

export let websocketService: WebSocketService; 