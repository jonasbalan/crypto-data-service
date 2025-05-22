import { logger } from '../../utils/logger';
import { CryptoAsset, IPriceData } from '../../models/crypto';

/**
 * Interface para representar dados OHLCV (Open, High, Low, Close, Volume)
 */
export interface OHLCVData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Interface para representar um indicador técnico
 */
export interface TechnicalIndicator {
  name: string;
  values: number[];
  timestamps: string[];
  parameters?: Record<string, any>;
}

/**
 * Obtém dados OHLCV para uma criptomoeda
 */
export async function getOHLCVData(
  symbol: string,
  timeframe: '1h' | '4h' | '1d' | '1w' = '1d',
  limit: number = 100
): Promise<OHLCVData[]> {
  try {
    const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
    
    if (!asset || !asset.priceHistory || asset.priceHistory.length < 2) {
      throw new Error(`Dados insuficientes para ${symbol}`);
    }
    
    // Em uma implementação real, buscaríamos dados OHLCV de uma fonte externa
    // ou de nossa própria base de dados. Para simplificar, vamos simular com os dados existentes.
    
    // Utilizar apenas o preço e volume dos dados disponíveis (simulado)
    const priceHistory = asset.priceHistory.slice(0, limit);
    
    // Simular dados OHLCV
    const ohlcvData: OHLCVData[] = priceHistory.map((ph, index) => {
      // Simular variação intraday em torno do preço de fechamento
      const volatility = ph.price * 0.02; // 2% de volatilidade
      const close = ph.price;
      const open = index > 0 ? priceHistory[index - 1].price : close * (1 - Math.random() * 0.01);
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      
      return {
        timestamp: ph.timestamp.toString(), // Garantir que timestamp seja string
        open,
        high,
        low,
        close,
        volume: ph.volume24h || 0 // Usar volume24h em vez de volume
      };
    });
    
    return ohlcvData;
  } catch (error) {
    logger.error(`Erro ao obter dados OHLCV para ${symbol}:`, error);
    throw error;
  }
}

/**
 * Calcula Média Móvel Simples (SMA)
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN); // Não há SMA para os primeiros (period-1) pontos
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += prices[i - j];
    }
    sma.push(sum / period);
  }
  return sma;
}

/**
 * Calcula Média Móvel Exponencial (EMA)
 */
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Primeiro EMA é SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema.push(sum / period);
  
  // Calcular EMA subsequentes
  for (let i = 1; i < prices.length; i++) {
    ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }
  
  return ema;
}

/**
 * Calcula Índice de Força Relativa (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const changes: number[] = [];
  
  // Calcular mudanças diárias
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  // Inicializar com NaN para os primeiros pontos
  for (let i = 0; i < period; i++) {
    rsi.push(NaN);
  }
  
  // Calcular RSI para o restante dos pontos
  for (let i = period; i < prices.length; i++) {
    let gains = 0;
    let losses = 0;
    
    for (let j = i - period; j < i; j++) {
      if (changes[j] >= 0) {
        gains += changes[j];
      } else {
        losses -= changes[j];
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

/**
 * Calcula Bandas de Bollinger
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle: number[] = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += Math.pow(prices[i - j] - middle[i], 2);
    }
    const standardDeviation = Math.sqrt(sum / period);
    
    upper.push(middle[i] + (standardDeviation * stdDev));
    lower.push(middle[i] - (standardDeviation * stdDev));
  }
  
  return { upper, middle, lower };
}

/**
 * Calcula MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  const macd: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macd.push(fastEMA[i] - slowEMA[i]);
  }
  
  const signal = calculateEMA(macd, signalPeriod);
  
  const histogram: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    histogram.push(macd[i] - signal[i]);
  }
  
  return { macd, signal, histogram };
}

/**
 * Obter indicadores técnicos para um ativo
 */
export async function getTechnicalIndicators(
  symbol: string,
  period: number = 14
): Promise<{
  sma: number[];
  ema: number[];
  rsi: number[];
  bollingerBands: { upper: number[]; middle: number[]; lower: number[] };
  macd: { macd: number[]; signal: number[]; histogram: number[] };
}> {
  try {
    const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
    
    if (!asset || !asset.priceHistory || asset.priceHistory.length < period) {
      throw new Error(`Dados insuficientes para ${symbol}`);
    }
    
    const prices = asset.priceHistory.map(ph => ph.price);
    
    const sma = calculateSMA(prices, period);
    const ema = calculateEMA(prices, period);
    const rsi = calculateRSI(prices, period);
    const bollingerBands = calculateBollingerBands(prices, period);
    const macd = calculateMACD(prices);
    
    return {
      sma,
      ema,
      rsi,
      bollingerBands,
      macd
    };
  } catch (error) {
    logger.error(`Erro ao calcular indicadores técnicos para ${symbol}:`, error);
    throw error;
  }
} 