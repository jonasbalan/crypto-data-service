import axios from 'axios';
import { logger } from '../../utils/logger';
import { getRedisClient } from '../../database/init';
import { IPriceData } from '../../models/crypto';

// Interface para resposta da API do CoinGecko
interface CoinGeckoPrice {
  [key: string]: {
    usd: number;
    usd_24h_vol: number;
    usd_24h_change: number;
    usd_market_cap: number;
  };
}

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  last_updated: string;
}

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const CACHE_TTL = 60 * 5; // 5 minutos em segundos

/**
 * Obter preços de várias criptomoedas
 * @param symbols Array de símbolos de criptomoedas (ex: ['bitcoin', 'ethereum'])
 * @returns Dados de preços formatados
 */
export async function getCryptoPrices(symbols: string[]): Promise<IPriceData[]> {
  try {
    const redis = getRedisClient();
    const cacheKey = `coingecko:prices:${symbols.join(',')}`;
    
    // Verificar cache (apenas se Redis estiver disponível)
    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Retornando dados de preço do cache');
        return JSON.parse(cachedData);
      }
    }
    
    // Consultar API do CoinGecko
    const response = await axios.get<CoinGeckoPrice>(`${COINGECKO_API_URL}/simple/price`, {
      params: {
        ids: symbols.join(','),
        vs_currencies: 'usd',
        include_market_cap: true,
        include_24hr_vol: true,
        include_24hr_change: true
      }
    });
    
    // Formatar dados conforme nossa interface padrão
    const priceData: IPriceData[] = Object.entries(response.data).map(([id, data]) => ({
      price: data.usd,
      volume24h: data.usd_24h_vol,
      marketCap: data.usd_market_cap,
      change24h: data.usd_24h_change,
      change7d: 0, // Não disponível nesta chamada
      timestamp: new Date(),
      source: 'coingecko'
    }));
    
    // Salvar no cache (apenas se Redis estiver disponível)
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(priceData), 'EX', CACHE_TTL);
    }
    
    return priceData;
  } catch (error) {
    logger.error('Erro ao obter preços do CoinGecko:', error);
    throw error;
  }
}

/**
 * Obter dados detalhados do mercado para criptomoedas
 * @param symbols Array de símbolos de criptomoedas (ex: ['bitcoin', 'ethereum'])
 * @returns Dados detalhados do mercado
 */
export async function getMarketData(symbols: string[]): Promise<CoinGeckoMarketData[]> {
  try {
    const redis = getRedisClient();
    const cacheKey = `coingecko:market:${symbols.join(',')}`;
    
    // Verificar cache (apenas se Redis estiver disponível)
    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Retornando dados de mercado do cache');
        return JSON.parse(cachedData);
      }
    }
    
    // Consultar API do CoinGecko
    const response = await axios.get<CoinGeckoMarketData[]>(`${COINGECKO_API_URL}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        ids: symbols.join(','),
        order: 'market_cap_desc',
        per_page: 100,
        page: 1,
        sparkline: false,
        price_change_percentage: '7d'
      }
    });
    
    // Salvar no cache (apenas se Redis estiver disponível)
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(response.data), 'EX', CACHE_TTL);
    }
    
    return response.data;
  } catch (error) {
    logger.error('Erro ao obter dados de mercado do CoinGecko:', error);
    throw error;
  }
}

/**
 * Converter dados do CoinGecko para o formato padrão de IPriceData
 * @param marketData Dados de mercado do CoinGecko
 * @returns Dados de preço formatados
 */
export function convertMarketDataToPriceData(marketData: CoinGeckoMarketData[]): IPriceData[] {
  return marketData.map(data => ({
    price: data.current_price,
    volume24h: data.total_volume,
    marketCap: data.market_cap,
    change24h: data.price_change_percentage_24h,
    change7d: data.price_change_percentage_7d,
    timestamp: new Date(data.last_updated),
    source: 'coingecko'
  }));
} 