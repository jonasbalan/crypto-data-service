import axios from 'axios';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import WebSocket from 'ws';

/**
 * Interface para representar configurações comuns de exchanges
 */
export interface ExchangeConfig {
  name: string;
  apiKey?: string;
  apiSecret?: string;
  baseUrl: string;
  wsUrl: string;
  rateLimit: number; // em milissegundos
  defaultSymbols: string[];
}

/**
 * Interface para representar dados de ticker de exchange
 */
export interface TickerData {
  symbol: string;
  price: number;
  volume: number;
  high24h?: number;
  low24h?: number;
  change24h?: number;
  bid?: number;
  ask?: number;
  timestamp: string;
  source: string;
}

/**
 * Interface para representar dados de candle OHLCV
 */
export interface CandleData {
  symbol: string;
  timestamp: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
}

/**
 * Classe base para implementações de exchanges
 */
export abstract class BaseExchange extends EventEmitter {
  protected name: string;
  protected apiKey?: string;
  protected apiSecret?: string;
  protected baseUrl: string;
  protected wsUrl: string;
  protected rateLimit: number;
  protected defaultSymbols: string[];
  protected wsConnections: Map<string, WebSocket> = new Map();
  protected lastApiCall: number = 0;
  
  constructor(config: ExchangeConfig) {
    super();
    this.name = config.name;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl;
    this.wsUrl = config.wsUrl;
    this.rateLimit = config.rateLimit;
    this.defaultSymbols = config.defaultSymbols;
    
    logger.info(`Inicializando integração com exchange ${this.name}`);
  }
  
  /**
   * Obtém nome da exchange
   */
  public getName(): string {
    return this.name;
  }
  
  /**
   * Método para respeitar limites de taxa de requisições
   */
  protected async throttleRequest(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastApiCall;
    
    if (elapsed < this.rateLimit) {
      const delay = this.rateLimit - elapsed;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastApiCall = Date.now();
  }
  
  /**
   * Método auxiliar para requisições HTTP
   */
  protected async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params: Record<string, any> = {},
    headers: Record<string, string> = {}
  ): Promise<any> {
    await this.throttleRequest();
    
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const config = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        params: method === 'GET' ? params : undefined,
        data: method !== 'GET' ? params : undefined
      };
      
      logger.debug(`Fazendo requisição para ${this.name}: ${method} ${url}`);
      const response = await axios(config);
      return response.data;
    } catch (error) {
      logger.error(`Erro na requisição para ${this.name}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Métodos abstratos que devem ser implementados por exchanges específicas
   */
  public abstract getTicker(symbol: string): Promise<TickerData>;
  public abstract getCandles(symbol: string, interval: string, limit?: number): Promise<CandleData[]>;
  public abstract subscribeToTicker(symbol: string): Promise<void>;
  public abstract subscribeToCandles(symbol: string, interval: string): Promise<void>;
  public abstract unsubscribe(channel: string, symbol: string): Promise<void>;
  
  /**
   * Método genérico para fechar conexões
   */
  public async closeConnections(): Promise<void> {
    logger.info(`Fechando conexões com ${this.name}`);
    
    for (const [channel, ws] of this.wsConnections.entries()) {
      logger.debug(`Fechando conexão WebSocket para canal ${channel}`);
      ws.close();
    }
    
    this.wsConnections.clear();
  }
}

/**
 * Factory para criar instâncias de exchanges
 */
export class ExchangeFactory {
  private static exchanges: Map<string, BaseExchange> = new Map();
  
  /**
   * Registra implementações de exchanges
   */
  public static registerExchange(exchange: BaseExchange): void {
    this.exchanges.set(exchange.getName().toLowerCase(), exchange);
    logger.info(`Exchange ${exchange.getName()} registrada com sucesso`);
  }
  
  /**
   * Obtém uma instância de exchange
   */
  public static getExchange(name: string): BaseExchange {
    const exchange = this.exchanges.get(name.toLowerCase());
    
    if (!exchange) {
      throw new Error(`Exchange não encontrada: ${name}`);
    }
    
    return exchange;
  }
  
  /**
   * Lista todas as exchanges disponíveis
   */
  public static listExchanges(): string[] {
    return Array.from(this.exchanges.keys());
  }
} 