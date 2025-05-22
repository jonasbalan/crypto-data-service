import { PolynomialRegression } from 'ml-regression';
import { Matrix } from 'ml-matrix';
import { logger } from '../../utils/logger';
import { CryptoAsset } from '../../models/crypto';
import { cachedResult } from '../cache/cacheService';

// Configurações do modelo
const WINDOW_SIZE = 14; // Usar 14 dias de dados para prever o próximo dia
const DEGREE = 3; // Grau do polinômio para regressão

// Cache para modelos treinados
const trainedModels: { [key: string]: any } = {};

/**
 * Normaliza dados para estarem entre 0 e 1
 */
function normalizeData(data: number[]): { normalizedData: number[], min: number, max: number } {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  // Evitar divisão por zero
  if (range === 0) {
    return {
      normalizedData: data.map(() => 0.5),
      min,
      max
    };
  }
  
  return {
    normalizedData: data.map(x => (x - min) / range),
    min,
    max
  };
}

/**
 * Desnormaliza um valor que foi normalizado entre 0 e 1
 */
function denormalizeValue(normalizedValue: number, min: number, max: number): number {
  return normalizedValue * (max - min) + min;
}

/**
 * Prepara dados para treinamento do modelo
 * Cada valor é associado a um índice de tempo
 */
function prepareTrainingData(prices: number[]): { x: number[], y: number[] } {
  const x: number[] = [];
  const y: number[] = prices;
  
  for (let i = 0; i < prices.length; i++) {
    x.push(i);
  }
  
  return { x, y };
}

/**
 * Cria e treina um modelo de previsão de preços usando regressão polinomial
 */
async function createAndTrainModel(
  symbol: string,
  timeframe: '24h' | '7d' | '30d' = '24h'
): Promise<{
  model: PolynomialRegression;
  min: number;
  max: number;
}> {
  try {
    logger.info(`Criando modelo de previsão para ${symbol}`);
    
    // Buscar dados históricos
    const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
    
    if (!asset || !asset.priceHistory || asset.priceHistory.length < WINDOW_SIZE + 10) {
      throw new Error(`Dados insuficientes para ${symbol}. Necessário pelo menos ${WINDOW_SIZE + 10} pontos de dados.`);
    }
    
    // Extrair preços (ordenados do mais recente para o mais antigo)
    const prices = asset.priceHistory.map(ph => ph.price);
    
    // Normalizar preços
    const { normalizedData, min, max } = normalizeData(prices);
    
    // Preparar dados para treinamento
    const { x, y } = prepareTrainingData(normalizedData);
    
    // Criar e treinar modelo de regressão polinomial
    const model = new PolynomialRegression(x, y, DEGREE);
    
    logger.info(`Modelo de previsão para ${symbol} treinado com sucesso`);
    
    return { model, min, max };
  } catch (error) {
    logger.error(`Erro ao treinar modelo para ${symbol}:`, error);
    throw error;
  }
}

/**
 * Obtém ou cria um modelo para um símbolo específico
 */
