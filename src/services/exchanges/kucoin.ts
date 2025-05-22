import { createHmac } from 'crypto';
import WebSocket from 'ws';
import { BaseExchange, ExchangeConfig, TickerData, CandleData } from './exchanges';
import { logger } from '../../utils/logger';

/**
 * Implementação da exchange KuCoin
 */
export class KuCoinExchange extends BaseExchange {
  private websocketAPI: string | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  
  constructor(apiKey?: string, apiSecret?: string) {
    const config: ExchangeConfig = {
      name: 'KuCoin',
      apiKey,
      apiSecret,
      baseUrl: 'https://api.kucoin.com',
      wsUrl: 'wss://ws-api.kucoin.com',
      rateLimit: 100, // 100ms entre requisições (até 10 req/s)
      defaultSymbols: ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'BNB-USDT', 'XRP-USDT']
    };
    
    super(config);
  }
  
  /**
   * Gera assinatura para autenticação
   */
  private generateSignature(
    timestamp: number,
    method: string,
    endpoint: string,
    data: string = ''
  ): string {
    if (!this.apiSecret) {
      throw new Error('API Secret não configurado');
    }
    
    const message = `${timestamp}${method}${endpoint}${data}`;
    return createHmac('sha256', this.apiSecret).update(message).digest('base64');
  }
  
  /**
   * Adiciona cabeçalhos de autenticação para requisições autenticadas
   */
  private getAuthHeaders(
    method: string,
    endpoint: string,
    data: string = ''
  ): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('API Key não configurada');
    }
    
    const timestamp = Date.now();
    const signature = this.generateSignature(timestamp, method, endpoint, data);
    
    return {
      'KC-API-KEY': this.apiKey,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp.toString(),
      'KC-API-PASSPHRASE': this.apiSecret || '' // Na implementação real, seria o passphrase real
    };
  }
  
  /**
   * Obtém token para conexão WebSocket
   */
  private async getWebsocketToken(): Promise<{
    token: string;
    instanceServers: Array<{
      endpoint: string;
      pingInterval: number;
      pingTimeout: number;
    }>;
  }> {
    try {
      const endpoint = '/api/v1/bullet-public';
      const response = await this.makeRequest(endpoint, 'POST');
      
      if (!response || !response.data || !response.data.token) {
        throw new Error('Falha ao obter token WebSocket');
      }
      
      return {
        token: response.data.token,
        instanceServers: response.data.instanceServers
      };
    } catch (error) {
      logger.error('Erro ao obter token WebSocket do KuCoin:', error);
      throw error;
    }
  }
  
  /**
   * Inicializa conexão WebSocket
   */
  private async initWebsocket(): Promise<string> {
    if (this.websocketAPI) {
      return this.websocketAPI;
    }
    
    try {
      const { token, instanceServers } = await this.getWebsocketToken();
      if (!instanceServers || !instanceServers.length) {
        throw new Error('Nenhum servidor WebSocket disponível');
      }
      
      const server = instanceServers[0];
      this.websocketAPI = `${server.endpoint}?token=${token}`;
      
      // Configurar ping para manter conexão ativa
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }
      
      this.pingInterval = setInterval(() => {
        for (const ws of this.wsConnections.values()) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          }
        }
      }, server.pingInterval);
      
      return this.websocketAPI;
    } catch (error) {
      logger.error('Erro ao inicializar WebSocket KuCoin:', error);
      throw error;
    }
  }
  
  /**
   * Implementação do método getTicker
   */
  public async getTicker(symbol: string): Promise<TickerData> {
    try {
      const formattedSymbol = symbol.replace('-', '');
      const endpoint = `/api/v1/market/orderbook/level1?symbol=${formattedSymbol}`;
      const response = await this.makeRequest(endpoint);
      
      if (!response || !response.data) {
        throw new Error(`Dados de ticker inválidos para ${symbol}`);
      }
      
      const data = response.data;
      return {
        symbol,
        price: parseFloat(data.price),
        volume: parseFloat(data.size || 0),
        high24h: undefined, // Não disponível neste endpoint
        low24h: undefined,  // Não disponível neste endpoint
        change24h: undefined, // Não disponível neste endpoint
        bid: parseFloat(data.bestBid || 0),
        ask: parseFloat(data.bestAsk || 0),
        timestamp: new Date(data.time).toISOString(),
        source: this.name
      };
    } catch (error) {
      logger.error(`Erro ao obter ticker do KuCoin para ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Implementação do método getCandles
   */
  public async getCandles(
    symbol: string,
    interval: string = '1day',
    limit: number = 100
  ): Promise<CandleData[]> {
    try {
      // Mapear intervalos para formato KuCoin
      const intervalMap: Record<string, string> = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '30m': '30min',
        '1h': '1hour',
        '2h': '2hour',
        '4h': '4hour',
        '12h': '12hour',
        '1d': '1day',
        '1w': '1week'
      };
      
      const kuCoinInterval = intervalMap[interval] || '1day';
      const endpoint = `/api/v1/market/candles?symbol=${symbol}&type=${kuCoinInterval}&limit=${limit}`;
      const response = await this.makeRequest(endpoint);
      
      if (!response || !response.data) {
        throw new Error(`Dados de candles inválidos para ${symbol}`);
      }
      
      // Formato KuCoin: [timestamp, open, close, high, low, volume, turnover]
      return response.data.map((candle: any) => ({
        symbol,
        timestamp: new Date(parseInt(candle[0]) * 1000).toISOString(),
        interval,
        open: parseFloat(candle[1]),
        high: parseFloat(candle[3]),
        low: parseFloat(candle[4]),
        close: parseFloat(candle[2]),
        volume: parseFloat(candle[5]),
        source: this.name
      }));
    } catch (error) {
      logger.error(`Erro ao obter candles do KuCoin para ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Implementação do método subscribeToTicker
   */
  public async subscribeToTicker(symbol: string): Promise<void> {
    try {
      const wsEndpoint = await this.initWebsocket();
      const channel = `ticker:${symbol}`;
      
      if (this.wsConnections.has(channel)) {
        logger.debug(`Já inscrito no canal ${channel} do KuCoin`);
        return;
      }
      
      const ws = new WebSocket(wsEndpoint);
      
      ws.on('open', () => {
        logger.info(`Conexão WebSocket KuCoin aberta para ${channel}`);
        
        // Enviar mensagem de inscrição
        ws.send(JSON.stringify({
          id: Date.now(),
          type: 'subscribe',
          topic: `/market/ticker:${symbol}`,
          privateChannel: false,
          response: true
        }));
      });
      
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'message' && message.subject === 'trade.ticker') {
            const ticker: TickerData = {
              symbol,
              price: parseFloat(message.data.price),
              volume: parseFloat(message.data.size || 0),
              high24h: undefined,
              low24h: undefined,
              change24h: undefined,
              bid: parseFloat(message.data.bestBid || 0),
              ask: parseFloat(message.data.bestAsk || 0),
              timestamp: new Date(message.data.time).toISOString(),
              source: this.name
            };
            
            this.emit('ticker', ticker);
          }
        } catch (error) {
          logger.error(`Erro ao processar mensagem WebSocket KuCoin:`, error);
        }
      });
      
      ws.on('error', (error) => {
        logger.error(`Erro na conexão WebSocket KuCoin para ${channel}:`, error);
      });
      
      ws.on('close', () => {
        logger.info(`Conexão WebSocket KuCoin fechada para ${channel}`);
        this.wsConnections.delete(channel);
      });
      
      this.wsConnections.set(channel, ws);
    } catch (error) {
      logger.error(`Erro ao inscrever-se em ticker ${symbol} do KuCoin:`, error);
      throw error;
    }
  }
  
  /**
   * Implementação do método subscribeToCandles
   */
  public async subscribeToCandles(symbol: string, interval: string = '1day'): Promise<void> {
    try {
      const wsEndpoint = await this.initWebsocket();
      const channel = `kline:${symbol}:${interval}`;
      
      if (this.wsConnections.has(channel)) {
        logger.debug(`Já inscrito no canal ${channel} do KuCoin`);
        return;
      }
      
      // Mapear intervalos para formato KuCoin
      const intervalMap: Record<string, string> = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '30m': '30min',
        '1h': '1hour',
        '2h': '2hour',
        '4h': '4hour',
        '12h': '12hour',
        '1d': '1day',
        '1w': '1week'
      };
      
      const kuCoinInterval = intervalMap[interval] || '1day';
      const ws = new WebSocket(wsEndpoint);
      
      ws.on('open', () => {
        logger.info(`Conexão WebSocket KuCoin aberta para ${channel}`);
        
        // Enviar mensagem de inscrição
        ws.send(JSON.stringify({
          id: Date.now(),
          type: 'subscribe',
          topic: `/market/candles:${symbol}_${kuCoinInterval}`,
          privateChannel: false,
          response: true
        }));
      });
      
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'message' && message.subject === 'trade.candles.update') {
            const candle: CandleData = {
              symbol,
              timestamp: new Date(parseInt(message.data[0]) * 1000).toISOString(),
              interval,
              open: parseFloat(message.data[1]),
              high: parseFloat(message.data[3]),
              low: parseFloat(message.data[4]),
              close: parseFloat(message.data[2]),
              volume: parseFloat(message.data[5]),
              source: this.name
            };
            
            this.emit('candle', candle);
          }
        } catch (error) {
          logger.error(`Erro ao processar mensagem WebSocket KuCoin:`, error);
        }
      });
      
      ws.on('error', (error) => {
        logger.error(`Erro na conexão WebSocket KuCoin para ${channel}:`, error);
      });
      
      ws.on('close', () => {
        logger.info(`Conexão WebSocket KuCoin fechada para ${channel}`);
        this.wsConnections.delete(channel);
      });
      
      this.wsConnections.set(channel, ws);
    } catch (error) {
      logger.error(`Erro ao inscrever-se em candles ${symbol} do KuCoin:`, error);
      throw error;
    }
  }
  
  /**
   * Implementação do método unsubscribe
   */
  public async unsubscribe(channel: string, symbol: string): Promise<void> {
    try {
      const fullChannel = `${channel}:${symbol}`;
      
      const ws = this.wsConnections.get(fullChannel);
      if (!ws) {
        logger.debug(`Não inscrito no canal ${fullChannel} do KuCoin`);
        return;
      }
      
      // Se a conexão estiver aberta, enviar mensagem de cancelamento de inscrição
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          id: Date.now(),
          type: 'unsubscribe',
          topic: channel === 'ticker' 
            ? `/market/ticker:${symbol}` 
            : `/market/candles:${symbol}_1day`,
          privateChannel: false,
          response: true
        }));
        
        // Fechar conexão
        ws.close();
      }
      
      this.wsConnections.delete(fullChannel);
    } catch (error) {
      logger.error(`Erro ao cancelar inscrição em ${channel}:${symbol} do KuCoin:`, error);
      throw error;
    }
  }
} 