import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class CacheService {
  private static instance: CacheService;
  private client!: Redis;
  private isConnected: boolean = false;
  private prefix: string = 'crypto:vector:';
  private defaultTTL: number = 3600; // 1 hora em segundos
  private skipConnection: boolean = process.env.SKIP_DATABASE_CONNECTION === 'true';

  private constructor() {
    if (this.skipConnection) {
      logger.info('SKIP_DATABASE_CONNECTION está ativado, ignorando conexão com Redis');
      return;
    }

    try {
      // Usar o nome do serviço Docker em vez do localhost
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      logger.info(`Conectando ao Redis em: ${redisUrl}`);
      
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        retryStrategy: (times) => {
          const delay = Math.min(times * 500, 5000);
          if (times > 5) {
            logger.warn(`Desistindo de conectar ao Redis após ${times} tentativas`);
            return null; // null para parar de tentar
          }
          logger.info(`Reconectando ao Redis (tentativa ${times}) em ${delay}ms...`);
          return delay;
        },
        connectTimeout: 10000 // 10 segundos
      });
      
      this.setupListeners();
    } catch (error) {
      logger.error('Erro ao criar cliente Redis:', error);
      logger.info('Continuando sem cache Redis');
    }
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private setupListeners(): void {
    if (!this.client) return;
    
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Conectado ao Redis com sucesso');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      logger.error('Erro na conexão com Redis:', err);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.info('Conexão com Redis fechada');
    });
  }

  public async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      if (!this.isConnected || !this.client || this.skipConnection) {
        logger.debug(`Cache: Ignorando set de ${key} (Redis não conectado)`);
        return;
      }

      const fullKey = this.getFullKey(key);
      const serializedValue = JSON.stringify(value);
      await this.client.setex(fullKey, ttl, serializedValue);
      logger.debug(`Cache: Chave ${fullKey} definida com TTL de ${ttl} segundos`);
    } catch (error) {
      logger.error('Erro ao definir cache:', error);
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected || !this.client || this.skipConnection) {
        logger.debug(`Cache: Ignorando get de ${key} (Redis não conectado)`);
        return null;
      }

      const fullKey = this.getFullKey(key);
      const value = await this.client.get(fullKey);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Erro ao buscar do cache:', error);
      return null;
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      if (!this.isConnected || !this.client || this.skipConnection) {
        return;
      }

      const fullKey = this.getFullKey(key);
      await this.client.del(fullKey);
      logger.debug(`Cache: Chave ${fullKey} removida`);
    } catch (error) {
      logger.error('Erro ao remover do cache:', error);
    }
  }

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  public async close(): Promise<void> {
    if (this.isConnected && this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Conexão com Redis fechada');
    }
  }
}

export const cacheService = CacheService.getInstance(); 