import express, { Request, Response } from 'express';
import { CryptoAsset } from '../../models/crypto';
import { logger } from '../../utils/logger';
import { getCryptoPrices, getMarketData } from '../../services/api/coingecko';
import { getTickers, getOrderBookLiquidity } from '../../services/api/binance';

// Criar router
const router = express.Router();

/**
 * @route GET /api/crypto/assets
 * @description Obtém lista de todos os ativos criptográficos
 */
router.get('/assets', async (req: Request, res: Response) => {
  try {
    // Parâmetros de consulta
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = (req.query.sortBy as string) || 'marketCap';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 1 : -1;
    
    // Construir objeto de ordenação
    const sort: any = {};
    sort[sortBy] = sortOrder;
    
    // Consultar banco de dados
    const assets = await CryptoAsset.find({})
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .select('symbol name currentPrice chainId marketCap change24h lastUpdated');
    
    // Obter contagem total
    const total = await CryptoAsset.countDocuments({});
    
    // Responder com os resultados
    res.status(200).json({
      data: assets,
      pagination: {
        total,
        offset,
        limit
      }
    });
  } catch (error) {
    logger.error('Erro ao obter ativos:', error);
    res.status(500).json({ error: 'Erro ao obter ativos' });
  }
});

/**
 * @route GET /api/crypto/assets/:symbol
 * @description Obtém detalhes de um ativo criptográfico específico
 */
router.get('/assets/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    // Verificar parâmetro
    if (!symbol) {
      return res.status(400).json({ error: 'Símbolo do ativo é obrigatório' });
    }
    
    // Consultar banco de dados
    const asset = await CryptoAsset.findOne({ 
      symbol: symbol.toUpperCase() 
    });
    
    // Verificar se o ativo foi encontrado
    if (!asset) {
      return res.status(404).json({ error: 'Ativo não encontrado' });
    }
    
    // Responder com os resultados
    res.status(200).json({ data: asset });
  } catch (error) {
    logger.error(`Erro ao obter ativo ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Erro ao obter detalhes do ativo' });
  }
});

/**
 * @route GET /api/crypto/prices
 * @description Obtém preços atuais para um conjunto de ativos
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    // Obter símbolos da consulta ou usar padrões
    let symbols = (req.query.symbols as string || 'bitcoin,ethereum,solana,binancecoin').split(',');
    
    // Verificar fonte de dados
    const source = (req.query.source as string) || 'coingecko';
    
    let priceData;
    
    if (source === 'coingecko') {
      // Obter preços do CoinGecko
      priceData = await getCryptoPrices(symbols);
    } else if (source === 'binance') {
      // Converter símbolos para formato da Binance
      const binanceSymbols = symbols.map(s => {
        // Converter nomes comuns para formato Binance (ex: bitcoin -> BTCUSDT)
        switch(s.toLowerCase()) {
          case 'bitcoin': return 'BTCUSDT';
          case 'ethereum': return 'ETHUSDT';
          case 'solana': return 'SOLUSDT';
          case 'binancecoin': return 'BNBUSDT';
          default: return s.toUpperCase() + 'USDT';
        }
      });
      
      // Obter preços da Binance
      priceData = await getTickers(binanceSymbols);
    } else {
      return res.status(400).json({ error: 'Fonte de dados não suportada' });
    }
    
    // Responder com os resultados
    res.status(200).json({ data: priceData, source });
  } catch (error) {
    logger.error('Erro ao obter preços:', error);
    res.status(500).json({ error: 'Erro ao obter preços' });
  }
});

/**
 * @route GET /api/crypto/market-data
 * @description Obtém dados de mercado detalhados
 */
router.get('/market-data', async (req: Request, res: Response) => {
  try {
    // Obter símbolos da consulta ou usar padrões
    let symbols = (req.query.symbols as string || 'bitcoin,ethereum,solana,binancecoin').split(',');
    
    // Obter dados de mercado
    const marketData = await getMarketData(symbols);
    
    // Responder com os resultados
    res.status(200).json({ data: marketData });
  } catch (error) {
    logger.error('Erro ao obter dados de mercado:', error);
    res.status(500).json({ error: 'Erro ao obter dados de mercado' });
  }
});

/**
 * @route GET /api/crypto/liquidity/:symbol
 * @description Obtém dados de liquidez para um par de negociação
 */
router.get('/liquidity/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    // Verificar parâmetro
    if (!symbol) {
      return res.status(400).json({ error: 'Símbolo do par é obrigatório' });
    }
    
    // Converter para formato da Binance se necessário
    let binanceSymbol = symbol.toUpperCase();
    if (!binanceSymbol.endsWith('USDT')) {
      binanceSymbol += 'USDT';
    }
    
    // Obter dados de liquidez
    const liquidityData = await getOrderBookLiquidity(binanceSymbol);
    
    // Responder com os resultados
    res.status(200).json({ data: liquidityData });
  } catch (error) {
    logger.error(`Erro ao obter liquidez para ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Erro ao obter dados de liquidez' });
  }
});

/**
 * @route GET /api/crypto/historical/:symbol
 * @description Obtém dados históricos de preço para um ativo
 */
router.get('/historical/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days as string) || 7;
    const interval = (req.query.interval as string) || 'daily';
    
    // Verificar parâmetro
    if (!symbol) {
      return res.status(400).json({ error: 'Símbolo do ativo é obrigatório' });
    }
    
    // Calcular data de início com base nos dias solicitados
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Consultar banco de dados
    const asset = await CryptoAsset.findOne({ 
      symbol: symbol.toUpperCase() 
    }).select('priceHistory');
    
    // Verificar se o ativo foi encontrado
    if (!asset) {
      return res.status(404).json({ error: 'Ativo não encontrado' });
    }
    
    // Filtrar histórico de preços com base na data de início
    const historicalData = asset.priceHistory.filter(
      record => new Date(record.timestamp) >= startDate
    );
    
    // Agrupar dados por intervalo se necessário
    let groupedData = historicalData;
    if (interval === 'hourly' || interval === 'daily') {
      groupedData = groupDataByInterval(historicalData, interval);
    }
    
    // Responder com os resultados
    res.status(200).json({ 
      data: groupedData,
      symbol: symbol.toUpperCase(),
      days,
      interval
    });
  } catch (error) {
    logger.error(`Erro ao obter histórico para ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Erro ao obter dados históricos' });
  }
});

/**
 * Agrupa dados históricos por intervalo
 * @param data Dados históricos
 * @param interval Intervalo (hourly, daily)
 * @returns Dados agrupados
 */
function groupDataByInterval(data: any[], interval: string): any[] {
  const grouped: any = {};
  
  data.forEach(item => {
    const date = new Date(item.timestamp);
    let key;
    
    if (interval === 'hourly') {
      // Agrupar por hora
      key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`;
    } else {
      // Agrupar por dia
      key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }
    
    if (!grouped[key]) {
      grouped[key] = {
        timestamp: date,
        prices: [],
        volumes: []
      };
    }
    
    grouped[key].prices.push(item.price);
    grouped[key].volumes.push(item.volume24h);
  });
  
  // Calcular médias para cada grupo
  return Object.keys(grouped).map(key => {
    const group = grouped[key];
    const avgPrice = group.prices.reduce((a: number, b: number) => a + b, 0) / group.prices.length;
    const avgVolume = group.volumes.reduce((a: number, b: number) => a + b, 0) / group.volumes.length;
    
    return {
      timestamp: group.timestamp,
      price: avgPrice,
      volume24h: avgVolume
    };
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export default router; 