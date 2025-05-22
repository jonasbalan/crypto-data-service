import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class CacheService {
  private static instance: CacheService;
  private client: Redis;
  private isConnected: boolean = false;
  private prefix: string = 'crypto:vector:';
  private defaultTTL: number = 3600; // 1 hora em segundos

  private constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });

    this.setupListeners();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private setupListeners(): void {
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
      if (!this.isConnected) {
        logger.warn('Tentativa de uso do cache sem conexão ativa com Redis');
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
      if (!this.isConnected) {
        logger.warn('Tentativa de uso do cache sem conexão ativa com Redis');
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
      if (!this.isConnected) {
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
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Conexão com Redis fechada');
    }
  }
}

export const cacheService = CacheService.getInstance(); 