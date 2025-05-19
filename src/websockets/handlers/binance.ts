import { WebSocketHandlerBase } from './base';
import { logger } from '../../utils/logger';
import { CryptoAsset } from '../../models/crypto';
import { getRedisClient } from '../../database/init';
import WebSocket from 'ws';

// Interface para mensagem do ticker da Binance
interface BinanceTickerMessage {
  e: string; // Tipo de evento
  E: number; // Timestamp do evento
  s: string; // Símbolo
  p: string; // Mudança de preço
  P: string; // Percentual de mudança de preço
  w: string; // Preço médio ponderado
  c: string; // Preço de fechamento (último preço)
  Q: string; // Quantidade do fechamento
  o: string; // Preço de abertura
  h: string; // Preço mais alto
  l: string; // Preço mais baixo
  v: string; // Volume
  q: string; // Volume em unidade base
  O: number; // Timestamp de abertura
  C: number; // Timestamp de fechamento
  F: number; // Primeiro ID de negociação
  L: number; // Último ID de negociação
  n: number; // Número de negociações
}

// Interface para mensagem de negociação da Binance
interface BinanceTradeMessage {
  e: string; // Tipo de evento
  E: number; // Timestamp do evento
  s: string; // Símbolo
  t: number; // ID da negociação
  p: string; // Preço
  q: string; // Quantidade
  b: number; // ID do comprador
  a: number; // ID do vendedor
  T: number; // Timestamp da negociação
  m: boolean; // O comprador foi market maker?
  M: boolean; // Ignorar
}

/**
 * Handler para WebSocket da Binance
 */
