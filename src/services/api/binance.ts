import axios from 'axios';
import { logger } from '../../utils/logger';
import { getRedisClient } from '../../database/init';
import { IPriceData, ILiquidityData } from '../../models/crypto';

// Interface para resposta da API da Binance para ticker
interface BinanceTickerResponse {
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

// Interface para resposta da API da Binance para o livro de ordens
interface BinanceOrderBookResponse {
  lastUpdateId: number;
  bids: [string, string][]; // [preço, quantidade]
  asks: [string, string][]; // [preço, quantidade]
}

const BINANCE_API_URL = 'https://api.binance.com/api/v3';
const CACHE_TTL = 60; // 1 minuto em segundos

/**
 * Obter dados de ticker de 24h para um ou mais pares de negociação
 * @param symbols Array de símbolos no formato Binance (ex: ['BTCUSDT', 'ETHUSDT'])
 * @returns Dados de preços formatados
 */
export async function getTickers(symbols: string[]): Promise<IPriceData[]> {
  try {
    const redis = getRedisClient();
    const cacheKey = `binance:tickers:${symbols.join(',')}`;
    
    // Verificar cache (apenas se Redis estiver disponível)
    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Retornando tickers da Binance do cache');
        return JSON.parse(cachedData);
      }
    }
    
    // Consultar todos os tickers
    const response = await axios.get<BinanceTickerResponse[]>(`${BINANCE_API_URL}/ticker/24hr`);
    
    // Filtrar tickers solicitados
    const filteredTickers = response.data.filter(ticker => 
      symbols.includes(ticker.symbol)
    );
    
    // Formatar para nosso modelo padrão
    const priceData: IPriceData[] = filteredTickers.map(ticker => ({
      price: parseFloat(ticker.lastPrice),
      volume24h: parseFloat(ticker.quoteVolume),
      marketCap: 0, // Binance não fornece market cap
      change24h: parseFloat(ticker.priceChangePercent),
      change7d: 0, // Não disponível nesta API
      timestamp: new Date(ticker.closeTime),
      source: 'binance'
    }));
    
    // Salvar no cache (apenas se Redis estiver disponível)
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(priceData), 'EX', CACHE_TTL);
    }
    
    return priceData;
  } catch (error) {
    logger.error('Erro ao obter tickers da Binance:', error);
    throw error;
  }
}

/**
 * Obter dados de liquidez a partir do livro de ordens
 * @param symbol Símbolo no formato Binance (ex: 'BTCUSDT')
 * @param depth Profundidade do livro de ordens (default: 500)
 * @returns Dados de liquidez
 */
export async function getOrderBookLiquidity(symbol: string, depth: number = 500): Promise<ILiquidityData> {
  try {
    const redis = getRedisClient();
    const cacheKey = `binance:orderbook:${symbol}:${depth}`;
    
    // Verificar cache (apenas se Redis estiver disponível)
    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Retornando dados de liquidez do cache');
        return JSON.parse(cachedData);
      }
    }
    
    // Consultar livro de ordens
    const response = await axios.get<BinanceOrderBookResponse>(`${BINANCE_API_URL}/depth`, {
      params: {
        symbol,
        limit: depth
      }
    });
    
    // Calcular liquidez total (soma de bids e asks)
    const bidsLiquidity = response.data.bids.reduce(
      (total, [price, qty]) => total + parseFloat(price) * parseFloat(qty),
      0
    );
    
    const asksLiquidity = response.data.asks.reduce(
      (total, [price, qty]) => total + parseFloat(price) * parseFloat(qty),
      0
    );
    
    const totalLiquidity = bidsLiquidity + asksLiquidity;
    
    // Calcular impacto de preço para uma ordem de 10000 USDT
    const orderSize = 10000;
    let remainingOrder = orderSize;
    let totalCost = 0;
    
    // Simular ordem de compra para calcular impacto
    for (const [price, qty] of response.data.asks) {
      const priceFloat = parseFloat(price);
      const qtyFloat = parseFloat(qty);
      const qtyValue = priceFloat * qtyFloat;
      
      if (qtyValue >= remainingOrder) {
        totalCost += remainingOrder;
        break;
      }
      
      totalCost += qtyValue;
      remainingOrder -= qtyValue;
    }
    
    // Calcular impacto de preço
    const priceImpact = ((totalCost / orderSize) - 1) * 100;
    
    const liquidityData: ILiquidityData = {
      exchange: 'binance',
      pair: symbol,
      totalLiquidity,
      priceImpact,
      timestamp: new Date()
    };
    
    // Salvar no cache (apenas se Redis estiver disponível)
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(liquidityData), 'EX', CACHE_TTL);
    }
    
    return liquidityData;
  } catch (error) {
    logger.error('Erro ao obter dados de liquidez da Binance:', error);
    throw error;
  }
}

/**
 * Obter candles OHLCV históricos da Binance
 * @param symbol Símbolo no formato Binance (ex: 'BTCUSDT')
 * @param interval Intervalo dos candles (ex: '1d', '1h', '5m')
 * @param limit Quantidade de candles (máx 1000)
 * @returns Array de OHLCVData
 */
export async function getOHLCV(symbol: string, interval: string = '1d', limit: number = 200): Promise<{
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}[]> {
  try {
    const response = await axios.get(`${BINANCE_API_URL}/klines`, {
      params: {
        symbol,
        interval,
        limit
      }
    });
    // Cada candle: [openTime, open, high, low, close, volume, closeTime, ...]
    return response.data.map((candle: any[]) => ({
      timestamp: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
    }));
  } catch (error) {
    logger.error('Erro ao obter OHLCV da Binance:', error);
    throw error;
  }
} 