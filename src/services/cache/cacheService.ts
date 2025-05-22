import { logger } from '../../utils/logger';

/**
 * Interface para os itens do cache
 */
interface CacheItem<T> {
  value: T;
  expiry: number; // timestamp de expiração
}

/**
 * Classe para gerenciamento de cache em memória
 */
class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number = 60 * 1000; // 1 minuto em milissegundos

  /**
   * Define um valor no cache
   * @param key Chave do item
   * @param value Valor a ser armazenado
   * @param ttl Tempo de vida em milissegundos (opcional)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
    logger.debug(`Cache: item definido [${key}]`);
  }

  /**
   * Obtém um valor do cache
   * @param key Chave do item
   * @returns Valor do cache ou undefined se não encontrado ou expirado
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    // Se o item não existe no cache
    if (!item) {
      logger.debug(`Cache: miss [${key}]`);
      return undefined;
    }
    
    // Se o item expirou
    if (Date.now() > item.expiry) {
      logger.debug(`Cache: expired [${key}]`);
      this.cache.delete(key);
      return undefined;
    }
    
    logger.debug(`Cache: hit [${key}]`);
    return item.value as T;
  }

  /**
   * Remove um item do cache
   * @param key Chave do item
   */
  delete(key: string): void {
    this.cache.delete(key);
    logger.debug(`Cache: item removido [${key}]`);
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    logger.info('Cache: limpo completamente');
  }

  /**
   * Remove todos os itens expirados do cache
   * @returns Número de itens removidos
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      logger.info(`Cache: ${count} itens expirados removidos`);
    }
    
    return count;
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): any {
    const now = Date.now();
    let expired = 0;
    
    for (const item of this.cache.values()) {
      if (now > item.expiry) {
        expired++;
      }
    }
    
    return {
      total: this.cache.size,
      active: this.cache.size - expired,
      expired
    };
  }
}

// Instância única do cache
export const cacheService = new MemoryCache();

/**
 * Função para cachear resultados de funções assíncronas
 * @param key Chave do cache
 * @param fn Função a ser executada se o cache estiver vazio
 * @param ttl Tempo de vida opcional
 */
export async function cachedResult<T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Verificar no cache primeiro
  const cached = cacheService.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }
  
  // Se não estiver no cache, executar a função
  const result = await fn();
  
  // Armazenar o resultado no cache
  cacheService.set(key, result, ttl);
  
  return result;
}

// Configurar limpeza automática do cache
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    cacheService.cleanup();
  }, CLEANUP_INTERVAL);
} 