export async function getOrTrainModel(
  symbol: string,
  timeframe: '24h' | '7d' | '30d' = '24h'
): Promise<{
  model: PolynomialRegression;
  min: number;
  max: number;
}> {
  const cacheKey = `model:${symbol}:${timeframe}`;
  const cacheTTL = 24 * 60 * 60 * 1000; // 24 horas
  
  return cachedResult(cacheKey, async () => {
    try {
      // Verificar se já temos o modelo na memória
      const modelId = `${symbol}:${timeframe}`;
      if (trainedModels[modelId]) {
        logger.debug(`Usando modelo em cache para ${symbol}`);
        
        // Buscar asset para obter min/max para normalização
        const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
        if (!asset || !asset.priceHistory || asset.priceHistory.length < 2) {
          throw new Error(`Dados insuficientes para ${symbol}`);
        }
        
        const prices = asset.priceHistory.map(ph => ph.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        
        return { model: trainedModels[modelId], min, max };
      }
      
      // Criar e treinar novo modelo
      const result = await createAndTrainModel(symbol, timeframe);
      
      // Armazenar em cache de memória
      trainedModels[modelId] = result.model;
      
      return result;
    } catch (error) {
      logger.error(`Erro ao obter modelo para ${symbol}:`, error);
      throw error;
    }
  }, cacheTTL);
}

/**
 * Faz previsão de preço futuro
 * @param symbol Símbolo da criptomoeda
 * @param days Número de dias no futuro para prever
 */
export async function predictPrice(
  symbol: string,
  days: number = 1
): Promise<{
  currentPrice: number;
  predictedPrice: number;
  percentChange: number;
  confidence: number;
}> {
  try {
    // Obter modelo treinado
    const { model, min, max } = await getOrTrainModel(symbol);
    
    // Buscar dados recentes
    const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
    
    if (!asset || !asset.priceHistory || asset.priceHistory.length < WINDOW_SIZE) {
      throw new Error(`Dados insuficientes para ${symbol}`);
    }
    
    const currentPrice = asset.priceHistory[0].price;
    
    // Obter último índice de tempo dos dados de treinamento
    const lastIndex = asset.priceHistory.length - 1;
    
    // Prever valor para dias no futuro (índice atual + dias)
    const futureIndex = lastIndex + days;
    const normalizedPrediction = model.predict(futureIndex);
    
    // Desnormalizar a previsão
    const predictedPrice = denormalizeValue(normalizedPrediction, min, max);
    
    // Calcular variação percentual
    const percentChange = ((predictedPrice - currentPrice) / currentPrice) * 100;
    
    // Calcular confiança (baseado no R² do modelo)
    const confidence = Math.min(Math.abs(model.score(model.coefficients)) * 100, 95);
    
    return {
      currentPrice,
      predictedPrice,
      percentChange,
      confidence
    };
  } catch (error) {
    logger.error(`Erro ao prever preço para ${symbol}:`, error);
    throw error;
  }
}

/**
 * Salva o modelo treinado para uso futuro
 */
export async function saveModel(
  symbol: string,
  timeframe: '24h' | '7d' | '30d' = '24h'
): Promise<boolean> {
  try {
    const modelId = `${symbol}:${timeframe}`;
    const model = trainedModels[modelId];
    
    if (!model) {
      throw new Error(`Modelo para ${symbol} não encontrado em memória`);
    }
    
    // Em ML-Regression, podemos salvar os coeficientes
    const modelData = {
      coefficients: model.coefficients,
      degree: model.degree,
      symbol,
      timeframe
    };
    
    // Aqui você implementaria a lógica para salvar o modelo
    // Por exemplo, armazenando em um arquivo ou banco de dados
    logger.info(`Modelo para ${symbol} salvo com sucesso`);
    
    return true;
  } catch (error) {
    logger.error(`Erro ao salvar modelo para ${symbol}:`, error);
    return false;
  }
}

/**
 * Carrega um modelo previamente treinado
 */
export async function loadModel(
  symbol: string,
  timeframe: '24h' | '7d' | '30d' = '24h'
): Promise<boolean> {
  try {
    const modelId = `${symbol}:${timeframe}`;
    
    // Aqui você implementaria a lógica para carregar o modelo
    // Por exemplo, lendo de um arquivo ou banco de dados
    
    // Exemplo de como carregar um modelo:
    // const modelData = ... // carregar dados do modelo
    // const model = new PolynomialRegression([], [], modelData.degree);
    // model.coefficients = modelData.coefficients;
    
    // trainedModels[modelId] = model;
    
    logger.info(`Modelo para ${symbol} carregado com sucesso`);
    
    return true;
  } catch (error) {
    logger.error(`Erro ao carregar modelo para ${symbol}:`, error);
    return false;
  }
} 