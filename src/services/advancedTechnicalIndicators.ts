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

export interface TechnicalSignal {
  timestamp: number;
  type: 'buy' | 'sell' | 'neutral';
  strength: number; // 0-1
  description: string;
  price: number;
  confidence: number;
}

export interface BollingerBands {
  upper: number[];
  middle: number[];
  lower: number[];
  bandwidth: number[];
  percentB: number[];
  squeeze: boolean[];
  signals: TechnicalSignal[];
}

export interface MACDAdvanced {
  macd: number[];
  signal: number[];
  histogram: number[];
  divergence: ('bullish' | 'bearish' | 'none')[];
  momentum: number[];
  signals: TechnicalSignal[];
}

export interface VolumeProfile {
  priceLevel: number;
  volume: number;
  percentage: number;
  poc: number; // Point of Control
  valueAreaHigh: number;
  valueAreaLow: number;
  signals: TechnicalSignal[];
}

export interface ElliottWave {
  waves: {
    wave: number;
    startPrice: number;
    endPrice: number;
    startTime: number;
    endTime: number;
    type: 'impulse' | 'corrective';
  }[];
  currentWave: number;
  projection: {
    nextTarget: number;
    confidence: number;
  };
  signals: TechnicalSignal[];
}

export interface HarmonicPatterns {
  patterns: {
    name: string;
    type: 'bullish' | 'bearish';
    completion: number; // 0-1
    points: { x: number; y: number; label: string }[];
    target: number;
    stopLoss: number;
  }[];
  signals: TechnicalSignal[];
}

export interface MarketStructure {
  higherHighs: { timestamp: number; price: number }[];
  lowerLows: { timestamp: number; price: number }[];
  supportLevels: { price: number; strength: number; touches: number }[];
  resistanceLevels: { price: number; strength: number; touches: number }[];
  trend: 'uptrend' | 'downtrend' | 'sideways';
  trendStrength: number;
  signals: TechnicalSignal[];
}

export interface AdvancedIndicatorsResult {
  bollingerBands: BollingerBands;
  macdAdvanced: MACDAdvanced;
  volumeProfile: VolumeProfile[];
  elliottWave: ElliottWave;
  harmonicPatterns: HarmonicPatterns;
  marketStructure: MarketStructure;
  overallSignal: {
    direction: 'buy' | 'sell' | 'neutral';
    strength: number;
    confidence: number;
    reasoning: string[];
  };
}

class AdvancedTechnicalIndicators {
  private static instance: AdvancedTechnicalIndicators;
  private redis?: any;
  private cache: Map<string, any> = new Map();

  private constructor() {
    this.initializeRedis();
  }

  public static getInstance(): AdvancedTechnicalIndicators {
    if (!AdvancedTechnicalIndicators.instance) {
      AdvancedTechnicalIndicators.instance = new AdvancedTechnicalIndicators();
    }
    return AdvancedTechnicalIndicators.instance;
  }

  private async initializeRedis() {
    try {
      const redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      redis.on('error', (err: any) => {
        console.error('Redis connection error (advanced indicators):', err);
      });

      await redis.connect();
      this.redis = redis;
      console.log('✅ Redis conectado para indicadores avançados');
    } catch (error) {
      console.warn('⚠️ Redis não disponível para indicadores avançados:', error);
    }
  }

