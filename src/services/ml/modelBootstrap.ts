import { logger } from '../../utils/logger';
import { getOrTrainModel, saveModel } from './pricePredictionModel';
import { CryptoAsset } from '../../models/crypto';

// Lista de principais criptomoedas para pré-treinar modelos
const TOP_CRYPTOS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'MATIC'];

/**
 * Inicializa modelos de ML para as principais criptomoedas
 */
export async function initializeModels(): Promise<void> {
  try {
    logger.info('Iniciando bootstrap de modelos de ML...');
    
    // Verificar quais símbolos existem na base de dados
    const assets = await CryptoAsset.find({
      symbol: { $in: TOP_CRYPTOS }
    });
    
    const availableSymbols = assets.map(a => a.symbol);
    logger.info(`${availableSymbols.length} criptomoedas disponíveis para treinamento de modelos`);
    
    // Treinar modelos em sequência para evitar sobrecarga de memória
    for (const symbol of availableSymbols) {
      try {
        logger.info(`Iniciando treinamento de modelo para ${symbol}...`);
        
        // Verificar se temos dados suficientes
        const asset = await CryptoAsset.findOne({ symbol });
        if (!asset || !asset.priceHistory || asset.priceHistory.length < 30) {
          logger.warn(`Dados insuficientes para treinar modelo de ${symbol}. Pulando.`);
          continue;
        }
        
        // Treinar modelo
        const result = await getOrTrainModel(symbol);
        logger.info(`Modelo para ${symbol} treinado com sucesso.`);
        
        // Salvar modelo treinado
        await saveModel(symbol);
        logger.info(`Modelo para ${symbol} salvo com sucesso.`);
      } catch (error) {
        logger.error(`Erro ao treinar modelo para ${symbol}:`, error);
      }
      
      // Pausa entre treinamentos para evitar sobrecarga
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    logger.info('Bootstrap de modelos de ML concluído');
  } catch (error) {
    logger.error('Erro no bootstrap de modelos de ML:', error);
  }
}

/**
 * Treina todos os modelos disponíveis
 */
export async function trainAllModels(): Promise<void> {
  try {
    logger.info('Iniciando treinamento de todos os modelos...');
    
    // Buscar todos os ativos
    const assets = await CryptoAsset.find({});
    
    // Treinar modelos em sequência para evitar sobrecarga de memória
    for (const asset of assets) {
      try {
        // Verificar se temos dados suficientes
        if (!asset.priceHistory || asset.priceHistory.length < 30) {
          logger.warn(`Dados insuficientes para treinar modelo de ${asset.symbol}. Pulando.`);
          continue;
        }
        
        logger.info(`Iniciando treinamento de modelo para ${asset.symbol}...`);
        
        // Treinar modelo
        await getOrTrainModel(asset.symbol);
        logger.info(`Modelo para ${asset.symbol} treinado com sucesso.`);
        
        // Salvar modelo treinado
        await saveModel(asset.symbol);
        logger.info(`Modelo para ${asset.symbol} salvo com sucesso.`);
      } catch (error) {
        logger.error(`Erro ao treinar modelo para ${asset.symbol}:`, error);
      }
      
      // Pausa entre treinamentos para evitar sobrecarga
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    logger.info('Treinamento de todos os modelos concluído');
  } catch (error) {
    logger.error('Erro ao treinar todos os modelos:', error);
  }
} 