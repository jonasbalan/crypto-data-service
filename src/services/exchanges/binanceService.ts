import axios from 'axios';
import WebSocket from 'ws';
import { logger } from '../../utils/logger';
import { broadcastUpdate } from '../../websocket';
import { CryptoAsset } from '../../models/crypto';
import { BaseExchange } from './exchanges';

// URLs da API
const BINANCE_API_URL = 'https://api.binance.com';
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

// Websockets ativos
let marketStreams: { [key: string]: WebSocket } = {};

/**
 * Implementação da Exchange Binance
 */
export class BinanceExchange extends BaseExchange {
  constructor(apiKey: string, apiSecret: string) {
    super({
      name: 'Binance',
      apiKey,
      apiSecret,
      baseUrl: BINANCE_API_URL,
      wsUrl: BINANCE_WS_URL,
      rateLimit: 1000, // 1 requisição por segundo
      defaultSymbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']
    });
  }
  
  async getTicker(symbol: string): Promise<any> {
    const ticker = await get24hTicker(symbol);
    return {
      symbol: ticker.symbol,
      price: parseFloat(ticker.lastPrice),
      volume: parseFloat(ticker.volume),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      change24h: parseFloat(ticker.priceChangePercent),
      bid: parseFloat(ticker.bidPrice),
      ask: parseFloat(ticker.askPrice),
      timestamp: new Date(ticker.closeTime).toISOString(),
      source: this.getName()
    };
  }
  
  async getCandles(symbol: string, interval: string, limit = 100): Promise<any[]> {
    const klines = await getKlines(symbol, interval as any, limit);
    return klines.map(k => ({
      symbol,
      timestamp: new Date(k.closeTime).toISOString(),
      interval,
      open: parseFloat(k.open),
      high: parseFloat(k.high),
      low: parseFloat(k.low),
      close: parseFloat(k.close),
      volume: parseFloat(k.volume),
      source: this.getName()
    }));
  }
  
  async subscribeToTicker(symbol: string): Promise<void> {
    startPriceStream(symbol);
  }
  
  async subscribeToCandles(symbol: string, interval: string): Promise<void> {
    // Implementação de subscrição a candles estaria aqui
    logger.info(`Subscrevendo a candles ${interval} para ${symbol} no Binance`);
  }
  
  async unsubscribe(channel: string, symbol: string): Promise<void> {
    stopPriceStream(symbol);
  }
}

/**
 * Interface para dados de ticker da Binance
 */
interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

/**
 * Interface para klines/candles da Binance
 */
interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  trades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

/**
 * Obtém preços atuais de todos os pares da Binance
 */
export async function getAllPrices(): Promise<{ symbol: string; price: number }[]> {
  try {
    const response = await axios.get(`${BINANCE_API_URL}/api/v3/ticker/price`);
    
    if (response.status !== 200) {
      throw new Error(`Erro ao buscar preços: ${response.statusText}`);
    }
    
    // Converter preços para números
    return response.data.map((item: { symbol: string; price: string }) => ({
      symbol: item.symbol,
      price: parseFloat(item.price)
    }));
  } catch (error) {
    logger.error('Erro ao buscar preços da Binance:', error);
    throw error;
  }
}

/**
 * Obtém dados de ticker de 24h para um símbolo
 */
export async function get24hTicker(symbol: string): Promise<BinanceTicker> {
  try {
    const response = await axios.get(`${BINANCE_API_URL}/api/v3/ticker/24hr`, {
      params: { symbol: symbol.toUpperCase() }
    });
    
    if (response.status !== 200) {
      throw new Error(`Erro ao buscar ticker: ${response.statusText}`);
    }
    
    return response.data;
  } catch (error) {
    logger.error(`Erro ao buscar ticker 24h para ${symbol}:`, error);
    throw error;
  }
}

/**
 * Obtém candles/klines para um símbolo
 */