  // Bollinger Bands Avançado
  public calculateBollingerBands(data: OHLCVData[], period = 20, stdDev = 2): BollingerBands {
    const closes = data.map(d => d.close);
    const middle = this.calculateSMA(closes, period);
    const upper: number[] = [];
    const lower: number[] = [];
    const bandwidth: number[] = [];
    const percentB: number[] = [];
    const squeeze: boolean[] = [];

    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
        bandwidth.push(NaN);
        percentB.push(NaN);
        squeeze.push(false);
        continue;
      }

      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);

      const upperBand = mean + (stdDev * standardDeviation);
      const lowerBand = mean - (stdDev * standardDeviation);

      upper.push(upperBand);
      lower.push(lowerBand);

      // Bandwidth (volatilidade)
      const bw = (upperBand - lowerBand) / mean;
      bandwidth.push(bw);

      // %B (posição do preço nas bandas)
      const pctB = (closes[i] - lowerBand) / (upperBand - lowerBand);
      percentB.push(pctB);

      // Squeeze detection (baixa volatilidade)
      const avgBandwidth = bandwidth.slice(Math.max(0, i - 19), i + 1)
        .filter(b => !isNaN(b))
        .reduce((sum, b) => sum + b, 0) / Math.min(20, i + 1);
      squeeze.push(bw < avgBandwidth * 0.8);
    }

    const signals = this.generateBollingerSignals(data, upper, middle, lower, percentB, squeeze);

    return {
      upper,
      middle,
      lower,
      bandwidth,
      percentB,
      squeeze,
      signals
    };
  }

  private generateBollingerSignals(
    data: OHLCVData[],
    upper: number[],
    middle: number[],
    lower: number[],
    percentB: number[],
    squeeze: boolean[]
  ): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];

    for (let i = 1; i < data.length; i++) {
      const price = data[i].close;
      const prevPrice = data[i - 1].close;

      // Sinal de reversão nas bandas
      if (!isNaN(upper[i]) && !isNaN(lower[i])) {
        if (prevPrice > upper[i - 1] && price <= upper[i]) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'sell',
            strength: 0.7,
            description: 'Reversão na banda superior de Bollinger',
            price,
            confidence: 0.75
          });
        }

        if (prevPrice < lower[i - 1] && price >= lower[i]) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'buy',
            strength: 0.7,
            description: 'Reversão na banda inferior de Bollinger',
            price,
            confidence: 0.75
          });
        }
      }

      // Sinal de squeeze breakout
      if (squeeze[i - 1] && !squeeze[i]) {
        const direction = price > middle[i] ? 'buy' : 'sell';
        signals.push({
          timestamp: data[i].timestamp,
          type: direction,
          strength: 0.8,
          description: 'Breakout do Bollinger Squeeze',
          price,
          confidence: 0.8
        });
      }
    }

    return signals;
  }

  // MACD Avançado com Divergências
  public calculateMACDAdvanced(data: OHLCVData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MACDAdvanced {
    const closes = data.map(d => d.close);
    const emaFast = this.calculateEMA(closes, fastPeriod);
    const emaSlow = this.calculateEMA(closes, slowPeriod);
    
    const macd = emaFast.map((fast, i) => fast - emaSlow[i]);
    const signal = this.calculateEMA(macd, signalPeriod);
    const histogram = macd.map((m, i) => m - signal[i]);
    
    // Detectar divergências
    const divergence = this.detectMACDDivergence(data, macd, histogram);
    
    // Calcular momentum
    const momentum = this.calculateMomentum(histogram, 5);
    
    const signals = this.generateMACDAdvancedSignals(data, macd, signal, histogram, divergence);

    return {
      macd,
      signal,
      histogram,
      divergence,
      momentum,
      signals
    };
  }

  private detectMACDDivergence(
    data: OHLCVData[],
    macd: number[],
    histogram: number[]
  ): ('bullish' | 'bearish' | 'none')[] {
    const divergence: ('bullish' | 'bearish' | 'none')[] = new Array(data.length).fill('none');
    const lookback = 20;

    for (let i = lookback; i < data.length; i++) {
      const priceSlice = data.slice(i - lookback, i + 1).map(d => d.close);
      const macdSlice = macd.slice(i - lookback, i + 1);

      const priceHigh = Math.max(...priceSlice);
      const priceLow = Math.min(...priceSlice);
      const macdHigh = Math.max(...macdSlice.filter(m => !isNaN(m)));
      const macdLow = Math.min(...macdSlice.filter(m => !isNaN(m)));

      const priceHighIdx = priceSlice.indexOf(priceHigh);
      const priceLowIdx = priceSlice.indexOf(priceLow);
      const macdHighIdx = macdSlice.indexOf(macdHigh);
      const macdLowIdx = macdSlice.indexOf(macdLow);

      // Divergência bullish: preço faz low mais baixo, MACD faz low mais alto
      if (priceLowIdx > macdLowIdx && data[i].close < priceLow && macd[i] > macdLow) {
        divergence[i] = 'bullish';
      }
      // Divergência bearish: preço faz high mais alto, MACD faz high mais baixo
      else if (priceHighIdx > macdHighIdx && data[i].close > priceHigh && macd[i] < macdHigh) {
        divergence[i] = 'bearish';
      }
    }

    return divergence;
  }

  private generateMACDAdvancedSignals(
    data: OHLCVData[],
    macd: number[],
    signal: number[],
    histogram: number[],
    divergence: ('bullish' | 'bearish' | 'none')[]
  ): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];

    for (let i = 1; i < data.length; i++) {
      // Cruzamento MACD/Signal
      if (!isNaN(macd[i]) && !isNaN(signal[i]) && !isNaN(macd[i-1]) && !isNaN(signal[i-1])) {
        if (macd[i-1] <= signal[i-1] && macd[i] > signal[i]) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'buy',
            strength: 0.6,
            description: 'Cruzamento bullish MACD',
            price: data[i].close,
            confidence: 0.7
          });
        } else if (macd[i-1] >= signal[i-1] && macd[i] < signal[i]) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'sell',
            strength: 0.6,
            description: 'Cruzamento bearish MACD',
            price: data[i].close,
            confidence: 0.7
          });
        }
      }

      // Sinais de divergência
      if (divergence[i] === 'bullish') {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'buy',
          strength: 0.8,
          description: 'Divergência bullish MACD',
          price: data[i].close,
          confidence: 0.85
        });
      } else if (divergence[i] === 'bearish') {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'sell',
          strength: 0.8,
          description: 'Divergência bearish MACD',
          price: data[i].close,
          confidence: 0.85
        });
      }
    }

    return signals;
  }

  // Volume Profile
  public calculateVolumeProfile(data: OHLCVData[], bins = 50): VolumeProfile[] {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const binSize = priceRange / bins;

    const volumeProfile: VolumeProfile[] = [];
    let totalVolume = 0;

    // Criar bins de preço
    for (let i = 0; i < bins; i++) {
      const priceLevel = minPrice + (i * binSize);
      let binVolume = 0;

      // Somar volume para cada bin
      data.forEach(candle => {
        if (candle.close >= priceLevel && candle.close < priceLevel + binSize) {
          binVolume += candle.volume;
        }
      });

      totalVolume += binVolume;
      volumeProfile.push({
        priceLevel,
        volume: binVolume,
        percentage: 0, // Será calculado depois
        poc: 0,
        valueAreaHigh: 0,
        valueAreaLow: 0,
        signals: []
      });
    }

    // Calcular percentuais
    volumeProfile.forEach(profile => {
      profile.percentage = (profile.volume / totalVolume) * 100;
    });

    // Encontrar POC (Point of Control)
    const pocIndex = volumeProfile.reduce((maxIdx, profile, idx) => 
      profile.volume > volumeProfile[maxIdx].volume ? idx : maxIdx, 0
    );
    
    volumeProfile[pocIndex].poc = volumeProfile[pocIndex].priceLevel;

    // Calcular Value Area (70% do volume)
    const sortedByVolume = [...volumeProfile].sort((a, b) => b.volume - a.volume);
    let valueAreaVolume = 0;
    const valueAreaThreshold = totalVolume * 0.7;
    const valueAreaLevels: number[] = [];

    for (const profile of sortedByVolume) {
      if (valueAreaVolume < valueAreaThreshold) {
        valueAreaVolume += profile.volume;
        valueAreaLevels.push(profile.priceLevel);
      }
    }

    const valueAreaHigh = Math.max(...valueAreaLevels);
    const valueAreaLow = Math.min(...valueAreaLevels);

    volumeProfile.forEach(profile => {
      profile.valueAreaHigh = valueAreaHigh;
      profile.valueAreaLow = valueAreaLow;
    });

    return volumeProfile;
  }

  // Market Structure Analysis
  public analyzeMarketStructure(data: OHLCVData[], lookback = 50): MarketStructure {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);

    // Identificar Higher Highs e Lower Lows
    const higherHighs = this.findHigherHighs(data, lookback);
    const lowerLows = this.findLowerLows(data, lookback);

    // Identificar níveis de suporte e resistência
    const supportLevels = this.findSupportLevels(data, lookback);
    const resistanceLevels = this.findResistanceLevels(data, lookback);

    // Determinar tendência
    const trend = this.determineTrend(higherHighs, lowerLows, data);
    const trendStrength = this.calculateTrendStrength(data, 20);

    const signals = this.generateMarketStructureSignals(data, supportLevels, resistanceLevels, trend);

    return {
      higherHighs,
      lowerLows,
      supportLevels,
      resistanceLevels,
      trend,
      trendStrength,
      signals
    };
  }

  // Análise Completa
  public async getAdvancedAnalysis(symbol: string, timeframe = '1d', limit = 200): Promise<AdvancedIndicatorsResult> {
    const cacheKey = `advanced_analysis:${symbol}:${timeframe}:${limit}`;
    
    // Verificar cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Erro ao acessar cache Redis:', error);
      }
    }

    // Gerar dados mock (em produção, buscar dados reais)
    const data = this.generateMockOHLCVData(symbol, limit);

    const bollingerBands = this.calculateBollingerBands(data);
    const macdAdvanced = this.calculateMACDAdvanced(data);
    const volumeProfile = this.calculateVolumeProfile(data);
    const marketStructure = this.analyzeMarketStructure(data);

    // Análise harmônica e Elliott Wave (simplificadas)
    const harmonicPatterns = this.detectHarmonicPatterns(data);
    const elliottWave = this.analyzeElliottWave(data);

    // Sinal geral
    const overallSignal = this.calculateOverallSignal([
      bollingerBands.signals,
      macdAdvanced.signals,
      marketStructure.signals,
      harmonicPatterns.signals,
      elliottWave.signals
    ]);

    const result: AdvancedIndicatorsResult = {
      bollingerBands,
      macdAdvanced,
      volumeProfile,
      elliottWave,
      harmonicPatterns,
      marketStructure,
      overallSignal
    };

    // Salvar no cache
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 minutos
      } catch (error) {
        console.warn('Erro ao salvar no cache Redis:', error);
      }
    }

    return result;
  }

  // Métodos auxiliares
  private calculateSMA(values: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }

  private calculateEMA(values: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    for (let i = 0; i < values.length; i++) {
      if (i === 0) {
        result.push(values[i]);
      } else {
        result.push((values[i] * multiplier) + (result[i - 1] * (1 - multiplier)));
      }
    }
    return result;
  }

  private calculateMomentum(values: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period) {
        result.push(0);
        continue;
      }
      result.push(values[i] - values[i - period]);
    }
    return result;
  }

  private findHigherHighs(data: OHLCVData[], lookback: number): { timestamp: number; price: number }[] {
    const higherHighs: { timestamp: number; price: number }[] = [];
    
    for (let i = lookback; i < data.length - lookback; i++) {
      const currentHigh = data[i].high;
      const isLocalHigh = data.slice(i - lookback, i + lookback + 1)
        .every((candle, idx) => idx === lookback || candle.high <= currentHigh);
      
      if (isLocalHigh && higherHighs.length > 0) {
        const lastHigh = higherHighs[higherHighs.length - 1];
        if (currentHigh > lastHigh.price) {
          higherHighs.push({ timestamp: data[i].timestamp, price: currentHigh });
        }
      } else if (isLocalHigh && higherHighs.length === 0) {
        higherHighs.push({ timestamp: data[i].timestamp, price: currentHigh });
      }
    }
    
    return higherHighs;
  }

  private findLowerLows(data: OHLCVData[], lookback: number): { timestamp: number; price: number }[] {
    const lowerLows: { timestamp: number; price: number }[] = [];
    
    for (let i = lookback; i < data.length - lookback; i++) {
      const currentLow = data[i].low;
      const isLocalLow = data.slice(i - lookback, i + lookback + 1)
        .every((candle, idx) => idx === lookback || candle.low >= currentLow);
      
      if (isLocalLow && lowerLows.length > 0) {
        const lastLow = lowerLows[lowerLows.length - 1];
        if (currentLow < lastLow.price) {
          lowerLows.push({ timestamp: data[i].timestamp, price: currentLow });
        }
      } else if (isLocalLow && lowerLows.length === 0) {
        lowerLows.push({ timestamp: data[i].timestamp, price: currentLow });
      }
    }
    
    return lowerLows;
  }

  private findSupportLevels(data: OHLCVData[], lookback: number): { price: number; strength: number; touches: number }[] {
    const levels: { price: number; strength: number; touches: number }[] = [];
    const tolerance = 0.02; // 2% tolerance
    
    for (let i = lookback; i < data.length; i++) {
      const low = data[i].low;
      let touches = 1;
      
      // Contar quantas vezes o preço tocou este nível
      for (let j = Math.max(0, i - lookback); j < Math.min(data.length, i + lookback); j++) {
        if (j !== i && Math.abs(data[j].low - low) / low < tolerance) {
          touches++;
        }
      }
      
      if (touches >= 3) {
        const existing = levels.find(level => Math.abs(level.price - low) / low < tolerance);
        if (!existing) {
          levels.push({ price: low, strength: touches / 10, touches });
        }
      }
    }
    
    return levels.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  private findResistanceLevels(data: OHLCVData[], lookback: number): { price: number; strength: number; touches: number }[] {
    const levels: { price: number; strength: number; touches: number }[] = [];
    const tolerance = 0.02; // 2% tolerance
    
    for (let i = lookback; i < data.length; i++) {
      const high = data[i].high;
      let touches = 1;
      
      // Contar quantas vezes o preço tocou este nível
      for (let j = Math.max(0, i - lookback); j < Math.min(data.length, i + lookback); j++) {
        if (j !== i && Math.abs(data[j].high - high) / high < tolerance) {
          touches++;
        }
      }
      
      if (touches >= 3) {
        const existing = levels.find(level => Math.abs(level.price - high) / high < tolerance);
        if (!existing) {
          levels.push({ price: high, strength: touches / 10, touches });
        }
      }
    }
    
    return levels.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  private determineTrend(
    higherHighs: { timestamp: number; price: number }[],
    lowerLows: { timestamp: number; price: number }[],
    data: OHLCVData[]
  ): 'uptrend' | 'downtrend' | 'sideways' {
    const recentHighs = higherHighs.slice(-3);
    const recentLows = lowerLows.slice(-3);
    
    if (recentHighs.length >= 2 && recentLows.length >= 2) {
      const highTrend = recentHighs[recentHighs.length - 1].price > recentHighs[0].price;
      const lowTrend = recentLows[recentLows.length - 1].price > recentLows[0].price;
      
      if (highTrend && lowTrend) return 'uptrend';
      if (!highTrend && !lowTrend) return 'downtrend';
    }
    
    return 'sideways';
  }

  private calculateTrendStrength(data: OHLCVData[], period: number): number {
    if (data.length < period) return 0;
    
    const recent = data.slice(-period);
    const firstPrice = recent[0].close;
    const lastPrice = recent[recent.length - 1].close;
    const change = (lastPrice - firstPrice) / firstPrice;
    
    return Math.min(Math.abs(change) * 10, 1); // Normalizar para 0-1
  }

  private generateMarketStructureSignals(
    data: OHLCVData[],
    supportLevels: { price: number; strength: number; touches: number }[],
    resistanceLevels: { price: number; strength: number; touches: number }[],
    trend: 'uptrend' | 'downtrend' | 'sideways'
  ): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const price = data[i].close;
      const prevPrice = data[i - 1].close;
      
      // Sinais de suporte
      supportLevels.forEach(support => {
        if (prevPrice > support.price && price <= support.price) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'buy',
            strength: support.strength,
            description: `Teste de suporte em ${support.price.toFixed(2)}`,
            price,
            confidence: support.strength
          });
        }
      });
      
      // Sinais de resistência
      resistanceLevels.forEach(resistance => {
        if (prevPrice < resistance.price && price >= resistance.price) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'sell',
            strength: resistance.strength,
            description: `Teste de resistência em ${resistance.price.toFixed(2)}`,
            price,
            confidence: resistance.strength
          });
        }
      });
    }
    
    return signals;
  }

  private detectHarmonicPatterns(data: OHLCVData[]): HarmonicPatterns {
    // Implementação simplificada de padrões harmônicos
    return {
      patterns: [],
      signals: []
    };
  }

  private analyzeElliottWave(data: OHLCVData[]): ElliottWave {
    // Implementação simplificada de Elliott Wave
    return {
      waves: [],
      currentWave: 1,
      projection: { nextTarget: 0, confidence: 0 },
      signals: []
    };
  }

  private calculateOverallSignal(signalGroups: TechnicalSignal[][]): {
    direction: 'buy' | 'sell' | 'neutral';
    strength: number;
    confidence: number;
    reasoning: string[];
  } {
    const allSignals = signalGroups.flat();
    const recentSignals = allSignals.slice(-10); // Últimos 10 sinais
    
    const buySignals = recentSignals.filter(s => s.type === 'buy');
    const sellSignals = recentSignals.filter(s => s.type === 'sell');
    
    const buyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
    const sellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);
    
    const reasoning: string[] = [];
    
    if (buyStrength > sellStrength) {
      reasoning.push(`${buySignals.length} sinais de compra vs ${sellSignals.length} de venda`);
      return {
        direction: 'buy',
        strength: buyStrength / buySignals.length || 0,
        confidence: Math.min(buyStrength / (buyStrength + sellStrength), 1),
        reasoning
      };
    } else if (sellStrength > buyStrength) {
      reasoning.push(`${sellSignals.length} sinais de venda vs ${buySignals.length} de compra`);
      return {
        direction: 'sell',
        strength: sellStrength / sellSignals.length || 0,
        confidence: Math.min(sellStrength / (buyStrength + sellStrength), 1),
        reasoning
      };
    }
    
    reasoning.push('Sinais conflitantes ou insuficientes');
    return {
      direction: 'neutral',
      strength: 0,
      confidence: 0,
      reasoning
    };
  }

  private generateMockOHLCVData(symbol: string, limit: number): OHLCVData[] {
    const data: OHLCVData[] = [];
    const basePrice = this.getBasePriceForSymbol(symbol);
    let currentPrice = basePrice;
    const now = Date.now();
    
    for (let i = 0; i < limit; i++) {
      const timestamp = now - (limit - i) * 24 * 60 * 60 * 1000; // Daily candles
      const volatility = 0.02 + Math.random() * 0.03; // 2-5% volatility
      
      const change = (Math.random() - 0.5) * volatility;
      const open = currentPrice;
      const close = currentPrice * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = 1000000 + Math.random() * 5000000;
      
      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
      
      currentPrice = close;
    }
    
    return data;
  }

  private getBasePriceForSymbol(symbol: string): number {
    const prices: { [key: string]: number } = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'ADAUSDT': 0.5,
      'DOTUSDT': 8,
      'LINKUSDT': 15,
      'BNBUSDT': 300,
      'SOLUSDT': 100,
      'MATICUSDT': 1.2
    };
    
    return prices[symbol] || 100;
  }
}

export default AdvancedTechnicalIndicators; 