export class BinanceWebSocketHandler extends WebSocketHandlerBase {
  private symbols: string[] = ['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'adausdt'];
  private channels: string[] = ['ticker', 'trade'];
  private streams: string[] = [];

  /**
   * Construtor para o handler da Binance
   */
  constructor() {
    // URL do WebSocket da Binance com streams combinados
    const symbols = ['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'adausdt'];
    const channels = ['ticker', 'trade'];
    const streams: string[] = [];
    
    // Gerar os streams para os símbolos e canais configurados
    for (const symbol of symbols) {
      for (const channel of channels) {
        streams.push(`${symbol}@${channel}`);
      }
    }
    
    const url = `wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`;
    super(url);
    
    // Inicializar propriedades da classe após super()
    this.symbols = symbols;
    this.channels = channels;
    this.streams = streams;
  }

  /**
   * Manipulador para evento de abertura de conexão
   */
  protected onOpen(): void {
    logger.info('Conexão WebSocket da Binance estabelecida');
    // Não é necessário enviar mensagem de subscrição, pois já está na URL
  }

  /**
   * Manipulador para mensagens recebidas
   * @param data Dados recebidos
   */
  protected onMessage(data: WebSocket.Data): void {
    try {
      // Converter os dados para objeto
      const message = JSON.parse(data.toString());
      
      // Processar a mensagem com base no tipo de stream
      if (message && message.data) {
        const streamName = message.stream;
        const streamData = message.data;
        
        if (streamName.includes('@ticker')) {
          this.processTickerMessage(streamData as BinanceTickerMessage);
        } else if (streamName.includes('@trade')) {
          this.processTradeMessage(streamData as BinanceTradeMessage);
        }
      }
    } catch (error) {
      logger.error('Erro ao processar mensagem WebSocket da Binance:', error);
    }
  }

  /**
   * Manipulador para erros na conexão
   * @param error Objeto de erro
   */
  protected onError(error: Error): void {
    logger.error(`Erro no WebSocket da Binance: ${error.message}`);
  }

  /**
   * Manipulador para fechamento da conexão
   * @param code Código de fechamento
   * @param reason Razão do fechamento
   */
  protected onClose(code: number, reason: string): void {
    logger.warn(`WebSocket da Binance fechado: ${code} - ${reason}`);
  }

  /**
   * Processa mensagens de ticker
   * @param message Mensagem de ticker
   */
  private async processTickerMessage(message: BinanceTickerMessage): Promise<void> {
    try {
      const symbol = message.s.toLowerCase();
      const price = parseFloat(message.c);
      const timestamp = new Date(message.E);
      
      // Criar objeto de dados de preço
      const priceData = {
        price,
        volume24h: parseFloat(message.q),
        marketCap: 0, // Não disponível diretamente
        change24h: parseFloat(message.P),
        change7d: 0, // Não disponível nesta mensagem
        timestamp,
        source: 'binance'
      };
      
      // Publicar dados para Redis pub/sub
      const redis = getRedisClient();
      await redis.publish('crypto:price:update', JSON.stringify({
        symbol,
        data: priceData
      }));
      
      // Emitir evento para outros componentes internos
      this.emit('price_update', symbol, priceData);
      
      // Atualizar no banco de dados se o preço mudou significativamente (> 0.5%)
      await this.updatePriceInDatabase(symbol, priceData);
      
      logger.debug(`Atualização de preço da Binance: ${symbol} = $${price}`);
    } catch (error) {
      logger.error('Erro ao processar mensagem de ticker:', error);
    }
  }

  /**
   * Processa mensagens de negociação
   * @param message Mensagem de negociação
   */
  private async processTradeMessage(message: BinanceTradeMessage): Promise<void> {
    try {
      const symbol = message.s.toLowerCase();
      const price = parseFloat(message.p);
      const quantity = parseFloat(message.q);
      const timestamp = new Date(message.T);
      const isBuyerMaker = message.m;
      
      // Criar objeto de dados de negociação
      const tradeData = {
        symbol,
        price,
        quantity,
        value: price * quantity,
        isBuyerMaker,
        timestamp,
        source: 'binance'
      };
      
      // Publicar dados para Redis pub/sub
      const redis = getRedisClient();
      await redis.publish('crypto:trade:new', JSON.stringify({
        symbol,
        data: tradeData
      }));
      
      // Emitir evento para outros componentes internos
      this.emit('trade', symbol, tradeData);
      
      logger.debug(`Nova negociação na Binance: ${symbol} - ${quantity} @ $${price}`);
    } catch (error) {
      logger.error('Erro ao processar mensagem de negociação:', error);
    }
  }

  /**
   * Atualiza o preço no banco de dados
   * @param symbol Símbolo da criptomoeda
   * @param priceData Dados de preço
   */
  private async updatePriceInDatabase(symbol: string, priceData: any): Promise<void> {
    try {
      // Identificar a correspondência entre o símbolo da Binance e nosso formato padrão
      // Ex: btcusdt -> BTC
      const standardSymbol = symbol.replace(/usdt$|busd$|usdc$/i, '').toUpperCase();
      
      // Buscar e atualizar o ativo no banco de dados
      const asset = await CryptoAsset.findOne({ symbol: standardSymbol });
      
      if (asset) {
        // Verificar se o preço mudou significativamente (> 0.5%)
        const priceDiffPercent = Math.abs((priceData.price - asset.currentPrice) / asset.currentPrice * 100);
        
        if (priceDiffPercent > 0.5) {
          // Atualizar preço atual
          asset.currentPrice = priceData.price;
          
          // Adicionar ao histórico de preços
          asset.priceHistory.push({
            price: priceData.price,
            volume24h: priceData.volume24h,
            marketCap: priceData.marketCap,
            change24h: priceData.change24h,
            change7d: priceData.change7d,
            timestamp: priceData.timestamp,
            source: priceData.source
          });
          
          // Limitar tamanho do histórico (manter apenas últimos 1000 registros)
          if (asset.priceHistory.length > 1000) {
            asset.priceHistory = asset.priceHistory.slice(-1000);
          }
          
          // Atualizar data da última modificação
          asset.lastUpdated = new Date();
          
          // Salvar no banco de dados
          await asset.save();
          
          logger.info(`Preço atualizado no banco de dados: ${standardSymbol} = $${priceData.price}`);
        }
      }
    } catch (error) {
      logger.error(`Erro ao atualizar preço no banco de dados para ${symbol}:`, error);
    }
  }
} 