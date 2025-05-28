import * as Redis from 'redis';
import { performance } from 'perf_hooks';

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicatorResult {
  name: string;
  values: number[];
  timestamps: number[];
  parameters: Record<string, any>;
  signals: TechnicalSignal[];
}

export interface TechnicalSignal {
  timestamp: number;
  type: 'buy' | 'sell' | 'neutral';
  strength: number; // 0-1
  description: string;
  price: number;
}

export interface IchimokuCloud {
  tenkanSen: number[];
  kijunSen: number[];
  senkouSpanA: number[];
  senkouSpanB: number[];
  chikouSpan: number[];
  signals: TechnicalSignal[];
}

export interface FibonacciRetracement {
  levels: {
    level: number;
    price: number;
    label: string;
  }[];
  trend: 'uptrend' | 'downtrend';
  highPrice: number;
  lowPrice: number;
  signals: TechnicalSignal[];
}

export interface AdvancedIndicators {
  ichimoku: IchimokuCloud;
  fibonacci: FibonacciRetracement;
  stochastic: TechnicalIndicatorResult;
  williamsr: TechnicalIndicatorResult;
  cci: TechnicalIndicatorResult;
  adx: TechnicalIndicatorResult;
  parabolicSar: TechnicalIndicatorResult;
}

class TechnicalIndicatorsService {
  private static instance: TechnicalIndicatorsService;
  private redis?: any;
  private cache: Map<string, any> = new Map();

  private constructor() {
    this.initializeRedis();
  }

  public static getInstance(): TechnicalIndicatorsService {
    if (!TechnicalIndicatorsService.instance) {
      TechnicalIndicatorsService.instance = new TechnicalIndicatorsService();
    }
    return TechnicalIndicatorsService.instance;
  }

  private async initializeRedis() {
    // Pular Redis se estiver em modo sem Docker
    if (process.env.SKIP_REDIS_CONNECTION === 'true' || process.env.SKIP_DATABASE_CONNECTION === 'true') {
      console.log('🚫 Redis desabilitado para indicadores técnicos (modo sem Docker)');
      return;
    }

    try {
      const redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      redis.on('error', (err: any) => {
        console.error('Redis connection error (technical indicators):', err);
      });

      await redis.connect();
      this.redis = redis;
      console.log('✅ Redis conectado para indicadores técnicos');
    } catch (error) {
      console.warn('⚠️ Redis não disponível para indicadores técnicos:', error);
    }
  }

  // Ichimoku Cloud
  public calculateIchimoku(data: OHLCVData[], tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52): IchimokuCloud {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);
    
    // Tenkan-sen (Conversion Line)
    const tenkanSen = this.calculateDonchianMidpoint(highs, lows, tenkanPeriod);
    
    // Kijun-sen (Base Line)
    const kijunSen = this.calculateDonchianMidpoint(highs, lows, kijunPeriod);
    
    // Senkou Span A (Leading Span A)
    const senkouSpanA = tenkanSen.map((tenkan, i) => 
      (tenkan + kijunSen[i]) / 2
    );
    
    // Senkou Span B (Leading Span B)
    const senkouSpanB = this.calculateDonchianMidpoint(highs, lows, senkouBPeriod);
    
    // Chikou Span (Lagging Span) - deslocado 26 períodos para trás
    const chikouSpan = [...closes.slice(kijunPeriod), ...Array(kijunPeriod).fill(NaN)];
    
    // Gerar sinais
    const signals = this.generateIchimokuSignals(data, tenkanSen, kijunSen, senkouSpanA, senkouSpanB, closes);

