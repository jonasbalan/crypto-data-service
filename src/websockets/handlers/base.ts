import WebSocket from 'ws';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';

/**
 * Classe base para todos os handlers de WebSocket
 * Implementa funcionalidades básicas comuns a todos os handlers
 */
export abstract class WebSocketHandlerBase extends EventEmitter {
  protected ws: WebSocket | null = null;
  protected url: string;
  protected connected: boolean = false;
  protected reconnectAttempts: number = 0;
  protected maxReconnectAttempts: number = 10;
  protected reconnectDelay: number = 5000; // 5 segundos

  /**
   * Construtor da classe base
   * @param url URL do WebSocket
   */
  constructor(url: string) {
    super();
    this.url = url;
  }

  /**
   * Conecta ao WebSocket
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          logger.info(`Conexão WebSocket estabelecida: ${this.url}`);
          this.onOpen();
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.onMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          logger.error(`Erro na conexão WebSocket: ${error.message}`);
          this.onError(error);
        });

        this.ws.on('close', (code: number, reason: string) => {
          this.connected = false;
          logger.warn(`Conexão WebSocket fechada: ${code} - ${reason}`);
          this.onClose(code, reason);
          this.tryReconnect();
        });
      } catch (error) {
        this.connected = false;
        logger.error(`Falha ao criar conexão WebSocket: ${error}`);
        reject(error);
      }
    });
  }

  /**
   * Reconecta ao WebSocket
   */
  public async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Número máximo de tentativas de reconexão atingido: ${this.reconnectAttempts}`);
      throw new Error('Número máximo de tentativas de reconexão atingido');
    }

    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
    }

    this.reconnectAttempts++;
    logger.info(`Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    return this.connect();
  }

  /**
   * Tenta reconectar automaticamente
   */
  private tryReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
      
      logger.info(`Tentando reconectar em ${delay}ms (tentativa ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnect().catch(error => {
          logger.error(`Falha na tentativa de reconexão automática: ${error}`);
        });
      }, delay);
    }
  }

  /**
   * Desconecta do WebSocket
   */
  public async disconnect(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connected = false;
        resolve();
        return;
      }

      this.ws.once('close', () => {
        this.connected = false;
        this.ws = null;
        resolve();
      });

      this.ws.close();
    });
  }

  /**
   * Verifica se o WebSocket está conectado
   */
  public isConnected(): boolean {
    return this.connected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Envia dados pelo WebSocket
   * @param data Dados a serem enviados
   */
  protected send(data: string | Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('WebSocket não está conectado'));
        return;
      }

      this.ws!.send(data, (error) => {
        if (error) {
          logger.error(`Erro ao enviar mensagem: ${error}`);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  // Métodos abstratos que devem ser implementados pelas classes filhas
  protected abstract onOpen(): void;
  protected abstract onMessage(data: WebSocket.Data): void;
  protected abstract onError(error: Error): void;
  protected abstract onClose(code: number, reason: string): void;
} 