import { PolynomialRegression } from 'ml-regression';
import { logger } from '../../utils/logger';
import { CryptoAsset } from '../../models/crypto';
import { getOrTrainModel } from './pricePredictionModel';

export interface ModelMetrics {
  symbol: string;
  timeframe: string;
  mse: number;       // Erro Quadrático Médio
  mae: number;       // Erro Absoluto Médio
  mape: number;      // Erro Percentual Absoluto Médio
  r2: number;        // Coeficiente de Determinação
  accuracy: number;  // Acurácia Direcional (% de acertos na direção da previsão)
  evaluatedAt: string;
}

/**
 * Divide os dados em conjuntos de treinamento e teste
 */
function splitTrainTest(data: number[], testSize: number = 0.2): { train: number[], test: number[] } {
  const splitIndex = Math.floor(data.length * (1 - testSize));
  return {
    train: data.slice(0, splitIndex),
    test: data.slice(splitIndex)
  };
}

/**
 * Calcula o Erro Quadrático Médio
 */
function calculateMSE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays de valores reais e previstos devem ter o mesmo tamanho');
  }
  
  let sumSquaredError = 0;
  for (let i = 0; i < actual.length; i++) {
    sumSquaredError += Math.pow(actual[i] - predicted[i], 2);
  }
  
  return sumSquaredError / actual.length;
}

/**
 * Calcula o Erro Absoluto Médio
 */
function calculateMAE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays de valores reais e previstos devem ter o mesmo tamanho');
  }
  
  let sumAbsoluteError = 0;
  for (let i = 0; i < actual.length; i++) {
    sumAbsoluteError += Math.abs(actual[i] - predicted[i]);
  }
  
  return sumAbsoluteError / actual.length;
}

/**
 * Calcula o Erro Percentual Absoluto Médio
 */
function calculateMAPE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays de valores reais e previstos devem ter o mesmo tamanho');
  }
  
  let sumPercentageError = 0;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] === 0) continue; // Evitar divisão por zero
    sumPercentageError += Math.abs((actual[i] - predicted[i]) / actual[i]);
  }
  
  return (sumPercentageError / actual.length) * 100;
}

/**
 * Calcula o Coeficiente de Determinação (R²)
 */
function calculateR2(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays de valores reais e previstos devem ter o mesmo tamanho');
  }
  
  const mean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
  
  let totalSumSquares = 0;
  let residualSumSquares = 0;
  
  for (let i = 0; i < actual.length; i++) {
    totalSumSquares += Math.pow(actual[i] - mean, 2);
    residualSumSquares += Math.pow(actual[i] - predicted[i], 2);
  }
  
  return 1 - (residualSumSquares / totalSumSquares);
}

/**
 * Calcula a Acurácia Direcional (% de acertos na direção da previsão)
 */
function calculateDirectionalAccuracy(actual: number[], predicted: number[]): number {
  if (actual.length < 2 || predicted.length < 2) {
    throw new Error('Arrays devem ter pelo menos 2 elementos');
  }
  
  let correctDirections = 0;
  
  for (let i = 1; i < actual.length; i++) {
    const actualDirection = actual[i] >= actual[i - 1];
    const predictedDirection = predicted[i] >= predicted[i - 1];
    
    if (actualDirection === predictedDirection) {
      correctDirections++;
    }
  }
  
  return (correctDirections / (actual.length - 1)) * 100;
}

/**
 * Avalia um modelo com dados de teste
 */
export async function evaluateModel(
  symbol: string,
  timeframe: '24h' | '7d' | '30d' = '24h'
): Promise<ModelMetrics> {
  try {
    logger.info(`Avaliando modelo de previsão para ${symbol}`);
    
    // Buscar dados históricos
    const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
    
    if (!asset || !asset.priceHistory || asset.priceHistory.length < 30) {
      throw new Error(`Dados insuficientes para ${symbol}. Necessário pelo menos 30 pontos de dados.`);
    }
    
    // Extrair preços (ordenados do mais recente para o mais antigo)
    const prices = asset.priceHistory.map(ph => ph.price);
    
    // Dividir em conjunto de treinamento e teste
    const { train, test } = splitTrainTest(prices, 0.3);
    
    // Obter modelo treinado
    const { model, min, max } = await getOrTrainModel(symbol, timeframe);
    
    // Normalizar dados de teste
    const range = max - min;
    const normalizedTest = test.map(price => (price - min) / range);
    
    // Preparar índices para teste
    const testIndices = Array.from({ length: normalizedTest.length }, (_, i) => i + train.length);
    
    // Fazer previsões usando o modelo
    const testPredictions = testIndices.map(index => model.predict(index));
    
    // Se não houver dados suficientes para teste
    if (testPredictions.length === 0) {
      throw new Error('Dados de teste insuficientes após preparação');
    }
    
    // Desnormalizar valores
    const actualValues = normalizedTest.map(val => val * range + min);
    const predictedDenormalized = testPredictions.map(val => val * range + min);
    
    // Calcular métricas
    const mse = calculateMSE(actualValues, predictedDenormalized);
    const mae = calculateMAE(actualValues, predictedDenormalized);
    const mape = calculateMAPE(actualValues, predictedDenormalized);
    const r2 = calculateR2(actualValues, predictedDenormalized);
    const accuracy = calculateDirectionalAccuracy(actualValues, predictedDenormalized);
    
    const metrics: ModelMetrics = {
      symbol: symbol.toUpperCase(),
      timeframe,
      mse,
      mae,
      mape,
      r2,
      accuracy,
      evaluatedAt: new Date().toISOString()
    };
    
    logger.info(`Métricas do modelo para ${symbol}: MSE=${mse.toFixed(2)}, MAPE=${mape.toFixed(2)}%, Acurácia=${accuracy.toFixed(2)}%`);
    
    return metrics;
  } catch (error) {
    logger.error(`Erro ao avaliar modelo para ${symbol}:`, error);
    throw error;
  }
}

/**
 * Realiza backtesting do modelo em dados históricos
 */
export async function backtestModel(
  symbol: string,
  periods: number = 30,
  timeframe: '24h' | '7d' | '30d' = '24h'
): Promise<{
  totalReturn: number;
  benchmarkReturn: number;
  metrics: ModelMetrics;
  trades: Array<{
    date: string;
    actual: number;
    predicted: number;
    action: 'compra' | 'venda' | 'manter';
    return: number;
  }>;
}> {
  try {
    // Implementação básica de backtesting
    // Em um sistema real, esta lógica seria muito mais complexa

    // Avaliar modelo para obter métricas
    const metrics = await evaluateModel(symbol, timeframe);
    
    // Simular trades seria implementado aqui
    // Por simplicidade, apenas retornamos as métricas
    
    return {
      totalReturn: 0,
      benchmarkReturn: 0,
      metrics,
      trades: []
    };
  } catch (error) {
    logger.error(`Erro ao realizar backtesting para ${symbol}:`, error);
    throw error;
  }
} 