    return {
      tenkanSen,
      kijunSen,
      senkouSpanA,
      senkouSpanB,
      chikouSpan,
      signals
    };
  }

  private calculateDonchianMidpoint(highs: number[], lows: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < highs.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      
      const periodHighs = highs.slice(i - period + 1, i + 1);
      const periodLows = lows.slice(i - period + 1, i + 1);
      
      const highest = Math.max(...periodHighs);
      const lowest = Math.min(...periodLows);
      
      result.push((highest + lowest) / 2);
    }
    
    return result;
  }

  private generateIchimokuSignals(
    data: OHLCVData[], 
    tenkan: number[], 
    kijun: number[], 
    spanA: number[], 
    spanB: number[], 
    closes: number[]
  ): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const currentPrice = closes[i];
      const prevPrice = closes[i - 1];
      
      // Sinal de cruzamento Tenkan/Kijun
      if (!isNaN(tenkan[i]) && !isNaN(kijun[i]) && !isNaN(tenkan[i-1]) && !isNaN(kijun[i-1])) {
        if (tenkan[i-1] <= kijun[i-1] && tenkan[i] > kijun[i]) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'buy',
            strength: 0.7,
            description: 'Cruzamento bullish Tenkan/Kijun',
            price: currentPrice
          });
        } else if (tenkan[i-1] >= kijun[i-1] && tenkan[i] < kijun[i]) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'sell',
            strength: 0.7,
            description: 'Cruzamento bearish Tenkan/Kijun',
            price: currentPrice
          });
        }
      }
      
      // Sinal de rompimento da nuvem
      if (!isNaN(spanA[i]) && !isNaN(spanB[i])) {
        const cloudTop = Math.max(spanA[i], spanB[i]);
        const cloudBottom = Math.min(spanA[i], spanB[i]);
        
        if (prevPrice <= cloudTop && currentPrice > cloudTop) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'buy',
            strength: 0.8,
            description: 'Rompimento bullish da nuvem Ichimoku',
            price: currentPrice
          });
        } else if (prevPrice >= cloudBottom && currentPrice < cloudBottom) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'sell',
            strength: 0.8,
            description: 'Rompimento bearish da nuvem Ichimoku',
            price: currentPrice
          });
        }
      }
    }
    
    return signals;
  }

  // Fibonacci Retracement
  public calculateFibonacci(data: OHLCVData[], lookbackPeriod = 50): FibonacciRetracement {
    const recentData = data.slice(-lookbackPeriod);
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);
    
    const highPrice = Math.max(...highs);
    const lowPrice = Math.min(...lows);
    const range = highPrice - lowPrice;
    
    // Determinar tendência
    const firstPrice = recentData[0].close;
    const lastPrice = recentData[recentData.length - 1].close;
    const trend = lastPrice > firstPrice ? 'uptrend' : 'downtrend';
    
    // Níveis de Fibonacci
    const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const levels = fibLevels.map(level => {
      let price: number;
      if (trend === 'uptrend') {
        price = highPrice - (range * level);
      } else {
        price = lowPrice + (range * level);
      }
      
      return {
        level,
        price,
        label: `${(level * 100).toFixed(1)}%`
      };
    });
    
    // Gerar sinais baseados na proximidade dos níveis
    const signals = this.generateFibonacciSignals(data, levels, trend);
    
    return {
      levels,
      trend,
      highPrice,
      lowPrice,
      signals
    };
  }

  private generateFibonacciSignals(
    data: OHLCVData[], 
    levels: { level: number; price: number; label: string }[], 
    trend: 'uptrend' | 'downtrend'
  ): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    const currentPrice = data[data.length - 1].close;
    
    // Encontrar o nível mais próximo
    let closestLevel = levels[0];
    let minDistance = Math.abs(currentPrice - levels[0].price);
    
    for (const level of levels) {
      const distance = Math.abs(currentPrice - level.price);
      if (distance < minDistance) {
        minDistance = distance;
        closestLevel = level;
      }
    }
    
    // Gerar sinal se estiver próximo de um nível importante
    const priceThreshold = (data[data.length - 1].high - data[data.length - 1].low) * 0.5;
    
    if (minDistance < priceThreshold) {
      const importantLevels = [0.382, 0.5, 0.618]; // Níveis mais importantes
      
      if (importantLevels.includes(closestLevel.level)) {
        const signalType = trend === 'uptrend' ? 'buy' : 'sell';
        const strength = 0.6 + (0.3 * (1 - minDistance / priceThreshold));
        
        signals.push({
          timestamp: data[data.length - 1].timestamp,
          type: signalType,
          strength,
          description: `Suporte/Resistência em Fibonacci ${closestLevel.label}`,
          price: currentPrice
        });
      }
    }
    
    return signals;
  }

  // Stochastic Oscillator
  public calculateStochastic(data: OHLCVData[], kPeriod = 14, dPeriod = 3): TechnicalIndicatorResult {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);
    
    const kValues: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < kPeriod - 1) {
        kValues.push(NaN);
        continue;
      }
      
      const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
      const periodLows = lows.slice(i - kPeriod + 1, i + 1);
      
      const highest = Math.max(...periodHighs);
      const lowest = Math.min(...periodLows);
      const current = closes[i];
      
      const k = ((current - lowest) / (highest - lowest)) * 100;
      kValues.push(k);
    }
    
    // %D é a média móvel simples de %K
    const dValues = this.calculateSMA(kValues, dPeriod);
    
    const signals = this.generateStochasticSignals(data, kValues, dValues);
    
    return {
      name: 'Stochastic',
      values: kValues,
      timestamps: data.map(d => d.timestamp),
      parameters: { kPeriod, dPeriod },
      signals
    };
  }

  private generateStochasticSignals(data: OHLCVData[], kValues: number[], dValues: number[]): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const k = kValues[i];
      const d = dValues[i];
      const prevK = kValues[i - 1];
      const prevD = dValues[i - 1];
      
      if (isNaN(k) || isNaN(d) || isNaN(prevK) || isNaN(prevD)) continue;
      
      // Cruzamento %K sobre %D em área de sobrevenda
      if (prevK <= prevD && k > d && k < 20) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'buy',
          strength: 0.7,
          description: 'Cruzamento bullish Stochastic em sobrevenda',
          price: data[i].close
        });
      }
      
      // Cruzamento %K sob %D em área de sobrecompra
      if (prevK >= prevD && k < d && k > 80) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'sell',
          strength: 0.7,
          description: 'Cruzamento bearish Stochastic em sobrecompra',
          price: data[i].close
        });
      }
    }
    
    return signals;
  }

  // Williams %R
  public calculateWilliamsR(data: OHLCVData[], period = 14): TechnicalIndicatorResult {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);
    
    const values: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        values.push(NaN);
        continue;
      }
      
      const periodHighs = highs.slice(i - period + 1, i + 1);
      const periodLows = lows.slice(i - period + 1, i + 1);
      
      const highest = Math.max(...periodHighs);
      const lowest = Math.min(...periodLows);
      const current = closes[i];
      
      const williamsR = ((highest - current) / (highest - lowest)) * -100;
      values.push(williamsR);
    }
    
    const signals = this.generateWilliamsRSignals(data, values);
    
    return {
      name: 'Williams %R',
      values,
      timestamps: data.map(d => d.timestamp),
      parameters: { period },
      signals
    };
  }

  private generateWilliamsRSignals(data: OHLCVData[], values: number[]): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const current = values[i];
      const previous = values[i - 1];
      
      if (isNaN(current) || isNaN(previous)) continue;
      
      // Saída de sobrevenda
      if (previous <= -80 && current > -80) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'buy',
          strength: 0.6,
          description: 'Williams %R saindo de sobrevenda',
          price: data[i].close
        });
      }
      
      // Entrada em sobrecompra
      if (previous >= -20 && current < -20) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'sell',
          strength: 0.6,
          description: 'Williams %R entrando em sobrecompra',
          price: data[i].close
        });
      }
    }
    
    return signals;
  }

  // Commodity Channel Index (CCI)
  public calculateCCI(data: OHLCVData[], period = 20): TechnicalIndicatorResult {
    const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
    const values: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        values.push(NaN);
        continue;
      }
      
      const periodPrices = typicalPrices.slice(i - period + 1, i + 1);
      const sma = periodPrices.reduce((sum, price) => sum + price, 0) / period;
      
      const meanDeviation = periodPrices.reduce((sum, price) => sum + Math.abs(price - sma), 0) / period;
      
      const cci = (typicalPrices[i] - sma) / (0.015 * meanDeviation);
      values.push(cci);
    }
    
    const signals = this.generateCCISignals(data, values);
    
    return {
      name: 'CCI',
      values,
      timestamps: data.map(d => d.timestamp),
      parameters: { period },
      signals
    };
  }

  private generateCCISignals(data: OHLCVData[], values: number[]): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const current = values[i];
      const previous = values[i - 1];
      
      if (isNaN(current) || isNaN(previous)) continue;
      
      // Cruzamento acima de -100 (saída de sobrevenda)
      if (previous <= -100 && current > -100) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'buy',
          strength: 0.6,
          description: 'CCI saindo de sobrevenda',
          price: data[i].close
        });
      }
      
      // Cruzamento abaixo de +100 (saída de sobrecompra)
      if (previous >= 100 && current < 100) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'sell',
          strength: 0.6,
          description: 'CCI saindo de sobrecompra',
          price: data[i].close
        });
      }
    }
    
    return signals;
  }

  // Average Directional Index (ADX)
  public calculateADX(data: OHLCVData[], period = 14): TechnicalIndicatorResult {
    const values: number[] = [];
    const trueRanges: number[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];
    
    // Calcular True Range e Directional Movements
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevHigh = data[i - 1].high;
      const prevLow = data[i - 1].low;
      const prevClose = data[i - 1].close;
      
      // True Range
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
      
      // Directional Movements
      const plusDM = high - prevHigh > prevLow - low ? Math.max(high - prevHigh, 0) : 0;
      const minusDM = prevLow - low > high - prevHigh ? Math.max(prevLow - low, 0) : 0;
      
      plusDMs.push(plusDM);
      minusDMs.push(minusDM);
    }
    
    // Calcular ADX
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        values.push(NaN);
        continue;
      }
      
      const periodTR = trueRanges.slice(i - period, i);
      const periodPlusDM = plusDMs.slice(i - period, i);
      const periodMinusDM = minusDMs.slice(i - period, i);
      
      const atr = periodTR.reduce((sum, tr) => sum + tr, 0) / period;
      const plusDI = (periodPlusDM.reduce((sum, dm) => sum + dm, 0) / period) / atr * 100;
      const minusDI = (periodMinusDM.reduce((sum, dm) => sum + dm, 0) / period) / atr * 100;
      
      const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
      values.push(dx);
    }
    
    // Suavizar ADX com média móvel
    const adxValues = this.calculateSMA(values, period);
    
    const signals = this.generateADXSignals(data, adxValues);
    
    return {
      name: 'ADX',
      values: adxValues,
      timestamps: data.map(d => d.timestamp),
      parameters: { period },
      signals
    };
  }

  private generateADXSignals(data: OHLCVData[], values: number[]): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const current = values[i];
      const previous = values[i - 1];
      
      if (isNaN(current) || isNaN(previous)) continue;
      
      // ADX crescente acima de 25 indica tendência forte
      if (previous < 25 && current >= 25) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'neutral',
          strength: 0.7,
          description: 'ADX indica início de tendência forte',
          price: data[i].close
        });
      }
      
      // ADX decrescente abaixo de 25 indica enfraquecimento da tendência
      if (previous > 25 && current <= 25) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'neutral',
          strength: 0.5,
          description: 'ADX indica enfraquecimento da tendência',
          price: data[i].close
        });
      }
    }
    
    return signals;
  }

  // Parabolic SAR
  public calculateParabolicSAR(data: OHLCVData[], step = 0.02, maxStep = 0.2): TechnicalIndicatorResult {
    const values: number[] = [];
    const signals: TechnicalSignal[] = [];
    
    if (data.length < 2) {
      return {
        name: 'Parabolic SAR',
        values: [],
        timestamps: [],
        parameters: { step, maxStep },
        signals: []
      };
    }
    
    let sar = data[0].low;
    let trend = 1; // 1 para uptrend, -1 para downtrend
    let af = step;
    let ep = data[0].high; // Extreme Point
    
    values.push(sar);
    
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      
      // Calcular novo SAR
      sar = sar + af * (ep - sar);
      
      if (trend === 1) { // Uptrend
        if (low <= sar) {
          // Reversão para downtrend
          trend = -1;
          sar = ep;
          ep = low;
          af = step;
          
          signals.push({
            timestamp: data[i].timestamp,
            type: 'sell',
            strength: 0.7,
            description: 'Parabolic SAR - Reversão para baixa',
            price: data[i].close
          });
        } else {
          if (high > ep) {
            ep = high;
            af = Math.min(af + step, maxStep);
          }
        }
      } else { // Downtrend
        if (high >= sar) {
          // Reversão para uptrend
          trend = 1;
          sar = ep;
          ep = high;
          af = step;
          
          signals.push({
            timestamp: data[i].timestamp,
            type: 'buy',
            strength: 0.7,
            description: 'Parabolic SAR - Reversão para alta',
            price: data[i].close
          });
        } else {
          if (low < ep) {
            ep = low;
            af = Math.min(af + step, maxStep);
          }
        }
      }
      
      values.push(sar);
    }
    
    return {
      name: 'Parabolic SAR',
      values,
      timestamps: data.map(d => d.timestamp),
      parameters: { step, maxStep },
      signals
    };
  }

  // Função auxiliar para SMA
  private calculateSMA(values: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      
      let sum = 0;
      let count = 0;
      
      for (let j = 0; j < period; j++) {
        if (!isNaN(values[i - j])) {
          sum += values[i - j];
          count++;
        }
      }
      
      result.push(count > 0 ? sum / count : NaN);
    }
    
    return result;
  }

  // Método principal para obter todos os indicadores avançados
  public async getAdvancedIndicators(symbol: string, timeframe = '1d', limit = 100): Promise<AdvancedIndicators> {
    const cacheKey = `advanced_indicators:${symbol}:${timeframe}:${limit}`;
    
    try {
      // Verificar cache
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      
      // Gerar dados OHLCV mock (em produção, viria de uma fonte real)
      const ohlcvData = this.generateMockOHLCVData(symbol, limit);
      
      const startTime = performance.now();
      
      // Calcular todos os indicadores
      const ichimoku = this.calculateIchimoku(ohlcvData);
      const fibonacci = this.calculateFibonacci(ohlcvData);
      const stochastic = this.calculateStochastic(ohlcvData);
      const williamsr = this.calculateWilliamsR(ohlcvData);
      const cci = this.calculateCCI(ohlcvData);
      const adx = this.calculateADX(ohlcvData);
      const parabolicSar = this.calculateParabolicSAR(ohlcvData);
      
      const endTime = performance.now();
      console.log(`⚡ Indicadores calculados em ${(endTime - startTime).toFixed(2)}ms para ${symbol}`);
      
      const result: AdvancedIndicators = {
        ichimoku,
        fibonacci,
        stochastic,
        williamsr,
        cci,
        adx,
        parabolicSar
      };
      
      // Salvar no cache por 5 minutos
      if (this.redis) {
        await this.redis.setex(cacheKey, 300, JSON.stringify(result));
      }
      
      return result;
    } catch (error) {
      console.error(`Erro ao calcular indicadores avançados para ${symbol}:`, error);
      throw error;
    }
  }

  // Gerar dados OHLCV mock para demonstração
  private generateMockOHLCVData(symbol: string, limit: number): OHLCVData[] {
    const data: OHLCVData[] = [];
    const basePrice = this.getBasePriceForSymbol(symbol);
    let currentPrice = basePrice;
    
    const now = Date.now();
    const interval = 24 * 60 * 60 * 1000; // 1 dia
    
    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * interval);
      
      // Simular variação de preço
      const volatility = 0.03; // 3% de volatilidade
      const change = (Math.random() - 0.5) * volatility;
      currentPrice *= (1 + change);
      
      // Simular OHLCV
      const open = currentPrice * (1 + (Math.random() - 0.5) * 0.01);
      const close = currentPrice;
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      const volume = Math.random() * 1000000;
      
      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return data;
  }

  private getBasePriceForSymbol(symbol: string): number {
    const basePrices: Record<string, number> = {
      'BTC': 45000,
      'ETH': 3000,
      'ADA': 0.5,
      'SOL': 100,
      'DOT': 25,
      'MATIC': 1.2,
      'LINK': 15,
      'UNI': 8
    };
    
    return basePrices[symbol.toUpperCase()] || 100;
  }

  // Obter resumo de sinais de todos os indicadores
  public async getIndicatorsSummary(symbol: string): Promise<{
    symbol: string;
    overallSignal: 'buy' | 'sell' | 'neutral';
    strength: number;
    signals: TechnicalSignal[];
    indicatorCount: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
  }> {
    const indicators = await this.getAdvancedIndicators(symbol);
    
    // Coletar todos os sinais
    const allSignals: TechnicalSignal[] = [
      ...indicators.ichimoku.signals,
      ...indicators.fibonacci.signals,
      ...indicators.stochastic.signals,
      ...indicators.williamsr.signals,
      ...indicators.cci.signals,
      ...indicators.adx.signals,
      ...indicators.parabolicSar.signals
    ];
    
    // Contar sinais por tipo
    const bullishCount = allSignals.filter(s => s.type === 'buy').length;
    const bearishCount = allSignals.filter(s => s.type === 'sell').length;
    const neutralCount = allSignals.filter(s => s.type === 'neutral').length;
    
    // Determinar sinal geral
    let overallSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0.5;
    
    if (bullishCount > bearishCount + neutralCount) {
      overallSignal = 'buy';
      strength = 0.6 + (bullishCount / allSignals.length) * 0.4;
    } else if (bearishCount > bullishCount + neutralCount) {
      overallSignal = 'sell';
      strength = 0.6 + (bearishCount / allSignals.length) * 0.4;
    }
    
    return {
      symbol: symbol.toUpperCase(),
      overallSignal,
      strength,
      signals: allSignals.slice(-10), // Últimos 10 sinais
      indicatorCount: 7,
      bullishCount,
      bearishCount,
      neutralCount
    };
  }
}

export const technicalIndicatorsService = TechnicalIndicatorsService.getInstance(); 