export async function getKlines(
  symbol: string,
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w',
  limit: number = 100
): Promise<BinanceKline[]> {
  try {
    const response = await axios.get(`${BINANCE_API_URL}/api/v3/klines`, {
      params: {
        symbol: symbol.toUpperCase(),
        interval,
        limit
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Erro ao buscar klines: ${response.statusText}`);
    }
    
    // Transformar a resposta no formato adequado
    return response.data.map((k: any[]) => ({
      openTime: k[0],
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
      closeTime: k[6],
      quoteAssetVolume: k[7],
      trades: k[8],
      takerBuyBaseAssetVolume: k[9],
      takerBuyQuoteAssetVolume: k[10]
    }));
  } catch (error) {
    logger.error(`Erro ao buscar klines para ${symbol}:`, error);
    throw error;
  }
}

/**
 * Iniciar stream WebSocket para atualizações de preço em tempo real
 */
export function startPriceStream(symbol: string): void {
  try {
    const formattedSymbol = symbol.toLowerCase();
    const streamUrl = `${BINANCE_WS_URL}/${formattedSymbol}@ticker`;
    
    // Verificar se já existe stream para este símbolo
    if (marketStreams[formattedSymbol]) {
      logger.info(`Stream já existente para ${symbol}`);
      return;
    }
    
    // Criar nova conexão WebSocket
    const ws = new WebSocket(streamUrl);
    
    ws.on('open', () => {
      logger.info(`Stream da Binance iniciado para ${symbol}`);
      marketStreams[formattedSymbol] = ws;
    });
    
    ws.on('message', async (data: WebSocket.Data) => {
      try {
        // Converter dados recebidos para JSON
        const tickerData = JSON.parse(data.toString());
        
        // Extrair dados relevantes
        const price = parseFloat(tickerData.c); // preço atual
        const priceChange = parseFloat(tickerData.p); // variação absoluta
        const priceChangePercent = parseFloat(tickerData.P); // variação percentual
        const volume = parseFloat(tickerData.v); // volume 24h em moeda base
        const quoteVolume = parseFloat(tickerData.q); // volume 24h em moeda de cotação
        
        // Atualizar ativo no banco de dados
        const upperSymbol = formattedSymbol.toUpperCase();
        
        // Buscar ativo
        const asset = await CryptoAsset.findOne({ symbol: upperSymbol });
        
        if (asset) {
          // Calcular market cap (simulado, pois a Binance não fornece)
          const marketCap = asset.circulatingSupply ? asset.circulatingSupply * price : 0;
          
          // Atualizar preço
          asset.currentPrice = price;
          
          // Atualizar histórico de preço
          if (!asset.priceHistory) {
            asset.priceHistory = [];
          }
          
          // Adicionar novo registro de preço
          asset.priceHistory.unshift({
            price,
            volume24h: quoteVolume,
            change24h: priceChangePercent,
            timestamp: new Date(),
            marketCap,
            change7d: asset.priceHistory[0]?.change7d || 0,
            source: 'binance'
          });
          
          // Limitar histórico
          if (asset.priceHistory.length > 100) {
            asset.priceHistory = asset.priceHistory.slice(0, 100);
          }
          
          // Salvar ativo
          await asset.save();
          
          // Enviar notificação via WebSocket para clientes
          broadcastUpdate(
            upperSymbol,
            'price',
            {
              price,
              volume24h: quoteVolume,
              change24h: priceChangePercent,
              marketCap,
              timestamp: new Date().toISOString()
            }
          );
        }
      } catch (error) {
        logger.error(`Erro ao processar dados do stream ${symbol}:`, error);
      }
    });
    
    ws.on('error', (error) => {
      logger.error(`Erro no stream da Binance para ${symbol}:`, error);
      
      // Remover referência ao stream com erro
      delete marketStreams[formattedSymbol];
      
      // Tentar reconectar após 30 segundos
      setTimeout(() => {
        startPriceStream(symbol);
      }, 30000);
    });
    
    ws.on('close', () => {
      logger.info(`Stream da Binance fechado para ${symbol}`);
      
      // Remover referência
      delete marketStreams[formattedSymbol];
      
      // Tentar reconectar após 5 segundos
      setTimeout(() => {
        startPriceStream(symbol);
      }, 5000);
    });
  } catch (error) {
    logger.error(`Erro ao iniciar stream para ${symbol}:`, error);
  }
}

/**
 * Parar stream WebSocket para um símbolo
 */
export function stopPriceStream(symbol: string): void {
  const formattedSymbol = symbol.toLowerCase();
  
  if (marketStreams[formattedSymbol]) {
    try {
      marketStreams[formattedSymbol].close();
      delete marketStreams[formattedSymbol];
      logger.info(`Stream da Binance para ${symbol} encerrado`);
    } catch (error) {
      logger.error(`Erro ao encerrar stream para ${symbol}:`, error);
    }
  }
}

/**
 * Iniciar streams para múltiplos símbolos
 */
export async function startAllPriceStreams(): Promise<void> {
  try {
    // Buscar todos os ativos
    const assets = await CryptoAsset.find({});
    
    // Iniciar streams para cada ativo
    for (const asset of assets) {
      if (asset.exchange === 'binance') {
        startPriceStream(asset.symbol);
        
        // Pequeno intervalo para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    logger.info(`Iniciados ${assets.length} streams da Binance`);
  } catch (error) {
    logger.error('Erro ao iniciar streams da Binance:', error);
  }
}

/**
 * Parar todos os streams ativos
 */
export function stopAllPriceStreams(): void {
  Object.keys(marketStreams).forEach(symbol => {
    try {
      marketStreams[symbol].close();
    } catch (error) {
      logger.error(`Erro ao encerrar stream para ${symbol}:`, error);
    }
  });
  
  // Limpar lista de streams
  marketStreams = {};
  logger.info('Todos os streams da Binance foram encerrados');
}

/**
 * Sincroniza dados de todos os ativos da Binance
 */
export async function syncBinanceAssets(): Promise<void> {
  try {
    // Obter lista de todos os tickers
    const tickers = await axios.get(`${BINANCE_API_URL}/api/v3/ticker/24hr`);
    
    if (tickers.status !== 200) {
      throw new Error(`Erro ao buscar tickers: ${tickers.statusText}`);
    }
    
    logger.info(`Sincronizando ${tickers.data.length} ativos da Binance`);
    
    // Processar apenas pares com USDT para simplificar
    const usdtPairs = tickers.data.filter((ticker: BinanceTicker) => 
      ticker.symbol.endsWith('USDT')
    );
    
    // Atualizar ou criar cada ativo
    for (const ticker of usdtPairs) {
      const symbol = ticker.symbol.replace('USDT', '');
      
      // Verificar se o ativo já existe
      let asset = await CryptoAsset.findOne({ symbol });
      
      if (!asset) {
        // Criar novo ativo
        asset = new CryptoAsset({
          symbol,
          name: symbol, // Nome simplificado, idealmente buscaríamos de outra API
          currentPrice: parseFloat(ticker.lastPrice),
          exchange: 'binance',
          chainId: 'unknown', // Precisaríamos mapear
          priceHistory: []
        });
      } else {
        // Atualizar preço
        asset.currentPrice = parseFloat(ticker.lastPrice);
        asset.exchange = 'binance';
      }
      
      // Calcular marketCap (simulado)
      const marketCap = 0; // Precisaríamos de dados de circulating supply
      
      // Adicionar histórico de preço
      if (!asset.priceHistory) {
        asset.priceHistory = [];
      }
      
      // Adicionar novo registro apenas se for o primeiro ou se preço mudou
      if (
        asset.priceHistory.length === 0 || 
        asset.priceHistory[0].price !== parseFloat(ticker.lastPrice)
      ) {
        asset.priceHistory.unshift({
          price: parseFloat(ticker.lastPrice),
          volume24h: parseFloat(ticker.quoteVolume),
          change24h: parseFloat(ticker.priceChangePercent),
          timestamp: new Date(),
          marketCap,
          change7d: 0, // Precisaríamos calcular
          source: 'binance'
        });
        
        // Limitar histórico
        if (asset.priceHistory.length > 100) {
          asset.priceHistory = asset.priceHistory.slice(0, 100);
        }
      }
      
      // Salvar ativo
      await asset.save();
    }
    
    logger.info(`Sincronização da Binance concluída: ${usdtPairs.length} ativos processados`);
  } catch (error) {
    logger.error('Erro ao sincronizar ativos da Binance:', error);
    throw error;
  }
} 