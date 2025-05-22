import { ExchangeFactory } from './exchanges';
import { BinanceExchange } from './binanceService'; // Corrigido: binanceService em vez de binance
import { KuCoinExchange } from './kucoin';
import { logger } from '../../utils/logger';

// Config mock para evitar dependência
const config = {
  exchanges: {
    binance: {
      apiKey: process.env.BINANCE_API_KEY || '',
      apiSecret: process.env.BINANCE_API_SECRET || ''
    },
    kucoin: {
      apiKey: process.env.KUCOIN_API_KEY || '',
      apiSecret: process.env.KUCOIN_API_SECRET || ''
    }
  }
};

/**
 * Inicializa e registra todas as exchanges disponíveis
 */
export async function registerExchanges(): Promise<void> {
  try {
    // Registrar Binance
    const binance = new BinanceExchange(
      config.exchanges?.binance?.apiKey,
      config.exchanges?.binance?.apiSecret
    );
    ExchangeFactory.registerExchange(binance);
    
    // Registrar KuCoin
    const kucoin = new KuCoinExchange(
      config.exchanges?.kucoin?.apiKey,
      config.exchanges?.kucoin?.apiSecret
    );
    ExchangeFactory.registerExchange(kucoin);
    
    logger.info(`Exchanges registradas com sucesso: ${ExchangeFactory.listExchanges().join(', ')}`);
  } catch (error) {
    logger.error('Erro ao registrar exchanges:', error);
    throw error;
  }
}

/**
 * Obtém uma instância de exchange pelo nome
 */
export function getExchange(name: string) {
  return ExchangeFactory.getExchange(name);
}

/**
 * Lista todas as exchanges disponíveis
 */
export function listExchanges(): string[] {
  return ExchangeFactory.listExchanges();
}

export * from './exchanges';
export { KuCoinExchange } from './kucoin';
export { BinanceExchange } from './binanceService'; // Corrigido 